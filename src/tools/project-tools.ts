import { z } from 'zod';
import { LacyLightsGraphQLClient } from '../services/graphql-client-simple';
// Project type not currently used in this file

const ListProjectsSchema = z.object({
  includeDetails: z.boolean().default(false).describe('Include fixture and look counts')
});

const CreateProjectSchema = z.object({
  name: z.string().describe('Project name'),
  description: z.string().optional().describe('Project description')
});

const GetProjectSchema = z.object({
  projectId: z.string().describe('Project ID to get')
});

const GetProjectDetailsSchema = z.object({
  projectId: z.string().describe('Project ID to get details for')
});

const DeleteProjectSchema = z.object({
  projectId: z.string().describe('Project ID to delete'),
  confirmDelete: z.boolean().default(false).describe('Confirm deletion of project and all its data')
});

// Bulk operation schemas
const BulkCreateProjectsSchema = z.object({
  projects: z.array(z.object({
    name: z.string().describe('Project name'),
    description: z.string().optional().describe('Project description')
  })).describe('Array of projects to create')
});

const BulkDeleteProjectsSchema = z.object({
  projectIds: z.array(z.string()).describe('Array of project IDs to delete'),
  confirmDelete: z.boolean().describe('Confirm deletion of projects and all their data')
});

// Removed ImportProjectFromQLCSchema - import functionality moved to web UI due to file size constraints

export class ProjectTools {
  constructor(private graphqlClient: LacyLightsGraphQLClient) {}

  async listProjects(args: z.infer<typeof ListProjectsSchema>) {
    const { includeDetails } = ListProjectsSchema.parse(args);

    try {
      if (includeDetails) {
        // Use efficient count query
        const projects = await this.graphqlClient.getProjectsWithCounts();
        return {
          projects: projects.map(project => ({
            id: project.id,
            name: project.name,
            description: project.description,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
            fixtureCount: project.fixtureCount,
            lookCount: project.lookCount,
            cueListCount: project.cueListCount
          })),
          totalProjects: projects.length
        };
      }

      // Lightweight query without counts
      const projects = await this.graphqlClient.getProjects();
      return {
        projects: projects.map(project => ({
          id: project.id,
          name: project.name,
          description: project.description
        })),
        totalProjects: projects.length
      };
    } catch (error) {
      throw new Error(`Failed to list projects: ${error}`);
    }
  }

  async getProject(args: z.infer<typeof GetProjectSchema>) {
    const { projectId } = GetProjectSchema.parse(args);

    try {
      const project = await this.graphqlClient.getProjectWithCounts(projectId);

      if (!project) {
        throw new Error(`Project with ID ${projectId} not found`);
      }

      return {
        project: {
          id: project.id,
          name: project.name,
          description: project.description,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          fixtureCount: project.fixtureCount,
          lookCount: project.lookCount,
          cueListCount: project.cueListCount
        }
      };
    } catch (error) {
      throw new Error(`Failed to get project: ${error}`);
    }
  }

  async createProject(args: z.infer<typeof CreateProjectSchema>) {
    const { name, description} = CreateProjectSchema.parse(args);

    try {
      const project = await this.graphqlClient.createProject({
        name,
        description
      });

      return {
        project: {
          id: project.id,
          name: project.name,
          description: project.description,
          createdAt: project.createdAt
        },
        message: `Successfully created project "${name}"`
      };
    } catch (error) {
      throw new Error(`Failed to create project: ${error}`);
    }
  }

  async getProjectDetails(args: z.infer<typeof GetProjectDetailsSchema>) {
    const { projectId } = GetProjectDetailsSchema.parse(args);

    try {
      const project = await this.graphqlClient.getProject(projectId);

      if (!project) {
        throw new Error(`Project with ID ${projectId} not found`);
      }

      // Organize fixtures by universe
      const fixturesByUniverse = project.fixtures.reduce((acc, fixture) => {
        if (!acc[fixture.universe]) {
          acc[fixture.universe] = [];
        }
        acc[fixture.universe].push(fixture);
        return acc;
      }, {} as Record<number, typeof project.fixtures>);

      // Sort fixtures within each universe by start channel
      Object.values(fixturesByUniverse).forEach(fixtures => {
        fixtures.sort((a, b) => a.startChannel - b.startChannel);
      });

      return {
        project: {
          id: project.id,
          name: project.name,
          description: project.description,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt
        },
        fixtures: {
          total: project.fixtures.length,
          byUniverse: Object.entries(fixturesByUniverse).map(([universe, fixtures]) => ({
            universe: parseInt(universe),
            fixtureCount: fixtures.length,
            channelRanges: this.calculateChannelRanges(fixtures),
            fixtures: fixtures.map(f => ({
              id: f.id,
              name: f.name,
              type: f.type,
              manufacturer: f.manufacturer,
              model: f.model,
              mode: f.modeName,
              channels: `${f.startChannel}-${f.startChannel + f.channelCount - 1}`,
              tags: f.tags
            }))
          }))
        },
        looks: {
          total: project.looks.length,
          list: project.looks.map(l => ({
            id: l.id,
            name: l.name,
            description: l.description,
            fixtureCount: l.fixtureValues?.length || 0
          }))
        },
        cueLists: {
          total: project.cueLists.length,
          list: project.cueLists.map(cl => ({
            id: cl.id,
            name: cl.name,
            description: cl.description,
            cueCount: cl.cues?.length || 0
          }))
        }
      };
    } catch (error) {
      throw new Error(`Failed to get project details: ${error}`);
    }
  }

