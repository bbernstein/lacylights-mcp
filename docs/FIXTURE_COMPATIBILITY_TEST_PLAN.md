# Comprehensive Fixture Compatibility Test Plan

## Overview
This document outlines a test strategy to validate that all fixtures from the Open Fixture Library (OFL) can be properly represented in the LacyLights system through the MCP server and Node backend.

## Current State Analysis

### Open Fixture Library Structure
- **Total Manufacturers**: 129
- **Total Fixture Definitions**: 600 (with complete mode data)
- **Total Test Cases**: 2,729 (fixture × mode combinations)
- **Format**: JSON files with standardized schema
- **Location**: `open-fixture-library/fixtures/`
- **Structure**: 
  - `manufacturers.json` - Master list of manufacturers
  - `{manufacturer}/` - Directory per manufacturer
  - `{manufacturer}/{model}.json` - Individual fixture definitions

### Mode Distribution Analysis
- **Average Modes per Fixture**: 4.55
- **Maximum Modes in Single Fixture**: 181 (chroma-q/color-force-ii-72)
- **Distribution**:
  - 23.2% fixtures have 1 mode (simple fixtures)
  - 52.0% fixtures have 2-4 modes (standard complexity)
  - 24.8% fixtures have 5+ modes (complex fixtures)
  - Notable outliers: Some fixtures have 30+, 68, 121, or 181 modes

### Key OFL Fixture Properties
1. **Physical Properties**: dimensions, weight, power, DMX connector
2. **Channel Definitions**: Available channels with capabilities
3. **Modes**: Different channel configurations (e.g., 3ch, 7ch, 36ch)
4. **Matrix/Pixel Information**: For pixel-based fixtures
5. **Categories**: LED Par, Moving Head, Strobe, etc.

## Test Scope

### In Scope
1. **Fixture Creation Validation**
   - Verify all OFL fixtures can be created in lacylights-go
   - Validate proper manufacturer/model mapping
   - Ensure all modes are selectable and create correct channels

2. **Channel Mapping Validation**
   - RGB, RGBA, RGBW, RGBAW detection
   - Intensity/Dimmer channels
   - Movement channels (Pan/Tilt)
   - Effect channels (Strobe, Gobo, etc.)
   - Matrix/Pixel channel expansion

3. **Mode Selection Logic**
   - Automatic mode detection from mode names
   - Proper channel count calculation
   - Mode-specific channel configurations

4. **Edge Cases**
   - Fixtures with unconventional channel names
   - Complex matrix fixtures
   - Fixtures with switching channels
   - Virtual channels and channel insertion

### Out of Scope
- Physical properties validation (dimensions, power)
- DMX universe assignment testing (covered by existing tests)
- Scene creation with fixtures (covered by existing tests)
- Real-time DMX output validation

## Repository Placement

### Recommended: `lacylights-mcp` Repository

**Rationale:**
1. **MCP is the integration layer** between external systems and lacylights-go
2. **Tests validate the MCP→Go flow**, not just Go backend internals
3. **OFL parsing logic** will primarily exist in MCP
4. **Fixture creation intelligence** is implemented in MCP's fixture-tools
5. **Isolated testing** - Can test without affecting core Go server

**Test Location:** `lacylights-mcp/tests/integration/ofl-compatibility/`

## Mode-Specific Testing Strategy

### Test Prioritization
Given the 2,729 total test cases, we need a smart testing strategy:

1. **Tier 1: Core Tests** (≈500 test cases)
   - All single-mode fixtures (139 fixtures)
   - First and last mode of multi-mode fixtures (≈350 modes)
   - Ensures basic compatibility for all fixtures

2. **Tier 2: Common Modes** (≈800 test cases)
   - All modes for fixtures with 2-4 modes (312 fixtures)
   - Most common mode patterns (RGB, RGBA, RGBW, DMX, etc.)

3. **Tier 3: Complex Fixtures** (≈1,429 test cases)
   - All modes for fixtures with 5+ modes
   - Edge cases and unusual configurations
   - Matrix/pixel expansion modes

### Mode Pattern Recognition
Common mode naming patterns to test:
- **Channel Count**: "3-channel", "7ch", "12-channel"
- **Color Modes**: "RGB", "RGBA", "RGBW", "RGBAW", "CMY"
- **Control Modes**: "DMX", "HSI", "Basic", "Advanced", "Extended"
- **Feature Modes**: "Strobe", "Dimmer", "Programs"
- **Resolution**: "8-bit", "16-bit", "fine"

