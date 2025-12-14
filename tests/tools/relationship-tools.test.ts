import { RelationshipTools } from '../../src/tools/relationship-tools';
import { LacyLightsGraphQLClient } from '../../src/services/graphql-client-simple';
import { FixtureUsage, SceneUsage, SceneComparison, DifferenceType } from '../../src/types/lighting';

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
      getSceneUsage: jest.fn(),
      compareScenes: jest.fn(),
    } as any;

    MockGraphQLClient.mockImplementation(() => mockGraphQLClient);
    relationshipTools = new RelationshipTools(mockGraphQLClient);
  });

  describe('getFixtureUsage', () => {
    it('should get fixture usage with scenes and cues', async () => {
      const mockUsage: FixtureUsage = {
        fixtureId: 'fixture-1',
        fixtureName: 'LED Par 1',
        scenes: [
          {
            id: 'scene-1',
            name: 'Scene 1',
            description: 'Test scene',
            fixtureCount: 5,
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01'
          },
          {
            id: 'scene-2',
            name: 'Scene 2',
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
      expect(result.scenes.count).toBe(2);
      expect(result.cues.count).toBe(2);
      expect(result.summary.totalScenes).toBe(2);
      expect(result.summary.totalCues).toBe(2);
      expect(result.summary.isUsed).toBe(true);
      expect(result.message).toContain('is used in 2 scene(s) and 2 cue(s)');
    });

    it('should handle unused fixture', async () => {
      const mockUsage: FixtureUsage = {
        fixtureId: 'fixture-1',
        fixtureName: 'Unused Fixture',
        scenes: [],
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

  describe('getSceneUsage', () => {
    it('should get scene usage with cues', async () => {
      const mockUsage: SceneUsage = {
        sceneId: 'scene-1',
        sceneName: 'Test Scene',
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

      mockGraphQLClient.getSceneUsage.mockResolvedValue(mockUsage);

      const result = await relationshipTools.getSceneUsage({ sceneId: 'scene-1' });

      expect(mockGraphQLClient.getSceneUsage).toHaveBeenCalledWith('scene-1');
      expect(result.scene.id).toBe('scene-1');
      expect(result.scene.name).toBe('Test Scene');
      expect(result.cues.count).toBe(3);
      expect(result.summary.totalCues).toBe(3);
      expect(result.summary.isUsed).toBe(true);
      expect(result.summary.uniqueCueLists).toBe(2);
      expect(result.message).toContain('is used in 3 cue(s) across 2 cue list(s)');
    });

    it('should handle unused scene', async () => {
      const mockUsage: SceneUsage = {
        sceneId: 'scene-1',
        sceneName: 'Unused Scene',
        cues: []
      };

      mockGraphQLClient.getSceneUsage.mockResolvedValue(mockUsage);

      const result = await relationshipTools.getSceneUsage({ sceneId: 'scene-1' });

      expect(result.summary.isUsed).toBe(false);
      expect(result.summary.uniqueCueLists).toBe(0);
      expect(result.message).toContain('is not currently used');
    });

    it('should handle GraphQL errors', async () => {
      mockGraphQLClient.getSceneUsage.mockRejectedValue(new Error('GraphQL error'));

      await expect(
        relationshipTools.getSceneUsage({ sceneId: 'scene-1' })
      ).rejects.toThrow('Failed to get scene usage: Error: GraphQL error');
    });
  });

  describe('compareScenes', () => {
    it('should compare identical scenes', async () => {
      const mockComparison: SceneComparison = {
        scene1: {
          id: 'scene-1',
          name: 'Scene 1',
          description: 'Test scene 1',
          fixtureCount: 5
        },
        scene2: {
          id: 'scene-2',
          name: 'Scene 2',
          description: 'Test scene 2',
          fixtureCount: 5
        },
        differences: [],
        identicalFixtureCount: 5,
        differentFixtureCount: 0
      };

      mockGraphQLClient.compareScenes.mockResolvedValue(mockComparison);

      const result = await relationshipTools.compareScenes({
        sceneId1: 'scene-1',
        sceneId2: 'scene-2'
      });

      expect(mockGraphQLClient.compareScenes).toHaveBeenCalledWith('scene-1', 'scene-2');
      expect(result.comparison.identicalFixtures).toBe(5);
      expect(result.comparison.differentFixtures).toBe(0);
      expect(result.comparison.totalDifferences).toBe(0);
      expect(result.summary.areIdentical).toBe(true);
      expect(result.summary.similarityPercentage).toBe(100);
      expect(result.message).toContain('are identical');
    });

    it('should identify value changes between scenes', async () => {
      const mockComparison: SceneComparison = {
        scene1: {
          id: 'scene-1',
          name: 'Scene 1',
          fixtureCount: 3
        },
        scene2: {
          id: 'scene-2',
          name: 'Scene 2',
          fixtureCount: 3
        },
        differences: [
          {
            fixtureId: 'fixture-1',
            fixtureName: 'LED Par 1',
            differenceType: DifferenceType.VALUES_CHANGED,
            scene1Values: [{ offset: 0, value: 255 }, { offset: 1, value: 0 }, { offset: 2, value: 0 }],
            scene2Values: [{ offset: 0, value: 0 }, { offset: 1, value: 255 }, { offset: 2, value: 0 }]
          },
          {
            fixtureId: 'fixture-2',
            fixtureName: 'LED Par 2',
            differenceType: DifferenceType.VALUES_CHANGED,
            scene1Values: [{ offset: 0, value: 100 }, { offset: 1, value: 100 }, { offset: 2, value: 100 }],
            scene2Values: [{ offset: 0, value: 200 }, { offset: 1, value: 200 }, { offset: 2, value: 200 }]
          }
        ],
        identicalFixtureCount: 1,
        differentFixtureCount: 2
      };

      mockGraphQLClient.compareScenes.mockResolvedValue(mockComparison);

      const result = await relationshipTools.compareScenes({
        sceneId1: 'scene-1',
        sceneId2: 'scene-2'
      });

      expect(result.differences.valuesChanged.count).toBe(2);
      expect(result.differences.onlyInScene1.count).toBe(0);
      expect(result.differences.onlyInScene2.count).toBe(0);
      expect(result.summary.areIdentical).toBe(false);
      expect(result.message).toContain('2 value changes');
    });

    it('should identify fixtures only in one scene', async () => {
      const mockComparison: SceneComparison = {
        scene1: {
          id: 'scene-1',
          name: 'Scene 1',
          fixtureCount: 4
        },
        scene2: {
          id: 'scene-2',
          name: 'Scene 2',
          fixtureCount: 3
        },
        differences: [
          {
            fixtureId: 'fixture-1',
            fixtureName: 'LED Par 1',
            differenceType: DifferenceType.ONLY_IN_SCENE1,
            scene1Values: [{ offset: 0, value: 255 }, { offset: 1, value: 0 }, { offset: 2, value: 0 }]
          },
          {
            fixtureId: 'fixture-2',
            fixtureName: 'LED Par 2',
            differenceType: DifferenceType.ONLY_IN_SCENE2,
            scene2Values: [{ offset: 0, value: 0 }, { offset: 1, value: 255 }, { offset: 2, value: 0 }]
          }
        ],
        identicalFixtureCount: 2,
        differentFixtureCount: 2
      };

      mockGraphQLClient.compareScenes.mockResolvedValue(mockComparison);

      const result = await relationshipTools.compareScenes({
        sceneId1: 'scene-1',
        sceneId2: 'scene-2'
      });

      expect(result.differences.onlyInScene1.count).toBe(1);
      expect(result.differences.onlyInScene2.count).toBe(1);
      expect(result.differences.valuesChanged.count).toBe(0);
      expect(result.message).toContain('1 fixtures only in scene 1');
      expect(result.message).toContain('1 fixtures only in scene 2');
    });

    it('should calculate similarity percentage correctly', async () => {
      const mockComparison: SceneComparison = {
        scene1: {
          id: 'scene-1',
          name: 'Scene 1',
          fixtureCount: 10
        },
        scene2: {
          id: 'scene-2',
          name: 'Scene 2',
          fixtureCount: 10
        },
        differences: [
          {
            fixtureId: 'fixture-1',
            fixtureName: 'LED Par 1',
            differenceType: DifferenceType.VALUES_CHANGED,
            scene1Values: [{ offset: 0, value: 255 }, { offset: 1, value: 0 }, { offset: 2, value: 0 }],
            scene2Values: [{ offset: 0, value: 0 }, { offset: 1, value: 255 }, { offset: 2, value: 0 }]
          }
        ],
        identicalFixtureCount: 9,
        differentFixtureCount: 1
      };

      mockGraphQLClient.compareScenes.mockResolvedValue(mockComparison);

      const result = await relationshipTools.compareScenes({
        sceneId1: 'scene-1',
        sceneId2: 'scene-2'
      });

      expect(result.summary.similarityPercentage).toBe(90);
    });

    it('should handle GraphQL errors', async () => {
      mockGraphQLClient.compareScenes.mockRejectedValue(new Error('GraphQL error'));

      await expect(
        relationshipTools.compareScenes({ sceneId1: 'scene-1', sceneId2: 'scene-2' })
      ).rejects.toThrow('Failed to compare scenes: Error: GraphQL error');
    });
  });
});

