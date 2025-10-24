import { SearchTools } from '../../src/tools/search-tools';
import { LacyLightsGraphQLClient } from '../../src/services/graphql-client-simple';
import { FixtureType } from '../../src/types/lighting';

// Mock the GraphQL client
jest.mock('../../src/services/graphql-client-simple');
const MockGraphQLClient = LacyLightsGraphQLClient as jest.MockedClass<typeof LacyLightsGraphQLClient>;

describe('SearchTools', () => {
  let searchTools: SearchTools;
  let mockGraphQLClient: jest.Mocked<LacyLightsGraphQLClient>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockGraphQLClient = {
      searchFixtures: jest.fn(),
      searchScenes: jest.fn(),
      searchCues: jest.fn(),
    } as any;

    MockGraphQLClient.mockImplementation(() => mockGraphQLClient);
    searchTools = new SearchTools(mockGraphQLClient);
  });

  describe('searchFixtures', () => {
    it('should search fixtures by query', async () => {
      const mockResponse = {
        fixtures: [
          {
            id: 'fixture-1',
            name: 'LED Par 1',
            description: 'Front stage light',
            definitionId: 'def-1',
            manufacturer: 'Chauvet',
            model: 'SlimPAR Pro H USB',
            type: FixtureType.LED_PAR,
            modeName: '3 Channel RGB',
            channelCount: 3,
            universe: 1,
            startChannel: 1,
            tags: ['front', 'wash', 'rgb'],
            channels: [
              { id: 'ch-1', offset: 0, name: 'Red', type: 'RED', minValue: 0, maxValue: 255, defaultValue: 0 },
              { id: 'ch-2', offset: 1, name: 'Green', type: 'GREEN', minValue: 0, maxValue: 255, defaultValue: 0 },
              { id: 'ch-3', offset: 2, name: 'Blue', type: 'BLUE', minValue: 0, maxValue: 255, defaultValue: 0 }
            ]
          },
          {
            id: 'fixture-2',
            name: 'LED Par 2',
            description: 'Back stage light',
            definitionId: 'def-1',
            manufacturer: 'Chauvet',
            model: 'SlimPAR Pro H USB',
            type: FixtureType.LED_PAR,
            modeName: '3 Channel RGB',
            channelCount: 3,
            universe: 1,
            startChannel: 4,
            tags: ['back', 'wash', 'rgb'],
            channels: [
              { id: 'ch-4', offset: 0, name: 'Red', type: 'RED', minValue: 0, maxValue: 255, defaultValue: 0 },
              { id: 'ch-5', offset: 1, name: 'Green', type: 'GREEN', minValue: 0, maxValue: 255, defaultValue: 0 },
              { id: 'ch-6', offset: 2, name: 'Blue', type: 'BLUE', minValue: 0, maxValue: 255, defaultValue: 0 }
            ]
          }
        ],
        pagination: {
          total: 2,
          page: 1,
          perPage: 20,
          totalPages: 1,
          hasMore: false
        }
      };

      mockGraphQLClient.searchFixtures.mockResolvedValue(mockResponse as any);

      const result = await searchTools.searchFixtures({
        projectId: 'project-1',
        query: 'LED'
      });

      expect(mockGraphQLClient.searchFixtures).toHaveBeenCalledWith(
        'project-1',
        'LED',
        undefined,
        1,
        20
      );
      expect(result.results.length).toBe(2);
      expect(result.results[0].name).toBe('LED Par 1');
      expect(result.results[0].dmx.channelRange).toBe('1-3');
      expect(result.pagination.totalResults).toBe(2);
      expect(result.summary.totalMatches).toBe(2);
      expect(result.message).toContain('Found 2 fixture(s)');
    });

    it('should search fixtures with filters', async () => {
      const mockResponse = {
        fixtures: [
          {
            id: 'fixture-1',
            name: 'LED Par 1',
            description: 'Front stage light',
            definitionId: 'def-1',
            manufacturer: 'Chauvet',
            model: 'SlimPAR Pro H USB',
            type: FixtureType.LED_PAR,
            modeName: '3 Channel RGB',
            channelCount: 3,
            universe: 1,
            startChannel: 1,
            tags: ['front', 'wash', 'rgb'],
            channels: []
          }
        ],
        pagination: {
          total: 1,
          page: 1,
          perPage: 20,
          totalPages: 1,
          hasMore: false
        }
      };

      mockGraphQLClient.searchFixtures.mockResolvedValue(mockResponse as any);

      const result = await searchTools.searchFixtures({
        projectId: 'project-1',
        query: 'LED',
        filter: {
          type: FixtureType.LED_PAR,
          universe: 1,
          manufacturer: 'Chauvet'
        }
      });

      expect(mockGraphQLClient.searchFixtures).toHaveBeenCalledWith(
        'project-1',
        'LED',
        {
          type: FixtureType.LED_PAR,
          universe: 1,
          manufacturer: 'Chauvet'
        },
        1,
        20
      );
      expect(result.results.length).toBe(1);
      expect(result.summary.filters).toContain('type');
      expect(result.summary.filters).toContain('universe');
      expect(result.summary.filters).toContain('manufacturer');
    });

    it('should handle pagination', async () => {
      const mockResponse = {
        fixtures: [
          {
            id: 'fixture-3',
            name: 'LED Par 3',
            description: 'Test',
            definitionId: 'def-1',
            manufacturer: 'Test',
            model: 'Test',
            type: FixtureType.LED_PAR,
            modeName: 'Test',
            channelCount: 3,
            universe: 1,
            startChannel: 7,
            tags: [],
            channels: []
          }
        ],
        pagination: {
          total: 15,
          page: 2,
          perPage: 10,
          totalPages: 2,
          hasMore: false
        }
      };

      mockGraphQLClient.searchFixtures.mockResolvedValue(mockResponse as any);

      const result = await searchTools.searchFixtures({
        projectId: 'project-1',
        query: 'LED',
        page: 2,
        perPage: 10
      });

      expect(mockGraphQLClient.searchFixtures).toHaveBeenCalledWith(
        'project-1',
        'LED',
        undefined,
        2,
        10
      );
      expect(result.pagination.currentPage).toBe(2);
      expect(result.pagination.totalPages).toBe(2);
      expect(result.pagination.totalResults).toBe(15);
    });

    it('should handle GraphQL errors', async () => {
      mockGraphQLClient.searchFixtures.mockRejectedValue(new Error('GraphQL error'));

      await expect(
        searchTools.searchFixtures({
          projectId: 'project-1',
          query: 'LED'
        })
      ).rejects.toThrow('Failed to search fixtures: Error: GraphQL error');
    });
  });

  describe('searchScenes', () => {
    it('should search scenes by query', async () => {
      const mockResponse = {
        scenes: [
          {
            id: 'scene-1',
            name: 'Warm Wash',
            description: 'Warm amber wash for intimate moments',
            fixtureCount: 5,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          },
          {
            id: 'scene-2',
            name: 'Cool Wash',
            description: 'Cool blue wash for nighttime',
            fixtureCount: 5,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          }
        ],
        pagination: {
          total: 2,
          page: 1,
          perPage: 20,
          totalPages: 1,
          hasMore: false
        }
      };

      mockGraphQLClient.searchScenes.mockResolvedValue(mockResponse as any);

      const result = await searchTools.searchScenes({
        projectId: 'project-1',
        query: 'wash'
      });

      expect(mockGraphQLClient.searchScenes).toHaveBeenCalledWith(
        'project-1',
        'wash',
        undefined,
        1,
        20
      );
      expect(result.results.length).toBe(2);
      expect(result.results[0].name).toBe('Warm Wash');
      expect(result.results[0].fixtureCount).toBe(5);
      expect(result.pagination.totalResults).toBe(2);
      expect(result.message).toContain('Found 2 scene(s)');
    });

    it('should search scenes with filters', async () => {
      const mockResponse = {
        scenes: [
          {
            id: 'scene-1',
            name: 'Warm Wash',
            description: 'Warm amber wash',
            fixtureCount: 5,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          }
        ],
        pagination: {
          total: 1,
          page: 1,
          perPage: 20,
          totalPages: 1,
          hasMore: false
        }
      };

      mockGraphQLClient.searchScenes.mockResolvedValue(mockResponse as any);

      const result = await searchTools.searchScenes({
        projectId: 'project-1',
        query: 'wash',
        filter: {
          nameContains: 'Warm',
          usesFixture: 'fixture-1'
        }
      });

      expect(mockGraphQLClient.searchScenes).toHaveBeenCalledWith(
        'project-1',
        'wash',
        {
          nameContains: 'Warm',
          usesFixture: 'fixture-1'
        },
        1,
        20
      );
      expect(result.results.length).toBe(1);
      expect(result.summary.filters).toContain('nameContains');
      expect(result.summary.filters).toContain('usesFixture');
    });

    it('should handle pagination', async () => {
      const mockResponse = {
        scenes: [
          {
            id: 'scene-3',
            name: 'Test Scene',
            description: 'Test',
            fixtureCount: 3,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          }
        ],
        pagination: {
          total: 25,
          page: 3,
          perPage: 10,
          totalPages: 3,
          hasMore: false
        }
      };

      mockGraphQLClient.searchScenes.mockResolvedValue(mockResponse as any);

      const result = await searchTools.searchScenes({
        projectId: 'project-1',
        query: 'scene',
        page: 3,
        perPage: 10
      });

      expect(mockGraphQLClient.searchScenes).toHaveBeenCalledWith(
        'project-1',
        'scene',
        undefined,
        3,
        10
      );
      expect(result.pagination.currentPage).toBe(3);
      expect(result.pagination.totalPages).toBe(3);
      expect(result.pagination.totalResults).toBe(25);
    });

    it('should handle GraphQL errors', async () => {
      mockGraphQLClient.searchScenes.mockRejectedValue(new Error('GraphQL error'));

      await expect(
        searchTools.searchScenes({
          projectId: 'project-1',
          query: 'wash'
        })
      ).rejects.toThrow('Failed to search scenes: Error: GraphQL error');
    });
  });

  describe('searchCues', () => {
    it('should search cues by query', async () => {
      const mockResponse = {
        cues: [
          {
            id: 'cue-1',
            name: 'Opening Warmup',
            cueNumber: 1.0,
            notes: 'Slow fade to warm wash',
            fadeInTime: 5.0,
            fadeOutTime: 3.0,
            followTime: undefined,
            scene: {
              id: 'scene-1',
              name: 'Warm Wash',
              fixtureValues: []
            } as any,
            cueList: {
              id: 'cuelist-1',
              name: 'Main Cue List'
            }
          },
          {
            id: 'cue-2',
            name: 'Night Scene',
            cueNumber: 2.0,
            notes: 'Quick snap to blue moonlight',
            fadeInTime: 2.0,
            fadeOutTime: 2.0,
            followTime: undefined,
            scene: {
              id: 'scene-2',
              name: 'Cool Wash',
              fixtureValues: []
            } as any,
            cueList: {
              id: 'cuelist-1',
              name: 'Main Cue List'
            }
          }
        ],
        pagination: {
          total: 2,
          page: 1,
          perPage: 20,
          totalPages: 1,
          hasMore: false
        }
      };

      mockGraphQLClient.searchCues.mockResolvedValue(mockResponse as any);

      const result = await searchTools.searchCues({
        cueListId: 'cuelist-1',
        query: 'fade'
      });

      expect(mockGraphQLClient.searchCues).toHaveBeenCalledWith(
        'cuelist-1',
        'fade',
        1,
        20
      );
      expect(result.results.length).toBe(2);
      expect(result.results[0].name).toBe('Opening Warmup');
      expect(result.results[0].cueNumber).toBe(1.0);
      expect(result.results[0].timing.fadeInTime).toBe(5.0);
      expect(result.pagination.totalResults).toBe(2);
      expect(result.message).toContain('Found 2 cue(s)');
    });

    it('should handle pagination', async () => {
      const mockResponse = {
        cues: [
          {
            id: 'cue-5',
            name: 'Test Cue',
            cueNumber: 5.0,
            notes: 'Test',
            fadeInTime: 3.0,
            fadeOutTime: 3.0,
            followTime: undefined,
            scene: {
              id: 'scene-1',
              name: 'Test Scene',
              fixtureValues: []
            } as any,
            cueList: {
              id: 'cuelist-1',
              name: 'Main Cue List'
            }
          }
        ],
        pagination: {
          total: 30,
          page: 2,
          perPage: 15,
          totalPages: 2,
          hasMore: false
        }
      };

      mockGraphQLClient.searchCues.mockResolvedValue(mockResponse as any);

      const result = await searchTools.searchCues({
        cueListId: 'cuelist-1',
        query: 'cue',
        page: 2,
        perPage: 15
      });

      expect(mockGraphQLClient.searchCues).toHaveBeenCalledWith(
        'cuelist-1',
        'cue',
        2,
        15
      );
      expect(result.pagination.currentPage).toBe(2);
      expect(result.pagination.totalPages).toBe(2);
      expect(result.pagination.totalResults).toBe(30);
    });

    it('should handle GraphQL errors', async () => {
      mockGraphQLClient.searchCues.mockRejectedValue(new Error('GraphQL error'));

      await expect(
        searchTools.searchCues({
          cueListId: 'cuelist-1',
          query: 'fade'
        })
      ).rejects.toThrow('Failed to search cues: Error: GraphQL error');
    });
  });
});