### Example Test Cases

#### Simple Fixture (1 mode)
```javascript
// acoustic-control/par-180-cob-3in1 (1 mode)
test('Single mode fixture', async () => {
  const result = await createFixture({
    manufacturer: 'Acoustic Control',
    model: 'PAR 180 COB 3in1',
    mode: 'Default' // Only mode available
  });
  expect(result.channels).toHaveLength(expectedChannelCount);
});
```

#### Standard Fixture (multiple modes)
```javascript
// american-dj/flat-par-qa12 (8 modes)
describe('Multi-mode fixture', () => {
  const modes = ['1-channel', '2-channel', '3-channel', '4-channel', 
                 '5-channel', '6-channel', '7-channel', '8-channel'];
  
  test.each(modes)('Mode: %s', async (mode) => {
    const result = await createFixture({
      manufacturer: 'American DJ',
      model: 'Flat Par QA12',
      mode
    });
    expect(result.channelCount).toBe(parseInt(mode));
    expect(result.success).toBe(true);
  });
});
```

#### Complex Fixture (many modes)
```javascript
// chroma-q/color-force-ii-72 (181 modes!)
describe('Complex fixture with 181 modes', () => {
  test('Sample critical modes', async () => {
    const criticalModes = [
      'RGB', 'RGBA', 'RGBW', 'HSI', 'Direct',
      '3-channel', '4-channel', '8-bit', '16-bit'
    ];
    
    for (const mode of criticalModes) {
      if (fixtureHasMode(mode)) {
        const result = await createFixture({/*...*/});
        expect(result.success).toBe(true);
      }
    }
  });
});
```

## Test Implementation Strategy

### Phase 1: OFL Parser Development
```typescript
// lacylights-mcp/src/utils/ofl-parser.ts
export class OFLParser {
  parseManufacturer(manufacturerData: any): string
  parseFixture(fixtureData: any): ParsedFixture
  extractModes(fixtureData: any): Mode[]
  mapChannelsToLacyLights(oflChannels: any): Channel[]
  detectColorMode(modeName: string, channels: string[]): ColorMode
}
```

### Phase 2: Test Data Preparation
```typescript
// lacylights-mcp/tests/fixtures/ofl-test-fixtures.ts
export const loadOFLFixtures = async () => {
  // Load all fixtures from open-fixture-library
  // Group by manufacturer
  // Return structured test data
}
```

### Phase 3: Compatibility Test Suite
```typescript
// lacylights-mcp/tests/integration/ofl-compatibility.test.ts
describe('Open Fixture Library Compatibility', () => {
  describe('Manufacturer Coverage', () => {
    test.each(manufacturers)('Should handle %s fixtures', async (manufacturer) => {
      // Test all fixtures from manufacturer
    })
  })
  
  describe('Mode Detection', () => {
    test('Should detect RGB modes correctly', async () => {})
    test('Should detect RGBA modes correctly', async () => {})
    test('Should detect RGBW modes correctly', async () => {})
    test('Should detect RGBAW modes correctly', async () => {})
  })
  
  describe('Channel Mapping', () => {
    test('Should map standard channels', async () => {})
    test('Should handle matrix expansion', async () => {})
    test('Should handle virtual channels', async () => {})
  })
})
```

### Phase 4: Validation Criteria

#### Success Criteria for Each Fixture:
1. **Creation Success**: Fixture can be created without errors
2. **Mode Availability**: All OFL modes are available in LacyLights
3. **Channel Count Match**: Channel count matches OFL definition
4. **Channel Type Mapping**: Channels mapped to appropriate types:
   - Color channels → RED, GREEN, BLUE, AMBER, WHITE
   - Intensity → INTENSITY
   - Movement → PAN, TILT
   - Effects → STROBE, GOBO, PRISM, etc.
5. **No Data Loss**: All functional channels represented

#### Acceptable Limitations:
- Complex switching channels may be simplified
- Some effect channels may map to generic "OTHER" type
- Virtual/calculated channels may be omitted
- Fine movement channels (16-bit) may be simplified to 8-bit

## Test Execution Plan

### 1. Initial Test Run
```bash
npm test -- tests/integration/ofl-compatibility.test.ts
```

