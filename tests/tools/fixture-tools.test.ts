import { FixtureTools } from '../../src/tools/fixture-tools';
import { LacyLightsGraphQLClient } from '../../src/services/graphql-client-simple';
import { FixtureType, ChannelType, FixtureDefinition, FixtureInstance } from '../../src/types/lighting';

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