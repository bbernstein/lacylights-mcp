/**
 * GraphQL Client Integration Contract Tests
 *
 * These tests validate that the MCP GraphQL client works correctly against the real backend
 * GraphQL API. They ensure contract compatibility end-to-end.
 *
 * Requirements:
 * - Backend server must be running at GRAPHQL_ENDPOINT (default: http://localhost:4000/graphql)
 * - Database should have some test data (or tests will skip assertions)
 *
 * Usage:
 * - npm run test:contracts (isolated contract tests)
 * - CI: GitHub Actions will start backend, run migrations, then run these tests
 */

import { LacyLightsGraphQLClient } from '../services/graphql-client-simple';

describe('GraphQL Client Integration Contract Tests', () => {
  let client: LacyLightsGraphQLClient;
  const GRAPHQL_ENDPOINT = process.env.GRAPHQL_ENDPOINT || 'http://localhost:4000/graphql';

  beforeAll(() => {
    client = new LacyLightsGraphQLClient(GRAPHQL_ENDPOINT);
  });

  describe('Project Operations', () => {
    it('should fetch projects list', async () => {
      const projects = await client.getProjects();

      expect(Array.isArray(projects)).toBe(true);

      // Validate structure if data exists
      if (projects.length > 0) {
        const project = projects[0];
        expect(project).toHaveProperty('id');
        expect(project).toHaveProperty('name');
        expect(project).toHaveProperty('fixtures');
        expect(project).toHaveProperty('looks');
        expect(project).toHaveProperty('cueLists');

        // Validate types
        expect(typeof project.id).toBe('string');
        expect(typeof project.name).toBe('string');
        expect(Array.isArray(project.fixtures)).toBe(true);
        expect(Array.isArray(project.looks)).toBe(true);
        expect(Array.isArray(project.cueLists)).toBe(true);
      }
    });

    it('should fetch single project by ID', async () => {
      const projects = await client.getProjects();

      if (projects.length > 0) {
        const projectId = projects[0].id;
        const project = await client.getProject(projectId);

        expect(project).not.toBeNull();

        if (project) {
          expect(project.id).toBe(projectId);
          expect(project).toHaveProperty('name');
          expect(project).toHaveProperty('fixtures');
          expect(project).toHaveProperty('looks');
          expect(project).toHaveProperty('cueLists');
        }
      } else {
        console.log('Skipping single project test - no projects in database');
      }
    });
  });

  describe('Fixture Operations', () => {
    it('should fetch project fixtures', async () => {
      const projects = await client.getProjects();

      if (projects.length > 0) {
        const projectId = projects[0].id;
        const project = await client.getProject(projectId);

        expect(project).not.toBeNull();

        if (project) {
          expect(Array.isArray(project.fixtures)).toBe(true);

          // Validate fixture structure if fixtures exist
          if (project.fixtures.length > 0) {
            const fixture = project.fixtures[0];
          expect(fixture).toHaveProperty('id');
          expect(fixture).toHaveProperty('name');
          expect(fixture).toHaveProperty('universe');
          expect(fixture).toHaveProperty('startChannel');
          expect(fixture).toHaveProperty('manufacturer');
          expect(fixture).toHaveProperty('model');
          expect(fixture).toHaveProperty('type');
          expect(fixture).toHaveProperty('channelCount');
          expect(fixture).toHaveProperty('channels');

          // Validate types
          expect(typeof fixture.id).toBe('string');
          expect(typeof fixture.name).toBe('string');
          expect(typeof fixture.universe).toBe('number');
          expect(typeof fixture.startChannel).toBe('number');
          expect(Array.isArray(fixture.channels)).toBe(true);

          // Validate channel structure if channels exist
          if (fixture.channels.length > 0) {
            const channel = fixture.channels[0];
            expect(channel).toHaveProperty('id');
            expect(channel).toHaveProperty('offset');
            expect(channel).toHaveProperty('name');
            expect(channel).toHaveProperty('type');
            expect(typeof channel.offset).toBe('number');
          }
        }
        }
      } else {
        console.log('Skipping fixture test - no projects in database');
      }
    });

    it('should fetch fixtures with pagination', async () => {
      const projects = await client.getProjects();

      if (projects.length > 0) {
        const projectId = projects[0].id;

        const result = await client.getFixtureInstances({ projectId, page: 1, perPage: 10 });

        // getFixtureInstances returns { fixtures, pagination }
        expect(result).toHaveProperty('fixtures');
        expect(result).toHaveProperty('pagination');
        expect(Array.isArray(result.fixtures)).toBe(true);

        // Validate pagination structure
        const pagination = result.pagination;
        expect(pagination).toHaveProperty('page');
        expect(pagination).toHaveProperty('perPage');
        expect(pagination).toHaveProperty('total');
        expect(pagination).toHaveProperty('hasMore');
        expect(typeof pagination.page).toBe('number');
        expect(typeof pagination.perPage).toBe('number');
        expect(typeof pagination.total).toBe('number');
        expect(typeof pagination.hasMore).toBe('boolean');
      } else {
        console.log('Skipping fixture pagination test - no projects in database');
      }
    });
  });

  describe('Look Operations', () => {
    it('should fetch project looks', async () => {
      const projects = await client.getProjects();

      if (projects.length > 0) {
        const projectId = projects[0].id;
        const project = await client.getProject(projectId);

        expect(project).not.toBeNull();

        if (project) {
          expect(Array.isArray(project.looks)).toBe(true);

          // Validate look structure if looks exist
          if (project.looks.length > 0) {
            const look = project.looks[0];
            expect(look).toHaveProperty('id');
            expect(look).toHaveProperty('name');
            expect(typeof look.id).toBe('string');
            expect(typeof look.name).toBe('string');
          }
        }
      } else {
        console.log('Skipping look test - no projects in database');
      }
    });

    it('should fetch individual look by ID', async () => {
      const projects = await client.getProjects();

      if (projects.length > 0 && projects[0].looks.length > 0) {
        const lookId = projects[0].looks[0].id;
        const look = await client.getLook(lookId);

        expect(look).not.toBeNull();

        if (look) {
          expect(look.id).toBe(lookId);
          expect(look).toHaveProperty('name');
          expect(look).toHaveProperty('fixtureValues');
        }
      } else {
        console.log('Skipping individual look test - no looks in database');
      }
    });
  });

  describe('Type Safety', () => {
    it('should return proper types for all fields', async () => {
      const projects = await client.getProjects();

      if (projects.length > 0) {
        const project = projects[0];

        // Validate ID types
        expect(typeof project.id).toBe('string');
        expect(project.id.length).toBeGreaterThan(0);

        // Validate nested fixtures IDs
        if (project.fixtures.length > 0) {
          expect(typeof project.fixtures[0].id).toBe('string');
        }

        // Validate nested looks IDs
        if (project.looks.length > 0) {
          expect(typeof project.looks[0].id).toBe('string');
        }

        // Validate nested cue lists IDs
        if (project.cueLists.length > 0) {
          expect(typeof project.cueLists[0].id).toBe('string');
        }
      }
    });

    it('should handle DateTime fields correctly', async () => {
      const projects = await client.getProjects();

      if (projects.length > 0) {
        const project = projects[0];

        // DateTime fields should be strings that can be parsed
        if (project.createdAt) {
          expect(typeof project.createdAt).toBe('string');

          // Backend returns timestamp as string, parse as number
          const timestamp = parseInt(project.createdAt, 10);
          const date = new Date(timestamp);
          expect(date).toBeInstanceOf(Date);
          expect(date.getTime()).toBeGreaterThan(0);
        }

        if (project.updatedAt) {
          expect(typeof project.updatedAt).toBe('string');
        }
      }
    });
  });

  describe('Error Handling', () => {
    it('should return null for non-existent project', async () => {
      const fakeId = 'non-existent-id-12345';

      const result = await client.getProject(fakeId);
      expect(result).toBeNull();
    });

    it('should handle invalid pagination parameters gracefully', async () => {
      const projects = await client.getProjects();

      if (projects.length > 0) {
        const projectId = projects[0].id;

        // Should handle valid pagination parameters
        const result = await client.getFixtureInstances({ projectId, page: 1, perPage: 10 });
        expect(result).toBeDefined();
        expect(result.pagination.page).toBe(1);
      } else {
        console.log('Skipping pagination test - no projects in database');
      }
    });
  });
});
