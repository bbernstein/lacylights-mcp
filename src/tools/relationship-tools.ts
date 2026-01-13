import { z } from 'zod';
import { LacyLightsGraphQLClient } from '../services/graphql-client-simple';

const GetFixtureUsageSchema = z.object({
  fixtureId: z.string().describe('Fixture ID to get usage for')
});

const GetLookUsageSchema = z.object({
  lookId: z.string().describe('Look ID to get usage for')
});

const CompareLooksSchema = z.object({
  lookId1: z.string().describe('First look ID'),
  lookId2: z.string().describe('Second look ID')
});

export class RelationshipTools {
  constructor(private graphqlClient: LacyLightsGraphQLClient) {}

  /**
   * Get fixture usage information - shows which looks and cues use this fixture
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
        looks: {
          count: usage.looks.length,
          list: usage.looks.map(look => ({
            id: look.id,
            name: look.name,
            description: look.description,
            fixtureCount: look.fixtureCount,
            createdAt: look.createdAt,
            updatedAt: look.updatedAt
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
          totalLooks: usage.looks.length,
          totalCues: usage.cues.length,
          isUsed: usage.looks.length > 0 || usage.cues.length > 0
        },
        message: usage.looks.length > 0 || usage.cues.length > 0
          ? `Fixture "${usage.fixtureName}" is used in ${usage.looks.length} look(s) and ${usage.cues.length} cue(s)`
          : `Fixture "${usage.fixtureName}" is not currently used in any looks or cues`
      };
    } catch (error) {
      throw new Error(`Failed to get fixture usage: ${error}`);
    }
  }

  /**
   * Get look usage information - shows which cues use this look
   */
  async getLookUsage(args: z.infer<typeof GetLookUsageSchema>) {
    const { lookId } = GetLookUsageSchema.parse(args);

    try {
      const usage = await this.graphqlClient.getLookUsage(lookId);

      return {
        look: {
          id: usage.lookId,
          name: usage.lookName
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
          ? `Look "${usage.lookName}" is used in ${usage.cues.length} cue(s) across ${[...new Set(usage.cues.map(c => c.cueListId))].length} cue list(s)`
          : `Look "${usage.lookName}" is not currently used in any cues`
      };
    } catch (error) {
      throw new Error(`Failed to get look usage: ${error}`);
    }
  }

  /**
   * Compare two looks to identify differences
   */
  async compareLooks(args: z.infer<typeof CompareLooksSchema>) {
    const { lookId1, lookId2 } = CompareLooksSchema.parse(args);

    try {
      const comparison = await this.graphqlClient.compareLooks(lookId1, lookId2);

      // Categorize differences
      const valuesChanged = comparison.differences.filter(d => d.differenceType === 'VALUES_CHANGED');
      const onlyInLook1 = comparison.differences.filter(d => d.differenceType === 'ONLY_IN_LOOK1');
      const onlyInLook2 = comparison.differences.filter(d => d.differenceType === 'ONLY_IN_LOOK2');

      return {
        look1: {
          id: comparison.look1.id,
          name: comparison.look1.name,
          description: comparison.look1.description,
          fixtureCount: comparison.look1.fixtureCount
        },
        look2: {
          id: comparison.look2.id,
          name: comparison.look2.name,
          description: comparison.look2.description,
          fixtureCount: comparison.look2.fixtureCount
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
              look1Values: d.look1Values,
              look2Values: d.look2Values
            }))
          },
          onlyInLook1: {
            count: onlyInLook1.length,
            fixtures: onlyInLook1.map(d => ({
              fixtureId: d.fixtureId,
              fixtureName: d.fixtureName,
              values: d.look1Values
            }))
          },
          onlyInLook2: {
            count: onlyInLook2.length,
            fixtures: onlyInLook2.map(d => ({
              fixtureId: d.fixtureId,
              fixtureName: d.fixtureName,
              values: d.look2Values
            }))
          }
        },
        summary: {
          areIdentical: comparison.differences.length === 0,
          similarityPercentage: comparison.look1.fixtureCount && comparison.look2.fixtureCount
            ? Math.round((comparison.identicalFixtureCount / Math.max(comparison.look1.fixtureCount, comparison.look2.fixtureCount)) * 100)
            : 0
        },
        message: comparison.differences.length === 0
          ? `Looks "${comparison.look1.name}" and "${comparison.look2.name}" are identical`
          : `Found ${comparison.differences.length} difference(s) between looks: ${valuesChanged.length} value changes, ${onlyInLook1.length} fixtures only in look 1, ${onlyInLook2.length} fixtures only in look 2`
      };
    } catch (error) {
      throw new Error(`Failed to compare looks: ${error}`);
    }
  }
}
