import { z } from 'zod';
import { LacyLightsGraphQLClient } from '../services/graphql-client-simple';

const GetFixtureUsageSchema = z.object({
  fixtureId: z.string().describe('Fixture ID to get usage for')
});

const GetSceneUsageSchema = z.object({
  sceneId: z.string().describe('Scene ID to get usage for')
});

const CompareScenesSchema = z.object({
  sceneId1: z.string().describe('First scene ID'),
  sceneId2: z.string().describe('Second scene ID')
});

export class RelationshipTools {
  constructor(private graphqlClient: LacyLightsGraphQLClient) {}

  /**
   * Get fixture usage information - shows which scenes and cues use this fixture
   */
  async getFixtureUsage(args: z.infer<typeof GetFixtureUsageSchema>) {
    const { fixtureId } = GetFixtureUsageSchema.parse(args);

    try {
      const usage = await this.graphqlClient.getFixtureUsage(fixtureId);

      return {
        fixture: {
          id: usage.fixtureId,
          name: usage.fixtureName
        },
        scenes: {
          count: usage.scenes.length,
          list: usage.scenes.map(scene => ({
            id: scene.id,
            name: scene.name,
            description: scene.description,
            fixtureCount: scene.fixtureCount,
            createdAt: scene.createdAt,
            updatedAt: scene.updatedAt
          }))
        },
        cues: {
          count: usage.cues.length,
          list: usage.cues.map(cue => ({
            cueId: cue.cueId,
            cueNumber: cue.cueNumber,
            cueName: cue.cueName,
            cueListId: cue.cueListId,
            cueListName: cue.cueListName
          }))
        },
        summary: {
          totalScenes: usage.scenes.length,
          totalCues: usage.cues.length,
          isUsed: usage.scenes.length > 0 || usage.cues.length > 0
        },
        message: usage.scenes.length > 0 || usage.cues.length > 0
          ? `Fixture "${usage.fixtureName}" is used in ${usage.scenes.length} scene(s) and ${usage.cues.length} cue(s)`
          : `Fixture "${usage.fixtureName}" is not currently used in any scenes or cues`
      };
    } catch (error) {
      throw new Error(`Failed to get fixture usage: ${error}`);
    }
  }

  /**
   * Get scene usage information - shows which cues use this scene
   */
  async getSceneUsage(args: z.infer<typeof GetSceneUsageSchema>) {
    const { sceneId } = GetSceneUsageSchema.parse(args);

    try {
      const usage = await this.graphqlClient.getSceneUsage(sceneId);

      return {
        scene: {
          id: usage.sceneId,
          name: usage.sceneName
        },
        cues: {
          count: usage.cues.length,
          list: usage.cues.map(cue => ({
            cueId: cue.cueId,
            cueNumber: cue.cueNumber,
            cueName: cue.cueName,
            cueListId: cue.cueListId,
            cueListName: cue.cueListName
          }))
        },
        summary: {
          totalCues: usage.cues.length,
          isUsed: usage.cues.length > 0,
          uniqueCueLists: [...new Set(usage.cues.map(c => c.cueListId))].length
        },
        message: usage.cues.length > 0
          ? `Scene "${usage.sceneName}" is used in ${usage.cues.length} cue(s) across ${[...new Set(usage.cues.map(c => c.cueListId))].length} cue list(s)`
          : `Scene "${usage.sceneName}" is not currently used in any cues`
      };
    } catch (error) {
      throw new Error(`Failed to get scene usage: ${error}`);
    }
  }

  /**
   * Compare two scenes to identify differences
   */
  async compareScenes(args: z.infer<typeof CompareScenesSchema>) {
    const { sceneId1, sceneId2 } = CompareScenesSchema.parse(args);

    try {
      const comparison = await this.graphqlClient.compareScenes(sceneId1, sceneId2);

      // Categorize differences
      const valuesChanged = comparison.differences.filter(d => d.differenceType === 'VALUES_CHANGED');
      const onlyInScene1 = comparison.differences.filter(d => d.differenceType === 'ONLY_IN_SCENE1');
      const onlyInScene2 = comparison.differences.filter(d => d.differenceType === 'ONLY_IN_SCENE2');

      return {
        scene1: {
          id: comparison.scene1.id,
          name: comparison.scene1.name,
          description: comparison.scene1.description,
          fixtureCount: comparison.scene1.fixtureCount
        },
        scene2: {
          id: comparison.scene2.id,
          name: comparison.scene2.name,
          description: comparison.scene2.description,
          fixtureCount: comparison.scene2.fixtureCount
        },
        comparison: {
          identicalFixtures: comparison.identicalFixtureCount,
          differentFixtures: comparison.differentFixtureCount,
          totalDifferences: comparison.differences.length
        },
        differences: {
          valuesChanged: {
            count: valuesChanged.length,
            fixtures: valuesChanged.map(d => ({
              fixtureId: d.fixtureId,
              fixtureName: d.fixtureName,
              scene1Values: d.scene1Values,
              scene2Values: d.scene2Values
            }))
          },
          onlyInScene1: {
            count: onlyInScene1.length,
            fixtures: onlyInScene1.map(d => ({
              fixtureId: d.fixtureId,
              fixtureName: d.fixtureName,
              values: d.scene1Values
            }))
          },
          onlyInScene2: {
            count: onlyInScene2.length,
            fixtures: onlyInScene2.map(d => ({
              fixtureId: d.fixtureId,
              fixtureName: d.fixtureName,
              values: d.scene2Values
            }))
          }
        },
        summary: {
          areIdentical: comparison.differences.length === 0,
          similarityPercentage: comparison.scene1.fixtureCount && comparison.scene2.fixtureCount
            ? Math.round((comparison.identicalFixtureCount / Math.max(comparison.scene1.fixtureCount, comparison.scene2.fixtureCount)) * 100)
            : 0
        },
        message: comparison.differences.length === 0
          ? `Scenes "${comparison.scene1.name}" and "${comparison.scene2.name}" are identical`
          : `Found ${comparison.differences.length} difference(s) between scenes: ${valuesChanged.length} value changes, ${onlyInScene1.length} fixtures only in scene 1, ${onlyInScene2.length} fixtures only in scene 2`
      };
    } catch (error) {
      throw new Error(`Failed to compare scenes: ${error}`);
    }
  }
}
