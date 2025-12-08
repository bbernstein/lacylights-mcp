# Code Coverage Policy

## Current Coverage Thresholds

This repository maintains minimum code coverage thresholds to ensure code quality. The thresholds are configured in `jest.config.js`:

```javascript
coverageThreshold: {
  global: {
    branches: 54,
    functions: 82,
    lines: 76,
    statements: 75,
  },
}
```

**Current Coverage (as of 2025-10-24):**
- Statements: 75.38%
- Branches: 54.73%
- Functions: 82.91%
- Lines: 76%

✅ **Exceeds the 75% requirement!**

## Continuous Improvement Strategy

### High-Water Mark Approach

We use a **high-water mark** strategy for code coverage:

1. **Current thresholds reflect actual coverage** - Thresholds are set slightly below current coverage to allow for minor variations
2. **Coverage should never decrease** - New code must maintain or improve coverage
3. **Periodic threshold increases** - When coverage improves significantly, update thresholds in `jest.config.js`

### Running Coverage Tests

```bash
# Run tests with coverage report
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- tests/tools/scene-tools.test.ts

# Open detailed HTML coverage report
open coverage/index.html
```

### CI/CD Enforcement

The GitHub Actions CI workflow (`ci.yml`) runs coverage tests on every pull request. **Builds will fail** if coverage drops below the configured thresholds.

## Improving Coverage

### Priority Areas for Improvement

Files with lower coverage that need tests:

- **graphql-client-simple.ts** (61.73% lines)
  - Many uncovered lines in error handling paths
  - Complex relationship queries need more test cases
  - Search functionality has gaps (lines 596-694)

- **cue-tools.ts** (65.74% lines)
  - Cue list manipulation edge cases
  - Error handling for invalid cue numbers
  - Follow time calculation logic

- **fixture-tools.ts** (69.66% lines)
  - Channel assignment conflict resolution
  - Fixture ordering edge cases
  - Complex fixture filtering logic

### Branch Coverage

Branch coverage is lower (54.73%) than other metrics. Focus on:
- Testing both success and failure paths
- Testing conditional logic (if/else branches)
- Testing error handling and validation
- Testing different input variations

### Adding Tests

1. **Service Tests** - Mock fetch for GraphQL calls:
   ```typescript
   import { mockFetch } from '../setup';

   const mockResponse = {
     json: jest.fn().mockResolvedValue({
       data: { projects: [] }
     })
   };
   mockFetch.mockResolvedValue(mockResponse as any);

   // Test your service method
   const result = await client.listProjects();
   expect(result).toEqual([]);
   ```

2. **Error Path Tests** - Test failure scenarios:
   ```typescript
   mockFetch.mockResolvedValue({
     json: jest.fn().mockResolvedValue({
       errors: [{ message: 'Not found' }]
     })
   });

   await expect(client.getProject('invalid')).rejects.toThrow();
   ```

3. **Edge Case Tests** - Test boundary conditions:
   ```typescript
   test('handles empty result set', async () => {
     mockFetch.mockResolvedValue({
       json: jest.fn().mockResolvedValue({ data: { fixtures: [] } })
     });

     const fixtures = await client.listFixtures('project-1');
     expect(fixtures).toHaveLength(0);
   });
   ```

### Updating Thresholds

When coverage improves across the codebase:

1. Run `npm run test:coverage` to get current metrics
2. Update thresholds in `jest.config.js` to reflect new baseline
3. Round down slightly to allow for minor variations
4. Commit the updated thresholds
5. Document the change in this file

### Best Practices

- **Test MCP tool handlers** - Each tool should have success and error tests
- **Mock external dependencies** - GraphQL client, OpenAI API, ChromaDB
- **Test validation logic** - Input validation, error messages
- **Test error propagation** - GraphQL errors, network errors, validation errors
- **Test edge cases** - Empty lists, null values, invalid IDs

## Progress Tracking

| Date       | Statements | Branches | Functions | Lines | Notes |
|------------|------------|----------|-----------|-------|-------|
| 2025-10-24 | 75.38%     | 54.73%   | 82.91%    | 76%   | Initial baseline |

**Next Milestone:** 80% coverage across all metrics, 60% branch coverage

## Coverage Gaps by File

### High Priority (< 70% coverage)
- `graphql-client-simple.ts`: 61.73% - Core GraphQL client, needs comprehensive tests
- `cue-tools.ts`: 65.74% - Playback control logic, critical path
- `fixture-tools.ts`: 69.66% - Fixture management, complex logic

### Medium Priority (70-80% coverage)
- `ai-lighting.ts`: 88.39% - AI integration, mostly covered

### Well Covered (> 80% coverage)
- `project-tools.ts`: 100% ✅
- `relationship-tools.ts`: 100% ✅
- `search-tools.ts`: 100% ✅
- `scene-tools.ts`: 97.69% ✅
- `rag-service-simple.ts`: 100% ✅

## Resources

- [Jest Coverage Documentation](https://jestjs.io/docs/configuration#coveragethreshold-object)
- [Testing MCP Servers](https://modelcontextprotocol.io/docs/testing)
- [Mocking GraphQL Queries](https://www.apollographql.com/docs/react/development-testing/testing/)
- [Coverage Reports Location](./coverage/index.html)
