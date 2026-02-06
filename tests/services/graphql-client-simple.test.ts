import { LacyLightsGraphQLClient } from '../../src/services/graphql-client-simple';
import fetch from 'cross-fetch';

// Mock cross-fetch
jest.mock('cross-fetch');
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

/**
 * Helper to create a mock fetch response with proper Response-like properties.
 * @param data The data to return from json()
 * @param options Optional configuration for status code, ok flag, and status text
 */
function createMockResponse(
  data: any,
  options: { ok?: boolean; status?: number; statusText?: string } = {}
): Partial<Response> {
  const { ok = true, status = ok ? 200 : 500, statusText = ok ? 'OK' : 'Internal Server Error' } = options;
  return {
    ok,
    status,
    statusText,
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(JSON.stringify(data)),
  };
}

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
        ok: true,
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
        ok: true,
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

    it('should handle non-2xx responses with error details', async () => {
      const errorBody = { error: 'Service unavailable' };
      const mockResponse = createMockResponse(errorBody, { ok: false, status: 503, statusText: 'Service Unavailable' });
      mockFetch.mockResolvedValue(mockResponse as any);

      // Use regex to match the error message pattern since it includes truncated body
      await expect(client.getProjects()).rejects.toThrow(
        /GraphQL request failed with status 503 Service Unavailable/
      );
    });

    it('should handle empty errors array gracefully', async () => {
      const mockResponse = createMockResponse({ errors: [], data: { projects: [] } });
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.getProjects();
      expect(result).toEqual([]);
    });

    it('should handle malformed error with missing message', async () => {
      const mockResponse = createMockResponse({ errors: [{ extensions: { code: 'SOME_CODE' } }] });
      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(client.getProjects()).rejects.toThrow('Unknown GraphQL error');
    });
  });

  describe('getProject', () => {
    it('should fetch project by id', async () => {
      const mockProject = {
        id: 'test-id',
        name: 'Test Project',
        fixtures: [],
        looks: [],
        cueLists: []
      };

      const mockResponse = {
        ok: true,
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
        ok: true,
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
        ok: true,
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
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: { createProject: mockProject }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.createProject({ name: 'New Project' });
      expect(result).toEqual(mockProject);
    });
  });

  describe('createLook', () => {
    it('should create scene with fixture values', async () => {
      const mockLook = {
        id: 'look-id',
        name: 'Test Look',
        description: 'Test description',
        fixtureValues: []
      };

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: { createLook: mockLook }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.createLook({
        name: 'Test Look',
        description: 'Test description',
        projectId: 'project-id',
        fixtureValues: [
          { fixtureId: 'fixture-1', channels: [{ offset: 0, value: 255 }, { offset: 1, value: 128 }, { offset: 2, value: 0 }] }
        ]
      });

      expect(result).toEqual(mockLook);
    });
  });

  describe('updateLook', () => {
    it('should update scene with new values', async () => {
      const mockLook = {
        id: 'look-id',
        name: 'Updated Look',
        fixtureValues: []
      };

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: { updateLook: mockLook }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.updateLook('look-id', {
        name: 'Updated Look'
      });

      expect(result).toEqual(mockLook);
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
        ok: true,
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
        ok: true,
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
        ok: true,
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
        ok: true,
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
        ok: true,
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
        ok: true,
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
          ok: true,
          json: jest.fn().mockResolvedValue({
            data: { cueList: mockCurrentCueList }
          })
        } as any)
        .mockResolvedValueOnce({
          ok: true,
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
        look: { id: 'look-1', name: 'Test Look' }
      };

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: { createCue: mockCue }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.createCue({
        name: 'New Cue',
        cueNumber: 1.0,
        cueListId: 'cuelist-1',
        lookId: 'look-1',
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
        look: { id: 'look-1' },
        fadeInTime: 3,
        fadeOutTime: 3
      };

      const mockUpdatedCue = {
        id: 'cue-1',
        name: 'Updated Cue',
        cueNumber: 1.0,
        look: { id: 'look-1', name: 'Test Look' }
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            data: { cue: mockCurrentCue }
          })
        } as any)
        .mockResolvedValueOnce({
          ok: true,
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

  describe('toggleCueSkip', () => {
    it('should toggle cue skip status', async () => {
      const mockCue = {
        id: 'cue-1',
        name: 'Test Cue',
        cueNumber: 1.0,
        fadeInTime: 3,
        fadeOutTime: 3,
        followTime: null,
        notes: '',
        skip: true,
        look: { id: 'look-1', name: 'Test Look' }
      };

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: { toggleCueSkip: mockCue }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.toggleCueSkip('cue-1');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/graphql',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('ToggleCueSkip')
        })
      );
      expect(result).toEqual(mockCue);
      expect(result.skip).toBe(true);
    });

    it('should handle toggle cue skip errors', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          errors: [{ message: 'Cue not found' }]
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(client.toggleCueSkip('invalid-cue')).rejects.toThrow('Cue not found');
    });
  });

  describe('deleteCue', () => {
    it('should delete cue', async () => {
      const mockResponse = {
        ok: true,
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
        ok: true,
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
        ok: true,
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
  describe('Safe Look Management GraphQL Methods', () => {
    const mockLook = {
      id: 'look-1',
      name: 'Test Look',
      description: 'Test scene description',
      updatedAt: '2023-01-01T00:00:00Z',
      fixtureValues: [
        {
          fixture: { id: 'fixture-1', name: 'LED Par 1' },
          channels: [{ offset: 0, value: 255 }, { offset: 1, value: 128 }, { offset: 2, value: 64 }],
          lookOrder: 1
        }
      ]
    };

    describe('addFixturesToLook', () => {
      it('should add fixtures to scene', async () => {
        const mockResponse = {
        ok: true,
          json: jest.fn().mockResolvedValue({
            data: { addFixturesToLook: mockLook }
          })
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        const result = await client.addFixturesToLook(
          'look-1',
          [{ fixtureId: 'fixture-1', channels: [{ offset: 0, value: 255 }, { offset: 1, value: 128 }, { offset: 2, value: 64 }], lookOrder: 1 }],
          false
        );

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:4000/graphql',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('AddFixturesToLook')
          })
        );
        expect(result).toEqual(mockLook);
      });

      it('should handle overwrite parameter', async () => {
        const mockResponse = {
        ok: true,
          json: jest.fn().mockResolvedValue({
            data: { addFixturesToLook: mockLook }
          })
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        await client.addFixturesToLook(
          'look-1',
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

      it('should include lookOrder in GraphQL query response', async () => {
        const mockResponse = {
        ok: true,
          json: jest.fn().mockResolvedValue({
            data: { addFixturesToLook: mockLook }
          })
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        await client.addFixturesToLook('look-1', [{ fixtureId: 'fixture-1', channels: [{ offset: 0, value: 255 }, { offset: 1, value: 0 }, { offset: 2, value: 0 }] }], false);

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:4000/graphql',
          expect.objectContaining({
            body: expect.stringContaining('lookOrder')
          })
        );
      });

      it('should handle addFixturesToLook errors', async () => {
        mockFetch.mockRejectedValue(new Error('Network error'));

        await expect(client.addFixturesToLook(
          'look-1',
          [{ fixtureId: 'fixture-1', channels: [{ offset: 0, value: 255 }, { offset: 1, value: 0 }, { offset: 2, value: 0 }] }],
          false
        )).rejects.toThrow('Network error');
      });
    });

    describe('removeFixturesFromLook', () => {
      it('should remove fixtures from scene', async () => {
        const mockResponse = {
        ok: true,
          json: jest.fn().mockResolvedValue({
            data: { removeFixturesFromLook: mockLook }
          })
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        const result = await client.removeFixturesFromLook('look-1', ['fixture-2']);

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:4000/graphql',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('RemoveFixturesFromLook')
          })
        );
        expect(result).toEqual(mockLook);
      });

      it('should remove multiple fixtures', async () => {
        const mockResponse = {
        ok: true,
          json: jest.fn().mockResolvedValue({
            data: { removeFixturesFromLook: mockLook }
          })
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        await client.removeFixturesFromLook('look-1', ['fixture-1', 'fixture-2']);

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:4000/graphql',
          expect.objectContaining({
            body: expect.stringContaining('"fixtureIds":["fixture-1","fixture-2"]')
          })
        );
      });

      it('should include lookOrder in response', async () => {
        const mockResponse = {
        ok: true,
          json: jest.fn().mockResolvedValue({
            data: { removeFixturesFromLook: mockLook }
          })
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        await client.removeFixturesFromLook('look-1', ['fixture-1']);

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:4000/graphql',
          expect.objectContaining({
            body: expect.stringContaining('lookOrder')
          })
        );
      });

      it('should handle removeFixturesFromLook errors', async () => {
        mockFetch.mockRejectedValue(new Error('Network error'));

        await expect(client.removeFixturesFromLook('look-1', ['fixture-1']))
          .rejects.toThrow('Network error');
      });
    });

    describe('updateLookPartial', () => {
      it('should update scene with metadata only', async () => {
        const mockResponse = {
        ok: true,
          json: jest.fn().mockResolvedValue({
            data: { updateLookPartial: mockLook }
          })
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        const result = await client.updateLookPartial('look-1', {
          name: 'Updated Look',
          description: 'Updated description'
        });

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:4000/graphql',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('UpdateLookPartial')
          })
        );
        expect(result).toEqual(mockLook);
      });

      it('should update scene with fixture values', async () => {
        const mockResponse = {
        ok: true,
          json: jest.fn().mockResolvedValue({
            data: { updateLookPartial: mockLook }
          })
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        await client.updateLookPartial('look-1', {
          name: 'Updated Look',
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
        ok: true,
          json: jest.fn().mockResolvedValue({
            data: { updateLookPartial: mockLook }
          })
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        await client.updateLookPartial('look-1', {
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

      it('should include lookOrder in fixture values', async () => {
        const mockResponse = {
        ok: true,
          json: jest.fn().mockResolvedValue({
            data: { updateLookPartial: mockLook }
          })
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        await client.updateLookPartial('look-1', {
          fixtureValues: [{ 
            fixtureId: 'fixture-1', 
            channels: [{ offset: 0, value: 255 }, { offset: 1, value: 0 }, { offset: 2, value: 0 }], 
            lookOrder: 5 
          }]
        });

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:4000/graphql',
          expect.objectContaining({
            body: expect.stringContaining('lookOrder')
          })
        );
      });

      it('should handle updateLookPartial errors', async () => {
        mockFetch.mockRejectedValue(new Error('Network error'));

        await expect(client.updateLookPartial('look-1', { name: 'Updated' }))
          .rejects.toThrow('Network error');
      });
    });

    describe('GraphQL Query Structure', () => {
      it('should include all required fields in look queries', async () => {
        const mockResponse = {
        ok: true,
          json: jest.fn().mockResolvedValue({
            data: { addFixturesToLook: mockLook }
          })
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        await client.addFixturesToLook('look-1', [{ fixtureId: 'fixture-1', channels: [{ offset: 0, value: 255 }, { offset: 1, value: 0 }, { offset: 2, value: 0 }] }], false);

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
        expect(query).toContain('lookOrder');
      });

      it('should structure mutation variables correctly', async () => {
        const mockResponse = {
        ok: true,
          json: jest.fn().mockResolvedValue({
            data: { addFixturesToLook: mockLook }
          })
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        await client.addFixturesToLook(
          'test-scene',
          [
            { fixtureId: 'fixture-1', channels: [{ offset: 0, value: 255 }, { offset: 1, value: 128 }, { offset: 2, value: 64 }], lookOrder: 1 },
            { fixtureId: 'fixture-2', channels: [{ offset: 0, value: 200 }, { offset: 1, value: 100 }, { offset: 2, value: 50 }] }
          ],
          true
        );

        const callBody = mockFetch.mock.calls[0][1]?.body as string;
        const parsedBody = JSON.parse(callBody);

        expect(parsedBody.variables).toEqual({
          lookId: 'test-scene',
          fixtureValues: [
            { fixtureId: 'fixture-1', channels: [{ offset: 0, value: 255 }, { offset: 1, value: 128 }, { offset: 2, value: 64 }], lookOrder: 1 },
            { fixtureId: 'fixture-2', channels: [{ offset: 0, value: 200 }, { offset: 1, value: 100 }, { offset: 2, value: 50 }] }
          ],
          overwriteExisting: true
        });
      });
    });

    describe('API Consistency Tests', () => {
      it('should use consistent response structure across all safe look methods', async () => {
        const mockResponse = {
        ok: true,
          json: jest.fn().mockResolvedValue({
            data: { 
              addFixturesToLook: mockLook,
              removeFixturesFromLook: mockLook,
              updateLookPartial: mockLook
            }
          })
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        // Test addFixturesToLook
        const addResult = await client.addFixturesToLook(
          'look-1',
          [{ fixtureId: 'fixture-1', channels: [{ offset: 0, value: 255 }, { offset: 1, value: 0 }, { offset: 2, value: 0 }] }],
          false
        );

        // Test removeFixturesFromLook  
        const removeResult = await client.removeFixturesFromLook('look-1', ['fixture-1']);

        // Test updateLookPartial
        const updateResult = await client.updateLookPartial('look-1', { name: 'Updated' });

        // Verify all return the same structure
        expect(addResult).toEqual(mockLook);
        expect(removeResult).toEqual(mockLook);
        expect(updateResult).toEqual(mockLook);

        // Verify all include lookOrder
        expect(addResult.fixtureValues[0]).toHaveProperty('lookOrder');
        expect(removeResult.fixtureValues[0]).toHaveProperty('lookOrder');
        expect(updateResult.fixtureValues[0]).toHaveProperty('lookOrder');
      });
    });

    describe('Error Handling', () => {
      it('should handle GraphQL errors consistently', async () => {
        const mockResponse = {
        ok: true,
          json: jest.fn().mockResolvedValue({
            errors: [{ message: 'Look not found' }]
          })
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        await expect(client.addFixturesToLook(
          'non-existent',
          [{ fixtureId: 'fixture-1', channels: [{ offset: 0, value: 255 }, { offset: 1, value: 0 }, { offset: 2, value: 0 }] }],
          false
        )).rejects.toThrow('Look not found');

        await expect(client.removeFixturesFromLook('non-existent', ['fixture-1']))
          .rejects.toThrow('Look not found');

        await expect(client.updateLookPartial('non-existent', { name: 'Updated' }))
          .rejects.toThrow('Look not found');
      });

      it('should handle network errors', async () => {
        mockFetch.mockRejectedValue(new Error('Network timeout'));

        await expect(client.addFixturesToLook(
          'look-1',
          [{ fixtureId: 'fixture-1', channels: [{ offset: 0, value: 255 }, { offset: 1, value: 0 }, { offset: 2, value: 0 }] }],
          false
        )).rejects.toThrow('Network timeout');
      });

      it('should handle malformed responses', async () => {
        const mockResponse = {
        ok: true,
          json: jest.fn().mockResolvedValue({})
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        await expect(client.addFixturesToLook(
          'look-1',
          [{ fixtureId: 'fixture-1', channels: [{ offset: 0, value: 255 }, { offset: 1, value: 0 }, { offset: 2, value: 0 }] }],
          false
        )).rejects.toThrow();
      });
    });
  });

  describe('bulkUpdateCues', () => {
    it('should bulk update cues', async () => {
      const mockCues = [
        { id: '1', name: 'Cue 1', cueNumber: 1, fadeInTime: 2, fadeOutTime: 2, followTime: null, notes: '', look: { id: 'look-1', name: 'Scene 1' } },
        { id: '2', name: 'Cue 2', cueNumber: 2, fadeInTime: 3, fadeOutTime: 3, followTime: null, notes: '', look: { id: 'look-1', name: 'Scene 1' } }
      ];
      const mockResponse = {
        ok: true,
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
        ok: true,
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

  describe('setLookLive', () => {
    it('should set scene live', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: { setLookLive: true }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.setLookLive('look-1');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/graphql',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('ActivateLook')
        })
      );
      expect(result).toBe(true);
    });
  });

  describe('fadeToBlack', () => {
    it('should fade to black', async () => {
      const mockResponse = {
        ok: true,
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

  describe('getLook', () => {
    it('should get look by id', async () => {
      const mockLook = {
        id: 'look-1',
        name: 'Test Look',
        description: 'A test look',
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
        fixtureValues: []
      };
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: { look: mockLook }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.getLook('look-1');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/graphql',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('GetLook')
        })
      );
      expect(result).toEqual(mockLook);
    });

    it('should return null for non-existent look', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: { look: null }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.getLook('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('goToCue', () => {
    it('should go to cue', async () => {
      const mockResponse = {
        ok: true,
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
        ok: true,
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
        ok: true,
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

  describe('getCurrentActiveLook', () => {
    it('should get current active look', async () => {
      const mockLook = {
        id: 'look-1',
        name: 'Active Look',
        description: 'Currently active look',
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
        project: { id: 'project-1', name: 'Test Project' },
        fixtureValues: []
      };
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: { currentActiveLook: mockLook }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.getCurrentActiveLook();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/graphql',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('GetCurrentActiveLook')
        })
      );
      expect(result).toEqual(mockLook);
    });

    it('should return null when no look is active', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: { currentActiveLook: null }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.getCurrentActiveLook();
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
        look: { id: 'look-1', name: 'Scene 1' }
      };
      const mockResponse = {
        ok: true,
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
        ok: true,
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
        ok: true,
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
        ok: true,
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
        ok: true,
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
        ok: true,
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
        ok: true,
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
        ok: true,
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
        ok: true,
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
        ok: true,
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
        ok: true,
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
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: { nextCue: true }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.nextCue('cue-list-1');

      expect(result).toBe(true);
    });
  });

  // ========================================================================
  // Look Board Tests
  // ========================================================================

  describe('Look Board Operations', () => {
    describe('listLookBoards', () => {
      it('should list look boards for a project', async () => {
        const mockBoards = [
          {
            id: 'board-1',
            name: 'Test Board',
            description: 'Test description',
            project: { id: 'project-1', name: 'Test Project' },
            defaultFadeTime: 3.0,
            gridSize: 50,
            canvasWidth: 2000,
            canvasHeight: 2000,
            buttons: [],
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01'
          }
        ];

        const mockResponse = {
        ok: true,
          json: jest.fn().mockResolvedValue({
            data: { lookBoards: mockBoards }
          })
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        const result = await client.listLookBoards('project-1');

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:4000/graphql',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('lookBoards')
          })
        );
        expect(result).toEqual(mockBoards);
      });
    });

    describe('getLookBoard', () => {
      it('should get a specific look board', async () => {
        const mockBoard = {
          id: 'board-1',
          name: 'Test Board',
          buttons: []
        };

        const mockResponse = {
        ok: true,
          json: jest.fn().mockResolvedValue({
            data: { lookBoard: mockBoard }
          })
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        const result = await client.getLookBoard('board-1');

        expect(result).toEqual(mockBoard);
      });
    });

    describe('createLookBoard', () => {
      it('should create a look board', async () => {
        const input = {
          name: 'New Board',
          projectId: 'project-1',
          defaultFadeTime: 3.0,
          gridSize: 50,
          canvasWidth: 2000,
          canvasHeight: 2000
        };

        const mockBoard = {
          id: 'board-1',
          ...input,
          project: { id: 'project-1', name: 'Test Project' },
          buttons: [],
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01'
        };

        const mockResponse = {
        ok: true,
          json: jest.fn().mockResolvedValue({
            data: { createLookBoard: mockBoard }
          })
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        const result = await client.createLookBoard(input);

        expect(result).toEqual(mockBoard);
      });
    });

    describe('updateLookBoard', () => {
      it('should update a look board', async () => {
        const updates = {
          name: 'Updated Board',
          defaultFadeTime: 5.0
        };

        const mockBoard = {
          id: 'board-1',
          ...updates,
          project: { id: 'project-1', name: 'Test Project' },
          createdAt: '2024-01-01',
          updatedAt: '2024-01-02'
        };

        const mockResponse = {
        ok: true,
          json: jest.fn().mockResolvedValue({
            data: { updateLookBoard: mockBoard }
          })
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        const result = await client.updateLookBoard('board-1', updates);

        expect(result).toEqual(mockBoard);
      });
    });

    describe('deleteLookBoard', () => {
      it('should delete a look board', async () => {
        const mockResponse = {
        ok: true,
          json: jest.fn().mockResolvedValue({
            data: { deleteLookBoard: true }
          })
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        const result = await client.deleteLookBoard('board-1');

        expect(result).toBe(true);
      });
    });

    describe('bulkCreateLookBoards', () => {
      it('should create multiple look boards', async () => {
        const input = [
          { name: 'Board 1', projectId: 'project-1' },
          { name: 'Board 2', projectId: 'project-1' }
        ];

        const mockBoards = input.map((b, i) => ({
          id: `board-${i + 1}`,
          ...b,
          project: { id: 'project-1', name: 'Test Project' },
          defaultFadeTime: 3.0,
          gridSize: 50,
          canvasWidth: 2000,
          canvasHeight: 2000,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01'
        }));

        const mockResponse = {
        ok: true,
          json: jest.fn().mockResolvedValue({
            data: { bulkCreateLookBoards: mockBoards }
          })
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        const result = await client.bulkCreateLookBoards(input);

        expect(result).toEqual(mockBoards);
        expect(result).toHaveLength(2);
      });
    });

    describe('bulkDeleteLookBoards', () => {
      it('should delete multiple look boards', async () => {
        const mockResult = {
          successCount: 2,
          failedIds: []
        };

        const mockResponse = {
        ok: true,
          json: jest.fn().mockResolvedValue({
            data: { bulkDeleteLookBoards: mockResult }
          })
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        const result = await client.bulkDeleteLookBoards(['board-1', 'board-2']);

        expect(result).toEqual(mockResult);
      });
    });
  });

  describe('Look Board Button Operations', () => {
    describe('addLookToBoard', () => {
      it('should add a scene to board as button', async () => {
        const input = {
          lookBoardId: 'board-1',
          lookId: 'look-1',
          layoutX: 100,
          layoutY: 200,
          width: 200,
          height: 120
        };

        const mockButton = {
          id: 'button-1',
          ...input,
          lookBoard: { id: 'board-1', name: 'Test Board' },
          look: { id: 'look-1', name: 'Test Look' },
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01'
        };

        const mockResponse = {
        ok: true,
          json: jest.fn().mockResolvedValue({
            data: { addLookToBoard: mockButton }
          })
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        const result = await client.addLookToBoard(input);

        expect(result).toEqual(mockButton);
      });
    });

    describe('updateLookBoardButton', () => {
      it('should update a button', async () => {
        const updates = {
          layoutX: 150,
          color: '#FF0000'
        };

        const mockButton = {
          id: 'button-1',
          ...updates,
          lookBoard: { id: 'board-1', name: 'Test Board' },
          look: { id: 'look-1', name: 'Test Look' },
          layoutY: 200,
          width: 200,
          height: 120,
          updatedAt: '2024-01-02'
        };

        const mockResponse = {
        ok: true,
          json: jest.fn().mockResolvedValue({
            data: { updateLookBoardButton: mockButton }
          })
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        const result = await client.updateLookBoardButton('button-1', updates);

        expect(result).toEqual(mockButton);
      });
    });

    describe('removeLookFromBoard', () => {
      it('should remove a button from board', async () => {
        const mockResponse = {
        ok: true,
          json: jest.fn().mockResolvedValue({
            data: { removeLookFromBoard: true }
          })
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        const result = await client.removeLookFromBoard('button-1');

        expect(result).toBe(true);
      });
    });

    describe('updateLookBoardButtonPositions', () => {
      it('should update multiple button positions', async () => {
        const positions = [
          { buttonId: 'button-1', layoutX: 100, layoutY: 100 },
          { buttonId: 'button-2', layoutX: 300, layoutY: 100 }
        ];

        const mockResponse = {
        ok: true,
          json: jest.fn().mockResolvedValue({
            data: { updateLookBoardButtonPositions: true }
          })
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        const result = await client.updateLookBoardButtonPositions(positions);

        expect(result).toBe(true);
      });
    });

    describe('bulkCreateLookBoardButtons', () => {
      it('should create multiple buttons', async () => {
        const input = [
          { lookBoardId: 'board-1', lookId: 'look-1', layoutX: 100, layoutY: 100 },
          { lookBoardId: 'board-1', lookId: 'look-2', layoutX: 300, layoutY: 100 }
        ];

        const mockButtons = input.map((b, i) => ({
          id: `button-${i + 1}`,
          ...b,
          lookBoard: { id: 'board-1', name: 'Test Board' },
          look: { id: b.lookId, name: `Look ${i + 1}` },
          width: 200,
          height: 120,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01'
        }));

        const mockResponse = {
        ok: true,
          json: jest.fn().mockResolvedValue({
            data: { bulkCreateLookBoardButtons: mockButtons }
          })
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        const result = await client.bulkCreateLookBoardButtons(input);

        expect(result).toEqual(mockButtons);
        expect(result).toHaveLength(2);
      });
    });

    describe('bulkDeleteLookBoardButtons', () => {
      it('should delete multiple buttons', async () => {
        const mockResult = {
          successCount: 2,
          failedIds: []
        };

        const mockResponse = {
        ok: true,
          json: jest.fn().mockResolvedValue({
            data: { bulkDeleteLookBoardButtons: mockResult }
          })
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        const result = await client.bulkDeleteLookBoardButtons(['button-1', 'button-2']);

        expect(result).toEqual(mockResult);
      });
    });

    describe('activateLookFromBoard', () => {
      it('should activate scene with board default fade time', async () => {
        const mockResponse = {
        ok: true,
          json: jest.fn().mockResolvedValue({
            data: { activateLookFromBoard: true }
          })
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        const result = await client.activateLookFromBoard('board-1', 'look-1');

        expect(result).toBe(true);
      });

      it('should activate scene with custom fade time', async () => {
        const mockResponse = {
        ok: true,
          json: jest.fn().mockResolvedValue({
            data: { activateLookFromBoard: true }
          })
        };
        mockFetch.mockResolvedValue(mockResponse as any);

        const result = await client.activateLookFromBoard('board-1', 'look-1', 5.0);

        expect(result).toBe(true);
      });
    });
  });

  describe('getBuildInfo', () => {
    it('should successfully fetch build info', async () => {
      const mockBuildInfo = {
        version: '1.2.3',
        gitCommit: 'abc123def456',
        buildTime: '2024-01-15T12:00:00Z'
      };

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: { buildInfo: mockBuildInfo }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.getBuildInfo();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/graphql',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('GetBuildInfo')
        })
      );
      expect(result).toEqual(mockBuildInfo);
    });

    it('should include all required fields in query', async () => {
      const mockBuildInfo = {
        version: '1.0.0',
        gitCommit: 'abc123',
        buildTime: '2024-01-01T00:00:00Z'
      };

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: { buildInfo: mockBuildInfo }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await client.getBuildInfo();

      const callBody = mockFetch.mock.calls[0][1]?.body as string;
      const parsedBody = JSON.parse(callBody);
      const query = parsedBody.query;

      expect(query).toContain('version');
      expect(query).toContain('gitCommit');
      expect(query).toContain('buildTime');
      expect(query).toContain('buildInfo');
    });

    it('should handle GraphQL errors', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          errors: [{ message: 'Build info not available' }]
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(client.getBuildInfo()).rejects.toThrow('Build info not available');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network connection failed'));

      await expect(client.getBuildInfo()).rejects.toThrow('Network connection failed');
    });

    it('should handle null response', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: { buildInfo: null }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.getBuildInfo();
      expect(result).toBeNull();
    });

    it('should validate response structure', async () => {
      const mockBuildInfo = {
        version: '2.0.0-beta',
        gitCommit: 'deadbeef1234567890abcdef',
        buildTime: '2024-12-22T10:30:00Z'
      };

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: { buildInfo: mockBuildInfo }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.getBuildInfo();

      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('gitCommit');
      expect(result).toHaveProperty('buildTime');
      expect(typeof result.version).toBe('string');
      expect(typeof result.gitCommit).toBe('string');
      expect(typeof result.buildTime).toBe('string');
    });
  });

  // ========================================================================
  // Device Authentication Tests
  // ========================================================================

  describe('Device Fingerprint Header', () => {
    it('should include device fingerprint header when set', async () => {
      const clientWithFingerprint = new LacyLightsGraphQLClient(
        'http://localhost:4000/graphql',
        'test-fingerprint-123'
      );

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: { projects: [] }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await clientWithFingerprint.getProjects();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/graphql',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Device-Fingerprint': 'test-fingerprint-123'
          })
        })
      );
    });

    it('should not include fingerprint header when not set', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: { projects: [] }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await client.getProjects();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/graphql',
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json'
          }
        })
      );
    });

    it('should set and get device fingerprint', () => {
      client.setDeviceFingerprint('new-fingerprint-456');
      expect(client.getDeviceFingerprint()).toBe('new-fingerprint-456');
    });

    it('should return null when no fingerprint is set', () => {
      expect(client.getDeviceFingerprint()).toBeNull();
    });
  });

  describe('DeviceNotApprovedError', () => {
    it('should throw DeviceNotApprovedError when extension code is DEVICE_NOT_APPROVED', async () => {
      const clientWithFingerprint = new LacyLightsGraphQLClient(
        'http://localhost:4000/graphql',
        'test-fingerprint'
      );

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          errors: [{
            message: 'Access denied',
            extensions: { code: 'DEVICE_NOT_APPROVED' }
          }]
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(clientWithFingerprint.getProjects()).rejects.toThrow('Access denied');
      try {
        await clientWithFingerprint.getProjects();
      } catch (error: any) {
        expect(error.name).toBe('DeviceNotApprovedError');
        expect(error.fingerprint).toBe('test-fingerprint');
      }
    });

    it('should throw DeviceNotApprovedError when message contains "device not approved" (case insensitive)', async () => {
      const clientWithFingerprint = new LacyLightsGraphQLClient(
        'http://localhost:4000/graphql',
        'test-fingerprint'
      );

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          errors: [{
            message: 'Device Not Approved for this operation'
          }]
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(clientWithFingerprint.getProjects()).rejects.toThrow('Device Not Approved for this operation');
    });

    it('should throw DeviceNotApprovedError when message contains "DEVICE NOT APPROVED" (uppercase)', async () => {
      const clientWithFingerprint = new LacyLightsGraphQLClient(
        'http://localhost:4000/graphql',
        'test-fingerprint'
      );

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          errors: [{
            message: 'DEVICE NOT APPROVED'
          }]
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(clientWithFingerprint.getProjects()).rejects.toThrow('DEVICE NOT APPROVED');
    });

    it('should use "unknown" fingerprint when client has no fingerprint', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          errors: [{
            message: 'device not approved',
            extensions: { code: 'DEVICE_NOT_APPROVED' }
          }]
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      try {
        await client.getProjects();
      } catch (error: any) {
        expect(error.fingerprint).toBe('unknown');
      }
    });

    it('should not throw DeviceNotApprovedError for unrelated errors', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          errors: [{
            message: 'Some other error'
          }]
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(client.getProjects()).rejects.toThrow('Some other error');
      // Should be a regular Error, not DeviceNotApprovedError
      try {
        await client.getProjects();
      } catch (error: any) {
        expect(error.name).not.toBe('DeviceNotApprovedError');
      }
    });
  });

  describe('getAuthSettings', () => {
    it('should get auth settings successfully', async () => {
      const mockAuthSettings = {
        authEnabled: true,
        deviceAuthEnabled: true
      };

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: { authSettings: mockAuthSettings }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.getAuthSettings();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/graphql',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('GetAuthSettings')
        })
      );
      expect(result).toEqual(mockAuthSettings);
      expect(result.authEnabled).toBe(true);
      expect(result.deviceAuthEnabled).toBe(true);
    });

    it('should return auth disabled settings', async () => {
      const mockAuthSettings = {
        authEnabled: false,
        deviceAuthEnabled: false
      };

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: { authSettings: mockAuthSettings }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.getAuthSettings();

      expect(result.authEnabled).toBe(false);
      expect(result.deviceAuthEnabled).toBe(false);
    });

    it('should handle GraphQL errors', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          errors: [{ message: 'Auth settings not available' }]
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(client.getAuthSettings()).rejects.toThrow('Auth settings not available');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(client.getAuthSettings()).rejects.toThrow('Network error');
    });
  });

  describe('checkDevice', () => {
    it('should check device and return APPROVED status', async () => {
      const mockDeviceCheck = {
        status: 'APPROVED',
        device: {
          id: 'device-123',
          name: 'Test Device',
          fingerprint: 'test-fingerprint',
          status: 'APPROVED',
          permissions: 'FULL',
          lastSeen: '2024-01-01T00:00:00Z',
          createdAt: '2024-01-01T00:00:00Z',
          approvedAt: '2024-01-01T00:00:00Z'
        },
        message: 'Device approved'
      };

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: { checkDevice: mockDeviceCheck }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.checkDevice('test-fingerprint');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/graphql',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('CheckDevice')
        })
      );
      expect(result.status).toBe('APPROVED');
      expect(result.device?.id).toBe('device-123');
      expect(result.device?.permissions).toBe('FULL');
    });

    it('should check device and return PENDING status', async () => {
      const mockDeviceCheck = {
        status: 'PENDING',
        device: {
          id: 'device-123',
          name: 'Test Device',
          fingerprint: 'test-fingerprint',
          status: 'PENDING',
          permissions: 'NONE',
          createdAt: '2024-01-01T00:00:00Z'
        },
        message: 'Device awaiting approval'
      };

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: { checkDevice: mockDeviceCheck }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.checkDevice('test-fingerprint');

      expect(result.status).toBe('PENDING');
      expect(result.message).toBe('Device awaiting approval');
    });

    it('should check device and return REVOKED status', async () => {
      const mockDeviceCheck = {
        status: 'REVOKED',
        device: {
          id: 'device-123',
          name: 'Test Device',
          fingerprint: 'test-fingerprint',
          status: 'REVOKED',
          permissions: 'NONE',
          createdAt: '2024-01-01T00:00:00Z'
        },
        message: 'Device has been revoked'
      };

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: { checkDevice: mockDeviceCheck }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.checkDevice('test-fingerprint');

      expect(result.status).toBe('REVOKED');
    });

    it('should check device and return UNKNOWN status', async () => {
      const mockDeviceCheck = {
        status: 'UNKNOWN',
        device: null,
        message: 'Device not found'
      };

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: { checkDevice: mockDeviceCheck }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.checkDevice('unknown-fingerprint');

      expect(result.status).toBe('UNKNOWN');
      expect(result.device).toBeNull();
    });

    it('should handle GraphQL errors', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          errors: [{ message: 'Device check failed' }]
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(client.checkDevice('test-fingerprint')).rejects.toThrow('Device check failed');
    });
  });

  describe('registerDevice', () => {
    it('should register device successfully', async () => {
      const mockRegistration = {
        success: true,
        device: {
          id: 'device-new',
          name: 'New Device',
          fingerprint: 'new-fingerprint',
          status: 'PENDING'
        },
        message: 'Device registered successfully'
      };

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: { registerDevice: mockRegistration }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.registerDevice('new-fingerprint', 'New Device');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/graphql',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('RegisterDevice')
        })
      );
      expect(result.success).toBe(true);
      expect(result.device?.id).toBe('device-new');
      expect(result.device?.status).toBe('PENDING');
      expect(result.message).toBe('Device registered successfully');
    });

    it('should handle registration failure', async () => {
      const mockRegistration = {
        success: false,
        device: null,
        message: 'Device already exists'
      };

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: { registerDevice: mockRegistration }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.registerDevice('existing-fingerprint', 'Existing Device');

      expect(result.success).toBe(false);
      expect(result.device).toBeNull();
      expect(result.message).toBe('Device already exists');
    });

    it('should handle GraphQL errors', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          errors: [{ message: 'Registration failed' }]
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(client.registerDevice('test-fingerprint', 'Test Device')).rejects.toThrow('Registration failed');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network unavailable'));

      await expect(client.registerDevice('test-fingerprint', 'Test Device')).rejects.toThrow('Network unavailable');
    });
  });

  describe('copyFixturesToLooks', () => {
    it('should copy fixtures to looks successfully', async () => {
      const mockResult = {
        updatedLookCount: 3,
        affectedCueCount: 5,
        operationId: 'op-123',
        updatedLooks: [
          {
            id: 'look-1',
            name: 'Look 1',
            updatedAt: '2024-01-01T00:00:00Z',
            fixtureValues: [
              {
                fixture: { id: 'fixture-1', name: 'LED Par 1' },
                channels: [{ offset: 0, value: 255 }]
              }
            ]
          },
          {
            id: 'look-2',
            name: 'Look 2',
            updatedAt: '2024-01-01T00:00:00Z',
            fixtureValues: [
              {
                fixture: { id: 'fixture-1', name: 'LED Par 1' },
                channels: [{ offset: 0, value: 255 }]
              }
            ]
          }
        ]
      };

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: { copyFixturesToLooks: mockResult }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.copyFixturesToLooks({
        sourceLookId: 'source-look',
        fixtureIds: ['fixture-1', 'fixture-2'],
        targetLookIds: ['look-1', 'look-2', 'look-3']
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/graphql',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('CopyFixturesToLooks')
        })
      );
      expect(result.updatedLookCount).toBe(3);
      expect(result.affectedCueCount).toBe(5);
      expect(result.operationId).toBe('op-123');
      expect(result.updatedLooks).toHaveLength(2);
    });

    it('should include look metadata in response', async () => {
      const mockResult = {
        updatedLookCount: 1,
        affectedCueCount: 0,
        operationId: 'op-456',
        updatedLooks: [
          {
            id: 'look-1',
            name: 'Updated Look',
            updatedAt: '2024-01-01T00:00:00Z'
          }
        ]
      };

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: { copyFixturesToLooks: mockResult }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.copyFixturesToLooks({
        sourceLookId: 'source-look',
        fixtureIds: ['fixture-1'],
        targetLookIds: ['look-1']
      });

      // Verify response contains look metadata (fixtureValues no longer returned)
      expect(result.updatedLooks[0].id).toBe('look-1');
      expect(result.updatedLooks[0].name).toBe('Updated Look');
      expect(result.updatedLooks[0].updatedAt).toBe('2024-01-01T00:00:00Z');
    });

    it('should handle GraphQL errors', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          errors: [{ message: 'Source look not found' }]
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(client.copyFixturesToLooks({
        sourceLookId: 'invalid-look',
        fixtureIds: ['fixture-1'],
        targetLookIds: ['look-1']
      })).rejects.toThrow('Source look not found');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network timeout'));

      await expect(client.copyFixturesToLooks({
        sourceLookId: 'source-look',
        fixtureIds: ['fixture-1'],
        targetLookIds: ['look-1']
      })).rejects.toThrow('Network timeout');
    });
  });
});
