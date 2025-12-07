import { ProjectTools } from '../../src/tools/project-tools';
import { LacyLightsGraphQLClient } from '../../src/services/graphql-client-simple';
import { Project, FixtureType } from '../../src/types/lighting';

// Mock the GraphQL client
jest.mock('../../src/services/graphql-client-simple');
const MockGraphQLClient = LacyLightsGraphQLClient as jest.MockedClass<typeof LacyLightsGraphQLClient>;

describe('ProjectTools', () => {
  let projectTools: ProjectTools;
  let mockGraphQLClient: jest.Mocked<LacyLightsGraphQLClient>;

  const mockProject: Project = {
    id: 'project-1',
    name: 'Test Project',
    description: 'Test description',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    fixtures: [
      {
        id: 'fixture-1',
        name: 'LED Par 1',
        definitionId: 'def-1',
        manufacturer: 'Test Manufacturer',
        model: 'Test Model',
        type: FixtureType.LED_PAR,
        modeName: 'Standard',
        channelCount: 3,
        channels: [],
        universe: 1,
        startChannel: 1,
        tags: ['wash']
      },
      {
        id: 'fixture-2',
        name: 'LED Par 2',
        definitionId: 'def-1',
        manufacturer: 'Test Manufacturer',
        model: 'Test Model',
        type: FixtureType.LED_PAR,
        modeName: 'Standard',
        channelCount: 3,
        channels: [],
        universe: 1,
        startChannel: 4,
        tags: ['wash']
      }
    ],
    scenes: [
      {
        id: 'scene-1',
        name: 'Test Scene',
        description: 'Test scene description',
        fixtureValues: []
      }
    ],
    cueLists: [
      {
        id: 'cuelist-1',
        name: 'Test Cue List',
        description: 'Test cue list description',
        loop: false,
        cues: []
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockGraphQLClient = {
      getProjects: jest.fn(),
      getProjectsWithCounts: jest.fn(),
      getProject: jest.fn(),
      getProjectWithCounts: jest.fn(),
      createProject: jest.fn(),
      deleteProject: jest.fn(),
    } as any;

    MockGraphQLClient.mockImplementation(() => mockGraphQLClient);
    projectTools = new ProjectTools(mockGraphQLClient);
  });

  describe('listProjects', () => {
    it('should list projects without details', async () => {
      mockGraphQLClient.getProjects.mockResolvedValue([mockProject]);

      const result = await projectTools.listProjects({ includeDetails: false });

      expect(mockGraphQLClient.getProjects).toHaveBeenCalled();
      expect(result).toEqual({
        projects: [
          {
            id: 'project-1',
            name: 'Test Project',
            description: 'Test description'
          }
        ],
        totalProjects: 1
      });
    });

    it('should list projects with details using count query', async () => {
      const mockProjectWithCounts = {
        id: 'project-1',
        name: 'Test Project',
        description: 'Test description',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        fixtureCount: 2,
        sceneCount: 1,
        cueListCount: 1
      };

      mockGraphQLClient.getProjectsWithCounts.mockResolvedValue([mockProjectWithCounts]);

      const result = await projectTools.listProjects({ includeDetails: true });

      expect(mockGraphQLClient.getProjectsWithCounts).toHaveBeenCalled();
      expect(result).toEqual({
        projects: [
          {
            id: 'project-1',
            name: 'Test Project',
            description: 'Test description',
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
            fixtureCount: 2,
            sceneCount: 1,
            cueListCount: 1
          }
        ],
        totalProjects: 1
      });
    });

    it('should use default value for includeDetails', async () => {
      mockGraphQLClient.getProjects.mockResolvedValue([]);

      const result = await projectTools.listProjects({ includeDetails: false });

      expect(result.projects).toEqual([]);
      expect(result.totalProjects).toBe(0);
    });

    it('should handle empty project list', async () => {
      mockGraphQLClient.getProjects.mockResolvedValue([]);

      const result = await projectTools.listProjects({ includeDetails: false });

      expect(result).toEqual({
        projects: [],
        totalProjects: 0
      });
    });

    it('should handle GraphQL client errors', async () => {
      mockGraphQLClient.getProjects.mockRejectedValue(new Error('GraphQL error'));

      await expect(projectTools.listProjects({ includeDetails: false })).rejects.toThrow('Failed to list projects: Error: GraphQL error');
    });
  });

  describe('createProject', () => {
    it('should create project with name and description', async () => {
      const createdProject = {
        id: 'new-project',
        name: 'New Project',
        description: 'New description',
        createdAt: '2024-01-01'
      };

      mockGraphQLClient.createProject.mockResolvedValue(createdProject as any);

      const result = await projectTools.createProject({
        name: 'New Project',
        description: 'New description'
      });

      expect(mockGraphQLClient.createProject).toHaveBeenCalledWith({
        name: 'New Project',
        description: 'New description'
      });

      expect(result).toEqual({
        project: {
          id: 'new-project',
          name: 'New Project',
          description: 'New description',
          createdAt: '2024-01-01'
        },
        message: 'Successfully created project "New Project"'
      });
    });

    it('should create project with name only', async () => {
      const createdProject = {
        id: 'new-project',
        name: 'New Project',
        createdAt: '2024-01-01'
      };

      mockGraphQLClient.createProject.mockResolvedValue(createdProject as any);

      const result = await projectTools.createProject({
        name: 'New Project'
      });

      expect(mockGraphQLClient.createProject).toHaveBeenCalledWith({
        name: 'New Project',
        description: undefined
      });

      expect(result.project.name).toBe('New Project');
    });

    it('should handle creation errors', async () => {
      mockGraphQLClient.createProject.mockRejectedValue(new Error('Creation failed'));

      await expect(projectTools.createProject({ name: 'Test' })).rejects.toThrow('Failed to create project: Error: Creation failed');
    });

    it('should validate required name field', async () => {
      await expect(projectTools.createProject({} as any)).rejects.toThrow();
    });
  });

  describe('getProject', () => {
    it('should get project with counts', async () => {
      const mockProjectWithCounts = {
        id: 'project-1',
        name: 'Test Project',
        description: 'Test description',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        fixtureCount: 2,
        sceneCount: 1,
        cueListCount: 1
      };

      mockGraphQLClient.getProjectWithCounts.mockResolvedValue(mockProjectWithCounts);

      const result = await projectTools.getProject({ projectId: 'project-1' });

      expect(mockGraphQLClient.getProjectWithCounts).toHaveBeenCalledWith('project-1');
      expect(result).toEqual({
        project: {
          id: 'project-1',
          name: 'Test Project',
          description: 'Test description',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
          fixtureCount: 2,
          sceneCount: 1,
          cueListCount: 1
        }
      });
    });

    it('should handle project not found', async () => {
      mockGraphQLClient.getProjectWithCounts.mockResolvedValue(null);

      await expect(projectTools.getProject({ projectId: 'non-existent' }))
        .rejects.toThrow('Project with ID non-existent not found');
    });

    it('should handle GraphQL client errors', async () => {
      mockGraphQLClient.getProjectWithCounts.mockRejectedValue(new Error('GraphQL error'));

      await expect(projectTools.getProject({ projectId: 'project-1' }))
        .rejects.toThrow('Failed to get project: Error: GraphQL error');
    });

    it('should handle project with zero counts', async () => {
      const mockEmptyProject = {
        id: 'project-1',
        name: 'Empty Project',
        description: 'Empty description',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        fixtureCount: 0,
        sceneCount: 0,
        cueListCount: 0
      };

      mockGraphQLClient.getProjectWithCounts.mockResolvedValue(mockEmptyProject);

      const result = await projectTools.getProject({ projectId: 'project-1' });

      expect(result.project.fixtureCount).toBe(0);
      expect(result.project.sceneCount).toBe(0);
      expect(result.project.cueListCount).toBe(0);
    });
  });

  describe('getProjectDetails', () => {
    it('should get project details with fixtures organized by universe', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(mockProject);

      const result = await projectTools.getProjectDetails({ projectId: 'project-1' });

      expect(mockGraphQLClient.getProject).toHaveBeenCalledWith('project-1');
      expect(result.project).toEqual({
        id: 'project-1',
        name: 'Test Project',
        description: 'Test description',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      });

      expect(result.fixtures.total).toBe(2);
      expect(result.fixtures.byUniverse).toHaveLength(1);
      expect(result.fixtures.byUniverse[0].universe).toBe(1);
      expect(result.fixtures.byUniverse[0].fixtureCount).toBe(2);
      expect(result.fixtures.byUniverse[0].fixtures).toHaveLength(2);

      // Check fixtures are sorted by start channel
      expect(result.fixtures.byUniverse[0].fixtures[0].channels).toBe('1-3');
      expect(result.fixtures.byUniverse[0].fixtures[1].channels).toBe('4-6');

      expect(result.scenes.total).toBe(1);
      expect(result.cueLists.total).toBe(1);
    });

    it('should handle project not found', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(null);

      await expect(projectTools.getProjectDetails({ projectId: 'non-existent' }))
        .rejects.toThrow('Project with ID non-existent not found');
    });

    it('should handle project with no fixtures', async () => {
      const emptyProject = {
        ...mockProject,
        fixtures: [],
        scenes: [],
        cueLists: []
      };

      mockGraphQLClient.getProject.mockResolvedValue(emptyProject);

      const result = await projectTools.getProjectDetails({ projectId: 'project-1' });

      expect(result.fixtures.total).toBe(0);
      expect(result.fixtures.byUniverse).toHaveLength(0);
      expect(result.scenes.total).toBe(0);
      expect(result.cueLists.total).toBe(0);
    });

    it('should handle GraphQL client errors', async () => {
      mockGraphQLClient.getProject.mockRejectedValue(new Error('GraphQL error'));

      await expect(projectTools.getProjectDetails({ projectId: 'project-1' }))
        .rejects.toThrow('Failed to get project details: Error: GraphQL error');
    });

    it('should calculate channel ranges correctly', async () => {
      const projectWithManyFixtures = {
        ...mockProject,
        fixtures: [
          { ...mockProject.fixtures[0], startChannel: 1, channelCount: 3 }, // 1-3
          { ...mockProject.fixtures[1], startChannel: 4, channelCount: 3 }, // 4-6 (continuous)
          { ...mockProject.fixtures[0], id: 'fixture-3', startChannel: 10, channelCount: 4 }, // 10-13 (gap)
        ]
      };

      mockGraphQLClient.getProject.mockResolvedValue(projectWithManyFixtures);

      const result = await projectTools.getProjectDetails({ projectId: 'project-1' });

      expect(result.fixtures.byUniverse[0].channelRanges).toBe('1-6, 10-13');
    });
  });

  describe('deleteProject', () => {
    it('should delete project when confirmed', async () => {
      mockGraphQLClient.deleteProject.mockResolvedValue(true);

      const result = await projectTools.deleteProject({
        projectId: 'project-1',
        confirmDelete: true
      });

      expect(mockGraphQLClient.deleteProject).toHaveBeenCalledWith('project-1');
      expect(result).toEqual({
        success: true,
        message: 'Project project-1 deleted successfully'
      });
    });

    it('should throw error when deletion not confirmed', async () => {
      await expect(projectTools.deleteProject({
        projectId: 'project-1',
        confirmDelete: false
      })).rejects.toThrow('Deletion not confirmed. Set confirmDelete to true to proceed.');

      expect(mockGraphQLClient.deleteProject).not.toHaveBeenCalled();
    });

    it('should use default value for confirmDelete', async () => {
      await expect(projectTools.deleteProject({
        projectId: 'project-1'
      } as any)).rejects.toThrow('Deletion not confirmed');
    });

    it('should handle deletion failure', async () => {
      mockGraphQLClient.deleteProject.mockResolvedValue(false);

      const result = await projectTools.deleteProject({
        projectId: 'project-1',
        confirmDelete: true
      });

      expect(result).toEqual({
        success: false,
        message: 'Failed to delete project'
      });
    });

    it('should handle GraphQL client errors', async () => {
      mockGraphQLClient.deleteProject.mockRejectedValue(new Error('Delete error'));

      await expect(projectTools.deleteProject({
        projectId: 'project-1',
        confirmDelete: true
      })).rejects.toThrow('Failed to delete project: Error: Delete error');
    });
  });

  describe('calculateChannelRanges private method', () => {
    it('should handle empty fixtures', async () => {
      const projectWithNoFixtures = {
        ...mockProject,
        fixtures: []
      };

      mockGraphQLClient.getProject.mockResolvedValue(projectWithNoFixtures);

      const result = await projectTools.getProjectDetails({ projectId: 'project-1' });

      expect(result.fixtures.byUniverse).toHaveLength(0);
    });

    it('should handle single channel fixture', async () => {
      const projectWithSingleChannel = {
        ...mockProject,
        fixtures: [
          { ...mockProject.fixtures[0], startChannel: 1, channelCount: 1 }
        ]
      };

      mockGraphQLClient.getProject.mockResolvedValue(projectWithSingleChannel);

      const result = await projectTools.getProjectDetails({ projectId: 'project-1' });

      expect(result.fixtures.byUniverse[0].channelRanges).toBe('1');
    });
  });

  describe('Bulk Project Operations', () => {
    describe('bulkCreateProjects', () => {
      it('should successfully bulk create projects', async () => {
        const mockCreatedProjects = [
          {
            id: 'project-1',
            name: 'Project 1',
            description: 'First project',
            createdAt: '2024-01-01T00:00:00Z'
          },
          {
            id: 'project-2',
            name: 'Project 2',
            description: 'Second project',
            createdAt: '2024-01-01T00:00:00Z'
          }
        ];

        mockGraphQLClient.bulkCreateProjects = jest.fn().mockResolvedValue(mockCreatedProjects);

        const result = await projectTools.bulkCreateProjects({
          projects: [
            { name: 'Project 1', description: 'First project' },
            { name: 'Project 2', description: 'Second project' }
          ]
        });

        expect(result.success).toBe(true);
        expect(result.createdProjects).toHaveLength(2);
        expect(result.summary.totalCreated).toBe(2);
        expect(result.message).toBe('Successfully created 2 projects');
      });

      it('should reject empty projects array', async () => {
        await expect(projectTools.bulkCreateProjects({
          projects: []
        })).rejects.toThrow('No projects provided for bulk creation');
      });

      it('should handle GraphQL errors', async () => {
        mockGraphQLClient.bulkCreateProjects = jest.fn().mockRejectedValue(new Error('GraphQL error'));

        await expect(projectTools.bulkCreateProjects({
          projects: [{ name: 'Test Project' }]
        })).rejects.toThrow('Failed to bulk create projects: Error: GraphQL error');
      });

      it('should create projects without descriptions', async () => {
        const mockCreatedProject = {
          id: 'project-1',
          name: 'Project Without Description',
          description: null,
          createdAt: '2024-01-01T00:00:00Z'
        };

        mockGraphQLClient.bulkCreateProjects = jest.fn().mockResolvedValue([mockCreatedProject]);

        const result = await projectTools.bulkCreateProjects({
          projects: [{ name: 'Project Without Description' }]
        });

        expect(result.success).toBe(true);
        expect(result.createdProjects[0].name).toBe('Project Without Description');
      });
    });

    describe('bulkDeleteProjects', () => {
      it('should successfully bulk delete projects', async () => {
        mockGraphQLClient.bulkDeleteProjects = jest.fn().mockResolvedValue({
          successCount: 3,
          failedIds: []
        });

        const result = await projectTools.bulkDeleteProjects({
          projectIds: ['project-1', 'project-2', 'project-3'],
          confirmDelete: true
        });

        expect(result.success).toBe(true);
        expect(result.deletedCount).toBe(3);
        expect(result.failedIds).toEqual([]);
        expect(result.summary.totalRequested).toBe(3);
        expect(result.summary.successCount).toBe(3);
        expect(result.summary.failureCount).toBe(0);
        expect(result.message).toBe('Successfully deleted 3 projects');
      });

      it('should handle partial deletion failures', async () => {
        mockGraphQLClient.bulkDeleteProjects = jest.fn().mockResolvedValue({
          successCount: 2,
          failedIds: ['project-3']
        });

        const result = await projectTools.bulkDeleteProjects({
          projectIds: ['project-1', 'project-2', 'project-3'],
          confirmDelete: true
        });

        expect(result.success).toBe(true);
        expect(result.deletedCount).toBe(2);
        expect(result.failedIds).toEqual(['project-3']);
        expect(result.summary.failureCount).toBe(1);
        expect(result.message).toBe('Deleted 2 projects, 1 failed');
      });

      it('should require confirmDelete to be true', async () => {
        await expect(projectTools.bulkDeleteProjects({
          projectIds: ['project-1'],
          confirmDelete: false
        })).rejects.toThrow('confirmDelete must be true to delete projects');
      });

      it('should reject empty project ID array', async () => {
        await expect(projectTools.bulkDeleteProjects({
          projectIds: [],
          confirmDelete: true
        })).rejects.toThrow('No project IDs provided for bulk deletion');
      });

      it('should handle GraphQL errors', async () => {
        mockGraphQLClient.bulkDeleteProjects = jest.fn().mockRejectedValue(new Error('GraphQL error'));

        await expect(projectTools.bulkDeleteProjects({
          projectIds: ['project-1'],
          confirmDelete: true
        })).rejects.toThrow('Failed to bulk delete projects: Error: GraphQL error');
      });

      it('should return success: false when all deletions fail', async () => {
        mockGraphQLClient.bulkDeleteProjects = jest.fn().mockResolvedValue({
          successCount: 0,
          failedIds: ['project-1', 'project-2']
        });

        const result = await projectTools.bulkDeleteProjects({
          projectIds: ['project-1', 'project-2'],
          confirmDelete: true
        });

        expect(result.success).toBe(false);
        expect(result.deletedCount).toBe(0);
        expect(result.failedIds).toEqual(['project-1', 'project-2']);
      });
    });
  });
});