### 2. Coverage Report Format
```
OFL Compatibility Report
========================
Total Manufacturers: 129
Total Fixtures: 600
Total Test Cases (Fixture×Mode): 2,729
Average Modes per Fixture: 4.55

FIXTURE COMPATIBILITY:
Successfully Created: 588 (98%)
Partially Compatible: 10 (1.7%)
Failed: 2 (0.3%)

MODE COVERAGE BY TIER:
Tier 1 (Core): 500/500 (100%)
Tier 2 (Common): 798/800 (99.8%)
Tier 3 (Complex): 1,400/1,429 (98.0%)

MODE DETECTION ACCURACY:
- RGB: 100% (450/450 modes)
- RGBA: 98% (196/200 modes)
- RGBW: 99% (297/300 modes)
- RGBAW: 100% (50/50 modes)
- HSI: 95% (95/100 modes)
- DMX/Basic: 97% (485/500 modes)
- Matrix/Pixel: 92% (46/50 modes)

PERFORMANCE METRICS:
- Total Test Time: 4.5 minutes
- Average per Test: 98ms
- Parallel Execution (4 workers): 1.1 minutes

COMMON ISSUES BY FREQUENCY:
1. Matrix expansion for fixtures with >100 pixels (15 cases)
2. Complex switching channel logic (12 cases)
3. Unconventional channel naming (8 cases)
4. 16-bit fine channel handling (5 cases)
5. Virtual/calculated channels (3 cases)

OUTLIER FIXTURES:
- chroma-q/color-force-ii-72: 181 modes (partial: 150/181 tested)
- lightmaxx/platinum-tour-spot: 121 modes (all tested)
- chauvet-dj/colorband-pix: 68 modes (all tested)
```

### 3. Continuous Integration
- Run on every PR that modifies fixture-tools
- Weekly full compatibility check
- Generate compatibility matrix for documentation

## Implementation Priority

### Phase 1: Foundation (Week 1)
1. **Create OFL parser utility** - Handle manufacturers.json and fixture definitions
2. **Implement Tier 1 tests** - 500 core test cases (single-mode + critical modes)
3. **Basic mode detection** - RGB, RGBA, RGBW pattern recognition
4. **Test infrastructure** - Parallel execution, reporting framework

### Phase 2: Core Coverage (Week 2)
1. **Implement Tier 2 tests** - 800 common mode test cases
2. **Advanced mode detection** - HSI, DMX, channel count patterns
3. **Edge case handling** - Matrix fixtures, switching channels
4. **Performance optimization** - Achieve <2 minute full test execution

### Phase 3: Complete Coverage (Week 3)
1. **Implement Tier 3 tests** - 1,429 complex fixture modes
2. **Outlier fixture handling** - Strategy for 181-mode fixtures
3. **Compatibility scoring** - Success metrics per manufacturer/fixture type
4. **CI integration** - Automated testing on PR changes

### Phase 4: Production Ready (Week 4)
1. **Test optimization** - Selective testing based on changes
2. **Reporting dashboard** - Visual compatibility matrix
3. **Documentation** - Migration guides, compatibility notes
4. **Monitoring** - Track compatibility over time

## Risk Mitigation

### Identified Risks:
1. **Performance**: Testing 600+ fixtures may be slow
   - **Mitigation**: Parallel test execution, caching
   
2. **OFL Schema Changes**: OFL format may evolve
   - **Mitigation**: Pin OFL version, monitor updates
   
3. **Complex Fixtures**: Some fixtures may be too complex
   - **Mitigation**: Define acceptable limitations upfront
   
4. **Memory Usage**: Loading all fixtures may use significant memory
   - **Mitigation**: Batch processing, streaming parser

## Success Metrics

1. **Coverage**: >95% of OFL fixtures can be created
2. **Accuracy**: >98% correct mode detection
3. **Performance**: Full test suite runs in <60 seconds
4. **Reliability**: 0 false positives in CI

## Next Steps

1. Review and approve test plan
2. Create test directory structure in lacylights-mcp
3. Implement OFL parser utility
4. Create first compatibility test for single manufacturer
5. Iterate and expand coverage

## Appendix: Sample Test Output

```
Testing Chauvet DJ Fixtures (27 total)
  ✓ COLORband PiX - 7-channel mode (RGB detected)
  ✓ COLORband PiX - 3-channel mode (RGB detected)
  ✓ COLORband PiX - 4-channel mode (RGB+Dimmer detected)
  ✓ SlimPAR Pro RGBA - 10-channel mode (RGBA detected)
  ✓ Intimidator Spot 360 - 14-channel mode (Moving Head detected)
  ...
  
Summary: 27/27 fixtures compatible (100%)
Channel Mapping Accuracy: 98%
Mode Detection Accuracy: 100%
```