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
          { fixtureId: 'fixture-1', channels: [{ offset: 0, value: 255 }, { offset: 1, value: 128 }, { offset: 2, value: 0 }] }
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
          { name: 'Red', type: 'RED', offset: 0 }
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

  // ✨ SAFE SCENE MANAGEMENT GRAPHQL TESTS
  describe('Safe Scene Management GraphQL Methods', () => {
    const mockScene = {
      id: 'scene-1',
      name: 'Test Scene',
      description: 'Test scene description',
      updatedAt: '2023-01-01T00:00:00Z',
      fixtureValues: [
        {
          fixture: { id: 'fixture-1', name: 'LED Par 1' },
          channels: [{ offset: 0, value: 255 }, { offset: 1, value: 128 }, { offset: 2, value: 64 }],
          sceneOrder: 1
        }
      ]
    };

    describe('addFixturesToScene', () => {
      it('should add fixtures to scene', async () => {
        const mockResponse = {
          json: jest.fn().mockResolvedValue({
            data: { addFixturesToScene: mockScene }
          })
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        const result = await client.addFixturesToScene(
          'scene-1',
          [{ fixtureId: 'fixture-1', channels: [{ offset: 0, value: 255 }, { offset: 1, value: 128 }, { offset: 2, value: 64 }], sceneOrder: 1 }],
          false
        );

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:4000/graphql',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('AddFixturesToScene')
          })
        );
        expect(result).toEqual(mockScene);
      });

      it('should handle overwrite parameter', async () => {
        const mockResponse = {
          json: jest.fn().mockResolvedValue({
            data: { addFixturesToScene: mockScene }
          })
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        await client.addFixturesToScene(
          'scene-1',
          [{ fixtureId: 'fixture-1', channels: [{ offset: 0, value: 255 }, { offset: 1, value: 0 }, { offset: 2, value: 0 }] }],
          true
        );

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:4000/graphql',
          expect.objectContaining({
            body: expect.stringContaining('"overwriteExisting":true')
          })
        );
      });

      it('should include sceneOrder in GraphQL query response', async () => {
        const mockResponse = {
          json: jest.fn().mockResolvedValue({
            data: { addFixturesToScene: mockScene }
          })
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        await client.addFixturesToScene('scene-1', [{ fixtureId: 'fixture-1', channels: [{ offset: 0, value: 255 }, { offset: 1, value: 0 }, { offset: 2, value: 0 }] }], false);

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:4000/graphql',
          expect.objectContaining({
            body: expect.stringContaining('sceneOrder')
          })
        );
      });

      it('should handle addFixturesToScene errors', async () => {
        mockFetch.mockRejectedValue(new Error('Network error'));

        await expect(client.addFixturesToScene(
          'scene-1',
          [{ fixtureId: 'fixture-1', channels: [{ offset: 0, value: 255 }, { offset: 1, value: 0 }, { offset: 2, value: 0 }] }],
          false
        )).rejects.toThrow('Network error');
      });
    });

    describe('removeFixturesFromScene', () => {
      it('should remove fixtures from scene', async () => {
        const mockResponse = {
          json: jest.fn().mockResolvedValue({
            data: { removeFixturesFromScene: mockScene }
          })
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        const result = await client.removeFixturesFromScene('scene-1', ['fixture-2']);

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:4000/graphql',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('RemoveFixturesFromScene')
          })
        );
        expect(result).toEqual(mockScene);
      });

      it('should remove multiple fixtures', async () => {
        const mockResponse = {
          json: jest.fn().mockResolvedValue({
            data: { removeFixturesFromScene: mockScene }
          })
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        await client.removeFixturesFromScene('scene-1', ['fixture-1', 'fixture-2']);

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:4000/graphql',
          expect.objectContaining({
            body: expect.stringContaining('"fixtureIds":["fixture-1","fixture-2"]')
          })
        );
      });

      it('should include sceneOrder in response', async () => {
        const mockResponse = {
          json: jest.fn().mockResolvedValue({
            data: { removeFixturesFromScene: mockScene }
          })
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        await client.removeFixturesFromScene('scene-1', ['fixture-1']);

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:4000/graphql',
          expect.objectContaining({
            body: expect.stringContaining('sceneOrder')
          })
        );
      });

      it('should handle removeFixturesFromScene errors', async () => {
        mockFetch.mockRejectedValue(new Error('Network error'));

        await expect(client.removeFixturesFromScene('scene-1', ['fixture-1']))
          .rejects.toThrow('Network error');
      });
    });

    describe('updateScenePartial', () => {
      it('should update scene with metadata only', async () => {
        const mockResponse = {
          json: jest.fn().mockResolvedValue({
            data: { updateScenePartial: mockScene }
          })
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        const result = await client.updateScenePartial('scene-1', {
          name: 'Updated Scene',
          description: 'Updated description'
        });

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:4000/graphql',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('UpdateScenePartial')
          })
        );
        expect(result).toEqual(mockScene);
      });

      it('should update scene with fixture values', async () => {
        const mockResponse = {
          json: jest.fn().mockResolvedValue({
            data: { updateScenePartial: mockScene }
          })
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        await client.updateScenePartial('scene-1', {
          name: 'Updated Scene',
          fixtureValues: [{ fixtureId: 'fixture-1', channels: [{ offset: 0, value: 255 }, { offset: 1, value: 0 }, { offset: 2, value: 0 }] }],
          mergeFixtures: true
        });

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:4000/graphql',
          expect.objectContaining({
            body: expect.stringContaining('"mergeFixtures":true')
          })
        );
      });

      it('should handle merge mode correctly', async () => {
        const mockResponse = {
          json: jest.fn().mockResolvedValue({
            data: { updateScenePartial: mockScene }
          })
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        await client.updateScenePartial('scene-1', {
          fixtureValues: [{ fixtureId: 'fixture-1', channels: [{ offset: 0, value: 255 }, { offset: 1, value: 0 }, { offset: 2, value: 0 }] }],
          mergeFixtures: false
        });

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:4000/graphql',
          expect.objectContaining({
            body: expect.stringContaining('"mergeFixtures":false')
          })
        );
      });

      it('should include sceneOrder in fixture values', async () => {
        const mockResponse = {
          json: jest.fn().mockResolvedValue({
            data: { updateScenePartial: mockScene }
          })
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        await client.updateScenePartial('scene-1', {
          fixtureValues: [{ 
            fixtureId: 'fixture-1', 
            channels: [{ offset: 0, value: 255 }, { offset: 1, value: 0 }, { offset: 2, value: 0 }], 
            sceneOrder: 5 
          }]
        });

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:4000/graphql',
          expect.objectContaining({
            body: expect.stringContaining('sceneOrder')
          })
        );
      });

      it('should handle updateScenePartial errors', async () => {
        mockFetch.mockRejectedValue(new Error('Network error'));

        await expect(client.updateScenePartial('scene-1', { name: 'Updated' }))
          .rejects.toThrow('Network error');
      });
    });

    describe('GraphQL Query Structure', () => {
      it('should include all required fields in scene queries', async () => {
        const mockResponse = {
          json: jest.fn().mockResolvedValue({
            data: { addFixturesToScene: mockScene }
          })
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        await client.addFixturesToScene('scene-1', [{ fixtureId: 'fixture-1', channels: [{ offset: 0, value: 255 }, { offset: 1, value: 0 }, { offset: 2, value: 0 }] }], false);

        const callBody = mockFetch.mock.calls[0][1]?.body as string;
        const parsedBody = JSON.parse(callBody);
        const query = parsedBody.query;

        // Verify required fields are included in the GraphQL query
        expect(query).toContain('id');
        expect(query).toContain('name');
        expect(query).toContain('description');
        expect(query).toContain('updatedAt');
        expect(query).toContain('fixtureValues');
        expect(query).toContain('fixture');
        expect(query).toContain('channels');
        expect(query).toContain('sceneOrder');
      });

      it('should structure mutation variables correctly', async () => {
        const mockResponse = {
          json: jest.fn().mockResolvedValue({
            data: { addFixturesToScene: mockScene }
          })
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        await client.addFixturesToScene(
          'test-scene',
          [
            { fixtureId: 'fixture-1', channels: [{ offset: 0, value: 255 }, { offset: 1, value: 128 }, { offset: 2, value: 64 }], sceneOrder: 1 },
            { fixtureId: 'fixture-2', channels: [{ offset: 0, value: 200 }, { offset: 1, value: 100 }, { offset: 2, value: 50 }] }
          ],
          true
        );

        const callBody = mockFetch.mock.calls[0][1]?.body as string;
        const parsedBody = JSON.parse(callBody);

        expect(parsedBody.variables).toEqual({
          sceneId: 'test-scene',
          fixtureValues: [
            { fixtureId: 'fixture-1', channels: [{ offset: 0, value: 255 }, { offset: 1, value: 128 }, { offset: 2, value: 64 }], sceneOrder: 1 },
            { fixtureId: 'fixture-2', channels: [{ offset: 0, value: 200 }, { offset: 1, value: 100 }, { offset: 2, value: 50 }] }
          ],
          overwriteExisting: true
        });
      });
    });

    describe('API Consistency Tests', () => {
      it('should use consistent response structure across all safe scene methods', async () => {
        const mockResponse = {
          json: jest.fn().mockResolvedValue({
            data: { 
              addFixturesToScene: mockScene,
              removeFixturesFromScene: mockScene,
              updateScenePartial: mockScene
            }
          })
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        // Test addFixturesToScene
        const addResult = await client.addFixturesToScene(
          'scene-1',
          [{ fixtureId: 'fixture-1', channels: [{ offset: 0, value: 255 }, { offset: 1, value: 0 }, { offset: 2, value: 0 }] }],
          false
        );

        // Test removeFixturesFromScene  
        const removeResult = await client.removeFixturesFromScene('scene-1', ['fixture-1']);

        // Test updateScenePartial
        const updateResult = await client.updateScenePartial('scene-1', { name: 'Updated' });

        // Verify all return the same structure
        expect(addResult).toEqual(mockScene);
        expect(removeResult).toEqual(mockScene);
        expect(updateResult).toEqual(mockScene);

        // Verify all include sceneOrder
        expect(addResult.fixtureValues[0]).toHaveProperty('sceneOrder');
        expect(removeResult.fixtureValues[0]).toHaveProperty('sceneOrder');
        expect(updateResult.fixtureValues[0]).toHaveProperty('sceneOrder');
      });
    });

    describe('Error Handling', () => {
      it('should handle GraphQL errors consistently', async () => {
        const mockResponse = {
          json: jest.fn().mockResolvedValue({
            errors: [{ message: 'Scene not found' }]
          })
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        await expect(client.addFixturesToScene(
          'non-existent',
          [{ fixtureId: 'fixture-1', channels: [{ offset: 0, value: 255 }, { offset: 1, value: 0 }, { offset: 2, value: 0 }] }],
          false
        )).rejects.toThrow('Scene not found');

        await expect(client.removeFixturesFromScene('non-existent', ['fixture-1']))
          .rejects.toThrow('Scene not found');

        await expect(client.updateScenePartial('non-existent', { name: 'Updated' }))
          .rejects.toThrow('Scene not found');
      });

      it('should handle network errors', async () => {
        mockFetch.mockRejectedValue(new Error('Network timeout'));

        await expect(client.addFixturesToScene(
          'scene-1',
          [{ fixtureId: 'fixture-1', channels: [{ offset: 0, value: 255 }, { offset: 1, value: 0 }, { offset: 2, value: 0 }] }],
          false
        )).rejects.toThrow('Network timeout');
      });

      it('should handle malformed responses', async () => {
        const mockResponse = {
          json: jest.fn().mockResolvedValue({})
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        await expect(client.addFixturesToScene(
          'scene-1',
          [{ fixtureId: 'fixture-1', channels: [{ offset: 0, value: 255 }, { offset: 1, value: 0 }, { offset: 2, value: 0 }] }],
          false
        )).rejects.toThrow();
      });
    });
  });

  describe('bulkUpdateCues', () => {
    it('should bulk update cues', async () => {
      const mockCues = [
        { id: '1', name: 'Cue 1', cueNumber: 1, fadeInTime: 2, fadeOutTime: 2, followTime: null, notes: '', scene: { id: 'scene-1', name: 'Scene 1' } },
        { id: '2', name: 'Cue 2', cueNumber: 2, fadeInTime: 3, fadeOutTime: 3, followTime: null, notes: '', scene: { id: 'scene-1', name: 'Scene 1' } }
      ];
      const mockResponse = {
        json: jest.fn().mockResolvedValue({
          data: { bulkUpdateCues: mockCues }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.bulkUpdateCues({
        cueIds: ['1', '2'],
        fadeInTime: 2.5,
        fadeOutTime: 2.5,
        followTime: null,
        easingType: 'linear'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/graphql',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('BulkUpdateCues')
        })
      );
      expect(result).toEqual(mockCues);
    });
  });

  describe('deleteFixtureInstance', () => {
    it('should delete fixture instance', async () => {
      const mockResponse = {
        json: jest.fn().mockResolvedValue({
          data: { deleteFixtureInstance: true }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.deleteFixtureInstance('fixture-1');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/graphql',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('DeleteFixtureInstance')
        })
      );
      expect(result).toBe(true);
    });
  });

  describe('setSceneLive', () => {
    it('should set scene live', async () => {
      const mockResponse = {
        json: jest.fn().mockResolvedValue({
          data: { setSceneLive: true }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.setSceneLive('scene-1');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/graphql',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('ActivateScene')
        })
      );
      expect(result).toBe(true);
    });
  });

  describe('fadeToBlack', () => {
    it('should fade to black', async () => {
      const mockResponse = {
        json: jest.fn().mockResolvedValue({
          data: { fadeToBlack: true }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.fadeToBlack(3.0);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/graphql',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('FadeToBlack')
        })
      );
      expect(result).toBe(true);
    });
  });

  describe('getScene', () => {
    it('should get scene by id', async () => {
      const mockScene = {
        id: 'scene-1',
        name: 'Test Scene',
        description: 'A test scene',
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
        fixtureValues: []
      };
      const mockResponse = {
        json: jest.fn().mockResolvedValue({
          data: { scene: mockScene }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.getScene('scene-1');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/graphql',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('GetScene')
        })
      );
      expect(result).toEqual(mockScene);
    });

    it('should return null for non-existent scene', async () => {
      const mockResponse = {
        json: jest.fn().mockResolvedValue({
          data: { scene: null }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.getScene('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('goToCue', () => {
    it('should go to cue', async () => {
      const mockResponse = {
        json: jest.fn().mockResolvedValue({
          data: { goToCue: true }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.goToCue('cue-list-1', 2, 1.5);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/graphql',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('GoToCue')
        })
      );
      expect(result).toBe(true);
    });

    it('should go to cue without fade time', async () => {
      const mockResponse = {
        json: jest.fn().mockResolvedValue({
          data: { goToCue: true }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.goToCue('cue-list-1', 2);

      expect(result).toBe(true);
    });
  });

  describe('stopCueList', () => {
    it('should stop cue list', async () => {
      const mockResponse = {
        json: jest.fn().mockResolvedValue({
          data: { stopCueList: true }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.stopCueList('cue-list-1');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/graphql',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('StopCueList')
        })
      );
      expect(result).toBe(true);
    });
  });

  describe('getCurrentActiveScene', () => {
    it('should get current active scene', async () => {
      const mockScene = {
        id: 'scene-1',
        name: 'Active Scene',
        description: 'Currently active scene',
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
        project: { id: 'project-1', name: 'Test Project' },
        fixtureValues: []
      };
      const mockResponse = {
        json: jest.fn().mockResolvedValue({
          data: { currentActiveScene: mockScene }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.getCurrentActiveScene();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/graphql',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('GetCurrentActiveScene')
        })
      );
      expect(result).toEqual(mockScene);
    });

    it('should return null when no scene is active', async () => {
      const mockResponse = {
        json: jest.fn().mockResolvedValue({
          data: { currentActiveScene: null }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.getCurrentActiveScene();
      expect(result).toBeNull();
    });
  });

  describe('getCue', () => {
    it('should get cue by id', async () => {
      const mockCue = {
        id: 'cue-1',
        name: 'Test Cue',
        cueNumber: 1,
        fadeInTime: 2,
        fadeOutTime: 2,
        followTime: null,
        notes: 'Test notes',
        scene: { id: 'scene-1', name: 'Scene 1' }
      };
      const mockResponse = {
        json: jest.fn().mockResolvedValue({
          data: { cue: mockCue }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.getCue('cue-1');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/graphql',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('GetCue')
        })
      );
      expect(result).toEqual(mockCue);
    });

    it('should return null for non-existent cue', async () => {
      const mockResponse = {
        json: jest.fn().mockResolvedValue({
          data: { cue: null }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.getCue('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('previousCue', () => {
    it('should go to previous cue', async () => {
      const mockResponse = {
        json: jest.fn().mockResolvedValue({
          data: { previousCue: true }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.previousCue('cue-list-1', 1.5);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/graphql',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('PreviousCue')
        })
      );
      expect(result).toBe(true);
    });

    it('should go to previous cue without fade time', async () => {
      const mockResponse = {
        json: jest.fn().mockResolvedValue({
          data: { previousCue: true }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.previousCue('cue-list-1');

      expect(result).toBe(true);
    });
  });

  describe('playCue', () => {
    it('should play cue with fade time', async () => {
      const mockResponse = {
        json: jest.fn().mockResolvedValue({
          data: { playCue: true }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.playCue('cue-1', 2.0);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/graphql',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('PlayCue')
        })
      );
      expect(result).toBe(true);
    });

    it('should play cue without fade time', async () => {
      const mockResponse = {
        json: jest.fn().mockResolvedValue({
          data: { playCue: true }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.playCue('cue-1');

      expect(result).toBe(true);
    });
  });

  describe('getCueListPlaybackStatus', () => {
    it('should get cue list playback status', async () => {
      const mockStatus = {
        cueListId: 'cue-list-1',
        currentCueIndex: 2,
        isPlaying: true,
        isFading: false,
        currentCue: {
          id: 'cue-2',
          name: 'Scene 2',
          cueNumber: 2,
          fadeInTime: 3,
          fadeOutTime: 3,
          followTime: null
        }
      };
      const mockResponse = {
        json: jest.fn().mockResolvedValue({
          data: { cueListPlaybackStatus: mockStatus }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.getCueListPlaybackStatus('cue-list-1');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/graphql',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('GetCueListPlaybackStatus')
        })
      );
      expect(result).toEqual(mockStatus);
    });

    it('should include isFading in query', async () => {
      const mockStatus = {
        cueListId: 'cue-list-1',
        currentCueIndex: 0,
        isPlaying: true,
        isFading: true,
        fadeProgress: 50,
        lastUpdated: '2024-01-01T00:00:00Z'
      };
      const mockResponse = {
        json: jest.fn().mockResolvedValue({
          data: { cueListPlaybackStatus: mockStatus }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await client.getCueListPlaybackStatus('cue-list-1');

      // Verify the query includes isFading field
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/graphql',
        expect.objectContaining({
          body: expect.stringContaining('isFading')
        })
      );
    });
  });

  describe('startCueList', () => {
    it('should start cue list from beginning', async () => {
      const mockResponse = {
        json: jest.fn().mockResolvedValue({
          data: { startCueList: true }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.startCueList('cue-list-1');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/graphql',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('StartCueList')
        })
      );
      expect(result).toBe(true);
    });

    it('should start cue list from specific cue', async () => {
      const mockResponse = {
        json: jest.fn().mockResolvedValue({
          data: { startCueList: true }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.startCueList('cue-list-1', 3);

      expect(result).toBe(true);
    });
  });

  describe('nextCue', () => {
    it('should advance to next cue', async () => {
      const mockResponse = {
        json: jest.fn().mockResolvedValue({
          data: { nextCue: true }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.nextCue('cue-list-1', 1.5);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/graphql',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('NextCue')
        })
      );
      expect(result).toBe(true);
    });

    it('should advance to next cue without fade time', async () => {
      const mockResponse = {
        json: jest.fn().mockResolvedValue({
          data: { nextCue: true }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.nextCue('cue-list-1');

      expect(result).toBe(true);
    });
  });
});