  async deleteProject(args: z.infer<typeof DeleteProjectSchema>) {
    const { projectId, confirmDelete } = DeleteProjectSchema.parse(args);

    if (!confirmDelete) {
      throw new Error('Deletion not confirmed. Set confirmDelete to true to proceed.');
    }

    try {
      const success = await this.graphqlClient.deleteProject(projectId);

      return {
        success,
        message: success ? `Project ${projectId} deleted successfully` : 'Failed to delete project'
      };
    } catch (error) {
      throw new Error(`Failed to delete project: ${error}`);
    }
  }

  // Bulk Operations

  /**
   * Create multiple projects in a single operation
   */
  async bulkCreateProjects(args: z.infer<typeof BulkCreateProjectsSchema>) {
    const { projects } = BulkCreateProjectsSchema.parse(args);

    try {
      if (projects.length === 0) {
        throw new Error('No projects provided for bulk creation');
      }

      // Use the GraphQL client's bulk create method
      const createdProjects = await this.graphqlClient.bulkCreateProjects({
        projects,
      });

      return {
        success: true,
        createdProjects: createdProjects.map(project => ({
          projectId: project.id,
          name: project.name,
          description: project.description,
          createdAt: project.createdAt,
        })),
        summary: {
          totalCreated: createdProjects.length,
        },
        message: `Successfully created ${createdProjects.length} projects`,
      };
    } catch (error) {
      throw new Error(`Failed to bulk create projects: ${error}`);
    }
  }

  /**
   * Delete multiple projects in a single operation
   */
  async bulkDeleteProjects(args: z.infer<typeof BulkDeleteProjectsSchema>) {
    const { projectIds, confirmDelete } = BulkDeleteProjectsSchema.parse(args);

    try {
      if (!confirmDelete) {
        throw new Error('confirmDelete must be true to delete projects');
      }

      if (projectIds.length === 0) {
        throw new Error('No project IDs provided for bulk deletion');
      }

      // Use the GraphQL client's bulk delete method
      const result = await this.graphqlClient.bulkDeleteProjects(projectIds);

      // Note: 'success' is true if at least one deletion succeeded, even if some deletions failed.
      // Partial successes are possible; see 'deletedCount' and 'failedIds' for details.
      return {
        success: result.successCount > 0,
        deletedCount: result.successCount,
        failedIds: result.failedIds,
        summary: {
          totalRequested: projectIds.length,
          successCount: result.successCount,
          failureCount: result.failedIds.length,
        },
        message: result.failedIds.length === 0
          ? `Successfully deleted ${result.successCount} projects`
          : `Deleted ${result.successCount} projects, ${result.failedIds.length} failed`,
      };
    } catch (error) {
      throw new Error(`Failed to bulk delete projects: ${error}`);
    }
  }

  private calculateChannelRanges(fixtures: any[]): string {
    if (fixtures.length === 0) return 'None';

    const ranges: Array<{ start: number; end: number }> = [];

    fixtures.forEach(fixture => {
      const start = fixture.startChannel;
      const channelCount = fixture.channelCount;
      const end = start + channelCount - 1;

      // Check if this range can be merged with the last one
      if (ranges.length > 0) {
        const lastRange = ranges[ranges.length - 1];
        if (start <= lastRange.end + 1) {
          // Extend the last range
          lastRange.end = Math.max(lastRange.end, end);
          return;
        }
      }

      // Add new range
      ranges.push({ start, end });
    });

    return ranges.map(r => r.start === r.end ? `${r.start}` : `${r.start}-${r.end}`).join(', ');
  }

  // importProjectFromQLC method removed - import functionality moved to web UI due to file size constraints
  // Users should use the LacyLights web interface to import QLC+ files
}
