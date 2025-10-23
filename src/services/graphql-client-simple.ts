import fetch from 'cross-fetch';
import { Project, FixtureDefinition, FixtureInstance, Scene, CueList, Cue, FixtureUsage, SceneUsage, SceneComparison } from '../types/lighting';

export class LacyLightsGraphQLClient {
  private endpoint: string;

  constructor(endpoint: string = 'http://localhost:4000/graphql') {
    this.endpoint = endpoint;
  }

  private async query(query: string, variables?: any): Promise<any> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    const result = await response.json();
    
    if (result.errors) {
      throw new Error(result.errors[0].message);
    }

    return result.data;
  }

  async getProjects(): Promise<Project[]> {
    const query = `
      query GetProjects {
        projects {
          id
          name
          description
          createdAt
          updatedAt
          fixtures {
            id
            name
            description
            universe
            startChannel
            tags
            # Flattened fields
            definitionId
            manufacturer
            model
            type
            modeName
            channelCount
            channels {
              id
              offset
              name
              type
              minValue
              maxValue
              defaultValue
            }
          }
          scenes {
            id
            name
            description
            createdAt
            updatedAt
          }
          cueLists {
            id
            name
            description
            createdAt
            updatedAt
          }
        }
      }
    `;

    const data = await this.query(query);
    return data.projects;
  }

  async getProject(id: string): Promise<Project | null> {
    const query = `
      query GetProject($id: ID!) {
        project(id: $id) {
          id
          name
          description
          createdAt
          updatedAt
          fixtures {
            id
            name
            description
            universe
            startChannel
            tags
            # Flattened fields
            definitionId
            manufacturer
            model
            type
            modeName
            channelCount
            channels {
              id
              offset
              name
              type
              minValue
              maxValue
              defaultValue
            }
          }
          scenes {
            id
            name
            description
            createdAt
            updatedAt
            fixtureValues {
              fixture {
                id
                name
              }
              channelValues
            }
          }
          cueLists {
            id
            name
            description
            createdAt
            updatedAt
            cues {
              id
              name
              cueNumber
              fadeInTime
              fadeOutTime
              followTime
              notes
              scene {
                id
                name
              }
            }
          }
        }
      }
    `;

    const data = await this.query(query, { id });
    return data.project;
  }

  async getFixtureDefinitions(): Promise<FixtureDefinition[]> {
    const query = `
      query GetFixtureDefinitions {
        fixtureDefinitions {
          id
          manufacturer
          model
          type
          isBuiltIn
          createdAt
          channels {
            id
            name
            type
            offset
            minValue
            maxValue
            defaultValue
          }
          modes {
            id
            name
            shortName
            channelCount
          }
        }
      }
    `;

    const data = await this.query(query);
    return data.fixtureDefinitions;
  }

  async createScene(input: {
    name: string;
    description?: string;
    projectId: string;
    fixtureValues: Array<{
      fixtureId: string;
      channelValues: number[];
    }>;
  }): Promise<Scene> {
    const mutation = `
      mutation CreateScene($input: CreateSceneInput!) {
        createScene(input: $input) {
          id
          name
          description
          createdAt
          updatedAt
          fixtureValues {
            fixture {
              id
              name
            }
            channelValues
          }
        }
      }
    `;

    const data = await this.query(mutation, { input });
    return data.createScene;
  }

  async updateScene(id: string, input: {
    name?: string;
    description?: string;
    fixtureValues?: Array<{
      fixtureId: string;
      channelValues: number[];
    }>;
  }): Promise<Scene> {
    const mutation = `
      mutation UpdateScene($id: ID!, $input: UpdateSceneInput!) {
        updateScene(id: $id, input: $input) {
          id
          name
          description
          updatedAt
          fixtureValues {
            fixture {
              id
              name
            }
            channelValues
          }
        }
      }
    `;

    const data = await this.query(mutation, { id, input });
    return data.updateScene;
  }

  // 🛡️ SAFE SCENE UPDATE METHODS
  async addFixturesToScene(sceneId: string, fixtureValues: Array<{
    fixtureId: string;
    channelValues: number[];
    sceneOrder?: number;
  }>, overwriteExisting: boolean = false): Promise<Scene> {
    const mutation = `
      mutation AddFixturesToScene($sceneId: ID!, $fixtureValues: [FixtureValueInput!]!, $overwriteExisting: Boolean) {
        addFixturesToScene(sceneId: $sceneId, fixtureValues: $fixtureValues, overwriteExisting: $overwriteExisting) {
          id
          name
          description
          updatedAt
          fixtureValues {
            fixture {
              id
              name
            }
            channelValues
            sceneOrder
          }
        }
      }
    `;

    const data = await this.query(mutation, { 
      sceneId, 
      fixtureValues, 
      overwriteExisting 
    });
    return data.addFixturesToScene;
  }

  async removeFixturesFromScene(sceneId: string, fixtureIds: string[]): Promise<Scene> {
    const mutation = `
      mutation RemoveFixturesFromScene($sceneId: ID!, $fixtureIds: [ID!]!) {
        removeFixturesFromScene(sceneId: $sceneId, fixtureIds: $fixtureIds) {
          id
          name
          description
          updatedAt
          fixtureValues {
            fixture {
              id
              name
            }
            channelValues
            sceneOrder
          }
        }
      }
    `;

    const data = await this.query(mutation, { sceneId, fixtureIds });
    return data.removeFixturesFromScene;
  }

  async updateScenePartial(sceneId: string, updates: {
    name?: string;
    description?: string;
    fixtureValues?: Array<{
      fixtureId: string;
      channelValues: number[];
      sceneOrder?: number;
    }>;
    mergeFixtures?: boolean;
  }): Promise<Scene> {
    const mutation = `
      mutation UpdateScenePartial($sceneId: ID!, $name: String, $description: String, $fixtureValues: [FixtureValueInput!], $mergeFixtures: Boolean) {
        updateScenePartial(sceneId: $sceneId, name: $name, description: $description, fixtureValues: $fixtureValues, mergeFixtures: $mergeFixtures) {
          id
          name
          description
          updatedAt
          fixtureValues {
            fixture {
              id
              name
            }
            channelValues
            sceneOrder
          }
        }
      }
    `;

    const data = await this.query(mutation, { 
      sceneId,
      name: updates.name,
      description: updates.description,
      fixtureValues: updates.fixtureValues,
      mergeFixtures: updates.mergeFixtures
    });
    return data.updateScenePartial;
  }

  async getCueList(id: string): Promise<CueList | null> {
    const query = `
      query GetCueList($id: ID!) {
        cueList(id: $id) {
          id
          name
          description
          createdAt
          updatedAt
          project {
            id
          }
          cues {
            id
            name
            cueNumber
            fadeInTime
            fadeOutTime
            followTime
            notes
            scene {
              id
              name
            }
          }
        }
      }
    `;

    const data = await this.query(query, { id });
    return data.cueList;
  }

  /**
   * Get lightweight cue list summaries for a project
   * Part of Task 2.5 - MCP API Refactor
   */
  async getCueLists(projectId: string): Promise<any[]> {
    // For now, use the existing project query to get cue lists
    // This will be replaced with a dedicated cueLists query once Task 1.4 backend changes are merged
    const project = await this.getProject(projectId);
    if (!project || !project.cueLists) {
      return [];
    }

    // Return lightweight summaries
    return project.cueLists.map((cueList: any) => ({
      id: cueList.id,
      name: cueList.name,
      description: cueList.description,
      cueCount: cueList.cues?.length || 0,
      totalDuration: this.estimateCueListDuration(cueList.cues || []),
      loop: cueList.loop || false,
      createdAt: cueList.createdAt,
    }));
  }

  /**
   * Get cue list with paginated cues
   * Part of Task 2.5 - MCP API Refactor
   */
  async getCueListWithPagination(
    cueListId: string,
    page: number = 1,
    perPage: number = 50,
    includeSceneDetails: boolean = false
  ): Promise<any> {
    // For now, use the existing getCueList and apply client-side pagination
    // This will be replaced with a backend paginated query once Task 1.4 is merged
    const cueList = await this.getCueList(cueListId);
    if (!cueList) {
      return null;
    }

    const cues = cueList.cues || [];
    const start = (page - 1) * perPage;
    const end = start + perPage;
    const paginatedCues = cues.slice(start, end);

    // Format cues with optional scene details
    const formattedCues = paginatedCues.map((cue: any) => {
      const baseCue = {
        id: cue.id,
        name: cue.name,
        cueNumber: cue.cueNumber,
        fadeInTime: cue.fadeInTime,
        fadeOutTime: cue.fadeOutTime,
        followTime: cue.followTime,
        notes: cue.notes,
        sceneId: cue.scene.id,
        sceneName: cue.scene.name,
      };

      if (includeSceneDetails) {
        return {
          ...baseCue,
          scene: cue.scene,
        };
      }

      return baseCue;
    });

    const totalPages = Math.ceil(cues.length / perPage);

    return {
      id: cueList.id,
      name: cueList.name,
      description: cueList.description,
      loop: (cueList as any).loop || false,
      cues: formattedCues,
      pagination: {
        total: cues.length,
        page,
        perPage,
        totalPages,
        hasMore: page < totalPages,
      },
      cueCount: cues.length,
      totalDuration: this.estimateCueListDuration(cues),
      createdAt: cueList.createdAt,
      updatedAt: cueList.updatedAt,
    };
  }

  /**
   * Helper to estimate cue list duration
   */
  private estimateCueListDuration(cues: any[]): number {
    let totalTime = 0;
    for (const cue of cues) {
      totalTime += cue.fadeInTime || 0;
      if (cue.followTime) {
        totalTime += cue.followTime;
      } else {
        totalTime += 5; // Assume 5 seconds for manual advance
      }
    }
    return totalTime;
  }

  async createCueList(input: {
    name: string;
    description?: string;
    projectId: string;
  }): Promise<CueList> {
    const mutation = `
      mutation CreateCueList($input: CreateCueListInput!) {
        createCueList(input: $input) {
          id
          name
          description
          createdAt
          updatedAt
          cues {
            id
            name
            cueNumber
            fadeInTime
            fadeOutTime
            followTime
            notes
          }
        }
      }
    `;

    const data = await this.query(mutation, { input });
    return data.createCueList;
  }

  async createCue(input: {
    name: string;
    cueNumber: number;
    cueListId: string;
    sceneId: string;
    fadeInTime: number;
    fadeOutTime: number;
    followTime?: number;
    notes?: string;
  }) {
    const mutation = `
      mutation CreateCue($input: CreateCueInput!) {
        createCue(input: $input) {
          id
          name
          cueNumber
          fadeInTime
          fadeOutTime
          followTime
          notes
          scene {
            id
            name
          }
        }
      }
    `;

    const data = await this.query(mutation, { input });
    return data.createCue;
  }

  async updateCueList(id: string, input: {
    name?: string;
    description?: string;
    loop?: boolean;
  }): Promise<CueList> {
    const mutation = `
      mutation UpdateCueList($id: ID!, $input: CreateCueListInput!) {
        updateCueList(id: $id, input: $input) {
          id
          name
          description
          loop
          createdAt
          updatedAt
          cues {
            id
            name
            cueNumber
            fadeInTime
            fadeOutTime
            followTime
            notes
            scene {
              id
              name
            }
          }
        }
      }
    `;

    // Since the backend expects CreateCueListInput which requires projectId,
    // we need to get the current cue list first to maintain the projectId
    const cueListQuery = `
      query GetCueList($id: ID!) {
        cueList(id: $id) {
          id
          name
          loop
          project {
            id
          }
        }
      }
    `;
    
    const cueListData = await this.query(cueListQuery, { id });
    const projectId = cueListData.cueList.project.id;

    const updateInput = {
      name: input.name || cueListData.cueList.name,
      description: input.description,
      loop: input.loop !== undefined ? input.loop : cueListData.cueList.loop,
      projectId
    };

    const data = await this.query(mutation, { id, input: updateInput });
    return data.updateCueList;
  }

  async updateCue(id: string, input: {
    name?: string;
    cueNumber?: number;
    sceneId?: string;
    fadeInTime?: number;
    fadeOutTime?: number;
    followTime?: number | null;
    notes?: string;
  }): Promise<Cue> {
    const mutation = `
      mutation UpdateCue($id: ID!, $input: CreateCueInput!) {
        updateCue(id: $id, input: $input) {
          id
          name
          cueNumber
          fadeInTime
          fadeOutTime
          followTime
          notes
          scene {
            id
            name
          }
        }
      }
    `;

    // Get current cue to maintain required fields
    const cueQuery = `
      query GetCue($id: ID!) {
        cue(id: $id) {
          id
          name
          cueNumber
          cueList {
            id
          }
          scene {
            id
          }
          fadeInTime
          fadeOutTime
          followTime
          notes
        }
      }
    `;
    
    const cueData = await this.query(cueQuery, { id });
    const currentCue = cueData.cue;
    
    const updateInput = {
      name: input.name ?? currentCue.name,
      cueNumber: input.cueNumber ?? currentCue.cueNumber,
      cueListId: currentCue.cueList.id,
      sceneId: input.sceneId ?? currentCue.scene.id,
      fadeInTime: input.fadeInTime ?? currentCue.fadeInTime,
      fadeOutTime: input.fadeOutTime ?? currentCue.fadeOutTime,
      followTime: input.followTime !== undefined ? input.followTime : currentCue.followTime,
      notes: input.notes !== undefined ? input.notes : currentCue.notes
    };

    const data = await this.query(mutation, { id, input: updateInput });
    return data.updateCue;
  }

  async bulkUpdateCues(input: {
    cueIds: string[];
    fadeInTime?: number;
    fadeOutTime?: number;
    followTime?: number | null;
    easingType?: string;
  }): Promise<Cue[]> {
    const mutation = `
      mutation BulkUpdateCues($input: BulkCueUpdateInput!) {
        bulkUpdateCues(input: $input) {
          id
          name
          cueNumber
          fadeInTime
          fadeOutTime
          followTime
          notes
          scene {
            id
            name
          }
        }
      }
    `;

    const data = await this.query(mutation, { input });
    return data.bulkUpdateCues;
  }

  async deleteCue(id: string): Promise<boolean> {
    const mutation = `
      mutation DeleteCue($id: ID!) {
        deleteCue(id: $id)
      }
    `;

    const data = await this.query(mutation, { id });
    return data.deleteCue;
  }

  async deleteCueList(id: string): Promise<boolean> {
    const mutation = `
      mutation DeleteCueList($id: ID!) {
        deleteCueList(id: $id)
      }
    `;

    const data = await this.query(mutation, { id });
    return data.deleteCueList;
  }

  async createProject(input: {
    name: string;
    description?: string;
  }): Promise<Project> {
    const mutation = `
      mutation CreateProject($input: CreateProjectInput!) {
        createProject(input: $input) {
          id
          name
          description
          createdAt
          updatedAt
        }
      }
    `;

    const data = await this.query(mutation, { input });
    return data.createProject;
  }

  async deleteProject(id: string): Promise<boolean> {
    const mutation = `
      mutation DeleteProject($id: ID!) {
        deleteProject(id: $id)
      }
    `;

    const data = await this.query(mutation, { id });
    return data.deleteProject;
  }

  async createFixtureDefinition(input: {
    manufacturer: string;
    model: string;
    type: string;
    channels: Array<{
      name: string;
      type: string;
      offset: number;
      minValue?: number;
      maxValue?: number;
      defaultValue?: number;
    }>;
    modes?: Array<{
      name: string;
      channelCount: number;
    }>;
  }): Promise<FixtureDefinition> {
    const mutation = `
      mutation CreateFixtureDefinition($input: CreateFixtureDefinitionInput!) {
        createFixtureDefinition(input: $input) {
          id
          manufacturer
          model
          type
          isBuiltIn
          channels {
            id
            name
            type
            offset
            minValue
            maxValue
            defaultValue
          }
          modes {
            id
            name
            shortName
            channelCount
          }
        }
      }
    `;

    const data = await this.query(mutation, { input });
    return data.createFixtureDefinition;
  }

  async createFixtureInstance(input: {
    projectId: string;
    name: string;
    description?: string;
    definitionId: string;
    modeId?: string;
    universe: number;
    startChannel: number;
    tags: string[];
  }): Promise<FixtureInstance> {
    const mutation = `
      mutation CreateFixtureInstance($input: CreateFixtureInstanceInput!) {
        createFixtureInstance(input: $input) {
          id
          name
          description
          universe
          startChannel
          tags
          # Flattened fields
          definitionId
          manufacturer
          model
          type
          modeName
          channelCount
        }
      }
    `;

    const data = await this.query(mutation, { input });
    return data.createFixtureInstance;
  }

  async updateFixtureInstance(id: string, input: {
    name?: string;
    description?: string;
    definitionId?: string;
    modeId?: string;
    universe?: number;
    startChannel?: number;
    tags?: string[];
  }): Promise<FixtureInstance> {
    const mutation = `
      mutation UpdateFixtureInstance($id: ID!, $input: UpdateFixtureInstanceInput!) {
        updateFixtureInstance(id: $id, input: $input) {
          id
          name
          description
          universe
          startChannel
          tags
          # Flattened fields
          definitionId
          manufacturer
          model
          type
          modeName
          channelCount
        }
      }
    `;

    const data = await this.query(mutation, { id, input });
    return data.updateFixtureInstance;
  }

  async deleteFixtureInstance(id: string): Promise<boolean> {
    const mutation = `
      mutation DeleteFixtureInstance($id: ID!) {
        deleteFixtureInstance(id: $id)
      }
    `;

    const data = await this.query(mutation, { id });
    return data.deleteFixtureInstance;
  }

  async bulkUpdateFixtures(input: {
    fixtures: Array<{
      fixtureId: string;
      name?: string;
      description?: string;
      universe?: number;
      startChannel?: number;
      tags?: string[];
      layoutX?: number;
      layoutY?: number;
      layoutRotation?: number;
    }>;
  }): Promise<FixtureInstance[]> {
    const mutation = `
      mutation BulkUpdateFixtures($input: BulkFixtureUpdateInput!) {
        bulkUpdateFixtures(input: $input) {
          id
          name
          description
          universe
          startChannel
          tags
          layoutX
          layoutY
          layoutRotation
          # Flattened fields
          definitionId
          manufacturer
          model
          type
          modeName
          channelCount
        }
      }
    `;

    const data = await this.query(mutation, { input });
    return data.bulkUpdateFixtures;
  }

  async bulkCreateFixtures(input: {
    fixtures: Array<{
      projectId: string;
      name: string;
      description?: string;
      definitionId: string;
      modeId?: string;
      universe: number;
      startChannel: number;
      tags?: string[];
    }>;
  }): Promise<FixtureInstance[]> {
    const mutation = `
      mutation BulkCreateFixtures($input: BulkFixtureCreateInput!) {
        bulkCreateFixtures(input: $input) {
          id
          name
          description
          universe
          startChannel
          tags
          # Flattened fields
          definitionId
          manufacturer
          model
          type
          modeName
          channelCount
          channels {
            id
            offset
            name
            type
            minValue
            maxValue
            defaultValue
          }
        }
      }
    `;

    const data = await this.query(mutation, { input });
    return data.bulkCreateFixtures;
  }

  async setSceneLive(sceneId: string): Promise<boolean> {
    const mutation = `
      mutation ActivateScene($sceneId: ID!) {
        setSceneLive(sceneId: $sceneId)
      }
    `;

    const data = await this.query(mutation, { sceneId });
    return data.setSceneLive;
  }

  async fadeToBlack(fadeOutTime: number): Promise<boolean> {
    const mutation = `
      mutation FadeToBlack($fadeOutTime: Float!) {
        fadeToBlack(fadeOutTime: $fadeOutTime)
      }
    `;

    const data = await this.query(mutation, { fadeOutTime });
    return data.fadeToBlack;
  }

  async getScene(id: string): Promise<Scene | null> {
    const query = `
      query GetScene($id: ID!) {
        scene(id: $id) {
          id
          name
          description
          createdAt
          updatedAt
          fixtureValues {
            fixture {
              id
              name
            }
            channelValues
          }
        }
      }
    `;

    const data = await this.query(query, { id });
    return data.scene;
  }

  async getCurrentActiveScene(): Promise<Scene | null> {
    const query = `
      query GetCurrentActiveScene {
        currentActiveScene {
          id
          name
          description
          createdAt
          updatedAt
          project {
            id
            name
          }
          fixtureValues {
            fixture {
              id
              name
            }
            channelValues
          }
        }
      }
    `;

    const data = await this.query(query);
    return data.currentActiveScene;
  }

  async getCue(id: string): Promise<Cue | null> {
    const query = `
      query GetCue($id: ID!) {
        cue(id: $id) {
          id
          name
          cueNumber
          fadeInTime
          fadeOutTime
          followTime
          notes
          cueList {
            id
            name
          }
          scene {
            id
            name
            description
          }
        }
      }
    `;

    const data = await this.query(query, { id });
    return data.cue;
  }

  async playCue(cueId: string, fadeInTime?: number): Promise<boolean> {
    const mutation = `
      mutation PlayCue($cueId: ID!, $fadeInTime: Float) {
        playCue(cueId: $cueId, fadeInTime: $fadeInTime)
      }
    `;

    const data = await this.query(mutation, { cueId, fadeInTime });
    return data.playCue;
  }

  async getCueListPlaybackStatus(cueListId: string): Promise<any> {
    const query = `
      query GetCueListPlaybackStatus($cueListId: ID!) {
        cueListPlaybackStatus(cueListId: $cueListId) {
          cueListId
          currentCueIndex
          isPlaying
          currentCue {
            id
            name
            cueNumber
            fadeInTime
            fadeOutTime
            followTime
          }
          fadeProgress
          lastUpdated
        }
      }
    `;

    const data = await this.query(query, { cueListId });
    return data.cueListPlaybackStatus;
  }

  async startCueList(cueListId: string, startFromCue?: number): Promise<boolean> {
    const mutation = `
      mutation StartCueList($cueListId: ID!, $startFromCue: Int) {
        startCueList(cueListId: $cueListId, startFromCue: $startFromCue)
      }
    `;

    const data = await this.query(mutation, { cueListId, startFromCue });
    return data.startCueList;
  }

  async nextCue(cueListId: string, fadeInTime?: number): Promise<boolean> {
    const mutation = `
      mutation NextCue($cueListId: ID!, $fadeInTime: Float) {
        nextCue(cueListId: $cueListId, fadeInTime: $fadeInTime)
      }
    `;

    const data = await this.query(mutation, { cueListId, fadeInTime });
    return data.nextCue;
  }

  async previousCue(cueListId: string, fadeInTime?: number): Promise<boolean> {
    const mutation = `
      mutation PreviousCue($cueListId: ID!, $fadeInTime: Float) {
        previousCue(cueListId: $cueListId, fadeInTime: $fadeInTime)
      }
    `;

    const data = await this.query(mutation, { cueListId, fadeInTime });
    return data.previousCue;
  }

  async goToCue(cueListId: string, cueIndex: number, fadeInTime?: number): Promise<boolean> {
    const mutation = `
      mutation GoToCue($cueListId: ID!, $cueIndex: Int!, $fadeInTime: Float) {
        goToCue(cueListId: $cueListId, cueIndex: $cueIndex, fadeInTime: $fadeInTime)
      }
    `;

    const data = await this.query(mutation, { cueListId, cueIndex, fadeInTime });
    return data.goToCue;
  }

  async stopCueList(cueListId: string): Promise<boolean> {
    const mutation = `
      mutation StopCueList($cueListId: ID!) {
        stopCueList(cueListId: $cueListId)
      }
    `;

    const data = await this.query(mutation, { cueListId });
    return data.stopCueList;
  }

  // importProjectFromQLC method removed - import functionality moved to web UI due to file size constraints
  // async importProjectFromQLC(xmlContent: string, originalFileName: string): Promise<any> {
    /*const mutation = `
      mutation ImportProjectFromQLC($xmlContent: String!, $originalFileName: String!) {
        importProjectFromQLC(xmlContent: $xmlContent, originalFileName: $originalFileName) {
          project {
            id
            name
            description
            createdAt
            updatedAt
            fixtures {
              id
              name
              manufacturer
              model
              universe
              startChannel
              channelCount
            }
            scenes {
              id
              name
              description
              fixtureValues {
                fixture {
                  id
                  name
                }
                channelValues
              }
            }
            cueLists {
              id
              name
              description
              cues {
                id
                name
                cueNumber
                fadeInTime
                fadeOutTime
                scene {
                  id
                  name
                }
              }
            }
          }
          originalFileName
          fixtureCount
          sceneCount
          cueListCount
          warnings
        }
      }
    `;

    const data = await this.query(mutation, { xmlContent, originalFileName });
    return data.importProjectFromQLC;
  }*/



  /**
   * Get fixture usage information - shows which scenes and cues use this fixture
   * Part of MCP API Refactor - Task 2.7
   */
  async getFixtureUsage(fixtureId: string): Promise<FixtureUsage> {
    const query = `
      query GetFixtureUsage($fixtureId: ID!) {
        fixtureUsage(fixtureId: $fixtureId) {
          fixtureId
          fixtureName
          scenes {
            id
            name
            description
            createdAt
            updatedAt
            fixtureCount
          }
          cues {
            cueId
            cueNumber
            cueName
            cueListId
            cueListName
          }
        }
      }
    `;

    const data = await this.query(query, { fixtureId });
    return data.fixtureUsage;
  }

  /**
   * Get scene usage information - shows which cues use this scene
   * Part of MCP API Refactor - Task 2.7
   */
  async getSceneUsage(sceneId: string): Promise<SceneUsage> {
    const query = `
      query GetSceneUsage($sceneId: ID!) {
        sceneUsage(sceneId: $sceneId) {
          sceneId
          sceneName
          cues {
            cueId
            cueNumber
            cueName
            cueListId
            cueListName
          }
        }
      }
    `;

    const data = await this.query(query, { sceneId });
    return data.sceneUsage;
  }

  /**
   * Compare two scenes to identify differences
   * Part of MCP API Refactor - Task 2.7
   */
  async compareScenes(sceneId1: string, sceneId2: string): Promise<SceneComparison> {
    const query = `
      query CompareScenes($sceneId1: ID!, $sceneId2: ID!) {
        compareScenes(sceneId1: $sceneId1, sceneId2: $sceneId2) {
          scene1 {
            id
            name
            description
            createdAt
            updatedAt
            fixtureCount
          }
          scene2 {
            id
            name
            description
            createdAt
            updatedAt
            fixtureCount
          }
          differences {
            fixtureId
            fixtureName
            differenceType
            scene1Values
            scene2Values
          }
          identicalFixtureCount
          differentFixtureCount
        }
      }
    `;

    const data = await this.query(query, { sceneId1, sceneId2 });
    return data.compareScenes;
  }

  // Search methods
  async searchFixtures(
    projectId: string,
    query: string,
    filter?: {
      type?: string;
      universe?: number;
      tags?: string[];
      manufacturer?: string;
      model?: string;
    },
    page?: number,
    perPage?: number
  ): Promise<{
    fixtures: FixtureInstance[];
    pagination: {
      total: number;
      page: number;
      perPage: number;
      totalPages: number;
      hasMore: boolean;
    };
  }> {
    const gqlQuery = `
      query SearchFixtures(
        $projectId: ID!
        $query: String!
        $filter: FixtureFilterInput
        $page: Int
        $perPage: Int
      ) {
        searchFixtures(
          projectId: $projectId
          query: $query
          filter: $filter
          page: $page
          perPage: $perPage
        ) {
          fixtures {
            id
            name
            description
            manufacturer
            model
            type
            modeName
            channelCount
            universe
            startChannel
            tags
            channels {
              id
              offset
              name
              type
              minValue
              maxValue
              defaultValue
            }
          }
          pagination {
            total
            page
            perPage
            totalPages
            hasMore
          }
        }
      }
    `;

    const data = await this.query(gqlQuery, {
      projectId,
      query,
      filter,
      page,
      perPage,
    });
    return data.searchFixtures;
  }

  async searchScenes(
    projectId: string,
    query: string,
    filter?: {
      nameContains?: string;
      usesFixture?: string;
    },
    page?: number,
    perPage?: number
  ): Promise<{
    scenes: Array<{
      id: string;
      name: string;
      description?: string;
      fixtureCount: number;
      createdAt: string;
      updatedAt: string;
    }>;
    pagination: {
      total: number;
      page: number;
      perPage: number;
      totalPages: number;
      hasMore: boolean;
    };
  }> {
    const gqlQuery = `
      query SearchScenes(
        $projectId: ID!
        $query: String!
        $filter: SceneFilterInput
        $page: Int
        $perPage: Int
      ) {
        searchScenes(
          projectId: $projectId
          query: $query
          filter: $filter
          page: $page
          perPage: $perPage
        ) {
          scenes {
            id
            name
            description
            fixtureCount
            createdAt
            updatedAt
          }
          pagination {
            total
            page
            perPage
            totalPages
            hasMore
          }
        }
      }
    `;

    const data = await this.query(gqlQuery, {
      projectId,
      query,
      filter,
      page,
      perPage,
    });
    return data.searchScenes;
  }

  async searchCues(
    cueListId: string,
    query: string,
    page?: number,
    perPage?: number
  ): Promise<{
    cues: Cue[];
    pagination: {
      total: number;
      page: number;
      perPage: number;
      totalPages: number;
      hasMore: boolean;
    };
  }> {
    const gqlQuery = `
      query SearchCues(
        $cueListId: ID!
        $query: String!
        $page: Int
        $perPage: Int
      ) {
        searchCues(
          cueListId: $cueListId
          query: $query
          page: $page
          perPage: $perPage
        ) {
          cues {
            id
            name
            cueNumber
            fadeInTime
            fadeOutTime
            followTime
            notes
            scene {
              id
              name
            }
            cueList {
              id
              name
            }
          }
          pagination {
            total
            page
            perPage
            totalPages
            hasMore
          }
        }
      }
    `;

    const data = await this.query(gqlQuery, {
      cueListId,
      query,
      page,
      perPage,
    });
    return data.searchCues;
  }
}
