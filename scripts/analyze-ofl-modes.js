const fs = require('fs');
const path = require('path');

const OFL_PATH = '../open-fixture-library/fixtures';

let totalFixtures = 0;
let totalModes = 0;
let modeDistribution = {};
let maxModes = {count: 0, fixture: '', manufacturer: ''};
let exampleModes = [];

const manufacturers = JSON.parse(fs.readFileSync(path.join(OFL_PATH, 'manufacturers.json')));

for (const manufacturer in manufacturers) {
  const manufacturerDir = path.join(OFL_PATH, manufacturer);
  if (fs.existsSync(manufacturerDir)) {
    const files = fs.readdirSync(manufacturerDir).filter(f => f.endsWith('.json'));
    
    for (const file of files) {
      const fixture = JSON.parse(fs.readFileSync(path.join(manufacturerDir, file)));
      if (fixture.modes) {
        totalFixtures++;
        const modeCount = fixture.modes.length;
        totalModes += modeCount;
        modeDistribution[modeCount] = (modeDistribution[modeCount] || 0) + 1;
        
        if (modeCount > maxModes.count) {
          maxModes = {count: modeCount, fixture: file.replace('.json',''), manufacturer};
        }
        
        // Collect examples of fixtures with many modes
        if (modeCount >= 8 && exampleModes.length < 5) {
          exampleModes.push({
            manufacturer,
            fixture: file.replace('.json',''),
            modeCount,
            modes: fixture.modes.map(m => m.name || m.shortName)
          });
        }
      }
    }
  }
}

console.log('=== OPEN FIXTURE LIBRARY MODE STATISTICS ===\n');
console.log('Total Fixtures:', totalFixtures);
console.log('Total Test Cases (Fixture×Mode combinations):', totalModes);
console.log('Average Modes per Fixture:', (totalModes/totalFixtures).toFixed(2));
console.log('Max Modes in Single Fixture:', maxModes.count, `(${maxModes.manufacturer}/${maxModes.fixture})`);

console.log('\n=== MODE DISTRIBUTION ===');
Object.keys(modeDistribution).sort((a,b) => parseInt(a)-parseInt(b)).forEach(count => {
  const percentage = ((modeDistribution[count] / totalFixtures) * 100).toFixed(1);
  const bar = '█'.repeat(Math.floor(percentage/2));
  console.log(`  ${count.padStart(2)} mode(s): ${modeDistribution[count].toString().padStart(3)} fixtures (${percentage.padStart(5)}%) ${bar}`);
});

// Calculate test complexity
const fixturesWithManyModes = Object.entries(modeDistribution)
  .filter(([count]) => parseInt(count) >= 5)
  .reduce((sum, [_, fixtureCount]) => sum + fixtureCount, 0);

console.log('\n=== TEST COMPLEXITY ===');
console.log(`Fixtures with 1 mode: ${modeDistribution[1] || 0} (${((modeDistribution[1] || 0) / totalFixtures * 100).toFixed(1)}%)`);
console.log(`Fixtures with 2-4 modes: ${
  ((modeDistribution[2] || 0) + (modeDistribution[3] || 0) + (modeDistribution[4] || 0))} (${
  (((modeDistribution[2] || 0) + (modeDistribution[3] || 0) + (modeDistribution[4] || 0)) / totalFixtures * 100).toFixed(1)}%)`);
console.log(`Fixtures with 5+ modes: ${fixturesWithManyModes} (${(fixturesWithManyModes / totalFixtures * 100).toFixed(1)}%)`);

console.log('\n=== EXAMPLES OF HIGH-MODE FIXTURES ===');
exampleModes.forEach(ex => {
  console.log(`\n${ex.manufacturer}/${ex.fixture} (${ex.modeCount} modes):`);
  ex.modes.forEach((mode, i) => console.log(`  ${(i+1).toString().padStart(2)}. ${mode}`));
});

// Estimate test execution time
const avgTimePerTest = 0.1; // 100ms per test (conservative estimate)
const totalTestTime = totalModes * avgTimePerTest;
console.log('\n=== TEST EXECUTION ESTIMATE ===');
console.log(`Estimated time per test: ${avgTimePerTest}s`);
console.log(`Total test execution time: ${(totalTestTime/60).toFixed(1)} minutes`);
console.log(`With parallel execution (4 workers): ${(totalTestTime/60/4).toFixed(1)} minutes`);