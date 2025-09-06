import fetch from 'cross-fetch';
import { Project, FixtureDefinition, FixtureInstance, Scene, CueList, Cue } from '../types/lighting';

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
  }): Promise<CueList> {
    const mutation = `
      mutation UpdateCueList($id: ID!, $input: CreateCueListInput!) {
        updateCueList(id: $id, input: $input) {
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
    `;

    // Since the backend expects CreateCueListInput which requires projectId,
    // we need to get the current cue list first to maintain the projectId
    const cueListQuery = `
      query GetCueList($id: ID!) {
        cueList(id: $id) {
          id
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
}