import fetch from 'cross-fetch';
import {
  Project,
  FixtureDefinition,
  FixtureInstance,
  Look,
  CueList,
  Cue,
  FixtureUsage,
  LookUsage,
  LookComparison,
  LookSummary,
  LookFixtureSummary,
  LookSortField,
  LookBoard,
  LookBoardButton
} from '../types/lighting';
import { PaginatedResponse } from '../types/pagination';
import { normalizePaginationParams } from '../utils/pagination';

/**
 * Default time (in seconds) assumed for manual cue advance when followTime is not specified.
 * This is used when estimating total cue list duration.
 */
const DEFAULT_MANUAL_ADVANCE_TIME = 5;

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
          looks {
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
          looks {
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
              channels {
                offset
                value
              }
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
              look {
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

  /**
   * Get a single project with metadata and counts only (no nested data).
   * More efficient than getProject when you only need summary information.
   * Part of MCP API Refactor - Task 2.2
   */
  async getProjectWithCounts(id: string): Promise<{
    id: string;
    name: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
    fixtureCount: number;
    lookCount: number;
    cueListCount: number;
  } | null> {
    const query = `
      query GetProjectWithCounts($id: ID!) {
        project(id: $id) {
          id
          name
          description
          createdAt
          updatedAt
          fixtureCount
          lookCount
          cueListCount
        }
      }
    `;

    const data = await this.query(query, { id });
    return data.project;
  }

  /**
   * Get all projects with metadata and counts.
   * Use includeDetails parameter to include counts in the response.
   * Part of MCP API Refactor - Task 2.2
   */
  async getProjectsWithCounts(): Promise<Array<{
    id: string;
    name: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
    fixtureCount: number;
    lookCount: number;
    cueListCount: number;
  }>> {
    const query = `
      query GetProjectsWithCounts {
        projects {
          id
          name
          description
          createdAt
          updatedAt
          fixtureCount
          lookCount
          cueListCount
        }
      }
    `;

    const data = await this.query(query);
    return data.projects;
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

  /**
   * Get paginated list of fixture instances with filtering
   * Part of MCP API Refactor - Task 2.3
   */
  async getFixtureInstances(args: {
    projectId: string;
    page?: number;
    perPage?: number;
    filter?: {
      type?: string;
      universe?: number;
      tags?: string[];
      manufacturer?: string;
      model?: string;
    };
  }): Promise<{
    fixtures: FixtureInstance[];
    pagination: {
      total: number;
      page: number;
      perPage: number;
      totalPages: number;
      hasMore: boolean;
    };
  }> {
    const query = `
      query GetFixtureInstances(
        $projectId: ID!
        $page: Int
        $perPage: Int
        $filter: FixtureFilterInput
      ) {
        fixtureInstances(
          projectId: $projectId
          page: $page
          perPage: $perPage
          filter: $filter
        ) {
          fixtures {
            id
            name
            description
            universe
            startChannel
            tags
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

    const data = await this.query(query, args);
    return data.fixtureInstances;
  }

  /**
   * Get a single fixture instance by ID
   * Part of MCP API Refactor - Task 2.3
   */
  async getFixtureInstance(id: string): Promise<FixtureInstance | null> {
    const query = `
      query GetFixtureInstance($id: ID!) {
        fixtureInstance(id: $id) {
          id
          name
          description
          universe
          startChannel
          tags
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

    const data = await this.query(query, { id });
    return data.fixtureInstance;
  }

  async createLook(input: {
    name: string;
    description?: string;
    projectId: string;
    fixtureValues: Array<{
      fixtureId: string;
      channels: { offset: number; value: number; }[];
    }>;
  }): Promise<Look> {
    const mutation = `
      mutation CreateLook($input: CreateLookInput!) {
        createLook(input: $input) {
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
            channels {
              offset
              value
            }
          }
        }
      }
    `;

    const data = await this.query(mutation, { input });
    return data.createLook;
  }

  async updateLook(id: string, input: {
    name?: string;
    description?: string;
    fixtureValues?: Array<{
      fixtureId: string;
      channels: { offset: number; value: number; }[];
    }>;
  }): Promise<Look> {
    const mutation = `
      mutation UpdateLook($id: ID!, $input: UpdateLookInput!) {
        updateLook(id: $id, input: $input) {
          id
          name
          description
          updatedAt
          fixtureValues {
            fixture {
              id
              name
            }
            channels {
              offset
              value
            }
          }
        }
      }
    `;

    const data = await this.query(mutation, { id, input });
    return data.updateLook;
  }

  // SAFE LOOK UPDATE METHODS
  async addFixturesToLook(lookId: string, fixtureValues: Array<{
    fixtureId: string;
    channels: { offset: number; value: number; }[];
    lookOrder?: number;
  }>, overwriteExisting: boolean = false): Promise<Look> {
    const mutation = `
      mutation AddFixturesToLook($lookId: ID!, $fixtureValues: [FixtureValueInput!]!, $overwriteExisting: Boolean) {
        addFixturesToLook(lookId: $lookId, fixtureValues: $fixtureValues, overwriteExisting: $overwriteExisting) {
          id
          name
          description
          updatedAt
          fixtureValues {
            fixture {
              id
              name
            }
            channels {
              offset
              value
            }
            lookOrder
          }
        }
      }
    `;

    const data = await this.query(mutation, {
      lookId,
      fixtureValues,
      overwriteExisting
    });
    return data.addFixturesToLook;
  }

  async removeFixturesFromLook(lookId: string, fixtureIds: string[]): Promise<Look> {
    const mutation = `
      mutation RemoveFixturesFromLook($lookId: ID!, $fixtureIds: [ID!]!) {
        removeFixturesFromLook(lookId: $lookId, fixtureIds: $fixtureIds) {
          id
          name
          description
          updatedAt
          fixtureValues {
            fixture {
              id
              name
            }
            channels {
              offset
              value
            }
            lookOrder
          }
        }
      }
    `;

    const data = await this.query(mutation, { lookId, fixtureIds });
    return data.removeFixturesFromLook;
  }

  async updateLookPartial(lookId: string, updates: {
    name?: string;
    description?: string;
    fixtureValues?: Array<{
      fixtureId: string;
      channels: { offset: number; value: number; }[];
      lookOrder?: number;
    }>;
    mergeFixtures?: boolean;
  }): Promise<Look> {
    const mutation = `
      mutation UpdateLookPartial($lookId: ID!, $name: String, $description: String, $fixtureValues: [FixtureValueInput!], $mergeFixtures: Boolean) {
        updateLookPartial(lookId: $lookId, name: $name, description: $description, fixtureValues: $fixtureValues, mergeFixtures: $mergeFixtures) {
          id
          name
          description
          updatedAt
          fixtureValues {
            fixture {
              id
              name
            }
            channels {
              offset
              value
            }
            lookOrder
          }
        }
      }
    `;

    const data = await this.query(mutation, {
      lookId,
      name: updates.name,
      description: updates.description,
      fixtureValues: updates.fixtureValues,
      mergeFixtures: updates.mergeFixtures
    });
    return data.updateLookPartial;
  }

  async bulkUpdateLooksPartial(input: {
    looks: Array<{
      lookId: string;
      name?: string;
      description?: string;
      fixtureValues?: Array<{
        fixtureId: string;
        channels: { offset: number; value: number; }[];
        lookOrder?: number;
      }>;
      mergeFixtures?: boolean;
    }>;
  }): Promise<Look[]> {
    const mutation = `
      mutation BulkUpdateLooksPartial($input: BulkLookPartialUpdateInput!) {
        bulkUpdateLooksPartial(input: $input) {
          id
          name
          description
          updatedAt
          fixtureValues {
            fixture {
              id
              name
            }
            channels {
              offset
              value
            }
            lookOrder
          }
        }
      }
    `;

    const data = await this.query(mutation, { input });
    return data.bulkUpdateLooksPartial;
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
            look {
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
   * Part of Task 2.5 (Cue List Query Tools) - MCP API Refactor
   */
  async getCueLists(projectId: string): Promise<any[]> {
    // For now, use the existing project query to get cue lists
    // This will be replaced with a dedicated cueLists query once backend pagination support is added
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
   * Part of Task 2.5 (Cue List Query Tools) - MCP API Refactor
   */
  async getCueListWithPagination(
    cueListId: string,
    page: number = 1,
    perPage: number = 50,
    includeLookDetails: boolean = false
  ): Promise<any> {
    // For now, use the existing getCueList and apply client-side pagination
    // This will be replaced with a backend paginated query once backend pagination support is added
    const cueList = await this.getCueList(cueListId);
    if (!cueList) {
      return null;
    }

    const cues = cueList.cues || [];
    const start = (page - 1) * perPage;
    const end = start + perPage;
    const paginatedCues = cues.slice(start, end);

    // Format cues with optional look details
    const formattedCues = paginatedCues.map((cue: any) => {
      const baseCue = {
        id: cue.id,
        name: cue.name,
        cueNumber: cue.cueNumber,
        fadeInTime: cue.fadeInTime,
        fadeOutTime: cue.fadeOutTime,
        followTime: cue.followTime,
        notes: cue.notes,
        lookId: cue.look.id,
        lookName: cue.look.name,
      };

      if (includeLookDetails) {
        return {
          ...baseCue,
          look: cue.look,
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
        totalTime += DEFAULT_MANUAL_ADVANCE_TIME;
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
    lookId: string;
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
          look {
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
            look {
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
    lookId?: string;
    fadeInTime?: number;
    fadeOutTime?: number;
    followTime?: number | null;
    notes?: string;
    skip?: boolean;
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
          skip
          look {
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
          look {
            id
          }
          fadeInTime
          fadeOutTime
          followTime
          notes
          skip
        }
      }
    `;

    const cueData = await this.query(cueQuery, { id });
    const currentCue = cueData.cue;

    const updateInput = {
      name: input.name ?? currentCue.name,
      cueNumber: input.cueNumber ?? currentCue.cueNumber,
      cueListId: currentCue.cueList.id,
      lookId: input.lookId ?? currentCue.look.id,
      fadeInTime: input.fadeInTime ?? currentCue.fadeInTime,
      fadeOutTime: input.fadeOutTime ?? currentCue.fadeOutTime,
      followTime: input.followTime !== undefined ? input.followTime : currentCue.followTime,
      notes: input.notes !== undefined ? input.notes : currentCue.notes,
      skip: input.skip !== undefined ? input.skip : currentCue.skip
    };

    const data = await this.query(mutation, { id, input: updateInput });
    return data.updateCue;
  }

  async toggleCueSkip(cueId: string): Promise<Cue> {
    const mutation = `
      mutation ToggleCueSkip($cueId: ID!) {
        toggleCueSkip(cueId: $cueId) {
          id
          name
          cueNumber
          fadeInTime
          fadeOutTime
          followTime
          notes
          skip
          look {
            id
            name
          }
        }
      }
    `;

    const data = await this.query(mutation, { cueId });
    return data.toggleCueSkip;
  }

  async bulkUpdateCues(input: {
    cueIds: string[];
    fadeInTime?: number;
    fadeOutTime?: number;
    followTime?: number | null;
    easingType?: string;
    skip?: boolean;
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
          skip
          look {
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

  async bulkDeleteFixtures(fixtureIds: string[]): Promise<{ successCount: number; failedIds: string[] }> {
    const mutation = `
      mutation BulkDeleteFixtures($fixtureIds: [ID!]!) {
        bulkDeleteFixtures(fixtureIds: $fixtureIds) {
          successCount
          failedIds
        }
      }
    `;

    const data = await this.query(mutation, { fixtureIds });
    return data.bulkDeleteFixtures;
  }

  // Bulk Look Operations

  async bulkCreateLooks(input: {
    looks: Array<{
      name: string;
      description?: string;
      projectId: string;
      fixtureValues: Array<{
        fixtureId: string;
        channels: { offset: number; value: number; }[];
      }>;
    }>;
  }): Promise<Look[]> {
    const mutation = `
      mutation BulkCreateLooks($input: BulkLookCreateInput!) {
        bulkCreateLooks(input: $input) {
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
            channels {
              offset
              value
            }
          }
        }
      }
    `;

    const data = await this.query(mutation, { input });
    return data.bulkCreateLooks;
  }

  async bulkUpdateLooks(input: {
    looks: Array<{
      lookId: string;
      name?: string;
      description?: string;
      fixtureValues?: Array<{
        fixtureId: string;
        channels: { offset: number; value: number; }[];
      }>;
    }>;
  }): Promise<Look[]> {
    const mutation = `
      mutation BulkUpdateLooks($input: BulkLookUpdateInput!) {
        bulkUpdateLooks(input: $input) {
          id
          name
          description
          updatedAt
          fixtureValues {
            fixture {
              id
              name
            }
            channels {
              offset
              value
            }
          }
        }
      }
    `;

    const data = await this.query(mutation, { input });
    return data.bulkUpdateLooks;
  }

  async bulkDeleteLooks(lookIds: string[]): Promise<{ successCount: number; failedIds: string[] }> {
    const mutation = `
      mutation BulkDeleteLooks($lookIds: [ID!]!) {
        bulkDeleteLooks(lookIds: $lookIds) {
          successCount
          failedIds
        }
      }
    `;

    const data = await this.query(mutation, { lookIds });
    return data.bulkDeleteLooks;
  }

  // Bulk Cue Operations

  async bulkCreateCues(input: {
    cues: Array<{
      name: string;
      cueNumber: number;
      cueListId: string;
      lookId: string;
      fadeInTime: number;
      fadeOutTime: number;
      followTime?: number;
      notes?: string;
    }>;
  }): Promise<Cue[]> {
    const mutation = `
      mutation BulkCreateCues($input: BulkCueCreateInput!) {
        bulkCreateCues(input: $input) {
          id
          name
          cueNumber
          fadeInTime
          fadeOutTime
          followTime
          notes
          look {
            id
            name
          }
        }
      }
    `;

    const data = await this.query(mutation, { input });
    return data.bulkCreateCues;
  }

  async bulkDeleteCues(cueIds: string[]): Promise<{ successCount: number; failedIds: string[] }> {
    const mutation = `
      mutation BulkDeleteCues($cueIds: [ID!]!) {
        bulkDeleteCues(cueIds: $cueIds) {
          successCount
          failedIds
        }
      }
    `;

    const data = await this.query(mutation, { cueIds });
    return data.bulkDeleteCues;
  }

  // Bulk Cue List Operations

  async bulkCreateCueLists(input: {
    cueLists: Array<{
      name: string;
      description?: string;
      projectId: string;
      loop?: boolean;
    }>;
  }): Promise<CueList[]> {
    const mutation = `
      mutation BulkCreateCueLists($input: BulkCueListCreateInput!) {
        bulkCreateCueLists(input: $input) {
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
          }
        }
      }
    `;

    const data = await this.query(mutation, { input });
    return data.bulkCreateCueLists;
  }

  async bulkUpdateCueLists(input: {
    cueLists: Array<{
      cueListId: string;
      name?: string;
      description?: string;
      loop?: boolean;
    }>;
  }): Promise<CueList[]> {
    const mutation = `
      mutation BulkUpdateCueLists($input: BulkCueListUpdateInput!) {
        bulkUpdateCueLists(input: $input) {
          id
          name
          description
          loop
          updatedAt
          cues {
            id
            name
            cueNumber
          }
        }
      }
    `;

    const data = await this.query(mutation, { input });
    return data.bulkUpdateCueLists;
  }

  async bulkDeleteCueLists(cueListIds: string[]): Promise<{ successCount: number; failedIds: string[] }> {
    const mutation = `
      mutation BulkDeleteCueLists($cueListIds: [ID!]!) {
        bulkDeleteCueLists(cueListIds: $cueListIds) {
          successCount
          failedIds
        }
      }
    `;

    const data = await this.query(mutation, { cueListIds });
    return data.bulkDeleteCueLists;
  }

  // Bulk Project Operations

  async bulkCreateProjects(input: {
    projects: Array<{
      name: string;
      description?: string;
    }>;
  }): Promise<Project[]> {
    const mutation = `
      mutation BulkCreateProjects($input: BulkProjectCreateInput!) {
        bulkCreateProjects(input: $input) {
          id
          name
          description
          createdAt
          updatedAt
        }
      }
    `;

    const data = await this.query(mutation, { input });
    return data.bulkCreateProjects;
  }

  async bulkDeleteProjects(projectIds: string[]): Promise<{ successCount: number; failedIds: string[] }> {
    const mutation = `
      mutation BulkDeleteProjects($projectIds: [ID!]!) {
        bulkDeleteProjects(projectIds: $projectIds) {
          successCount
          failedIds
        }
      }
    `;

    const data = await this.query(mutation, { projectIds });
    return data.bulkDeleteProjects;
  }

  // Bulk Fixture Definition Operations

  async bulkCreateFixtureDefinitions(input: {
    definitions: Array<{
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
    }>;
  }): Promise<FixtureDefinition[]> {
    const mutation = `
      mutation BulkCreateFixtureDefinitions($input: BulkFixtureDefinitionCreateInput!) {
        bulkCreateFixtureDefinitions(input: $input) {
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
    return data.bulkCreateFixtureDefinitions;
  }

  async setLookLive(lookId: string): Promise<boolean> {
    const mutation = `
      mutation ActivateLook($lookId: ID!) {
        setLookLive(lookId: $lookId)
      }
    `;

    const data = await this.query(mutation, { lookId });
    return data.setLookLive;
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

  async getLook(id: string): Promise<Look | null> {
    const query = `
      query GetLook($id: ID!) {
        look(id: $id) {
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
            channels {
              offset
              value
            }
          }
        }
      }
    `;

    const data = await this.query(query, { id });
    return data.look;
  }

  async getCurrentActiveLook(): Promise<Look | null> {
    const query = `
      query GetCurrentActiveLook {
        currentActiveLook {
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
            channels {
              offset
              value
            }
          }
        }
      }
    `;

    const data = await this.query(query);
    return data.currentActiveLook;
  }

  // MCP API Refactor - Task 2.4: Look Query Tools

  /**
   * List looks in a project with pagination and filtering (Task 2.4)
   * Returns lightweight look summaries without fixture values
   */
  async listLooks(params: {
    projectId: string;
    page?: number;
    perPage?: number;
    nameContains?: string;
    usesFixture?: string;
    sortBy?: LookSortField;
  }): Promise<PaginatedResponse<LookSummary>> {
    const { page: normalizedPage, perPage: normalizedPerPage } = normalizePaginationParams(params.page, params.perPage);

    const query = `
      query ListLooks($projectId: ID!, $page: Int!, $perPage: Int!, $filter: LookFilterInput, $sortBy: LookSortField) {
        looks(projectId: $projectId, page: $page, perPage: $perPage, filter: $filter, sortBy: $sortBy) {
          looks {
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

    const filter: any = {};
    if (params.nameContains) filter.nameContains = params.nameContains;
    if (params.usesFixture) filter.usesFixture = params.usesFixture;

    const variables = {
      projectId: params.projectId,
      page: normalizedPage,
      perPage: normalizedPerPage,
      filter: Object.keys(filter).length > 0 ? filter : undefined,
      sortBy: params.sortBy || LookSortField.CREATED_AT
    };

    const data = await this.query(query, variables);
    return {
      items: data.looks.looks,
      pagination: data.looks.pagination
    };
  }

  /**
   * Get full look details with optional fixture values (Task 2.4)
   * Set includeFixtureValues=false for faster queries when values not needed
   */
  async getLookWithOptions(id: string, includeFixtureValues: boolean = true): Promise<Look | null> {
    const query = `
      query GetLookWithOptions($id: ID!, $includeFixtureValues: Boolean!) {
        look(id: $id, includeFixtureValues: $includeFixtureValues) {
          id
          name
          description
          createdAt
          updatedAt
          fixtureValues @include(if: $includeFixtureValues) {
            fixture {
              id
              name
            }
            channels {
              offset
              value
            }
            lookOrder
          }
        }
      }
    `;

    const data = await this.query(query, { id, includeFixtureValues });
    return data.look;
  }

  /**
   * Get just the fixtures used in a look without their values (Task 2.4)
   * Fastest way to understand look composition
   */
  async getLookFixtures(lookId: string): Promise<LookFixtureSummary[]> {
    const query = `
      query GetLookFixtures($lookId: ID!) {
        lookFixtures(lookId: $lookId) {
          fixtureId
          fixtureName
          fixtureType
        }
      }
    `;

    const data = await this.query(query, { lookId });
    return data.lookFixtures;
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
          look {
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
          isFading
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

  /**
   * Get fixture usage information - shows which looks and cues use this fixture
   * Part of MCP API Refactor - Task 2.7
   */
  async getFixtureUsage(fixtureId: string): Promise<FixtureUsage> {
    const query = `
      query GetFixtureUsage($fixtureId: ID!) {
        fixtureUsage(fixtureId: $fixtureId) {
          fixtureId
          fixtureName
          looks {
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
   * Get look usage information - shows which cues use this look
   * Part of MCP API Refactor - Task 2.7
   */
  async getLookUsage(lookId: string): Promise<LookUsage> {
    const query = `
      query GetLookUsage($lookId: ID!) {
        lookUsage(lookId: $lookId) {
          lookId
          lookName
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

    const data = await this.query(query, { lookId });
    return data.lookUsage;
  }

  /**
   * Compare two looks to identify differences
   * Part of MCP API Refactor - Task 2.7
   */
  async compareLooks(lookId1: string, lookId2: string): Promise<LookComparison> {
    const query = `
      query CompareLooks($lookId1: ID!, $lookId2: ID!) {
        compareLooks(lookId1: $lookId1, lookId2: $lookId2) {
          look1 {
            id
            name
            description
            createdAt
            updatedAt
            fixtureCount
          }
          look2 {
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
            look1Values
            look2Values
          }
          identicalFixtureCount
          differentFixtureCount
        }
      }
    `;

    const data = await this.query(query, { lookId1, lookId2 });
    return data.compareLooks;
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

  async searchLooks(
    projectId: string,
    query: string,
    filter?: {
      nameContains?: string;
      usesFixture?: string;
    },
    page?: number,
    perPage?: number
  ): Promise<{
    looks: Array<{
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
      query SearchLooks(
        $projectId: ID!
        $query: String!
        $filter: LookFilterInput
        $page: Int
        $perPage: Int
      ) {
        searchLooks(
          projectId: $projectId
          query: $query
          filter: $filter
          page: $page
          perPage: $perPage
        ) {
          looks {
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
    return data.searchLooks;
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
            look {
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

  // Settings Operations

  /**
   * Get a setting value by key
   * @param key Setting key (e.g., "fade_update_rate")
   * @returns Setting value or null if not found
   */
  async getSetting(key: string): Promise<string | null> {
    const query = `
      query GetSetting($key: String!) {
        setting(key: $key) {
          key
          value
        }
      }
    `;

    const data = await this.query(query, { key });
    return data.setting ? data.setting.value : null;
  }

  /**
   * Set a setting value by key
   * @param key Setting key (e.g., "fade_update_rate")
   * @param value Setting value (e.g., "60")
   * @returns Updated setting value
   */
  async setSetting(key: string, value: string): Promise<string> {
    const mutation = `
      mutation SetSetting($key: String!, $value: String!) {
        setSetting(key: $key, value: $value) {
          key
          value
        }
      }
    `;

    const data = await this.query(mutation, { key, value });
    return data.setSetting.value;
  }

  /**
   * Get build information for the backend server
   * @returns Build info including version, git commit, and build time
   */
  async getBuildInfo(): Promise<{
    version: string;
    gitCommit: string;
    buildTime: string;
  }> {
    const query = `
      query GetBuildInfo {
        buildInfo {
          version
          gitCommit
          buildTime
        }
      }
    `;

    const data = await this.query(query, {});
    return data.buildInfo;
  }

  // ========================================================================
  // Look Board Operations
  // ========================================================================

  /**
   * List all look boards in a project
   */
  async listLookBoards(projectId: string): Promise<LookBoard[]> {
    const query = `
      query ListLookBoards($projectId: ID!) {
        lookBoards(projectId: $projectId) {
          id
          name
          description
          project {
            id
            name
          }
          defaultFadeTime
          gridSize
          canvasWidth
          canvasHeight
          buttons {
            id
            look {
              id
              name
            }
            layoutX
            layoutY
            width
            height
            color
            label
            createdAt
            updatedAt
          }
          createdAt
          updatedAt
        }
      }
    `;

    const data = await this.query(query, { projectId });
    return data.lookBoards;
  }

  /**
   * Get a specific look board with all its buttons
   */
  async getLookBoard(lookBoardId: string): Promise<LookBoard | null> {
    const query = `
      query GetLookBoard($lookBoardId: ID!) {
        lookBoard(id: $lookBoardId) {
          id
          name
          description
          project {
            id
            name
          }
          defaultFadeTime
          gridSize
          canvasWidth
          canvasHeight
          buttons {
            id
            lookBoard {
              id
              name
            }
            look {
              id
              name
            }
            layoutX
            layoutY
            width
            height
            color
            label
            createdAt
            updatedAt
          }
          createdAt
          updatedAt
        }
      }
    `;

    const data = await this.query(query, { lookBoardId });
    return data.lookBoard;
  }

  /**
   * Create a new look board
   */
  async createLookBoard(input: {
    name: string;
    description?: string;
    projectId: string;
    defaultFadeTime?: number;
    gridSize?: number;
    canvasWidth?: number;
    canvasHeight?: number;
  }): Promise<LookBoard> {
    const mutation = `
      mutation CreateLookBoard($input: CreateLookBoardInput!) {
        createLookBoard(input: $input) {
          id
          name
          description
          project {
            id
            name
          }
          defaultFadeTime
          gridSize
          canvasWidth
          canvasHeight
          buttons {
            id
          }
          createdAt
          updatedAt
        }
      }
    `;

    const data = await this.query(mutation, { input });
    return data.createLookBoard;
  }

  /**
   * Update an existing look board
   */
  async updateLookBoard(
    lookBoardId: string,
    input: {
      name?: string;
      description?: string;
      defaultFadeTime?: number;
      gridSize?: number;
      canvasWidth?: number;
      canvasHeight?: number;
    }
  ): Promise<LookBoard> {
    const mutation = `
      mutation UpdateLookBoard($id: ID!, $input: UpdateLookBoardInput!) {
        updateLookBoard(id: $id, input: $input) {
          id
          name
          description
          project {
            id
            name
          }
          defaultFadeTime
          gridSize
          canvasWidth
          canvasHeight
          createdAt
          updatedAt
        }
      }
    `;

    const data = await this.query(mutation, { id: lookBoardId, input });
    return data.updateLookBoard;
  }

  /**
   * Delete a look board and all its buttons
   */
  async deleteLookBoard(lookBoardId: string): Promise<boolean> {
    const mutation = `
      mutation DeleteLookBoard($id: ID!) {
        deleteLookBoard(id: $id)
      }
    `;

    const data = await this.query(mutation, { id: lookBoardId });
    return data.deleteLookBoard;
  }

  /**
   * Bulk create multiple look boards
   */
  async bulkCreateLookBoards(input: Array<{
    name: string;
    description?: string;
    projectId: string;
    defaultFadeTime?: number;
    gridSize?: number;
    canvasWidth?: number;
    canvasHeight?: number;
  }>): Promise<LookBoard[]> {
    const mutation = `
      mutation BulkCreateLookBoards($input: BulkLookBoardCreateInput!) {
        bulkCreateLookBoards(input: $input) {
          id
          name
          description
          project {
            id
            name
          }
          defaultFadeTime
          gridSize
          canvasWidth
          canvasHeight
          createdAt
          updatedAt
        }
      }
    `;

    const data = await this.query(mutation, { input: { lookBoards: input } });
    return data.bulkCreateLookBoards;
  }

  /**
   * Bulk update multiple look boards
   */
  async bulkUpdateLookBoards(input: Array<{
    lookBoardId: string;
    name?: string;
    description?: string;
    defaultFadeTime?: number;
    gridSize?: number;
    canvasWidth?: number;
    canvasHeight?: number;
  }>): Promise<LookBoard[]> {
    const mutation = `
      mutation BulkUpdateLookBoards($input: BulkLookBoardUpdateInput!) {
        bulkUpdateLookBoards(input: $input) {
          id
          name
          description
          defaultFadeTime
          gridSize
          canvasWidth
          canvasHeight
          updatedAt
        }
      }
    `;

    const data = await this.query(mutation, { input: { lookBoards: input } });
    return data.bulkUpdateLookBoards;
  }

  /**
   * Bulk delete multiple look boards
   */
  async bulkDeleteLookBoards(lookBoardIds: string[]): Promise<{
    successCount: number;
    failedIds: string[];
  }> {
    const mutation = `
      mutation BulkDeleteLookBoards($lookBoardIds: [ID!]!) {
        bulkDeleteLookBoards(lookBoardIds: $lookBoardIds) {
          successCount
          failedIds
        }
      }
    `;

    const data = await this.query(mutation, { lookBoardIds });
    return data.bulkDeleteLookBoards;
  }

  // ========================================================================
  // Look Board Button Operations
  // ========================================================================

  /**
   * Add a look to a board (create button)
   */
  async addLookToBoard(input: {
    lookBoardId: string;
    lookId: string;
    layoutX: number;
    layoutY: number;
    width?: number;
    height?: number;
    color?: string;
    label?: string;
  }): Promise<LookBoardButton> {
    const mutation = `
      mutation AddLookToBoard($input: CreateLookBoardButtonInput!) {
        addLookToBoard(input: $input) {
          id
          lookBoard {
            id
            name
          }
          look {
            id
            name
          }
          layoutX
          layoutY
          width
          height
          color
          label
          createdAt
          updatedAt
        }
      }
    `;

    const data = await this.query(mutation, { input });
    return data.addLookToBoard;
  }

  /**
   * Update a look board button
   */
  async updateLookBoardButton(
    buttonId: string,
    input: {
      layoutX?: number;
      layoutY?: number;
      width?: number;
      height?: number;
      color?: string;
      label?: string;
    }
  ): Promise<LookBoardButton> {
    const mutation = `
      mutation UpdateLookBoardButton($id: ID!, $input: UpdateLookBoardButtonInput!) {
        updateLookBoardButton(id: $id, input: $input) {
          id
          lookBoard {
            id
            name
          }
          look {
            id
            name
          }
          layoutX
          layoutY
          width
          height
          color
          label
          updatedAt
        }
      }
    `;

    const data = await this.query(mutation, { id: buttonId, input });
    return data.updateLookBoardButton;
  }

  /**
   * Remove a look from board (delete button)
   */
  async removeLookFromBoard(buttonId: string): Promise<boolean> {
    const mutation = `
      mutation RemoveLookFromBoard($buttonId: ID!) {
        removeLookFromBoard(buttonId: $buttonId)
      }
    `;

    const data = await this.query(mutation, { buttonId });
    return data.removeLookFromBoard;
  }

  /**
   * Update multiple button positions in batch
   */
  async updateLookBoardButtonPositions(positions: Array<{
    buttonId: string;
    layoutX: number;
    layoutY: number;
  }>): Promise<boolean> {
    const mutation = `
      mutation UpdateLookBoardButtonPositions($positions: [LookBoardButtonPositionInput!]!) {
        updateLookBoardButtonPositions(positions: $positions)
      }
    `;

    const data = await this.query(mutation, { positions });
    return data.updateLookBoardButtonPositions;
  }

  /**
   * Bulk create multiple buttons
   */
  async bulkCreateLookBoardButtons(input: Array<{
    lookBoardId: string;
    lookId: string;
    layoutX: number;
    layoutY: number;
    width?: number;
    height?: number;
    color?: string;
    label?: string;
  }>): Promise<LookBoardButton[]> {
    const mutation = `
      mutation BulkCreateLookBoardButtons($input: BulkLookBoardButtonCreateInput!) {
        bulkCreateLookBoardButtons(input: $input) {
          id
          lookBoard {
            id
            name
          }
          look {
            id
            name
          }
          layoutX
          layoutY
          width
          height
          color
          label
          createdAt
          updatedAt
        }
      }
    `;

    const data = await this.query(mutation, { input: { buttons: input } });
    return data.bulkCreateLookBoardButtons;
  }

  /**
   * Bulk update multiple buttons
   */
  async bulkUpdateLookBoardButtons(input: Array<{
    buttonId: string;
    layoutX?: number;
    layoutY?: number;
    width?: number;
    height?: number;
    color?: string;
    label?: string;
  }>): Promise<LookBoardButton[]> {
    const mutation = `
      mutation BulkUpdateLookBoardButtons($input: BulkLookBoardButtonUpdateInput!) {
        bulkUpdateLookBoardButtons(input: $input) {
          id
          look {
            id
            name
          }
          layoutX
          layoutY
          width
          height
          color
          label
          updatedAt
        }
      }
    `;

    const data = await this.query(mutation, { input: { buttons: input } });
    return data.bulkUpdateLookBoardButtons;
  }

  /**
   * Bulk delete multiple buttons
   */
  async bulkDeleteLookBoardButtons(buttonIds: string[]): Promise<{
    successCount: number;
    failedIds: string[];
  }> {
    const mutation = `
      mutation BulkDeleteLookBoardButtons($buttonIds: [ID!]!) {
        bulkDeleteLookBoardButtons(buttonIds: $buttonIds) {
          successCount
          failedIds
        }
      }
    `;

    const data = await this.query(mutation, { buttonIds });
    return data.bulkDeleteLookBoardButtons;
  }

  /**
   * Activate a look from a board (uses board's default fade time unless overridden)
   */
  async activateLookFromBoard(
    lookBoardId: string,
    lookId: string,
    fadeTimeOverride?: number
  ): Promise<boolean> {
    const mutation = `
      mutation ActivateLookFromBoard(
        $lookBoardId: ID!
        $lookId: ID!
        $fadeTimeOverride: Float
      ) {
        activateLookFromBoard(
          lookBoardId: $lookBoardId
          lookId: $lookId
          fadeTimeOverride: $fadeTimeOverride
        )
      }
    `;

    const data = await this.query(mutation, { lookBoardId, lookId, fadeTimeOverride });
    return data.activateLookFromBoard;
  }

  // ============================================================
  // Undo/Redo Operations
  // ============================================================

  /**
   * Get the undo/redo status for a project.
   */
  async getUndoRedoStatus(projectId: string): Promise<{
    projectId: string;
    canUndo: boolean;
    canRedo: boolean;
    currentSequence: number;
    totalOperations: number;
    undoDescription: string | null;
    redoDescription: string | null;
  }> {
    const query = `
      query GetUndoRedoStatus($projectId: ID!) {
        undoRedoStatus(projectId: $projectId) {
          projectId
          canUndo
          canRedo
          currentSequence
          totalOperations
          undoDescription
          redoDescription
        }
      }
    `;

    const data = await this.query(query, { projectId });
    return data.undoRedoStatus;
  }

  /**
   * Undo the last operation for a project.
   */
  async undo(projectId: string): Promise<{
    success: boolean;
    message: string | null;
    restoredEntityId: string | null;
    operation: {
      id: string;
      description: string;
      operationType: string;
      entityType: string;
      sequence: number;
    } | null;
  }> {
    const mutation = `
      mutation Undo($projectId: ID!) {
        undo(projectId: $projectId) {
          success
          message
          restoredEntityId
          operation {
            id
            description
            operationType
            entityType
            sequence
          }
        }
      }
    `;

    const data = await this.query(mutation, { projectId });
    return data.undo;
  }

  /**
   * Redo the last undone operation for a project.
   */
  async redo(projectId: string): Promise<{
    success: boolean;
    message: string | null;
    restoredEntityId: string | null;
    operation: {
      id: string;
      description: string;
      operationType: string;
      entityType: string;
      sequence: number;
    } | null;
  }> {
    const mutation = `
      mutation Redo($projectId: ID!) {
        redo(projectId: $projectId) {
          success
          message
          restoredEntityId
          operation {
            id
            description
            operationType
            entityType
            sequence
          }
        }
      }
    `;

    const data = await this.query(mutation, { projectId });
    return data.redo;
  }

  /**
   * Get the operation history for a project with pagination.
   */
  async getOperationHistory(
    projectId: string,
    page: number = 1,
    perPage: number = 50
  ): Promise<{
    operations: Array<{
      id: string;
      description: string;
      operationType: string;
      entityType: string;
      sequence: number;
      createdAt: string;
      isCurrent: boolean;
    }>;
    pagination: {
      total: number;
      page: number;
      perPage: number;
      totalPages: number;
      hasMore: boolean;
    };
    currentSequence: number;
  }> {
    const query = `
      query GetOperationHistory($projectId: ID!, $page: Int, $perPage: Int) {
        operationHistory(projectId: $projectId, page: $page, perPage: $perPage) {
          operations {
            id
            description
            operationType
            entityType
            sequence
            createdAt
            isCurrent
          }
          pagination {
            total
            page
            perPage
            totalPages
            hasMore
          }
          currentSequence
        }
      }
    `;

    const data = await this.query(query, { projectId, page, perPage });
    return data.operationHistory;
  }

  /**
   * Jump to a specific operation in the history.
   */
  async jumpToOperation(
    projectId: string,
    operationId: string
  ): Promise<{
    success: boolean;
    message: string | null;
    restoredEntityId: string | null;
    operation: {
      id: string;
      description: string;
      operationType: string;
      entityType: string;
      sequence: number;
    } | null;
  }> {
    const mutation = `
      mutation JumpToOperation($projectId: ID!, $operationId: ID!) {
        jumpToOperation(projectId: $projectId, operationId: $operationId) {
          success
          message
          restoredEntityId
          operation {
            id
            description
            operationType
            entityType
            sequence
          }
        }
      }
    `;

    const data = await this.query(mutation, { projectId, operationId });
    return data.jumpToOperation;
  }

  /**
   * Clear the operation history for a project.
   */
  async clearOperationHistory(
    projectId: string,
    confirmClear: boolean = true
  ): Promise<boolean> {
    const mutation = `
      mutation ClearOperationHistory($projectId: ID!, $confirmClear: Boolean!) {
        clearOperationHistory(projectId: $projectId, confirmClear: $confirmClear)
      }
    `;

    const data = await this.query(mutation, { projectId, confirmClear });
    return data.clearOperationHistory;
  }
}
