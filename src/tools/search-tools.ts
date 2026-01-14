import { z } from 'zod';
import { LacyLightsGraphQLClient } from '../services/graphql-client-simple';
import { FixtureType } from '../types/lighting';

const SearchFixturesSchema = z.object({
  projectId: z.string().describe('Project ID to search within'),
  query: z.string().describe('Search query for fixture name, manufacturer, or model'),
  filter: z.object({
    type: z.nativeEnum(FixtureType).optional().describe('Filter by fixture type'),
    universe: z.number().int().min(1).optional().describe('Filter by DMX universe'),
    tags: z.array(z.string()).optional().describe('Filter by tags (must have all specified tags)'),
    manufacturer: z.string().optional().describe('Filter by manufacturer name'),
    model: z.string().optional().describe('Filter by model name')
  }).optional().describe('Additional filters to apply'),
  page: z.number().int().min(1).default(1).describe('Page number for pagination'),
  perPage: z.number().int().min(1).max(100).default(20).describe('Results per page (max 100)')
});

const SearchLooksSchema = z.object({
  projectId: z.string().describe('Project ID to search within'),
  query: z.string().describe('Search query for look name or description'),
  filter: z.object({
    nameContains: z.string().optional().describe('Filter looks where name contains this text'),
    usesFixture: z.string().optional().describe('Filter looks that use this fixture ID')
  }).optional().describe('Additional filters to apply'),
  page: z.number().int().min(1).default(1).describe('Page number for pagination'),
  perPage: z.number().int().min(1).max(100).default(20).describe('Results per page (max 100)')
});

const SearchCuesSchema = z.object({
  cueListId: z.string().describe('Cue list ID to search within'),
  query: z.string().describe('Search query for cue name or notes'),
  page: z.number().int().min(1).default(1).describe('Page number for pagination'),
  perPage: z.number().int().min(1).max(100).default(20).describe('Results per page (max 100)')
});

export class SearchTools {
  constructor(private graphqlClient: LacyLightsGraphQLClient) {}

  /**
   * Search for fixtures by name, manufacturer, or model with optional filters
   */
  async searchFixtures(args: z.input<typeof SearchFixturesSchema>) {
    const { projectId, query, filter, page, perPage } = SearchFixturesSchema.parse(args);

    try {
      const result = await this.graphqlClient.searchFixtures(
        projectId,
        query,
        filter,
        page,
        perPage
      );

      const { fixtures, pagination } = result;

      // Format fixtures for better readability
      const formattedFixtures = fixtures.map(fixture => ({
        id: fixture.id,
        name: fixture.name,
        description: fixture.description,
        manufacturer: fixture.manufacturer,
        model: fixture.model,
        type: fixture.type,
        mode: fixture.modeName,
        dmx: {
          universe: fixture.universe,
          startChannel: fixture.startChannel,
          channelCount: fixture.channelCount,
          channelRange: `${fixture.startChannel}-${fixture.startChannel + fixture.channelCount - 1}`
        },
        tags: fixture.tags,
        channels: fixture.channels.map(ch => ({
          offset: ch.offset,
          name: ch.name,
          type: ch.type
        }))
      }));

      return {
        results: formattedFixtures,
        pagination: {
          currentPage: pagination.page,
          totalPages: pagination.totalPages,
          totalResults: pagination.total,
          resultsPerPage: pagination.perPage,
          hasMore: pagination.hasMore
        },
        summary: {
          query,
          filters: filter ? Object.keys(filter).filter(k => filter[k as keyof typeof filter] !== undefined) : [],
          resultsCount: fixtures.length,
          totalMatches: pagination.total
        },
        message: `Found ${pagination.total} fixture(s) matching "${query}"${filter ? ' with filters applied' : ''}`
      };
    } catch (error) {
      throw new Error(`Failed to search fixtures: ${error}`);
    }
  }

  /**
   * Search for looks by name or description with optional filters
   */
  async searchLooks(args: z.input<typeof SearchLooksSchema>) {
    const { projectId, query, filter, page, perPage} = SearchLooksSchema.parse(args);

    try {
      const result = await this.graphqlClient.searchLooks(
        projectId,
        query,
        filter,
        page,
        perPage
      );

      const { looks, pagination } = result;

      // Format looks for better readability
      const formattedLooks = looks.map(look => ({
        id: look.id,
        name: look.name,
        description: look.description,
        fixtureCount: look.fixtureCount,
        created: look.createdAt,
        updated: look.updatedAt
      }));

      return {
        results: formattedLooks,
        pagination: {
          currentPage: pagination.page,
          totalPages: pagination.totalPages,
          totalResults: pagination.total,
          resultsPerPage: pagination.perPage,
          hasMore: pagination.hasMore
        },
        summary: {
          query,
          filters: filter ? Object.keys(filter).filter(k => filter[k as keyof typeof filter] !== undefined) : [],
          resultsCount: looks.length,
          totalMatches: pagination.total
        },
        message: `Found ${pagination.total} look(s) matching "${query}"${filter ? ' with filters applied' : ''}`
      };
    } catch (error) {
      throw new Error(`Failed to search looks: ${error}`);
    }
  }

  /**
   * Search for cues by name or notes within a cue list
   */
  async searchCues(args: z.input<typeof SearchCuesSchema>) {
    const { cueListId, query, page, perPage } = SearchCuesSchema.parse(args);

    try {
      const result = await this.graphqlClient.searchCues(
        cueListId,
        query,
        page,
        perPage
      );

      const { cues, pagination } = result;

      // Format cues for better readability
      const formattedCues = cues.map(cue => {
        const cueWithList = cue as any;
        return {
          id: cue.id,
          cueNumber: cue.cueNumber,
          name: cue.name,
          notes: cue.notes,
          look: {
            id: cue.look.id,
            name: cue.look.name
          },
          timing: {
            fadeInTime: cue.fadeInTime,
            fadeOutTime: cue.fadeOutTime,
            followTime: cue.followTime
          },
          cueList: {
            id: cueWithList.cueList.id,
            name: cueWithList.cueList.name
          }
        };
      });

      return {
        results: formattedCues,
        pagination: {
          currentPage: pagination.page,
          totalPages: pagination.totalPages,
          totalResults: pagination.total,
          resultsPerPage: pagination.perPage,
          hasMore: pagination.hasMore
        },
        summary: {
          query,
          cueListId,
          resultsCount: cues.length,
          totalMatches: pagination.total
        },
        message: `Found ${pagination.total} cue(s) matching "${query}" in cue list`
      };
    } catch (error) {
      throw new Error(`Failed to search cues: ${error}`);
    }
  }
}
