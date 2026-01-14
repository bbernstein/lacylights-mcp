import { RelationshipTools } from '../../src/tools/relationship-tools';
import { LacyLightsGraphQLClient } from '../../src/services/graphql-client-simple';
import { FixtureUsage, LookUsage, LookComparison, DifferenceType } from '../../src/types/lighting';

// Mock the GraphQL client
jest.mock('../../src/services/graphql-client-simple');
const MockGraphQLClient = LacyLightsGraphQLClient as jest.MockedClass<typeof LacyLightsGraphQLClient>;

describe('RelationshipTools', () => {
  let relationshipTools: RelationshipTools;
  let mockGraphQLClient: jest.Mocked<LacyLightsGraphQLClient>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockGraphQLClient = {
      getFixtureUsage: jest.fn(),
      getLookUsage: jest.fn(),
      compareLooks: jest.fn(),
    } as any;

    MockGraphQLClient.mockImplementation(() => mockGraphQLClient);
    relationshipTools = new RelationshipTools(mockGraphQLClient);
  });

  describe('getFixtureUsage', () => {
    it('should get fixture usage with looks and cues', async () => {
      const mockUsage: FixtureUsage = {
        fixtureId: 'fixture-1',
        fixtureName: 'LED Par 1',
        looks: [
          {
            id: 'look-1',
            name: 'Look 1',
            description: 'Test look',
            fixtureCount: 5,
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01'
          },
          {
            id: 'look-2',
            name: 'Look 2',
            fixtureCount: 3
          }
        ],
        cues: [
          {
            cueId: 'cue-1',
            cueNumber: 1.0,
            cueName: 'Cue 1',
            cueListId: 'cuelist-1',
            cueListName: 'Main Cue List'
          },
          {
            cueId: 'cue-2',
            cueNumber: 2.0,
            cueName: 'Cue 2',
            cueListId: 'cuelist-1',
            cueListName: 'Main Cue List'
          }
        ]
      };

      mockGraphQLClient.getFixtureUsage.mockResolvedValue(mockUsage);

      const result = await relationshipTools.getFixtureUsage({ fixtureId: 'fixture-1' });

      expect(mockGraphQLClient.getFixtureUsage).toHaveBeenCalledWith('fixture-1');
      expect(result.fixture.id).toBe('fixture-1');
      expect(result.fixture.name).toBe('LED Par 1');
      expect(result.looks.count).toBe(2);
      expect(result.cues.count).toBe(2);
      expect(result.summary.totalLooks).toBe(2);
      expect(result.summary.totalCues).toBe(2);
      expect(result.summary.isUsed).toBe(true);
      expect(result.message).toContain('is used in 2 look(s) and 2 cue(s)');
    });

    it('should handle unused fixture', async () => {
      const mockUsage: FixtureUsage = {
        fixtureId: 'fixture-1',
        fixtureName: 'Unused Fixture',
        looks: [],
        cues: []
      };

      mockGraphQLClient.getFixtureUsage.mockResolvedValue(mockUsage);

      const result = await relationshipTools.getFixtureUsage({ fixtureId: 'fixture-1' });

      expect(result.summary.isUsed).toBe(false);
      expect(result.message).toContain('is not currently used');
    });

    it('should handle GraphQL errors', async () => {
      mockGraphQLClient.getFixtureUsage.mockRejectedValue(new Error('GraphQL error'));

      await expect(
        relationshipTools.getFixtureUsage({ fixtureId: 'fixture-1' })
      ).rejects.toThrow('Failed to get fixture usage: Error: GraphQL error');
    });
  });

  describe('getLookUsage', () => {
    it('should get look usage with cues', async () => {
      const mockUsage: LookUsage = {
        lookId: 'look-1',
        lookName: 'Test Look',
        cues: [
          {
            cueId: 'cue-1',
            cueNumber: 1.0,
            cueName: 'Cue 1',
            cueListId: 'cuelist-1',
            cueListName: 'Main Cue List'
          },
          {
            cueId: 'cue-2',
            cueNumber: 2.0,
            cueName: 'Cue 2',
            cueListId: 'cuelist-1',
            cueListName: 'Main Cue List'
          },
          {
            cueId: 'cue-3',
            cueNumber: 1.0,
            cueName: 'Cue 1',
            cueListId: 'cuelist-2',
            cueListName: 'Secondary Cue List'
          }
        ]
      };

      mockGraphQLClient.getLookUsage.mockResolvedValue(mockUsage);

      const result = await relationshipTools.getLookUsage({ lookId: 'look-1' });

      expect(mockGraphQLClient.getLookUsage).toHaveBeenCalledWith('look-1');
      expect(result.look.id).toBe('look-1');
      expect(result.look.name).toBe('Test Look');
      expect(result.cues.count).toBe(3);
      expect(result.summary.totalCues).toBe(3);
      expect(result.summary.isUsed).toBe(true);
      expect(result.summary.uniqueCueLists).toBe(2);
      expect(result.message).toContain('is used in 3 cue(s) across 2 cue list(s)');
    });

    it('should handle unused look', async () => {
      const mockUsage: LookUsage = {
        lookId: 'look-1',
        lookName: 'Unused Look',
        cues: []
      };

      mockGraphQLClient.getLookUsage.mockResolvedValue(mockUsage);

      const result = await relationshipTools.getLookUsage({ lookId: 'look-1' });

      expect(result.summary.isUsed).toBe(false);
      expect(result.summary.uniqueCueLists).toBe(0);
      expect(result.message).toContain('is not currently used');
    });

    it('should handle GraphQL errors', async () => {
      mockGraphQLClient.getLookUsage.mockRejectedValue(new Error('GraphQL error'));

      await expect(
        relationshipTools.getLookUsage({ lookId: 'look-1' })
      ).rejects.toThrow('Failed to get look usage: Error: GraphQL error');
    });
  });

  describe('compareLooks', () => {
    it('should compare identical looks', async () => {
      const mockComparison: LookComparison = {
        look1: {
          id: 'look-1',
          name: 'Look 1',
          description: 'Test look 1',
          fixtureCount: 5
        },
        look2: {
          id: 'look-2',
          name: 'Look 2',
          description: 'Test look 2',
          fixtureCount: 5
        },
        differences: [],
        identicalFixtureCount: 5,
        differentFixtureCount: 0
      };

      mockGraphQLClient.compareLooks.mockResolvedValue(mockComparison);

      const result = await relationshipTools.compareLooks({
        lookId1: 'look-1',
        lookId2: 'look-2'
      });

      expect(mockGraphQLClient.compareLooks).toHaveBeenCalledWith('look-1', 'look-2');
      expect(result.comparison.identicalFixtures).toBe(5);
      expect(result.comparison.differentFixtures).toBe(0);
      expect(result.comparison.totalDifferences).toBe(0);
      expect(result.summary.areIdentical).toBe(true);
      expect(result.summary.similarityPercentage).toBe(100);
      expect(result.message).toContain('are identical');
    });

    it('should identify value changes between looks', async () => {
      const mockComparison: LookComparison = {
        look1: {
          id: 'look-1',
          name: 'Look 1',
          fixtureCount: 3
        },
        look2: {
          id: 'look-2',
          name: 'Look 2',
          fixtureCount: 3
        },
        differences: [
          {
            fixtureId: 'fixture-1',
            fixtureName: 'LED Par 1',
            differenceType: DifferenceType.VALUES_CHANGED,
            look1Values: [{ offset: 0, value: 255 }, { offset: 1, value: 0 }, { offset: 2, value: 0 }],
            look2Values: [{ offset: 0, value: 0 }, { offset: 1, value: 255 }, { offset: 2, value: 0 }]
          },
          {
            fixtureId: 'fixture-2',
            fixtureName: 'LED Par 2',
            differenceType: DifferenceType.VALUES_CHANGED,
            look1Values: [{ offset: 0, value: 100 }, { offset: 1, value: 100 }, { offset: 2, value: 100 }],
            look2Values: [{ offset: 0, value: 200 }, { offset: 1, value: 200 }, { offset: 2, value: 200 }]
          }
        ],
        identicalFixtureCount: 1,
        differentFixtureCount: 2
      };

      mockGraphQLClient.compareLooks.mockResolvedValue(mockComparison);

      const result = await relationshipTools.compareLooks({
        lookId1: 'look-1',
        lookId2: 'look-2'
      });

      expect(result.differences.valuesChanged.count).toBe(2);
      expect(result.differences.onlyInLook1.count).toBe(0);
      expect(result.differences.onlyInLook2.count).toBe(0);
      expect(result.summary.areIdentical).toBe(false);
      expect(result.message).toContain('2 value changes');
    });

    it('should identify fixtures only in one look', async () => {
      const mockComparison: LookComparison = {
        look1: {
          id: 'look-1',
          name: 'Look 1',
          fixtureCount: 4
        },
        look2: {
          id: 'look-2',
          name: 'Look 2',
          fixtureCount: 3
        },
        differences: [
          {
            fixtureId: 'fixture-1',
            fixtureName: 'LED Par 1',
            differenceType: DifferenceType.ONLY_IN_LOOK1,
            look1Values: [{ offset: 0, value: 255 }, { offset: 1, value: 0 }, { offset: 2, value: 0 }]
          },
          {
            fixtureId: 'fixture-2',
            fixtureName: 'LED Par 2',
            differenceType: DifferenceType.ONLY_IN_LOOK2,
            look2Values: [{ offset: 0, value: 0 }, { offset: 1, value: 255 }, { offset: 2, value: 0 }]
          }
        ],
        identicalFixtureCount: 2,
        differentFixtureCount: 2
      };

      mockGraphQLClient.compareLooks.mockResolvedValue(mockComparison);

      const result = await relationshipTools.compareLooks({
        lookId1: 'look-1',
        lookId2: 'look-2'
      });

      expect(result.differences.onlyInLook1.count).toBe(1);
      expect(result.differences.onlyInLook2.count).toBe(1);
      expect(result.differences.valuesChanged.count).toBe(0);
      expect(result.message).toContain('1 fixtures only in look 1');
      expect(result.message).toContain('1 fixtures only in look 2');
    });

    it('should calculate similarity percentage correctly', async () => {
      const mockComparison: LookComparison = {
        look1: {
          id: 'look-1',
          name: 'Look 1',
          fixtureCount: 10
        },
        look2: {
          id: 'look-2',
          name: 'Look 2',
          fixtureCount: 10
        },
        differences: [
          {
            fixtureId: 'fixture-1',
            fixtureName: 'LED Par 1',
            differenceType: DifferenceType.VALUES_CHANGED,
            look1Values: [{ offset: 0, value: 255 }, { offset: 1, value: 0 }, { offset: 2, value: 0 }],
            look2Values: [{ offset: 0, value: 0 }, { offset: 1, value: 255 }, { offset: 2, value: 0 }]
          }
        ],
        identicalFixtureCount: 9,
        differentFixtureCount: 1
      };

      mockGraphQLClient.compareLooks.mockResolvedValue(mockComparison);

      const result = await relationshipTools.compareLooks({
        lookId1: 'look-1',
        lookId2: 'look-2'
      });

      expect(result.summary.similarityPercentage).toBe(90);
    });

    it('should handle GraphQL errors', async () => {
      mockGraphQLClient.compareLooks.mockRejectedValue(new Error('GraphQL error'));

      await expect(
        relationshipTools.compareLooks({ lookId1: 'look-1', lookId2: 'look-2' })
      ).rejects.toThrow('Failed to compare looks: Error: GraphQL error');
    });
  });
});

