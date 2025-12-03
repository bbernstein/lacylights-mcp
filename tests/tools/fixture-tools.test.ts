import { FixtureTools } from '../../src/tools/fixture-tools';
import { LacyLightsGraphQLClient } from '../../src/services/graphql-client-simple';
import { FixtureType, ChannelType, FixtureDefinition, FixtureInstance } from '../../src/types/lighting';
import { PAGINATION_DEFAULTS } from '../../src/utils/pagination';

// Mock the GraphQL client
jest.mock('../../src/services/graphql-client-simple');
const MockGraphQLClient = LacyLightsGraphQLClient as jest.MockedClass<typeof LacyLightsGraphQLClient>;

describe('FixtureTools', () => {
  let fixtureTools: FixtureTools;
  let mockGraphQLClient: jest.Mocked<LacyLightsGraphQLClient>;

  const mockProject = {
    id: 'project-1',
    name: 'Test Project',
    fixtures: [
      {
        id: 'fixture-1',
        name: 'LED Par 1',
        type: FixtureType.LED_PAR,
        manufacturer: 'Test Manufacturer',
        model: 'Test Model',
        modeName: 'Standard',
        channelCount: 3,
        channels: [
          { id: 'ch1', offset: 0, name: 'Red', type: ChannelType.RED, minValue: 0, maxValue: 255, defaultValue: 0 },
          { id: 'ch2', offset: 1, name: 'Green', type: ChannelType.GREEN, minValue: 0, maxValue: 255, defaultValue: 0 },
          { id: 'ch3', offset: 2, name: 'Blue', type: ChannelType.BLUE, minValue: 0, maxValue: 255, defaultValue: 0 }
        ],
        universe: 1,
        startChannel: 1,
        tags: ['wash'],
        definitionId: 'def-1',
        description: 'Test fixture'
      }
    ],
    scenes: [],
    cueLists: []
  };

  const mockFixtureDefinitions: FixtureDefinition[] = [
    {
      id: 'def-1',
      manufacturer: 'Test Manufacturer',
      model: 'Test Model',
      type: FixtureType.LED_PAR,
      channels: [
        { id: 'ch1', name: 'Red', type: ChannelType.RED, offset: 0, minValue: 0, maxValue: 255, defaultValue: 0 },
        { id: 'ch2', name: 'Green', type: ChannelType.GREEN, offset: 1, minValue: 0, maxValue: 255, defaultValue: 0 },
        { id: 'ch3', name: 'Blue', type: ChannelType.BLUE, offset: 2, minValue: 0, maxValue: 255, defaultValue: 0 }
      ],
      modes: [
        { id: 'mode-1', name: 'Standard', channelCount: 3 }
      ],
      isBuiltIn: true
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockGraphQLClient = {
      getProjects: jest.fn(),
      getProject: jest.fn(),
      getFixtureDefinitions: jest.fn(),
      createFixtureDefinition: jest.fn(),
      createFixtureInstance: jest.fn(),
      updateFixtureInstance: jest.fn(),
    } as any;

    MockGraphQLClient.mockImplementation(() => mockGraphQLClient);
    fixtureTools = new FixtureTools(mockGraphQLClient);
  });

  describe('constructor', () => {
    it('should create FixtureTools instance', () => {
      expect(fixtureTools).toBeInstanceOf(FixtureTools);
    });
  });

  describe('listFixtures', () => {
    const mockPaginatedResponse = {
      fixtures: [
        {
          id: 'fixture-1',
          name: 'LED Par 1',
          description: 'Test fixture',
          manufacturer: 'Test Manufacturer',
          model: 'Test Model',
          type: FixtureType.LED_PAR,
          modeName: 'Standard',
          channelCount: 3,
          universe: 1,
          startChannel: 1,
          tags: ['wash'],
          definitionId: 'def-1',
          channels: [
            { id: 'ch1', offset: 0, name: 'Red', type: ChannelType.RED, minValue: 0, maxValue: 255, defaultValue: 0 },
            { id: 'ch2', offset: 1, name: 'Green', type: ChannelType.GREEN, minValue: 0, maxValue: 255, defaultValue: 0 },
            { id: 'ch3', offset: 2, name: 'Blue', type: ChannelType.BLUE, minValue: 0, maxValue: 255, defaultValue: 0 }
          ]
        },
        {
          id: 'fixture-2',
          name: 'Moving Head 1',
          description: 'Test moving head',
          manufacturer: 'Test Manufacturer 2',
          model: 'Test Model 2',
          type: FixtureType.MOVING_HEAD,
          modeName: 'Extended',
          channelCount: 16,
          universe: 1,
          startChannel: 10,
          tags: ['spot'],
          definitionId: 'def-2',
          channels: []
        }
      ],
      pagination: {
        total: 2,
        page: 1,
        perPage: 50,
        totalPages: 1,
        hasMore: false
      }
    };

    beforeEach(() => {
      mockGraphQLClient.getFixtureInstances = jest.fn();
    });

    it('should list fixtures with default pagination', async () => {
      mockGraphQLClient.getFixtureInstances.mockResolvedValue(mockPaginatedResponse);

      const result = await fixtureTools.listFixtures({
        projectId: 'project-1'
      });

      expect(mockGraphQLClient.getFixtureInstances).toHaveBeenCalledWith({
        projectId: 'project-1',
        page: 1,
        perPage: 50,
        filter: undefined
      });

      expect(result.fixtures).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.hasMore).toBe(false);
      expect(result.fixtures[0].id).toBe('fixture-1');
      expect(result.fixtures[0].name).toBe('LED Par 1');
    });

    it('should list fixtures with custom pagination', async () => {
      mockGraphQLClient.getFixtureInstances.mockResolvedValue(mockPaginatedResponse);

      await fixtureTools.listFixtures({
        projectId: 'project-1',
        page: 2,
        perPage: 25
      });

      expect(mockGraphQLClient.getFixtureInstances).toHaveBeenCalledWith({
        projectId: 'project-1',
        page: 2,
        perPage: 25,
        filter: undefined
      });
    });

    it('should list fixtures with filters', async () => {
      mockGraphQLClient.getFixtureInstances.mockResolvedValue(mockPaginatedResponse);

      await fixtureTools.listFixtures({
        projectId: 'project-1',
        filter: {
          type: 'LED_PAR',
          universe: 1,
          tags: ['wash'],
          manufacturer: 'Test Manufacturer'
        }
      });

      expect(mockGraphQLClient.getFixtureInstances).toHaveBeenCalledWith({
        projectId: 'project-1',
        page: 1,
        perPage: 50,
        filter: {
          type: 'LED_PAR',
          universe: 1,
          tags: ['wash'],
          manufacturer: 'Test Manufacturer'
        }
      });
    });

    it('should normalize pagination parameters', async () => {
      mockGraphQLClient.getFixtureInstances.mockResolvedValue(mockPaginatedResponse);

      await fixtureTools.listFixtures({
        projectId: 'project-1',
        page: -1,  // Should normalize to MIN_PAGE
        perPage: 200  // Should normalize to MAX_PER_PAGE
      });

      expect(mockGraphQLClient.getFixtureInstances).toHaveBeenCalledWith({
        projectId: 'project-1',
        page: PAGINATION_DEFAULTS.MIN_PAGE,
        perPage: PAGINATION_DEFAULTS.MAX_PER_PAGE,
        filter: undefined
      });
    });

    it('should handle errors gracefully', async () => {
      mockGraphQLClient.getFixtureInstances.mockRejectedValue(new Error('GraphQL Error'));

      await expect(
        fixtureTools.listFixtures({ projectId: 'project-1' })
      ).rejects.toThrow('Failed to list fixtures');
    });
  });

  describe('getFixture', () => {
    const mockFixture = {
      id: 'fixture-1',
      name: 'LED Par 1',
      description: 'Test fixture',
      manufacturer: 'Test Manufacturer',
      model: 'Test Model',
      type: FixtureType.LED_PAR,
      modeName: 'Standard',
      channelCount: 3,
      universe: 1,
      startChannel: 1,
      tags: ['wash'],
      definitionId: 'def-1',
      channels: [
        { id: 'ch1', offset: 0, name: 'Red', type: ChannelType.RED, minValue: 0, maxValue: 255, defaultValue: 0 },
        { id: 'ch2', offset: 1, name: 'Green', type: ChannelType.GREEN, minValue: 0, maxValue: 255, defaultValue: 0 },
        { id: 'ch3', offset: 2, name: 'Blue', type: ChannelType.BLUE, minValue: 0, maxValue: 255, defaultValue: 0 }
      ]
    };

    beforeEach(() => {
      mockGraphQLClient.getFixtureInstance = jest.fn();
    });

    it('should get a single fixture by ID', async () => {
      mockGraphQLClient.getFixtureInstance.mockResolvedValue(mockFixture as any);

      const result = await fixtureTools.getFixture({
        fixtureId: 'fixture-1'
      });

      expect(mockGraphQLClient.getFixtureInstance).toHaveBeenCalledWith('fixture-1');
      expect(result.fixture.id).toBe('fixture-1');
      expect(result.fixture.name).toBe('LED Par 1');
      expect(result.fixture.channels).toHaveLength(3);
      expect(result.fixture.channels[0].type).toBe(ChannelType.RED);
    });

    it('should include all fixture details', async () => {
      mockGraphQLClient.getFixtureInstance.mockResolvedValue(mockFixture as any);

      const result = await fixtureTools.getFixture({
        fixtureId: 'fixture-1'
      });

      expect(result.fixture).toHaveProperty('id');
      expect(result.fixture).toHaveProperty('name');
      expect(result.fixture).toHaveProperty('manufacturer');
      expect(result.fixture).toHaveProperty('model');
      expect(result.fixture).toHaveProperty('type');
      expect(result.fixture).toHaveProperty('mode');
      expect(result.fixture).toHaveProperty('universe');
      expect(result.fixture).toHaveProperty('startChannel');
      expect(result.fixture).toHaveProperty('channelCount');
      expect(result.fixture).toHaveProperty('tags');
      expect(result.fixture).toHaveProperty('channels');
    });

    it('should handle fixture not found', async () => {
      mockGraphQLClient.getFixtureInstance.mockResolvedValue(null);

      await expect(
        fixtureTools.getFixture({ fixtureId: 'non-existent' })
      ).rejects.toThrow('Fixture with ID non-existent not found');
    });

    it('should handle errors gracefully', async () => {
      mockGraphQLClient.getFixtureInstance.mockRejectedValue(new Error('GraphQL Error'));

      await expect(
        fixtureTools.getFixture({ fixtureId: 'fixture-1' })
      ).rejects.toThrow('Failed to get fixture');
    });
  });

  describe('getFixtureInventory', () => {
    it('should get fixture inventory with definitions', async () => {
      mockGraphQLClient.getFixtureDefinitions.mockResolvedValue(mockFixtureDefinitions);
      mockGraphQLClient.getProjects.mockResolvedValue([]);

      const result = await fixtureTools.getFixtureInventory({
        includeDefinitions: true
      });

      expect(mockGraphQLClient.getFixtureDefinitions).toHaveBeenCalled();
      expect(result.definitions).toHaveLength(1);
      expect(result.summary.availableDefinitions).toBe(1);
    });

    it('should get project-specific fixture inventory', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);

      const result = await fixtureTools.getFixtureInventory({
        projectId: 'project-1',
        includeDefinitions: false
      });

      expect(mockGraphQLClient.getProject).toHaveBeenCalledWith('project-1');
      expect(result.fixtures).toHaveLength(1);
      expect(result.summary.totalFixtures).toBe(1);
    });

    it('should get all fixtures from all projects when no projectId specified', async () => {
      mockGraphQLClient.getProjects.mockResolvedValue([mockProject] as any);

      const result = await fixtureTools.getFixtureInventory({
        includeDefinitions: false
      });

      expect(mockGraphQLClient.getProjects).toHaveBeenCalled();
      expect(result.fixtures).toHaveLength(1);
    });

    it('should filter fixtures by type', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);

      const result = await fixtureTools.getFixtureInventory({
        projectId: 'project-1',
        fixtureType: 'LED_PAR',
        includeDefinitions: false
      });

      expect(result.fixtures).toHaveLength(1);
      expect(result.fixtures[0].type).toBe(FixtureType.LED_PAR);
    });

    it('should filter definitions by type', async () => {
      mockGraphQLClient.getFixtureDefinitions.mockResolvedValue(mockFixtureDefinitions);
      mockGraphQLClient.getProjects.mockResolvedValue([]);

      const result = await fixtureTools.getFixtureInventory({
        fixtureType: 'LED_PAR',
        includeDefinitions: true
      });

      expect(result.definitions).toHaveLength(1);
      expect(result.definitions[0].type).toBe('LED_PAR');
    });

    it('should handle project not found', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(null);

      await expect(fixtureTools.getFixtureInventory({
        projectId: 'non-existent',
        includeDefinitions: false
      })).rejects.toThrow('Project with ID non-existent not found');
    });

    it('should handle GraphQL errors', async () => {
      mockGraphQLClient.getFixtureDefinitions.mockRejectedValue(new Error('GraphQL error'));
      mockGraphQLClient.getProjects.mockResolvedValue([]);

      await expect(fixtureTools.getFixtureInventory({
        includeDefinitions: true
      })).rejects.toThrow('Failed to get fixture inventory: Error: GraphQL error');
    });
  });

  describe('analyzeFixtureCapabilities', () => {
    it('should analyze single fixture capabilities', async () => {
      const projects = [mockProject];
      mockGraphQLClient.getProjects.mockResolvedValue(projects as any);

      const result = await fixtureTools.analyzeFixtureCapabilities({
        fixtureId: 'fixture-1',
        analysisType: 'color_mixing'
      });

      expect(result.analysisType).toBe('color_mixing');
      expect(result.fixtures).toHaveLength(1);
      expect(result.fixtures[0].fixtureId).toBe('fixture-1');
    });

    it('should analyze multiple fixtures', async () => {
      const projects = [mockProject];
      mockGraphQLClient.getProjects.mockResolvedValue(projects as any);

      const result = await fixtureTools.analyzeFixtureCapabilities({
        fixtureIds: ['fixture-1'],
        analysisType: 'general'
      });

      expect(result.fixtures).toHaveLength(1);
      expect(result.analysisType).toBe('general');
    });

    it('should handle different analysis types', async () => {
      const projects = [mockProject];
      mockGraphQLClient.getProjects.mockResolvedValue(projects as any);

      const positioningResult = await fixtureTools.analyzeFixtureCapabilities({
        fixtureId: 'fixture-1',
        analysisType: 'positioning'
      });

      expect(positioningResult.analysisType).toBe('positioning');

      const effectsResult = await fixtureTools.analyzeFixtureCapabilities({
        fixtureId: 'fixture-1',
        analysisType: 'effects'
      });

      expect(effectsResult.analysisType).toBe('effects');
    });

    it('should require either fixtureId or fixtureIds', async () => {
      await expect(fixtureTools.analyzeFixtureCapabilities({
        analysisType: 'general'
      })).rejects.toThrow('Either fixtureId or fixtureIds must be provided');
    });

    it('should handle fixture not found', async () => {
      mockGraphQLClient.getProjects.mockResolvedValue([]);

      await expect(fixtureTools.analyzeFixtureCapabilities({
        fixtureId: 'non-existent',
        analysisType: 'general'
      })).rejects.toThrow('No fixtures found with the provided IDs');
    });

    it('should handle GraphQL errors', async () => {
      mockGraphQLClient.getProjects.mockRejectedValue(new Error('GraphQL error'));

      await expect(fixtureTools.analyzeFixtureCapabilities({
        fixtureId: 'fixture-1',
        analysisType: 'general'
      })).rejects.toThrow('Failed to analyze fixture capabilities: Error: GraphQL error');
    });
  });

  describe('createFixtureInstance', () => {
    it('should create fixture instance with auto channel assignment', async () => {
      const mockCreatedFixture = {
        id: 'new-fixture',
        name: 'New Fixture',
        manufacturer: 'Test Manufacturer',
        model: 'Test Model',
        definitionId: 'def-1',
        modeName: 'Standard',
        channelCount: 3,
        universe: 1,
        startChannel: 4,
        tags: ['test']
      };

      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);
      mockGraphQLClient.getFixtureDefinitions.mockResolvedValue(mockFixtureDefinitions);
      mockGraphQLClient.createFixtureInstance.mockResolvedValue(mockCreatedFixture as any);

      const result = await fixtureTools.createFixtureInstance({
        projectId: 'project-1',
        name: 'New Fixture',
        manufacturer: 'Test Manufacturer',
        model: 'Test Model',
        universe: 1,
        tags: ['test'],
        channelAssignment: 'auto'
      });

      expect(mockGraphQLClient.createFixtureInstance).toHaveBeenCalled();
      expect(result.fixture.name).toBe('New Fixture');
      expect(result.message).toContain('Successfully created');
    });

    it('should create fixture instance with manual channel assignment', async () => {
      const mockCreatedFixture = {
        id: 'new-fixture',
        name: 'New Fixture',
        startChannel: 10
      };

      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);
      mockGraphQLClient.getFixtureDefinitions.mockResolvedValue(mockFixtureDefinitions);
      mockGraphQLClient.createFixtureInstance.mockResolvedValue(mockCreatedFixture as any);

      const result = await fixtureTools.createFixtureInstance({
        projectId: 'project-1',
        name: 'New Fixture',
        manufacturer: 'Test Manufacturer',
        model: 'Test Model',
        startChannel: 10,
        universe: 1,
        tags: [],
        channelAssignment: 'manual'
      });

      expect(result.fixture.name).toBe('New Fixture');
    });

    it('should suggest channel assignment', async () => {
      // Mock the suggest channel assignment method to return proper structure
      const mockSuggestion = {
        projectId: 'project-1',
        universe: 1,
        groupingStrategy: 'sequential' as const,
        assignments: [{
          fixtureName: 'New Fixture',
          manufacturer: 'Test Manufacturer',
          model: 'Test Model',
          mode: undefined,
          startChannel: 4,
          endChannel: 6,
          channelCount: 3,
          channelRange: '4-6'
        }],
        summary: {
          totalFixtures: 1,
          channelsUsed: 3,
          startChannel: 4,
          endChannel: 6
        },
        recommendations: []
      };
      
      // Mock suggestChannelAssignment as a spy on the instance
      const suggestSpy = jest.spyOn(fixtureTools, 'suggestChannelAssignment').mockResolvedValue(mockSuggestion);
      
      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);
      mockGraphQLClient.getFixtureDefinitions.mockResolvedValue(mockFixtureDefinitions);
      mockGraphQLClient.createFixtureInstance.mockResolvedValue({
        id: 'new-fixture',
        name: 'New Fixture',
        universe: 1,
        startChannel: 4,
        tags: []
      } as any);

      const result = await fixtureTools.createFixtureInstance({
        projectId: 'project-1',
        name: 'New Fixture',
        manufacturer: 'Test Manufacturer',
        model: 'Test Model',
        universe: 1,
        tags: [],
        channelAssignment: 'suggest'
      });

      expect(suggestSpy).toHaveBeenCalled();
      expect(result.channelAssignment).toBeDefined();
      expect(result.message).toContain('Successfully created');
      
      suggestSpy.mockRestore();
    });

    it('should create new fixture definition if not found', async () => {
      const newDefinition = {
        id: 'def-new',
        manufacturer: 'New Manufacturer',
        model: 'New Model',
        type: FixtureType.LED_PAR,
        channels: [],
        modes: [],
        isBuiltIn: false
      };

      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);
      mockGraphQLClient.getFixtureDefinitions.mockResolvedValue([]);
      mockGraphQLClient.createFixtureDefinition.mockResolvedValue(newDefinition);
      mockGraphQLClient.createFixtureInstance.mockResolvedValue({
        id: 'new-fixture',
        name: 'New Fixture'
      } as any);

      const result = await fixtureTools.createFixtureInstance({
        projectId: 'project-1',
        name: 'New Fixture',
        manufacturer: 'New Manufacturer',
        model: 'New Model',
        universe: 1,
        tags: [],
        channelAssignment: 'auto'
      });

      expect(mockGraphQLClient.createFixtureDefinition).toHaveBeenCalled();
      expect(result.fixture.name).toBe('New Fixture');
    });

    it('should handle project not found', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(null);

      await expect(fixtureTools.createFixtureInstance({
        projectId: 'non-existent',
        name: 'New Fixture',
        manufacturer: 'Test Manufacturer',
        model: 'Test Model',
        universe: 1,
        tags: [],
        channelAssignment: 'auto'
      })).rejects.toThrow('Project with ID non-existent not found');
    });

    it('should handle GraphQL errors', async () => {
      mockGraphQLClient.getProject.mockRejectedValue(new Error('GraphQL error'));

      await expect(fixtureTools.createFixtureInstance({
        projectId: 'project-1',
        name: 'New Fixture',
        manufacturer: 'Test Manufacturer',
        model: 'Test Model',
        universe: 1,
        tags: [],
        channelAssignment: 'auto'
      })).rejects.toThrow('Failed to create fixture instance: Error: GraphQL error');
    });
  });

  describe('getChannelMap', () => {
    it('should get channel map for project', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);

      const result = await fixtureTools.getChannelMap({
        projectId: 'project-1'
      });

      expect(result.projectId).toBe('project-1');
      expect(result.universes).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    it('should filter by universe', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);

      const result = await fixtureTools.getChannelMap({
        projectId: 'project-1',
        universe: 1
      });

      expect(result.universes.some(u => u.universe === 1)).toBe(true);
    });

    it('should handle project not found', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(null);

      await expect(fixtureTools.getChannelMap({
        projectId: 'non-existent'
      })).rejects.toThrow('Project with ID non-existent not found');
    });

    it('should handle GraphQL errors', async () => {
      mockGraphQLClient.getProject.mockRejectedValue(new Error('GraphQL error'));

      await expect(fixtureTools.getChannelMap({
        projectId: 'project-1'
      })).rejects.toThrow('Failed to get channel map: Error: GraphQL error');
    });
  });

  describe('suggestChannelAssignment', () => {
    it('should suggest channel assignments for fixtures', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);

      const result = await fixtureTools.suggestChannelAssignment({
        projectId: 'project-1',
        universe: 1,
        startingChannel: 1,
        groupingStrategy: 'sequential',
        fixtureSpecs: [
          {
            name: 'New Fixture',
            manufacturer: 'Test Manufacturer',
            model: 'Test Model'
          }
        ]
      });

      expect(result.assignments).toBeDefined();
      expect(result.groupingStrategy).toBe('sequential');
      expect(result.universe).toBe(1);
    });

    it('should handle different grouping strategies', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);

      const result = await fixtureTools.suggestChannelAssignment({
        projectId: 'project-1',
        universe: 1,
        startingChannel: 1,
        groupingStrategy: 'by_type',
        fixtureSpecs: [
          {
            name: 'New Fixture',
            manufacturer: 'Test Manufacturer',
            model: 'Test Model'
          }
        ]
      });

      expect(result.groupingStrategy).toBe('by_type');
    });

    it('should handle project not found', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(null);

      await expect(fixtureTools.suggestChannelAssignment({
        projectId: 'non-existent',
        universe: 1,
        startingChannel: 1,
        groupingStrategy: 'sequential',
        fixtureSpecs: []
      })).rejects.toThrow('Project with ID non-existent not found');
    });
  });

  describe('updateFixtureInstance', () => {
    it('should update fixture instance', async () => {
      const mockUpdatedFixture = {
        id: 'fixture-1',
        name: 'Updated Fixture',
        manufacturer: 'Test Manufacturer',
        model: 'Test Model'
      };

      // Mock a project with fixtures so the fixture can be found
      const mockProjectWithFixtures = {
        ...mockProject,
        fixtures: [{
          ...mockProject.fixtures[0],
          id: 'fixture-1'
        }]
      };
      mockGraphQLClient.getProjects.mockResolvedValue([mockProjectWithFixtures]);
      mockGraphQLClient.updateFixtureInstance.mockResolvedValue(mockUpdatedFixture as any);

      const result = await fixtureTools.updateFixtureInstance({
        fixtureId: 'fixture-1',
        name: 'Updated Fixture'
      });

      expect(mockGraphQLClient.updateFixtureInstance).toHaveBeenCalledWith(
        'fixture-1',
        { name: 'Updated Fixture' }
      );
      expect(result.fixture.name).toBe('Updated Fixture');
      expect(result.message).toContain('Successfully updated');
    });

    it('should handle update errors', async () => {
      // Mock a project with fixtures so the fixture can be found first
      const mockProjectWithFixtures = {
        ...mockProject,
        fixtures: [{
          ...mockProject.fixtures[0],
          id: 'fixture-1'
        }]
      };
      mockGraphQLClient.getProjects.mockResolvedValue([mockProjectWithFixtures]);
      mockGraphQLClient.updateFixtureInstance.mockRejectedValue(new Error('Update error'));

      await expect(fixtureTools.updateFixtureInstance({
        fixtureId: 'fixture-1',
        name: 'Updated Fixture'
      })).rejects.toThrow('Failed to update fixture instance: Error: Update error');
    });
  });

  describe('analyzeFixtureCapabilities edge cases', () => {
    it('should handle fixture definition without profile but with channels', async () => {
      // Create a fixture definition without profile but with channels
      const fixtureWithoutProfile = {
        id: 'def-no-profile',
        manufacturer: 'Test Manufacturer',
        model: 'Basic Model',
        type: FixtureType.LED_PAR,
        channels: [
          { id: 'ch1', name: 'Red', type: ChannelType.RED, offset: 0, minValue: 0, maxValue: 255, defaultValue: 0 },
          { id: 'ch2', name: 'Green', type: ChannelType.GREEN, offset: 1, minValue: 0, maxValue: 255, defaultValue: 0 },
          { id: 'ch3', name: 'Blue', type: ChannelType.BLUE, offset: 2, minValue: 0, maxValue: 255, defaultValue: 0 }
        ],
        modes: [
          { id: 'mode-1', name: 'Standard', channelCount: 3 }
        ],
        isBuiltIn: true
        // Note: no profile property
      };

      const projectWithNoProfileFixture = {
        ...mockProject,
        fixtures: [{
          ...mockProject.fixtures[0],
          id: 'fixture-no-profile',
          definitionId: 'def-no-profile'
        }]
      };

      mockGraphQLClient.getProjects.mockResolvedValue([projectWithNoProfileFixture] as any);
      mockGraphQLClient.getFixtureDefinitions.mockResolvedValue([fixtureWithoutProfile] as any);

      const result = await fixtureTools.analyzeFixtureCapabilities({
        fixtureId: 'fixture-no-profile',
        analysisType: 'color_mixing'
      });

      expect(result.analysisType).toBe('color_mixing');
      expect(result.fixtures).toHaveLength(1);
      // For color_mixing analysis, check the specific properties
      const colorAnalysis = result.fixtures[0] as any;
      expect(colorAnalysis.canMixColors).toBe(true);
    });

    it('should analyze fixture with strobe and gobo capabilities', async () => {
      const strobeGoboFixture = {
        id: 'def-strobe-gobo',
        manufacturer: 'Test Manufacturer',
        model: 'Effect Light',
        type: FixtureType.MOVING_HEAD,
        channels: [
          { id: 'ch1', name: 'Pan', type: ChannelType.PAN, offset: 0, minValue: 0, maxValue: 255, defaultValue: 128 },
          { id: 'ch2', name: 'Tilt', type: ChannelType.TILT, offset: 1, minValue: 0, maxValue: 255, defaultValue: 128 },
          { id: 'ch3', name: 'Strobe', type: ChannelType.STROBE, offset: 2, minValue: 0, maxValue: 255, defaultValue: 0 },
          { id: 'ch4', name: 'Gobo', type: ChannelType.GOBO, offset: 3, minValue: 0, maxValue: 255, defaultValue: 0 },
          { id: 'ch5', name: 'Focus', type: ChannelType.FOCUS, offset: 4, minValue: 0, maxValue: 255, defaultValue: 128 },
          { id: 'ch6', name: 'Zoom', type: ChannelType.ZOOM, offset: 5, minValue: 0, maxValue: 255, defaultValue: 128 }
        ],
        modes: [
          { id: 'mode-1', name: 'Standard', channelCount: 6 }
        ],
        isBuiltIn: true
      };

      const projectWithEffectFixture = {
        ...mockProject,
        fixtures: [{
          ...mockProject.fixtures[0],
          id: 'fixture-effect',
          definitionId: 'def-strobe-gobo'
        }]
      };

      mockGraphQLClient.getProjects.mockResolvedValue([projectWithEffectFixture] as any);
      mockGraphQLClient.getFixtureDefinitions.mockResolvedValue([strobeGoboFixture] as any);

      const result = await fixtureTools.analyzeFixtureCapabilities({
        fixtureId: 'fixture-effect',
        analysisType: 'effects'
      });

      expect(result.analysisType).toBe('effects');
      expect(result.fixtures).toHaveLength(1);
    });

    it('should analyze fixture with white and amber channels', async () => {
      const whiteAmberFixture = {
        id: 'def-white-amber',
        manufacturer: 'Test Manufacturer',
        model: 'RGBWA Light',
        type: FixtureType.LED_PAR,
        channels: [
          { id: 'ch1', name: 'Red', type: ChannelType.RED, offset: 0, minValue: 0, maxValue: 255, defaultValue: 0 },
          { id: 'ch2', name: 'Green', type: ChannelType.GREEN, offset: 1, minValue: 0, maxValue: 255, defaultValue: 0 },
          { id: 'ch3', name: 'Blue', type: ChannelType.BLUE, offset: 2, minValue: 0, maxValue: 255, defaultValue: 0 },
          { id: 'ch4', name: 'White', type: ChannelType.WHITE, offset: 3, minValue: 0, maxValue: 255, defaultValue: 0 },
          { id: 'ch5', name: 'Amber', type: ChannelType.AMBER, offset: 4, minValue: 0, maxValue: 255, defaultValue: 0 }
        ],
        modes: [
          { id: 'mode-1', name: 'Standard', channelCount: 5 }
        ],
        isBuiltIn: true
      };

      const projectWithWhiteAmber = {
        ...mockProject,
        fixtures: [{
          ...mockProject.fixtures[0],
          id: 'fixture-white-amber',
          definitionId: 'def-white-amber'
        }]
      };

      mockGraphQLClient.getProjects.mockResolvedValue([projectWithWhiteAmber] as any);
      mockGraphQLClient.getFixtureDefinitions.mockResolvedValue([whiteAmberFixture] as any);

      const result = await fixtureTools.analyzeFixtureCapabilities({
        fixtureId: 'fixture-white-amber',
        analysisType: 'color_mixing'
      });

      expect(result.analysisType).toBe('color_mixing');
      expect(result.fixtures).toHaveLength(1);
    });

    it('should analyze simple intensity dimmer fixture', async () => {
      const dimmerFixture = {
        id: 'def-dimmer',
        manufacturer: 'Test Manufacturer',
        model: 'Simple Dimmer',
        type: FixtureType.DIMMER,
        channels: [
          { id: 'ch1', name: 'Intensity', type: ChannelType.INTENSITY, offset: 0, minValue: 0, maxValue: 255, defaultValue: 0 }
        ],
        modes: [
          { id: 'mode-1', name: 'Standard', channelCount: 1 }
        ],
        isBuiltIn: true
      };

      const projectWithDimmer = {
        ...mockProject,
        fixtures: [{
          ...mockProject.fixtures[0],
          id: 'fixture-dimmer',
          definitionId: 'def-dimmer'
        }]
      };

      mockGraphQLClient.getProjects.mockResolvedValue([projectWithDimmer] as any);
      mockGraphQLClient.getFixtureDefinitions.mockResolvedValue([dimmerFixture] as any);

      const result = await fixtureTools.analyzeFixtureCapabilities({
        fixtureId: 'fixture-dimmer',
        analysisType: 'positioning'
      });

      expect(result.analysisType).toBe('positioning');
      expect(result.fixtures).toHaveLength(1);
    });
  });

  describe('bulkUpdateFixtures', () => {
    it('should bulk update multiple fixtures successfully', async () => {
      const mockUpdatedFixtures = [
        {
          id: 'fixture-1',
          name: 'Spot 1:1',
          description: 'Updated fixture 1',
          universe: 1,
          startChannel: 1,
          tags: ['spot', 'front'],
          layoutX: 0.1,
          layoutY: 0.2,
          layoutRotation: 45,
          manufacturer: 'Test Manufacturer',
          model: 'Test Model',
          definitionId: 'def-1',
          modeName: 'Standard',
          channelCount: 3
        },
        {
          id: 'fixture-2',
          name: 'Spot 1:2',
          description: 'Updated fixture 2',
          universe: 1,
          startChannel: 4,
          tags: ['spot', 'front'],
          layoutX: 0.3,
          layoutY: 0.4,
          layoutRotation: 90,
          manufacturer: 'Test Manufacturer',
          model: 'Test Model',
          definitionId: 'def-1',
          modeName: 'Standard',
          channelCount: 3
        }
      ];

      // Mock the bulkUpdateFixtures method on the GraphQL client
      mockGraphQLClient.bulkUpdateFixtures = jest.fn().mockResolvedValue(mockUpdatedFixtures as any);

      const result = await fixtureTools.bulkUpdateFixtures({
        fixtures: [
          {
            fixtureId: 'fixture-1',
            name: 'Spot 1:1',
            description: 'Updated fixture 1',
            tags: ['spot', 'front'],
            layoutX: 0.1,
            layoutY: 0.2,
            layoutRotation: 45
          },
          {
            fixtureId: 'fixture-2',
            name: 'Spot 1:2',
            description: 'Updated fixture 2',
            tags: ['spot', 'front'],
            layoutX: 0.3,
            layoutY: 0.4,
            layoutRotation: 90
          }
        ]
      });

      expect(mockGraphQLClient.bulkUpdateFixtures).toHaveBeenCalledWith({
        fixtures: [
          {
            fixtureId: 'fixture-1',
            name: 'Spot 1:1',
            description: 'Updated fixture 1',
            tags: ['spot', 'front'],
            layoutX: 0.1,
            layoutY: 0.2,
            layoutRotation: 45
          },
          {
            fixtureId: 'fixture-2',
            name: 'Spot 1:2',
            description: 'Updated fixture 2',
            tags: ['spot', 'front'],
            layoutX: 0.3,
            layoutY: 0.4,
            layoutRotation: 90
          }
        ]
      });
      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(2);
      expect(result.fixtures).toHaveLength(2);
      expect(result.fixtures[0].name).toBe('Spot 1:1');
      expect(result.fixtures[1].name).toBe('Spot 1:2');
      expect(result.message).toContain('Successfully updated 2 fixture(s)');
    });

    it('should handle bulk update with partial field updates', async () => {
      const mockUpdatedFixtures = [
        {
          id: 'fixture-1',
          name: 'Updated Name',
          description: 'Original description',
          universe: 1,
          startChannel: 1,
          tags: [],
          manufacturer: 'Test Manufacturer',
          model: 'Test Model',
          definitionId: 'def-1',
          modeName: 'Standard',
          channelCount: 3
        }
      ];

      mockGraphQLClient.bulkUpdateFixtures = jest.fn().mockResolvedValue(mockUpdatedFixtures as any);

      const result = await fixtureTools.bulkUpdateFixtures({
        fixtures: [
          {
            fixtureId: 'fixture-1',
            name: 'Updated Name'
            // Only updating name, not other fields
          }
        ]
      });

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(1);
      expect(result.fixtures[0].name).toBe('Updated Name');
    });

    it('should handle bulk update errors', async () => {
      mockGraphQLClient.bulkUpdateFixtures = jest.fn().mockRejectedValue(new Error('GraphQL error'));

      await expect(fixtureTools.bulkUpdateFixtures({
        fixtures: [
          {
            fixtureId: 'fixture-1',
            name: 'Updated Name'
          }
        ]
      })).rejects.toThrow('Failed to bulk update fixtures: Error: GraphQL error');
    });

    it('should validate bulk update input', async () => {
      // Test with empty fixtures array
      await expect(fixtureTools.bulkUpdateFixtures({
        fixtures: []
      })).rejects.toThrow();

      // Test with missing fixtureId
      await expect(fixtureTools.bulkUpdateFixtures({
        fixtures: [
          {
            name: 'Updated Name'
          } as any
        ]
      })).rejects.toThrow();
    });

    it('should handle bulk update with all updatable fields', async () => {
      const mockUpdatedFixtures = [
        {
          id: 'fixture-1',
          name: 'Updated Fixture',
          description: 'Updated description',
          universe: 2,
          startChannel: 10,
          tags: ['updated', 'test'],
          layoutX: 0.5,
          layoutY: 0.6,
          layoutRotation: 180,
          manufacturer: 'Test Manufacturer',
          model: 'Test Model',
          definitionId: 'def-1',
          modeName: 'Standard',
          channelCount: 3
        }
      ];

      mockGraphQLClient.bulkUpdateFixtures = jest.fn().mockResolvedValue(mockUpdatedFixtures as any);

      const result = await fixtureTools.bulkUpdateFixtures({
        fixtures: [
          {
            fixtureId: 'fixture-1',
            name: 'Updated Fixture',
            description: 'Updated description',
            universe: 2,
            startChannel: 10,
            tags: ['updated', 'test'],
            layoutX: 0.5,
            layoutY: 0.6,
            layoutRotation: 180
          }
        ]
      });

      expect(result.success).toBe(true);
      expect(result.fixtures[0]).toMatchObject({
        id: 'fixture-1',
        name: 'Updated Fixture',
        description: 'Updated description',
        universe: 2,
        startChannel: 10,
        tags: ['updated', 'test'],
        layoutX: 0.5,
        layoutY: 0.6,
        layoutRotation: 180
      });
    });
  });

  describe('bulkCreateFixtures', () => {
    it('should bulk create multiple fixtures successfully', async () => {
      const mockCreatedFixtures = [
        {
          id: 'fixture-new-1',
          name: 'New Fixture 1',
          manufacturer: 'Test Manufacturer',
          model: 'Test Model',
          type: FixtureType.LED_PAR,
          universe: 1,
          startChannel: 4,
          modeName: 'Standard',
          channelCount: 3,
          tags: ['new'],
          channels: mockProject.fixtures[0].channels
        },
        {
          id: 'fixture-new-2',
          name: 'New Fixture 2',
          manufacturer: 'Test Manufacturer',
          model: 'Test Model',
          type: FixtureType.LED_PAR,
          universe: 1,
          startChannel: 7,
          modeName: 'Standard',
          channelCount: 3,
          tags: ['new'],
          channels: mockProject.fixtures[0].channels
        }
      ];

      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);
      mockGraphQLClient.getFixtureDefinitions.mockResolvedValue(mockFixtureDefinitions);

      // Mock createFixtureInstance to return fixtures sequentially
      mockGraphQLClient.createFixtureInstance
        .mockResolvedValueOnce(mockCreatedFixtures[0] as any)
        .mockResolvedValueOnce(mockCreatedFixtures[1] as any);

      const result = await fixtureTools.bulkCreateFixtures({
        fixtures: [
          {
            projectId: 'project-1',
            name: 'New Fixture 1',
            manufacturer: 'Test Manufacturer',
            model: 'Test Model',
            universe: 1,
            tags: ['new']
          },
          {
            projectId: 'project-1',
            name: 'New Fixture 2',
            manufacturer: 'Test Manufacturer',
            model: 'Test Model',
            universe: 1,
            tags: ['new']
          }
        ]
      });

      expect(mockGraphQLClient.createFixtureInstance).toHaveBeenCalledTimes(2);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
      expect(result.succeeded).toHaveLength(2);
      expect(result.succeeded[0].name).toBe('New Fixture 1');
      expect(result.succeeded[1].name).toBe('New Fixture 2');
      expect(result.message).toContain('Successfully created'); // Changed to match case
    });

    it('should create fixtures with auto channel assignment', async () => {
      const mockCreatedFixture = {
        id: 'fixture-new',
        name: 'Auto Channel Fixture',
        manufacturer: 'Test Manufacturer',
        model: 'Test Model',
        type: FixtureType.LED_PAR,
        universe: 1,
        startChannel: 4,
        modeName: 'Standard',
        channelCount: 3,
        tags: [],
        channels: mockProject.fixtures[0].channels
      };

      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);
      mockGraphQLClient.getFixtureDefinitions.mockResolvedValue(mockFixtureDefinitions);
      mockGraphQLClient.createFixtureInstance.mockResolvedValue(mockCreatedFixture as any);

      const result = await fixtureTools.bulkCreateFixtures({
        fixtures: [
          {
            projectId: 'project-1',
            name: 'Auto Channel Fixture',
            manufacturer: 'Test Manufacturer',
            model: 'Test Model',
            universe: 1,
            tags: []
            // No startChannel provided - should auto-assign
          }
        ]
      });

      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(0);
      expect(result.succeeded[0].startChannel).toBe(4); // Auto-assigned after existing fixture at channel 1-3
    });

    it('should create fixtures with manual channel assignment', async () => {
      const mockCreatedFixture = {
        id: 'fixture-new',
        name: 'Manual Channel Fixture',
        manufacturer: 'Test Manufacturer',
        model: 'Test Model',
        type: FixtureType.LED_PAR,
        universe: 1,
        startChannel: 10,
        modeName: 'Standard',
        channelCount: 3,
        tags: [],
        channels: mockProject.fixtures[0].channels
      };

      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);
      mockGraphQLClient.getFixtureDefinitions.mockResolvedValue(mockFixtureDefinitions);
      mockGraphQLClient.createFixtureInstance.mockResolvedValue(mockCreatedFixture as any);

      const result = await fixtureTools.bulkCreateFixtures({
        fixtures: [
          {
            projectId: 'project-1',
            name: 'Manual Channel Fixture',
            manufacturer: 'Test Manufacturer',
            model: 'Test Model',
            universe: 1,
            startChannel: 10,
            tags: []
          }
        ]
      });

      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(0);
      expect(result.succeeded[0].startChannel).toBe(10);
    });

    it('should create new fixture definition if not found', async () => {
      const newDefinition = {
        id: 'def-new',
        manufacturer: 'New Manufacturer',
        model: 'New Model',
        type: FixtureType.LED_PAR,
        channels: [],
        modes: [],
        isBuiltIn: false
      };

      const mockCreatedFixture = {
        id: 'fixture-new',
        name: 'New Fixture',
        manufacturer: 'New Manufacturer',
        model: 'New Model',
        type: FixtureType.LED_PAR,
        universe: 1,
        startChannel: 1,
        modeName: 'Default',
        channelCount: 3,
        tags: [],
        channels: []
      };

      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);
      mockGraphQLClient.getFixtureDefinitions.mockResolvedValue([]);
      mockGraphQLClient.createFixtureDefinition.mockResolvedValue(newDefinition);
      mockGraphQLClient.createFixtureInstance.mockResolvedValue(mockCreatedFixture as any);

      const result = await fixtureTools.bulkCreateFixtures({
        fixtures: [
          {
            projectId: 'project-1',
            name: 'New Fixture',
            manufacturer: 'New Manufacturer',
            model: 'New Model',
            universe: 1,
            tags: []
          }
        ]
      });

      expect(mockGraphQLClient.createFixtureDefinition).toHaveBeenCalled();
      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(0);
      expect(result.succeeded[0].name).toBe('New Fixture');
    });

    it('should handle bulk create with mode selection', async () => {
      const mockCreatedFixture = {
        id: 'fixture-new',
        name: 'Mode Fixture',
        manufacturer: 'Test Manufacturer',
        model: 'Test Model',
        type: FixtureType.LED_PAR,
        universe: 1,
        startChannel: 1,
        modeName: 'Standard',
        channelCount: 3,
        tags: [],
        channels: mockProject.fixtures[0].channels
      };

      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);
      mockGraphQLClient.getFixtureDefinitions.mockResolvedValue(mockFixtureDefinitions);
      mockGraphQLClient.createFixtureInstance.mockResolvedValue(mockCreatedFixture as any);

      const result = await fixtureTools.bulkCreateFixtures({
        fixtures: [
          {
            projectId: 'project-1',
            name: 'Mode Fixture',
            manufacturer: 'Test Manufacturer',
            model: 'Test Model',
            mode: 'Standard',
            universe: 1,
            tags: []
          }
        ]
      });

      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(0);
      expect(result.succeeded[0].mode).toBe('Standard'); // Changed from modeName to mode
    });

    it('should handle bulk create errors with best-effort approach', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);
      mockGraphQLClient.getFixtureDefinitions.mockResolvedValue(mockFixtureDefinitions);
      mockGraphQLClient.createFixtureInstance = jest.fn().mockRejectedValue(new Error('GraphQL error'));

      const result = await fixtureTools.bulkCreateFixtures({
        fixtures: [
          {
            projectId: 'project-1',
            name: 'New Fixture',
            manufacturer: 'Test Manufacturer',
            model: 'Test Model',
            universe: 1,
            tags: []
          }
        ]
      });

      // With best-effort, individual failures don't throw - they're returned in failed array
      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(1);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].error).toContain('GraphQL error');
    });

    it('should validate bulk create input', async () => {
      // Test with empty fixtures array - best-effort returns success with 0 items
      const emptyResult = await fixtureTools.bulkCreateFixtures({
        fixtures: []
      });
      expect(emptyResult.successCount).toBe(0);
      expect(emptyResult.failureCount).toBe(0);
      expect(emptyResult.totalRequested).toBe(0);

      // Test with missing required fields - Zod validation should still throw
      await expect(fixtureTools.bulkCreateFixtures({
        fixtures: [
          {
            projectId: 'project-1',
            name: 'Incomplete Fixture'
            // Missing manufacturer and model
          } as any
        ]
      })).rejects.toThrow();
    });

    it('should provide channel summary for bulk created fixtures', async () => {
      const mockCreatedFixtures = [
        {
          id: 'fixture-new-1',
          name: 'New Fixture 1',
          manufacturer: 'Test Manufacturer',
          model: 'Test Model',
          type: FixtureType.LED_PAR,
          universe: 1,
          startChannel: 10, // Changed from 1 to match test input
          channelCount: 3,
          modeName: 'Standard',
          tags: []
        },
        {
          id: 'fixture-new-2',
          name: 'New Fixture 2',
          manufacturer: 'Test Manufacturer',
          model: 'Test Model',
          type: FixtureType.LED_PAR,
          universe: 2,
          startChannel: 1,
          channelCount: 3,
          modeName: 'Standard',
          tags: []
        }
      ];

      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);
      mockGraphQLClient.getFixtureDefinitions.mockResolvedValue(mockFixtureDefinitions);

      // Mock createFixtureInstance to return fixtures sequentially
      mockGraphQLClient.createFixtureInstance
        .mockResolvedValueOnce(mockCreatedFixtures[0] as any)
        .mockResolvedValueOnce(mockCreatedFixtures[1] as any);

      const result = await fixtureTools.bulkCreateFixtures({
        fixtures: [
          {
            projectId: 'project-1',
            name: 'New Fixture 1',
            manufacturer: 'Test Manufacturer',
            model: 'Test Model',
            universe: 1,
            startChannel: 10, // Changed from 1 to avoid conflict with existing fixture at channels 1-3
            tags: []
          },
          {
            projectId: 'project-1',
            name: 'New Fixture 2',
            manufacturer: 'Test Manufacturer',
            model: 'Test Model',
            universe: 2,
            startChannel: 1,
            tags: []
          }
        ]
      });

      expect(result.channelSummary).toBeDefined();
      expect(result.channelSummary).not.toBeNull();
      expect(result.channelSummary!.totalChannelsUsed).toBe(6);
      expect(result.channelSummary!.universes).toEqual([1, 2]);
    });
  });

  describe('deleteFixtureInstance', () => {
    beforeEach(() => {
      mockGraphQLClient.deleteFixtureInstance = jest.fn();
    });

    it('should delete fixture instance successfully', async () => {
      const mockProjectWithScenes = {
        ...mockProject,
        fixtures: [{
          id: 'fixture-1',
          name: 'LED Par 1',
          manufacturer: 'Test Manufacturer',
          model: 'Test Model',
          universe: 1,
          startChannel: 1,
          tags: ['wash']
        }],
        scenes: [{
          id: 'scene-1',
          name: 'Test Scene',
          fixtureValues: []
        }]
      };

      mockGraphQLClient.getProjects.mockResolvedValue([mockProjectWithScenes] as any);
      mockGraphQLClient.getProject.mockResolvedValue(mockProjectWithScenes as any);
      mockGraphQLClient.deleteFixtureInstance.mockResolvedValue(true);

      const result = await fixtureTools.deleteFixtureInstance({
        fixtureId: 'fixture-1',
        confirmDelete: true
      });

      expect(mockGraphQLClient.deleteFixtureInstance).toHaveBeenCalledWith('fixture-1');
      expect(result.success).toBe(true);
      expect(result.deletedFixture.id).toBe('fixture-1');
      expect(result.deletedFixture.name).toBe('LED Par 1');
      expect(result.message).toContain('Successfully deleted');
    });

    it('should require confirmDelete to be true', async () => {
      await expect(fixtureTools.deleteFixtureInstance({
        fixtureId: 'fixture-1',
        confirmDelete: false
      })).rejects.toThrow('Delete operation requires confirmDelete: true');
    });

    it('should handle fixture not found', async () => {
      mockGraphQLClient.getProjects.mockResolvedValue([]);

      await expect(fixtureTools.deleteFixtureInstance({
        fixtureId: 'non-existent',
        confirmDelete: true
      })).rejects.toThrow('Fixture with ID non-existent not found');
    });

    it('should report affected scenes when fixture is in use', async () => {
      const fixtureInScene = {
        id: 'fixture-1',
        name: 'LED Par 1',
        manufacturer: 'Test Manufacturer',
        model: 'Test Model',
        universe: 1,
        startChannel: 1,
        tags: []
      };

      const mockProjectWithFixtureInScene = {
        ...mockProject,
        fixtures: [fixtureInScene],
        scenes: [{
          id: 'scene-1',
          name: 'Test Scene',
          description: 'Scene using fixture',
          fixtureValues: [{
            fixture: { id: 'fixture-1' },
            channelValues: [255, 0, 0]
          }]
        }]
      };

      mockGraphQLClient.getProjects.mockResolvedValue([mockProjectWithFixtureInScene] as any);
      mockGraphQLClient.getProject.mockResolvedValue(mockProjectWithFixtureInScene as any);
      mockGraphQLClient.deleteFixtureInstance.mockResolvedValue(true);

      const result = await fixtureTools.deleteFixtureInstance({
        fixtureId: 'fixture-1',
        confirmDelete: true
      });

      expect(result.success).toBe(true);
      expect(result.affectedScenes).toHaveLength(1);
      expect(result.affectedScenes[0].name).toBe('Test Scene');
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('removed from 1 scene');
    });

    it('should handle deletion failure', async () => {
      const mockProjectWithFixture = {
        ...mockProject,
        fixtures: [{
          id: 'fixture-1',
          name: 'LED Par 1',
          manufacturer: 'Test Manufacturer',
          model: 'Test Model',
          universe: 1,
          startChannel: 1,
          tags: []
        }],
        scenes: []
      };

      mockGraphQLClient.getProjects.mockResolvedValue([mockProjectWithFixture] as any);
      mockGraphQLClient.getProject.mockResolvedValue(mockProjectWithFixture as any);
      mockGraphQLClient.deleteFixtureInstance.mockResolvedValue(false);

      await expect(fixtureTools.deleteFixtureInstance({
        fixtureId: 'fixture-1',
        confirmDelete: true
      })).rejects.toThrow('Failed to delete fixture instance');
    });

    it('should handle GraphQL errors during deletion', async () => {
      const mockProjectWithFixture = {
        ...mockProject,
        fixtures: [{
          id: 'fixture-1',
          name: 'LED Par 1',
          manufacturer: 'Test Manufacturer',
          model: 'Test Model',
          universe: 1,
          startChannel: 1,
          tags: []
        }],
        scenes: []
      };

      mockGraphQLClient.getProjects.mockResolvedValue([mockProjectWithFixture] as any);
      mockGraphQLClient.getProject.mockResolvedValue(mockProjectWithFixture as any);
      mockGraphQLClient.deleteFixtureInstance.mockRejectedValue(new Error('GraphQL error'));

      await expect(fixtureTools.deleteFixtureInstance({
        fixtureId: 'fixture-1',
        confirmDelete: true
      })).rejects.toThrow('Failed to delete fixture instance');
    });
  });

  describe('updateFixtureInstance complex updates', () => {
    it('should handle manufacturer change requiring new definition', async () => {
      const existingFixture = {
        id: 'fixture-1',
        name: 'LED Par 1',
        manufacturer: 'Old Manufacturer',
        model: 'Test Model',
        modeName: 'Standard',
        universe: 1,
        startChannel: 1,
        tags: [],
        definitionId: 'def-1',
        channelCount: 3,
        channels: []
      };

      const updatedFixture = {
        ...existingFixture,
        manufacturer: 'New Manufacturer'
      };

      mockGraphQLClient.getProjects.mockResolvedValue([{ ...mockProject, fixtures: [existingFixture] }] as any);
      mockGraphQLClient.getFixtureDefinitions.mockResolvedValue([]);
      mockGraphQLClient.createFixtureDefinition.mockResolvedValue({
        id: 'def-new',
        manufacturer: 'New Manufacturer',
        model: 'Test Model',
        type: FixtureType.LED_PAR,
        channels: [],
        modes: [],
        isBuiltIn: false
      });
      mockGraphQLClient.updateFixtureInstance.mockResolvedValue(updatedFixture as any);

      const result = await fixtureTools.updateFixtureInstance({
        fixtureId: 'fixture-1',
        manufacturer: 'New Manufacturer'
      });

      expect(mockGraphQLClient.createFixtureDefinition).toHaveBeenCalled();
      expect(result.fixture.manufacturer).toBe('New Manufacturer');
    });

    it('should handle mode change', async () => {
      const existingFixture = {
        id: 'fixture-1',
        name: 'LED Par 1',
        manufacturer: 'Test Manufacturer',
        model: 'Test Model',
        modeName: 'Standard',
        universe: 1,
        startChannel: 1,
        tags: [],
        definitionId: 'def-1',
        channelCount: 3,
        channels: []
      };

      const mockDefinitionWithModes = {
        ...mockFixtureDefinitions[0],
        modes: [
          { id: 'mode-1', name: 'Standard', channelCount: 3 },
          { id: 'mode-2', name: 'Extended', channelCount: 7 }
        ]
      };

      mockGraphQLClient.getProjects.mockResolvedValue([{ ...mockProject, fixtures: [existingFixture] }] as any);
      mockGraphQLClient.getFixtureDefinitions.mockResolvedValue([mockDefinitionWithModes]);
      mockGraphQLClient.updateFixtureInstance.mockResolvedValue({
        ...existingFixture,
        modeName: 'Extended',
        channelCount: 7
      } as any);

      const result = await fixtureTools.updateFixtureInstance({
        fixtureId: 'fixture-1',
        mode: 'Extended'
      });

      expect(result.message).toContain('Successfully updated');
    });

    it('should handle fixture not found during update', async () => {
      mockGraphQLClient.getProjects.mockResolvedValue([]);

      await expect(fixtureTools.updateFixtureInstance({
        fixtureId: 'non-existent',
        manufacturer: 'New Manufacturer'
      })).rejects.toThrow('Fixture with ID non-existent not found');
    });
  });

  describe('validation', () => {
    it('should validate input parameters', async () => {
      // Test invalid parameters trigger validation errors
      await expect(fixtureTools.getFixtureInventory({} as any)).rejects.toThrow();

      await expect(fixtureTools.createFixtureInstance({} as any)).rejects.toThrow();

      await expect(fixtureTools.getChannelMap({} as any)).rejects.toThrow();
    });
  });
});