import { LacyLightsGraphQLClient } from '../../src/services/graphql-client-simple';
import fetch from 'cross-fetch';

// Mock cross-fetch
jest.mock('cross-fetch');
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('LacyLightsGraphQLClient', () => {
  let client: LacyLightsGraphQLClient;

  beforeEach(() => {
    client = new LacyLightsGraphQLClient('http://localhost:4000/graphql');
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create client with default endpoint', () => {
      const defaultClient = new LacyLightsGraphQLClient();
      expect(defaultClient).toBeInstanceOf(LacyLightsGraphQLClient);
    });

    it('should create client with custom endpoint', () => {
      const customClient = new LacyLightsGraphQLClient('http://custom:4000/graphql');
      expect(customClient).toBeInstanceOf(LacyLightsGraphQLClient);
    });
  });

  describe('query method', () => {
    it('should make successful GraphQL query', async () => {
      const mockResponse = {
        json: jest.fn().mockResolvedValue({
          data: { projects: [] }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.getProjects();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/graphql',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('projects')
        })
      );
      expect(result).toEqual([]);
    });

    it('should handle GraphQL errors', async () => {
      const mockResponse = {
        json: jest.fn().mockResolvedValue({
          errors: [{ message: 'Test error' }]
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(client.getProjects()).rejects.toThrow('Test error');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(client.getProjects()).rejects.toThrow('Network error');
    });
  });

  describe('getProject', () => {
    it('should fetch project by id', async () => {
      const mockProject = {
        id: 'test-id',
        name: 'Test Project',
        fixtures: [],
        scenes: [],
        cueLists: []
      };

      const mockResponse = {
        json: jest.fn().mockResolvedValue({
          data: { project: mockProject }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.getProject('test-id');

      expect(result).toEqual(mockProject);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/graphql',
        expect.objectContaining({
          body: expect.stringContaining('GetProject')
        })
      );
    });

    it('should return null for non-existent project', async () => {
      const mockResponse = {
        json: jest.fn().mockResolvedValue({
          data: { project: null }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.getProject('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('createProject', () => {
    it('should create project with name and description', async () => {
      const mockProject = {
        id: 'new-id',
        name: 'New Project',
        description: 'Test description',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      };

      const mockResponse = {
        json: jest.fn().mockResolvedValue({
          data: { createProject: mockProject }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.createProject({
        name: 'New Project',
        description: 'Test description'
      });

      expect(result).toEqual(mockProject);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/graphql',
        expect.objectContaining({
          body: expect.stringContaining('CreateProject')
        })
      );
    });

    it('should create project with name only', async () => {
      const mockProject = {
        id: 'new-id',
        name: 'New Project',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      };

      const mockResponse = {
        json: jest.fn().mockResolvedValue({
          data: { createProject: mockProject }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.createProject({ name: 'New Project' });
      expect(result).toEqual(mockProject);
    });
  });

  describe('createScene', () => {
    it('should create scene with fixture values', async () => {
      const mockScene = {
        id: 'scene-id',
        name: 'Test Scene',
        description: 'Test description',
        fixtureValues: []
      };

      const mockResponse = {
        json: jest.fn().mockResolvedValue({
          data: { createScene: mockScene }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.createScene({
        name: 'Test Scene',
        description: 'Test description',
        projectId: 'project-id',
        fixtureValues: [
          { fixtureId: 'fixture-1', channelValues: [255, 128, 0] }
        ]
      });

      expect(result).toEqual(mockScene);
    });
  });

  describe('updateScene', () => {
    it('should update scene with new values', async () => {
      const mockScene = {
        id: 'scene-id',
        name: 'Updated Scene',
        fixtureValues: []
      };

      const mockResponse = {
        json: jest.fn().mockResolvedValue({
          data: { updateScene: mockScene }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.updateScene('scene-id', {
        name: 'Updated Scene'
      });

      expect(result).toEqual(mockScene);
    });
  });

  describe('getFixtureDefinitions', () => {
    it('should get fixture definitions', async () => {
      const mockDefinitions = [
        {
          id: 'def-1',
          manufacturer: 'Test Manufacturer',
          model: 'Test Model',
          type: 'LED_PAR',
          channels: [],
          modes: []
        }
      ];

      const mockResponse = {
        json: jest.fn().mockResolvedValue({
          data: { fixtureDefinitions: mockDefinitions }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.getFixtureDefinitions();
      expect(result).toEqual(mockDefinitions);
    });
  });

  describe('createFixtureDefinition', () => {
    it('should create fixture definition', async () => {
      const mockDefinition = {
        id: 'def-new',
        manufacturer: 'New Manufacturer',
        model: 'New Model',
        type: 'LED_PAR',
        channels: [],
        modes: []
      };

      const mockResponse = {
        json: jest.fn().mockResolvedValue({
          data: { createFixtureDefinition: mockDefinition }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.createFixtureDefinition({
        manufacturer: 'New Manufacturer',
        model: 'New Model',
        type: 'LED_PAR',
        channels: [
          { name: 'Red', type: 'RED' }
        ]
      });

      expect(result).toEqual(mockDefinition);
    });
  });

  describe('createFixtureInstance', () => {
    it('should create fixture instance', async () => {
      const mockInstance = {
        id: 'instance-new',
        name: 'New Instance',
        manufacturer: 'Test Manufacturer',
        model: 'Test Model'
      };

      const mockResponse = {
        json: jest.fn().mockResolvedValue({
          data: { createFixtureInstance: mockInstance }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.createFixtureInstance({
        projectId: 'project-1',
        name: 'New Instance',
        definitionId: 'def-1',
        universe: 1,
        startChannel: 1,
        tags: []
      });

      expect(result).toEqual(mockInstance);
    });
  });

  describe('updateFixtureInstance', () => {
    it('should update fixture instance', async () => {
      const mockInstance = {
        id: 'instance-1',
        name: 'Updated Instance',
        manufacturer: 'Test Manufacturer',
        model: 'Test Model'
      };

      const mockResponse = {
        json: jest.fn().mockResolvedValue({
          data: { updateFixtureInstance: mockInstance }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.updateFixtureInstance('instance-1', {
        name: 'Updated Instance'
      });

      expect(result).toEqual(mockInstance);
    });
  });

  describe('getCueList', () => {
    it('should get cue list', async () => {
      const mockCueList = {
        id: 'cuelist-1',
        name: 'Test Cue List',
        cues: []
      };

      const mockResponse = {
        json: jest.fn().mockResolvedValue({
          data: { cueList: mockCueList }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.getCueList('cuelist-1');
      expect(result).toEqual(mockCueList);
    });
  });

  describe('createCueList', () => {
    it('should create cue list', async () => {
      const mockCueList = {
        id: 'cuelist-new',
        name: 'New Cue List',
        cues: []
      };

      const mockResponse = {
        json: jest.fn().mockResolvedValue({
          data: { createCueList: mockCueList }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.createCueList({
        name: 'New Cue List',
        projectId: 'project-1'
      });

      expect(result).toEqual(mockCueList);
    });
  });

  describe('updateCueList', () => {
    it('should update cue list', async () => {
      // Mock getting the current cue list first
      const mockCurrentCueList = {
        id: 'cuelist-1',
        name: 'Old Name',
        project: { id: 'project-1' }
      };

      const mockUpdatedCueList = {
        id: 'cuelist-1',
        name: 'Updated Cue List',
        cues: []
      };

      mockFetch
        .mockResolvedValueOnce({
          json: jest.fn().mockResolvedValue({
            data: { cueList: mockCurrentCueList }
          })
        } as any)
        .mockResolvedValueOnce({
          json: jest.fn().mockResolvedValue({
            data: { updateCueList: mockUpdatedCueList }
          })
        } as any);

      const result = await client.updateCueList('cuelist-1', {
        name: 'Updated Cue List'
      });

      expect(result).toEqual(mockUpdatedCueList);
    });
  });

  describe('createCue', () => {
    it('should create cue', async () => {
      const mockCue = {
        id: 'cue-new',
        name: 'New Cue',
        cueNumber: 1.0,
        scene: { id: 'scene-1', name: 'Test Scene' }
      };

      const mockResponse = {
        json: jest.fn().mockResolvedValue({
          data: { createCue: mockCue }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.createCue({
        name: 'New Cue',
        cueNumber: 1.0,
        cueListId: 'cuelist-1',
        sceneId: 'scene-1',
        fadeInTime: 3,
        fadeOutTime: 3
      });

      expect(result).toEqual(mockCue);
    });
  });

  describe('updateCue', () => {
    it('should update cue', async () => {
      // Mock getting the current cue first
      const mockCurrentCue = {
        id: 'cue-1',
        name: 'Old Name',
        cueNumber: 1.0,
        cueList: { id: 'cuelist-1' },
        scene: { id: 'scene-1' },
        fadeInTime: 3,
        fadeOutTime: 3
      };

      const mockUpdatedCue = {
        id: 'cue-1',
        name: 'Updated Cue',
        cueNumber: 1.0,
        scene: { id: 'scene-1', name: 'Test Scene' }
      };

      mockFetch
        .mockResolvedValueOnce({
          json: jest.fn().mockResolvedValue({
            data: { cue: mockCurrentCue }
          })
        } as any)
        .mockResolvedValueOnce({
          json: jest.fn().mockResolvedValue({
            data: { updateCue: mockUpdatedCue }
          })
        } as any);

      const result = await client.updateCue('cue-1', {
        name: 'Updated Cue'
      });

      expect(result).toEqual(mockUpdatedCue);
    });
  });

  describe('deleteCue', () => {
    it('should delete cue', async () => {
      const mockResponse = {
        json: jest.fn().mockResolvedValue({
          data: { deleteCue: true }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.deleteCue('cue-1');
      expect(result).toBe(true);
    });
  });

  describe('deleteCueList', () => {
    it('should delete cue list', async () => {
      const mockResponse = {
        json: jest.fn().mockResolvedValue({
          data: { deleteCueList: true }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.deleteCueList('cuelist-1');
      expect(result).toBe(true);
    });
  });

  describe('deleteProject', () => {
    it('should delete project', async () => {
      const mockResponse = {
        json: jest.fn().mockResolvedValue({
          data: { deleteProject: true }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.deleteProject('project-id');
      expect(result).toBe(true);
    });
  });
});