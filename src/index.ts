#!/usr/bin/env node

import {
  Server,
  StdioServerTransport,
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "./mcp-imports";

import { LacyLightsGraphQLClient, DeviceNotApprovedError } from "./services/graphql-client-simple";
import { RAGService } from "./services/rag-service-simple";
import { AILightingService } from "./services/ai-lighting";
import { FixtureTools } from "./tools/fixture-tools";
import { LookTools } from "./tools/look-tools";
import { CueTools } from "./tools/cue-tools";
import { ProjectTools } from "./tools/project-tools";
import { SettingsTools } from "./tools/settings-tools";
import { LookBoardTools } from "./tools/look-board-tools";
import { UndoRedoTools } from "./tools/undo-redo-tools";
import { logger } from "./utils/logger";
import { getDeviceFingerprint, getDeviceName } from "./utils/device-fingerprint";

/**
 * Redact a device fingerprint for safe logging.
 * For fingerprints longer than 12 characters: shows first 8 and last 4 characters.
 * For shorter fingerprints: shows only first 4 characters followed by '...'.
 */
function redactFingerprint(fingerprint: string | null | undefined): string {
  if (!fingerprint) return 'unknown';
  if (fingerprint.length <= 12) return fingerprint.slice(0, 4) + '...';
  return fingerprint.slice(0, 8) + '...' + fingerprint.slice(-4);
}

class LacyLightsMCPServer {
  private server: Server;
  private graphqlClient: LacyLightsGraphQLClient;
  private ragService: RAGService;
  private aiLightingService: AILightingService;
  private fixtureTools: FixtureTools;
  private lookTools: LookTools;
  private cueTools: CueTools;
  private projectTools: ProjectTools;
  private settingsTools: SettingsTools;
  private lookBoardTools: LookBoardTools;
  private undoRedoTools: UndoRedoTools;

  constructor() {
    this.server = new Server(
      {
        name: "lacylights-mcp",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    // Initialize services
    const graphqlEndpoint =
      process.env.LACYLIGHTS_GRAPHQL_ENDPOINT ||
      "http://localhost:4000/graphql";

    // Generate device fingerprint for authentication
    const deviceFingerprint = getDeviceFingerprint();
    logger.info('Device fingerprint generated', {
      fingerprint: redactFingerprint(deviceFingerprint),
      deviceName: getDeviceName(),
    });

    this.graphqlClient = new LacyLightsGraphQLClient(graphqlEndpoint, deviceFingerprint);
    this.ragService = new RAGService();
    this.aiLightingService = new AILightingService(this.ragService);

    // Initialize tools
    this.fixtureTools = new FixtureTools(this.graphqlClient);
    this.lookTools = new LookTools(
      this.graphqlClient,
      this.ragService,
      this.aiLightingService,
    );
    this.cueTools = new CueTools(
      this.graphqlClient,
      this.ragService,
      this.aiLightingService,
    );
    this.projectTools = new ProjectTools(this.graphqlClient);
    this.settingsTools = new SettingsTools(this.graphqlClient);
    this.lookBoardTools = new LookBoardTools(this.graphqlClient);
    this.undoRedoTools = new UndoRedoTools(this.graphqlClient);

    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // Project Tools
          {
            name: "list_projects",
            description: `List all projects with optional detail level.

Parameters:
- includeDetails: When true, includes resource counts for each project. Default false.

Returns:
- Basic info (id, name, description) always
- Resource counts (fixtureCount, lookCount, cueListCount) when includeDetails=true

Use includeDetails=false for quick project listing.
Use includeDetails=true when you need to understand project sizes.`,
            inputSchema: {
              type: "object",
              properties: {
                includeDetails: {
                  type: "boolean",
                  default: false,
                  description: "Include fixture/look/cue counts",
                },
              },
            },
          },
          {
            name: "create_project",
            description: "Create a new lighting project",
            inputSchema: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "Project name",
                },
                description: {
                  type: "string",
                  description: "Project description",
                },
                groupId: {
                  type: "string",
                  description: "Group ID to own this project (optional, defaults to user's personal group)",
                },
              },
              required: ["name"],
            },
          },
          {
            name: "get_project",
            description: `Get high-level project information including metadata and counts.

Returns:
- Project metadata (id, name, description, timestamps)
- Resource counts (fixtureCount, lookCount, cueListCount)

Does NOT include:
- Fixture details (use list_fixtures or get_fixture_inventory)
- Look details (use list_looks)
- Cue list details (use list_cue_lists or get_cue_list_details)

Use this tool first to understand project scope before drilling down into specific resources.`,
            inputSchema: {
              type: "object",
              properties: {
                projectId: {
                  type: "string",
                  description: "Project ID to retrieve",
                },
              },
              required: ["projectId"],
            },
          },
          {
            name: "get_project_details",
            description: "Get detailed information about a specific project including all fixtures, looks, and cue lists. This returns a lot of data and should only be used when you need comprehensive project information.",
            inputSchema: {
              type: "object",
              properties: {
                projectId: {
                  type: "string",
                  description: "Project ID to get details for",
                },
              },
              required: ["projectId"],
            },
          },
          {
            name: "delete_project",
            description: "Delete a project and all its data",
            inputSchema: {
              type: "object",
              properties: {
                projectId: {
                  type: "string",
                  description: "Project ID to delete",
                },
                confirmDelete: {
                  type: "boolean",
                  default: false,
                  description: "Confirm deletion of project and all its data",
                },
              },
              required: ["projectId", "confirmDelete"],
            },
          },
          // Bulk Project Operations
          {
            name: "bulk_create_projects",
            description: "Create multiple projects in a single operation.",
            inputSchema: {
              type: "object",
              properties: {
                projects: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: {
                        type: "string",
                        description: "Project name",
                      },
                      description: {
                        type: "string",
                        description: "Project description",
                      },
                      groupId: {
                        type: "string",
                        description: "Group ID to own this project (optional)",
                      },
                    },
                    required: ["name"],
                  },
                  description: "Array of projects to create",
                },
              },
              required: ["projects"],
            },
          },
          {
            name: "bulk_delete_projects",
            description: "Delete multiple projects in a single operation. Returns count of successfully deleted projects and any failed IDs.",
            inputSchema: {
              type: "object",
              properties: {
                projectIds: {
                  type: "array",
                  items: { type: "string" },
                  description: "Array of project IDs to delete",
                },
                confirmDelete: {
                  type: "boolean",
                  description: "Confirm deletion (required to be true for safety)",
                },
              },
              required: ["projectIds", "confirmDelete"],
            },
          },
          {
            name: "qlc_import_guidance",
            description: "Get information about importing QLC+ (.qxw) files into LacyLights",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
          // Fixture Tools
          {
            name: "list_fixtures",
            description: `List fixtures in a project with pagination and filtering.

Returns lightweight fixture information:
- Basic metadata (id, name, manufacturer, model, type)
- DMX addressing (universe, startChannel, channelCount)
- Tags

Does NOT include:
- Full channel definitions (use get_fixture for that)
- Look usage (use get_fixture_usage)

Pagination:
- Default: 50 items per page
- Max: 100 items per page
- Use pagination.hasMore to check if more results exist

Filtering:
- type: Filter by fixture type (LED_PAR, MOVING_HEAD, etc.)
- universe: Filter by DMX universe
- tags: Filter by tags (array)
- manufacturer: Filter by manufacturer name
- model: Filter by model name

Example workflow:
1. list_fixtures(projectId, page=1) - Get first page
2. If pagination.hasMore, call with page=2, etc.`,
            inputSchema: {
              type: "object",
              properties: {
                projectId: {
                  type: "string",
                  description: "Project ID to list fixtures from",
                },
                page: {
                  type: "number",
                  default: 1,
                  description: "Page number (default: 1)",
                },
                perPage: {
                  type: "number",
                  default: 50,
                  description: "Items per page (default: 50, max: 100)",
                },
                filter: {
                  type: "object",
                  properties: {
                    type: {
                      type: "string",
                      enum: ["LED_PAR", "MOVING_HEAD", "STROBE", "DIMMER", "OTHER"],
                      description: "Filter by fixture type",
                    },
                    universe: {
                      type: "number",
                      description: "Filter by DMX universe",
                    },
                    tags: {
                      type: "array",
                      items: { type: "string" },
                      description: "Filter by tags (all must match)",
                    },
                    manufacturer: {
                      type: "string",
                      description: "Filter by manufacturer name",
                    },
                    model: {
                      type: "string",
                      description: "Filter by model name",
                    },
                  },
                  description: "Optional filters to apply",
                },
              },
              required: ["projectId"],
            },
          },
          {
            name: "get_fixture",
            description: `Get full details for a specific fixture.

Returns:
- All metadata (id, name, manufacturer, model, type, mode)
- DMX addressing (universe, startChannel, channelCount)
- Full channel definitions with types and ranges
- Tags

Use this tool when you need:
- Complete channel information for a fixture
- To understand fixture capabilities in detail
- Channel types and DMX value ranges

Use list_fixtures instead if you only need basic fixture information.`,
            inputSchema: {
              type: "object",
              properties: {
                fixtureId: {
                  type: "string",
                  description: "Fixture ID to retrieve",
                },
              },
              required: ["fixtureId"],
            },
          },
          {
            name: "get_fixture_inventory",
            description:
              "Get available lighting fixtures and their capabilities for a project or globally",
            inputSchema: {
              type: "object",
              properties: {
                projectId: {
                  type: "string",
                  description: "Optional project ID to filter fixtures",
                },
                fixtureType: {
                  type: "string",
                  enum: ["LED_PAR", "MOVING_HEAD", "STROBE", "DIMMER", "OTHER"],
                  description: "Optional fixture type filter",
                },
                includeDefinitions: {
                  type: "boolean",
                  default: true,
                  description: "Include available fixture definitions",
                },
              },
            },
          },
          {
            name: "analyze_fixture_capabilities",
            description:
              "Analyze specific fixtures to understand their lighting capabilities",
            inputSchema: {
              type: "object",
              properties: {
                fixtureId: {
                  type: "string",
                  description: "Single fixture ID to analyze",
                },
                fixtureIds: {
                  type: "array",
                  items: { type: "string" },
                  description: "Multiple fixture IDs to analyze",
                },
                analysisType: {
                  type: "string",
                  enum: ["color_mixing", "positioning", "effects", "general"],
                  default: "general",
                  description: "Type of capability analysis",
                },
              },
            },
          },
          {
            name: "create_fixture_instance",
            description:
              "Create a new fixture instance in a project with manufacturer/model details",
            inputSchema: {
              type: "object",
              properties: {
                projectId: {
                  type: "string",
                  description: "Project ID to add fixture to",
                },
                name: {
                  type: "string",
                  description: "Name for this fixture instance",
                },
                description: {
                  type: "string",
                  description:
                    "Description of where this fixture is placed or its purpose",
                },
                manufacturer: {
                  type: "string",
                  description:
                    'Fixture manufacturer (e.g., "Chauvet", "Martin", "ETC")',
                },
                model: {
                  type: "string",
                  description: "Fixture model name",
                },
                mode: {
                  type: "string",
                  description:
                    "Specific mode if the fixture has multiple modes",
                },
                universe: {
                  type: "number",
                  default: 1,
                  description: "DMX universe number (typically 1-4)",
                },
                startChannel: {
                  type: "number",
                  description:
                    "Starting DMX channel (1-512). If not provided, will auto-assign",
                },
                tags: {
                  type: "array",
                  items: { type: "string" },
                  default: [],
                  description:
                    'Tags for organization (e.g., ["front", "wash", "blue"])',
                },
                channelAssignment: {
                  type: "string",
                  enum: ["auto", "manual", "suggest"],
                  default: "auto",
                  description:
                    "How to assign channels: auto=find next available, manual=use provided startChannel, suggest=recommend placement",
                },
              },
              required: ["projectId", "name", "manufacturer", "model"],
            },
          },
          {
            name: "get_channel_map",
            description: "Get the DMX channel usage map for a project",
            inputSchema: {
              type: "object",
              properties: {
                projectId: {
                  type: "string",
                  description: "Project ID to analyze",
                },
                universe: {
                  type: "number",
                  description:
                    "Specific universe to analyze (if not provided, shows all)",
                },
              },
              required: ["projectId"],
            },
          },
          {
            name: "suggest_channel_assignment",
            description:
              "Suggest optimal channel assignments for multiple fixtures",
            inputSchema: {
              type: "object",
              properties: {
                projectId: {
                  type: "string",
                  description: "Project ID",
                },
                fixtureSpecs: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      manufacturer: { type: "string" },
                      model: { type: "string" },
                      mode: { type: "string" },
                      channelCount: {
                        type: "number",
                        description: "Number of channels (if known)",
                      },
                    },
                    required: ["name", "manufacturer", "model"],
                  },
                  description: "List of fixtures to assign channels for",
                },
                universe: {
                  type: "number",
                  default: 1,
                  description: "Universe to assign channels in",
                },
                startingChannel: {
                  type: "number",
                  default: 1,
                  description: "Channel to start assignments from",
                },
                groupingStrategy: {
                  type: "string",
                  enum: ["sequential", "by_type", "by_function"],
                  default: "sequential",
                  description: "How to group fixture assignments",
                },
              },
              required: ["projectId", "fixtureSpecs"],
            },
          },
          {
            name: "update_fixture_instance",
            description:
              "Update an existing fixture instance with new properties",
            inputSchema: {
              type: "object",
              properties: {
                fixtureId: {
                  type: "string",
                  description: "ID of the fixture instance to update",
                },
                name: {
                  type: "string",
                  description: "New name for the fixture",
                },
                description: {
                  type: "string",
                  description: "New description for the fixture",
                },
                manufacturer: {
                  type: "string",
                  description:
                    "New manufacturer (will find/create new definition if changed)",
                },
                model: {
                  type: "string",
                  description:
                    "New model (will find/create new definition if changed)",
                },
                mode: {
                  type: "string",
                  description: "New mode name",
                },
                universe: {
                  type: "number",
                  description: "New DMX universe number",
                },
                startChannel: {
                  type: "number",
                  description: "New starting DMX channel",
                },
                tags: {
                  type: "array",
                  items: { type: "string" },
                  description: "New tags array",
                },
              },
              required: ["fixtureId"],
            },
          },
          {
            name: "delete_fixture_instance",
            description:
              "Delete a fixture instance from a project (will remove it from all looks)",
            inputSchema: {
              type: "object",
              properties: {
                fixtureId: {
                  type: "string",
                  description: "ID of the fixture instance to delete",
                },
                confirmDelete: {
                  type: "boolean",
                  description: "Confirm deletion (required to be true for safety)",
                },
              },
              required: ["fixtureId", "confirmDelete"],
            },
          },
          {
            name: "bulk_update_fixtures",
            description:
              "Update multiple fixture instances in a single atomic operation. All updates succeed or fail together. Useful for batch renaming, repositioning, or re-tagging fixtures.",
            inputSchema: {
              type: "object",
              properties: {
                fixtures: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      fixtureId: {
                        type: "string",
                        description: "ID of the fixture instance to update",
                      },
                      name: {
                        type: "string",
                        description: "New name for the fixture",
                      },
                      description: {
                        type: "string",
                        description: "New description",
                      },
                      universe: {
                        type: "number",
                        description: "New DMX universe number",
                      },
                      startChannel: {
                        type: "number",
                        description: "New starting DMX channel",
                      },
                      tags: {
                        type: "array",
                        items: { type: "string" },
                        description: "New tags array",
                      },
                      layoutX: {
                        type: "number",
                        description: "X position (0-1 normalized)",
                      },
                      layoutY: {
                        type: "number",
                        description: "Y position (0-1 normalized)",
                      },
                      layoutRotation: {
                        type: "number",
                        description: "Rotation in degrees",
                      },
                    },
                    required: ["fixtureId"],
                  },
                  description: "Array of fixture updates to apply",
                },
              },
              required: ["fixtures"],
            },
          },
          {
            name: "bulk_create_fixtures",
            description:
              "Create multiple fixture instances with best-effort approach. Each fixture is processed individually, allowing partial success if some fixtures fail. Returns detailed success/failure information for each fixture. Automatically assigns DMX channels if not specified. Validates channel availability before creation.",
            inputSchema: {
              type: "object",
              properties: {
                fixtures: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      projectId: {
                        type: "string",
                        description: "Project ID to add fixture to",
                      },
                      name: {
                        type: "string",
                        description: "Name for this fixture instance",
                      },
                      description: {
                        type: "string",
                        description: "Description of where this fixture is placed or its purpose",
                      },
                      manufacturer: {
                        type: "string",
                        description: 'Fixture manufacturer (e.g., "Chauvet", "Martin", "ETC")',
                      },
                      model: {
                        type: "string",
                        description: "Fixture model name",
                      },
                      mode: {
                        type: "string",
                        description: "Specific mode if the fixture has multiple modes",
                      },
                      universe: {
                        type: "number",
                        default: 1,
                        description: "DMX universe number (typically 1-4)",
                      },
                      startChannel: {
                        type: "number",
                        description: "Starting DMX channel (1-512). If not provided, will auto-assign",
                      },
                      tags: {
                        type: "array",
                        items: { type: "string" },
                        default: [],
                        description: 'Tags for organization (e.g., ["front", "wash", "blue"])',
                      },
                    },
                    required: ["projectId", "name", "manufacturer", "model"],
                  },
                  description: "Array of fixtures to create",
                },
              },
              required: ["fixtures"],
            },
          },
          {
            name: "bulk_delete_fixtures",
            description:
              "Delete multiple fixture instances in a single operation. Returns count of successfully deleted fixtures and any failed IDs.",
            inputSchema: {
              type: "object",
              properties: {
                fixtureIds: {
                  type: "array",
                  items: { type: "string" },
                  description: "Array of fixture IDs to delete",
                },
                confirmDelete: {
                  type: "boolean",
                  description: "Confirm deletion (required to be true for safety)",
                },
              },
              required: ["fixtureIds", "confirmDelete"],
            },
          },
          {
            name: "bulk_create_fixture_definitions",
            description:
              "Create multiple fixture definitions in a single operation. Use this to efficiently add multiple fixture types (manufacturer/model combinations) to the system at once.",
            inputSchema: {
              type: "object",
              properties: {
                definitions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      manufacturer: {
                        type: "string",
                        description: 'Fixture manufacturer (e.g., "Chauvet", "Martin", "ETC")',
                      },
                      model: {
                        type: "string",
                        description: "Fixture model name",
                      },
                      type: {
                        type: "string",
                        description: 'Fixture type (e.g., "LED_PAR", "MOVING_HEAD", "STROBE", "DIMMER", "OTHER")',
                      },
                      channels: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            name: {
                              type: "string",
                              description: 'Channel name (e.g., "Dimmer", "Red", "Pan")',
                            },
                            type: {
                              type: "string",
                              description: 'Channel type (e.g., "INTENSITY", "COLOR", "PAN", "TILT", "STROBE")',
                            },
                            offset: {
                              type: "number",
                              description: "Channel offset from fixture start address (0-based)",
                            },
                            minValue: {
                              type: "number",
                              description: "Minimum DMX value (0-255, default 0)",
                            },
                            maxValue: {
                              type: "number",
                              description: "Maximum DMX value (0-255, default 255)",
                            },
                            defaultValue: {
                              type: "number",
                              description: "Default DMX value (0-255, default 0)",
                            },
                          },
                          required: ["name", "type", "offset"],
                        },
                        description: "Array of channel definitions for the fixture",
                      },
                      modes: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            name: {
                              type: "string",
                              description: 'Mode name (e.g., "4-Channel", "8-Channel")',
                            },
                            channelCount: {
                              type: "number",
                              description: "Number of DMX channels in this mode",
                            },
                          },
                          required: ["name", "channelCount"],
                        },
                        description: "Optional array of operating modes for the fixture",
                      },
                    },
                    required: ["manufacturer", "model", "type", "channels"],
                  },
                  description: "Array of fixture definitions to create",
                },
              },
              required: ["definitions"],
            },
          },
          // Look Tools
          // MCP API Refactor - Task 2.4: Look Query Tools
          {
            name: "list_looks",
            description: `List looks in a project with pagination and filtering.

Returns lightweight look summaries:
- Metadata (id, name, description)
- Fixture count
- Timestamps

Does NOT include:
- Fixture values (use get_look for that)
- Usage information (use get_look_usage)

This is the most efficient way to browse available looks.

Filtering:
- nameContains: Filter by look name (case-insensitive)
- usesFixture: Filter to looks using specific fixture ID

Sorting:
- name: Alphabetical by name
- createdAt: Oldest first (default)
- updatedAt: Recently modified first`,
            inputSchema: {
              type: "object",
              properties: {
                projectId: {
                  type: "string",
                  description: "Project ID to list looks from",
                },
                page: {
                  type: "number",
                  minimum: 1,
                  default: 1,
                  description: "Page number (1-based)",
                },
                perPage: {
                  type: "number",
                  minimum: 1,
                  maximum: 100,
                  default: 50,
                  description: "Items per page (max 100)",
                },
                nameContains: {
                  type: "string",
                  description: "Filter looks by name (case-insensitive substring match)",
                },
                usesFixture: {
                  type: "string",
                  description: "Filter to looks that use this fixture ID",
                },
                sortBy: {
                  type: "string",
                  enum: ["NAME", "CREATED_AT", "UPDATED_AT"],
                  default: "CREATED_AT",
                  description: "Sort field",
                },
              },
              required: ["projectId"],
            },
          },
          {
            name: "get_look",
            description: `Get full details for a specific look.

Parameters:
- lookId: Look to retrieve
- includeFixtureValues: Include all DMX channel values (default: true)

Set includeFixtureValues=false if you only need to know which fixtures
are in the look, not their specific values. This is much faster for
large looks.

Use get_look_fixtures instead if you only need fixture metadata.`,
            inputSchema: {
              type: "object",
              properties: {
                lookId: {
                  type: "string",
                  description: "Look ID to retrieve",
                },
                includeFixtureValues: {
                  type: "boolean",
                  default: true,
                  description: "Include fixture DMX channel values",
                },
              },
              required: ["lookId"],
            },
          },
          {
            name: "get_look_fixtures",
            description: `Get just the fixtures used in a look without their values.

Returns:
- Fixture IDs, names, and types

This is the fastest way to understand look composition without
loading full DMX channel data.

Use cases:
- "Which fixtures does this look use?"
- "What type of fixtures are in this look?"
- Quick look composition analysis`,
            inputSchema: {
              type: "object",
              properties: {
                lookId: {
                  type: "string",
                  description: "Look ID to get fixtures for",
                },
              },
              required: ["lookId"],
            },
          },
          {
            name: "generate_look",
            description:
              "Generate a lighting look based on script context and design preferences",
            inputSchema: {
              type: "object",
              properties: {
                projectId: {
                  type: "string",
                  description: "Project ID to create look in",
                },
                lookDescription: {
                  type: "string",
                  description: "Description of the look to light",
                },
                scriptContext: {
                  type: "string",
                  description: "Optional script context for the look",
                },
                lookType: {
                  type: "string",
                  enum: ["full", "additive"],
                  default: "full",
                  description: "Type of look: 'full' uses all fixtures (default), 'additive' only modifies specified fixtures",
                },
                designPreferences: {
                  type: "object",
                  properties: {
                    colorPalette: {
                      type: "array",
                      items: { type: "string" },
                      description: "Preferred colors for the look",
                    },
                    mood: {
                      type: "string",
                      description: "Mood or atmosphere for the look",
                    },
                    intensity: {
                      type: "string",
                      enum: ["subtle", "moderate", "dramatic"],
                      description: "Overall intensity level",
                    },
                    focusAreas: {
                      type: "array",
                      items: { type: "string" },
                      description: "Stage areas to emphasize",
                    },
                  },
                },
                fixtureFilter: {
                  type: "object",
                  properties: {
                    includeTypes: {
                      type: "array",
                      items: {
                        type: "string",
                        enum: [
                          "LED_PAR",
                          "MOVING_HEAD",
                          "STROBE",
                          "DIMMER",
                          "OTHER",
                        ],
                      },
                    },
                    excludeTypes: {
                      type: "array",
                      items: {
                        type: "string",
                        enum: [
                          "LED_PAR",
                          "MOVING_HEAD",
                          "STROBE",
                          "DIMMER",
                          "OTHER",
                        ],
                      },
                    },
                    includeTags: {
                      type: "array",
                      items: { type: "string" },
                    },
                  },
                },
                activate: {
                  type: "boolean",
                  description: "Automatically activate the look after creation",
                },
              },
              required: ["projectId", "lookDescription"],
            },
          },
          {
            name: "analyze_script",
            description:
              "Analyze a theatrical script to extract lighting-relevant information",
            inputSchema: {
              type: "object",
              properties: {
                scriptText: {
                  type: "string",
                  description: "The theatrical script text to analyze",
                },
                extractLightingCues: {
                  type: "boolean",
                  default: true,
                  description: "Extract specific lighting cues from the script",
                },
                suggestLooks: {
                  type: "boolean",
                  default: true,
                  description: "Generate look suggestions based on analysis",
                },
              },
              required: ["scriptText"],
            },
          },
          {
            name: "optimize_look",
            description: "Optimize an existing look for specific goals",
            inputSchema: {
              type: "object",
              properties: {
                lookId: {
                  type: "string",
                  description: "Look ID to optimize",
                },
                projectId: {
                  type: "string",
                  description: "Project ID containing the look",
                },
                optimizationGoals: {
                  type: "array",
                  items: {
                    type: "string",
                    enum: [
                      "energy_efficiency",
                      "color_accuracy",
                      "dramatic_impact",
                      "technical_simplicity",
                    ],
                  },
                  default: ["dramatic_impact"],
                  description: "Goals for optimization",
                },
              },
              required: ["lookId", "projectId"],
            },
          },
          {
            name: "update_look",
            description: "Update an existing look with new values",
            inputSchema: {
              type: "object",
              properties: {
                lookId: {
                  type: "string",
                  description: "Look ID to update",
                },
                name: {
                  type: "string",
                  description: "Optional new name for the look",
                },
                description: {
                  type: "string",
                  description: "Optional new description for the look",
                },
                fixtureValues: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      fixtureId: {
                        type: "string",
                        description: "Fixture ID to update",
                      },
                      channels: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            offset: {
                              type: "number",
                              description: "Channel offset (0-based index)",
                            },
                            value: {
                              type: "number",
                              minimum: 0,
                              maximum: 255,
                              description: "DMX value (0-255)",
                            },
                          },
                          required: ["offset", "value"],
                        },
                        description: "Sparse array of channel values",
                      },
                    },
                    required: ["fixtureId", "channels"],
                  },
                  description: "Optional fixture values to update",
                },
              },
              required: ["lookId"],
            },
          },
          {
            name: "activate_look",
            description: "Activate a lighting look by name or ID",
            inputSchema: {
              type: "object",
              properties: {
                projectId: {
                  type: "string",
                  description: "Optional project ID to search within",
                },
                lookId: {
                  type: "string",
                  description: "Look ID to activate",
                },
                lookName: {
                  type: "string",
                  description: "Look name to activate (searches across projects if projectId not provided)",
                },
              },
            },
          },
          {
            name: "fade_to_black",
            description: "Fade all lights to black (turn off)",
            inputSchema: {
              type: "object",
              properties: {
                fadeOutTime: {
                  type: "number",
                  default: 3.0,
                  description: "Time in seconds to fade out (default: 3.0)",
                },
              },
            },
          },
          {
            name: "get_current_active_look",
            description: "Get the currently active look if any",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
          // Safe Look Management Tools
          {
            name: "add_fixtures_to_look",
            description: "Safely add fixtures to a look without affecting existing fixtures",
            inputSchema: {
              type: "object",
              properties: {
                lookId: {
                  type: "string",
                  description: "Look ID to add fixtures to",
                },
                fixtureValues: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      fixtureId: {
                        type: "string",
                        description: "Fixture ID to add",
                      },
                      channels: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            offset: {
                              type: "number",
                              description: "Channel offset (0-based index)",
                            },
                            value: {
                              type: "number",
                              minimum: 0,
                              maximum: 255,
                              description: "DMX value (0-255)",
                            },
                          },
                          required: ["offset", "value"],
                        },
                        description: "Sparse array of channel values",
                      },
                      lookOrder: {
                        type: "number",
                        description: "Optional order in look",
                      },
                    },
                    required: ["fixtureId", "channels"],
                  },
                  description: "Fixtures to add to the look",
                },
                overwriteExisting: {
                  type: "boolean",
                  default: false,
                  description: "Whether to overwrite existing fixture values",
                },
              },
              required: ["lookId", "fixtureValues"],
            },
          },
          {
            name: "remove_fixtures_from_look",
            description: "Safely remove specific fixtures from a look",
            inputSchema: {
              type: "object",
              properties: {
                lookId: {
                  type: "string",
                  description: "Look ID to remove fixtures from",
                },
                fixtureIds: {
                  type: "array",
                  items: { type: "string" },
                  description: "Array of fixture IDs to remove",
                },
              },
              required: ["lookId", "fixtureIds"],
            },
          },
          {
            name: "get_look_fixture_values",
            description: "Get current fixture values for a look (read-only)",
            inputSchema: {
              type: "object",
              properties: {
                lookId: {
                  type: "string",
                  description: "Look ID to get fixture values for",
                },
              },
              required: ["lookId"],
            },
          },
          {
            name: "ensure_fixtures_in_look",
            description: "Ensure specific fixtures exist in a look with given values, adding only if missing",
            inputSchema: {
              type: "object",
              properties: {
                lookId: {
                  type: "string",
                  description: "Look ID to ensure fixtures in",
                },
                fixtureValues: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      fixtureId: {
                        type: "string",
                        description: "Fixture ID to ensure",
                      },
                      channels: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            offset: {
                              type: "number",
                              description: "Channel offset (0-based index)",
                            },
                            value: {
                              type: "number",
                              minimum: 0,
                              maximum: 255,
                              description: "DMX value (0-255)",
                            },
                          },
                          required: ["offset", "value"],
                        },
                        description: "Sparse array of channel values",
                      },
                      lookOrder: {
                        type: "number",
                        description: "Optional order in look",
                      },
                    },
                    required: ["fixtureId", "channels"],
                  },
                  description: "Fixtures to ensure exist in the look",
                },
              },
              required: ["lookId", "fixtureValues"],
            },
          },
          {
            name: "update_look_partial",
            description: "Safely update look metadata and optionally merge fixture values",
            inputSchema: {
              type: "object",
              properties: {
                lookId: {
                  type: "string",
                  description: "Look ID to update",
                },
                name: {
                  type: "string",
                  description: "Optional new name for the look",
                },
                description: {
                  type: "string",
                  description: "Optional new description for the look",
                },
                fixtureValues: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      fixtureId: {
                        type: "string",
                        description: "Fixture ID to update",
                      },
                      channels: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            offset: {
                              type: "number",
                              description: "Channel offset (0-based index)",
                            },
                            value: {
                              type: "number",
                              minimum: 0,
                              maximum: 255,
                              description: "DMX value (0-255)",
                            },
                          },
                          required: ["offset", "value"],
                        },
                        description: "Sparse array of channel values",
                      },
                      lookOrder: {
                        type: "number",
                        description: "Optional order in look",
                      },
                    },
                    required: ["fixtureId", "channels"],
                  },
                  description: "Optional fixture values to merge/update",
                },
                mergeFixtures: {
                  type: "boolean",
                  default: true,
                  description: "Whether to merge fixtures (true) or replace all (false)",
                },
              },
              required: ["lookId"],
            },
          },
          // Bulk Look Operations
          {
            name: "bulk_create_looks",
            description: "Create multiple looks in a single operation. Returns all created looks with their IDs.",
            inputSchema: {
              type: "object",
              properties: {
                looks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: {
                        type: "string",
                        description: "Look name",
                      },
                      description: {
                        type: "string",
                        description: "Look description",
                      },
                      projectId: {
                        type: "string",
                        description: "Project ID to create look in",
                      },
                      fixtureValues: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            fixtureId: { type: "string" },
                            channels: {
                              type: "array",
                              items: {
                                type: "object",
                                properties: {
                                  offset: { type: "number", description: "Channel offset (0-based index)" },
                                  value: { type: "number", minimum: 0, maximum: 255, description: "DMX value (0-255)" },
                                },
                                required: ["offset", "value"],
                              },
                            },
                          },
                          required: ["fixtureId", "channels"],
                        },
                        description: "Fixture values for the look",
                      },
                    },
                    required: ["name", "projectId", "fixtureValues"],
                  },
                  description: "Array of looks to create",
                },
              },
              required: ["looks"],
            },
          },
          {
            name: "bulk_update_looks",
            description: "Update multiple looks in a single operation. Supports updating name, description, and fixture values.",
            inputSchema: {
              type: "object",
              properties: {
                looks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      lookId: {
                        type: "string",
                        description: "Look ID to update",
                      },
                      name: {
                        type: "string",
                        description: "New look name",
                      },
                      description: {
                        type: "string",
                        description: "New look description",
                      },
                      fixtureValues: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            fixtureId: { type: "string" },
                            channels: {
                              type: "array",
                              items: {
                                type: "object",
                                properties: {
                                  offset: { type: "number", description: "Channel offset (0-based index)" },
                                  value: { type: "number", minimum: 0, maximum: 255, description: "DMX value (0-255)" },
                                },
                                required: ["offset", "value"],
                              },
                            },
                          },
                          required: ["fixtureId", "channels"],
                        },
                        description: "New fixture values for the look",
                      },
                    },
                    required: ["lookId"],
                  },
                  description: "Array of look updates to apply",
                },
              },
              required: ["looks"],
            },
          },
          {
            name: "bulk_update_looks_partial",
            description: "Update multiple looks with partial fixture value merging support. Each look can independently specify name, description, fixtureValues, and mergeFixtures. Unlike bulk_update_looks, this preserves existing fixtures not mentioned in the update (when mergeFixtures=true). This is useful for batch operations like changing a channel value across many looks without affecting other fixtures.",
            inputSchema: {
              type: "object",
              properties: {
                looks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      lookId: {
                        type: "string",
                        description: "Look ID to update",
                      },
                      name: {
                        type: "string",
                        description: "New look name",
                      },
                      description: {
                        type: "string",
                        description: "New look description",
                      },
                      fixtureValues: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            fixtureId: { type: "string" },
                            channels: {
                              type: "array",
                              items: {
                                type: "object",
                                properties: {
                                  offset: { type: "number", description: "Channel offset (0-based index)" },
                                  value: { type: "number", minimum: 0, maximum: 255, description: "DMX value (0-255)" },
                                },
                                required: ["offset", "value"],
                              },
                            },
                            lookOrder: {
                              type: "number",
                              description: "Optional order in look",
                            },
                          },
                          required: ["fixtureId", "channels"],
                        },
                        description: "Fixture values to update/merge",
                      },
                      mergeFixtures: {
                        type: "boolean",
                        default: true,
                        description: "Whether to merge fixtures (true, default) or replace all fixtures (false)",
                      },
                    },
                    required: ["lookId"],
                  },
                  description: "Array of look partial updates to apply",
                },
              },
              required: ["looks"],
            },
          },
          {
            name: "bulk_delete_looks",
            description: "Delete multiple looks in a single operation. Returns count of successfully deleted looks and any failed IDs.",
            inputSchema: {
              type: "object",
              properties: {
                lookIds: {
                  type: "array",
                  items: { type: "string" },
                  description: "Array of look IDs to delete",
                },
                confirmDelete: {
                  type: "boolean",
                  description: "Confirm deletion (required to be true for safety)",
                },
              },
              required: ["lookIds", "confirmDelete"],
            },
          },
          {
            name: "copy_fixtures_to_looks",
            description: "Copy fixture channel values from a source look to multiple target looks. This is an atomic operation that supports undo/redo. Useful for propagating lighting changes across multiple looks efficiently.",
            inputSchema: {
              type: "object",
              properties: {
                sourceLookId: {
                  type: "string",
                  description: "ID of the source look to copy fixture values from",
                },
                fixtureIds: {
                  type: "array",
                  items: { type: "string" },
                  minItems: 1,
                  description: "Array of fixture IDs to copy (must exist in source look)",
                },
                targetLookIds: {
                  type: "array",
                  items: { type: "string" },
                  minItems: 1,
                  description: "Array of target look IDs to copy fixture values to",
                },
              },
              required: ["sourceLookId", "fixtureIds", "targetLookIds"],
            },
          },
          // Cue Tools
          {
            name: "create_cue_sequence",
            description:
              "Create a sequence of lighting cues from existing looks",
            inputSchema: {
              type: "object",
              properties: {
                projectId: {
                  type: "string",
                  description: "Project ID to create cue sequence in",
                },
                scriptContext: {
                  type: "string",
                  description: "Script context for the cue sequence",
                },
                lookIds: {
                  type: "array",
                  items: { type: "string" },
                  description: "Look IDs to include in sequence",
                },
                sequenceName: {
                  type: "string",
                  description: "Name for the cue sequence",
                },
                transitionPreferences: {
                  type: "object",
                  properties: {
                    defaultFadeIn: { type: "number", default: 3 },
                    defaultFadeOut: { type: "number", default: 3 },
                    followCues: { type: "boolean", default: false },
                    autoAdvance: { type: "boolean", default: false },
                  },
                },
              },
              required: [
                "projectId",
                "scriptContext",
                "lookIds",
                "sequenceName",
              ],
            },
          },
          {
            name: "generate_act_cues",
            description:
              "Generate cue suggestions for an entire act based on script analysis",
            inputSchema: {
              type: "object",
              properties: {
                projectId: {
                  type: "string",
                  description: "Project ID to work with",
                },
                actNumber: {
                  type: "number",
                  description: "Act number to generate cues for",
                },
                scriptText: {
                  type: "string",
                  description: "Script text for the act",
                },
                existingLooks: {
                  type: "array",
                  items: { type: "string" },
                  description: "Optional existing look IDs to reference",
                },
                cueListName: {
                  type: "string",
                  description: "Optional name for the cue list",
                },
              },
              required: ["projectId", "actNumber", "scriptText"],
            },
          },
          {
            name: "optimize_cue_timing",
            description: "Optimize the timing of cues in a cue list",
            inputSchema: {
              type: "object",
              properties: {
                cueListId: {
                  type: "string",
                  description: "Cue list ID to optimize",
                },
                projectId: {
                  type: "string",
                  description: "Project ID containing the cue list",
                },
                optimizationStrategy: {
                  type: "string",
                  enum: [
                    "smooth_transitions",
                    "dramatic_timing",
                    "technical_precision",
                    "energy_conscious",
                  ],
                  default: "smooth_transitions",
                  description: "Optimization strategy to apply",
                },
              },
              required: ["cueListId", "projectId"],
            },
          },
          {
            name: "analyze_cue_structure",
            description: "Analyze the structure and timing of a cue list",
            inputSchema: {
              type: "object",
              properties: {
                cueListId: {
                  type: "string",
                  description: "Cue list ID to analyze",
                },
                projectId: {
                  type: "string",
                  description: "Project ID containing the cue list",
                },
                includeRecommendations: {
                  type: "boolean",
                  default: true,
                  description: "Include improvement recommendations",
                },
              },
              required: ["cueListId", "projectId"],
            },
          },
          // Cue List Management Tools
          {
            name: "update_cue_list",
            description: "Update cue list name or description",
            inputSchema: {
              type: "object",
              properties: {
                cueListId: {
                  type: "string",
                  description: "Cue list ID to update",
                },
                name: {
                  type: "string",
                  description: "New name for the cue list",
                },
                description: {
                  type: "string",
                  description: "New description for the cue list",
                },
                loop: {
                  type: "boolean",
                  description: "Whether to loop the cue list (restart from first cue after last cue finishes)",
                },
              },
              required: ["cueListId"],
            },
          },
          {
            name: "add_cue_to_list",
            description: "Add a new cue to an existing cue list",
            inputSchema: {
              type: "object",
              properties: {
                cueListId: {
                  type: "string",
                  description: "Cue list ID to add cue to",
                },
                name: {
                  type: "string",
                  description: "Name for the new cue",
                },
                cueNumber: {
                  type: "number",
                  description: "Cue number (e.g., 1.5, 2.0)",
                },
                lookId: {
                  type: "string",
                  description: "Look ID to use for this cue",
                },
                fadeInTime: {
                  type: "number",
                  default: 3,
                  description: "Fade in time in seconds",
                },
                fadeOutTime: {
                  type: "number",
                  default: 3,
                  description: "Fade out time in seconds",
                },
                followTime: {
                  type: "number",
                  description: "Auto-follow time in seconds (null for manual)",
                },
                notes: {
                  type: "string",
                  description: "Notes or description for the cue",
                },
                position: {
                  type: "string",
                  enum: ["before", "after"],
                  description: "Position relative to reference cue",
                },
                referenceCueNumber: {
                  type: "number",
                  description: "Cue number to insert before/after",
                },
              },
              required: ["cueListId", "name", "cueNumber", "lookId"],
            },
          },
          {
            name: "remove_cue_from_list",
            description: "Remove a cue from a cue list",
            inputSchema: {
              type: "object",
              properties: {
                cueId: {
                  type: "string",
                  description: "ID of the cue to remove",
                },
              },
              required: ["cueId"],
            },
          },
          {
            name: "update_cue",
            description: "Update properties of an existing cue",
            inputSchema: {
              type: "object",
              properties: {
                cueId: {
                  type: "string",
                  description: "ID of the cue to update",
                },
                name: {
                  type: "string",
                  description: "New name for the cue",
                },
                cueNumber: {
                  type: "number",
                  description: "New cue number",
                },
                lookId: {
                  type: "string",
                  description: "New look ID",
                },
                fadeInTime: {
                  type: "number",
                  description: "New fade in time in seconds",
                },
                fadeOutTime: {
                  type: "number",
                  description: "New fade out time in seconds",
                },
                followTime: {
                  type: "number",
                  description: "New follow time (null to remove auto-follow)",
                },
                notes: {
                  type: "string",
                  description: "New notes or description",
                },
                skip: {
                  type: "boolean",
                  description: "When true, this cue is skipped during playback but remains visible in the UI",
                },
              },
              required: ["cueId"],
            },
          },
          {
            name: "toggle_cue_skip",
            description: "Toggle the skip status of a cue. Skipped cues remain visible but are bypassed during playback.",
            inputSchema: {
              type: "object",
              properties: {
                cueId: {
                  type: "string",
                  description: "ID of the cue to toggle skip status",
                },
              },
              required: ["cueId"],
            },
          },
          {
            name: "bulk_update_cues",
            description: "Update fade times and follow times for multiple cues in a single operation",
            inputSchema: {
              type: "object",
              properties: {
                cueIds: {
                  type: "array",
                  items: {
                    type: "string"
                  },
                  description: "Array of cue IDs to update"
                },
                fadeInTime: {
                  type: "number",
                  description: "New fade in time in seconds (applies to all selected cues)"
                },
                fadeOutTime: {
                  type: "number",
                  description: "New fade out time in seconds (applies to all selected cues)"
                },
                followTime: {
                  type: "number",
                  description: "New follow time in seconds (applies to all selected cues, null to remove auto-follow)"
                },
                easingType: {
                  type: "string",
                  description: "Easing type for transitions"
                },
                skip: {
                  type: "boolean",
                  description: "When set, updates the skip status of all selected cues"
                }
              },
              required: ["cueIds"]
            }
          },
          {
            name: "bulk_create_cues",
            description: "Create multiple cues in a single operation. All cues are created in one GraphQL call for efficiency.",
            inputSchema: {
              type: "object",
              properties: {
                cues: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: {
                        type: "string",
                        description: "Cue name",
                      },
                      cueNumber: {
                        type: "number",
                        description: "Cue number (e.g., 1, 1.5, 2)",
                      },
                      cueListId: {
                        type: "string",
                        description: "Cue list ID to add cue to",
                      },
                      lookId: {
                        type: "string",
                        description: "Look ID for this cue",
                      },
                      fadeInTime: {
                        type: "number",
                        default: 3,
                        description: "Fade in time in seconds",
                      },
                      fadeOutTime: {
                        type: "number",
                        default: 3,
                        description: "Fade out time in seconds",
                      },
                      followTime: {
                        type: "number",
                        description: "Auto-follow time in seconds (optional)",
                      },
                      notes: {
                        type: "string",
                        description: "Notes or description for the cue",
                      },
                    },
                    required: ["name", "cueNumber", "cueListId", "lookId"],
                  },
                  description: "Array of cues to create",
                },
              },
              required: ["cues"],
            },
          },
          {
            name: "bulk_delete_cues",
            description: "Delete multiple cues in a single operation. Returns count of successfully deleted cues and any failed IDs.",
            inputSchema: {
              type: "object",
              properties: {
                cueIds: {
                  type: "array",
                  items: { type: "string" },
                  description: "Array of cue IDs to delete",
                },
                confirmDelete: {
                  type: "boolean",
                  description: "Confirm deletion (required to be true for safety)",
                },
              },
              required: ["cueIds", "confirmDelete"],
            },
          },
          {
            name: "reorder_cues",
            description: "Reorder multiple cues by assigning new cue numbers",
            inputSchema: {
              type: "object",
              properties: {
                cueListId: {
                  type: "string",
                  description: "Cue list ID containing the cues",
                },
                cueReordering: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      cueId: {
                        type: "string",
                        description: "ID of the cue to reorder",
                      },
                      newCueNumber: {
                        type: "number",
                        description: "New cue number for this cue",
                      },
                    },
                    required: ["cueId", "newCueNumber"],
                  },
                  description: "Array of cue ID and new number pairs",
                },
              },
              required: ["cueListId", "cueReordering"],
            },
          },
          // Cue List Query Tools (Task 2.5 - included in this PR)
          {
            name: "list_cue_lists",
            description: `List all cue lists in a project with lightweight summaries.

Returns:
- Metadata (id, name, description)
- Cue count
- Total duration estimate
- Loop setting

Does NOT include:
- Individual cues (use get_cue_list_details)
- Look details (use get_look)

This is the most efficient way to browse available cue lists.
Projects typically have < 10 cue lists, so no pagination needed.

Use cases:
- "What cue lists are available?"
- "Show me all cue lists in this project"
- Quick cue list overview`,
            inputSchema: {
              type: "object",
              properties: {
                projectId: {
                  type: "string",
                  description: "Project ID to list cue lists from",
                },
              },
              required: ["projectId"],
            },
          },
          {
            name: "get_cue_list_details",
            description: `Get cue list with its cues, optionally paginated.

Parameters:
- cueListId: Cue list to retrieve
- page: Page number (default: 1)
- perPage: Items per page (default: 50, max: 100)
- includeLookDetails: Include full look data for each cue (default: false)
- sortBy: Sort cues by cueNumber, name, or lookName
- filterBy: Optional filters (cueNumberRange, nameContains, etc.)

By default, each cue includes lookId and lookName but NOT full look
fixture values. Set includeLookDetails=true only if you need full look
data for every cue (this can be very large).

For large cue lists (50+ cues), use pagination to avoid context overflow.

Returns:
- Cue list metadata
- Paginated cues array
- Pagination info (total, page, perPage, hasMore)
- Statistics (averages, counts, ranges)
- Lookup tables for quick reference

Example workflow:
1. list_cue_lists(projectId) - Find available cue lists
2. get_cue_list_details(cueListId, page=1) - Get first page of cues
3. If pagination.hasMore, call with page=2, etc.`,
            inputSchema: {
              type: "object",
              properties: {
                cueListId: {
                  type: "string",
                  description: "Cue list ID to query",
                },
                page: {
                  type: "number",
                  default: 1,
                  description: "Page number for pagination (min 1)",
                },
                perPage: {
                  type: "number",
                  default: 50,
                  description: "Items per page (min 1, max 100)",
                },
                includeLookDetails: {
                  type: "boolean",
                  default: false,
                  description:
                    "Include full look data for each cue (default: false for performance)",
                },
                sortBy: {
                  type: "string",
                  enum: ["cueNumber", "name", "lookName"],
                  default: "cueNumber",
                  description: "Sort cues by cue number, name, or look name",
                },
                filterBy: {
                  type: "object",
                  properties: {
                    cueNumberRange: {
                      type: "object",
                      properties: {
                        min: { type: "number" },
                        max: { type: "number" },
                      },
                      description: "Filter by cue number range",
                    },
                    nameContains: {
                      type: "string",
                      description:
                        "Filter cues where name contains this text (case-insensitive)",
                    },
                    lookNameContains: {
                      type: "string",
                      description:
                        "Filter cues where look name contains this text (case-insensitive)",
                    },
                    hasFollowTime: {
                      type: "boolean",
                      description:
                        "Filter cues that have (true) or don't have (false) follow times",
                    },
                    fadeTimeRange: {
                      type: "object",
                      properties: {
                        min: { type: "number" },
                        max: { type: "number" },
                      },
                      description: "Filter by fade in time range",
                    },
                  },
                  description: "Optional filters to apply to the cue list",
                },
              },
              required: ["cueListId"],
            },
          },
          {
            name: "get_cue",
            description: `Get full details for a specific cue by ID.

Returns:
- Cue metadata (name, number, fade times, follow time, notes)
- Look information (id, name, description)
- Cue list information (id, name)

Use this when you need to inspect a single cue in detail.

Use cases:
- "Show me details for cue 5.5"
- "What look does this cue use?"
- "What are the fade times for this cue?"

Note: To look up a cue by number or name, use get_cue_list_details
with filters and lookup tables instead.`,
            inputSchema: {
              type: "object",
              properties: {
                cueId: {
                  type: "string",
                  description: "Cue ID to retrieve",
                },
              },
              required: ["cueId"],
            },
          },
          {
            name: "delete_cue_list",
            description: "Delete a cue list and all its cues",
            inputSchema: {
              type: "object",
              properties: {
                cueListId: {
                  type: "string",
                  description: "Cue list ID to delete",
                },
                confirmDelete: {
                  type: "boolean",
                  default: false,
                  description: "Confirm deletion of cue list and all its cues (required to be true for safety)",
                },
              },
              required: ["cueListId", "confirmDelete"],
            },
          },
          // Bulk Cue List Operations
          {
            name: "bulk_create_cue_lists",
            description: "Create multiple cue lists in a single operation.",
            inputSchema: {
              type: "object",
              properties: {
                cueLists: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: {
                        type: "string",
                        description: "Cue list name",
                      },
                      description: {
                        type: "string",
                        description: "Cue list description",
                      },
                      projectId: {
                        type: "string",
                        description: "Project ID to create cue list in",
                      },
                      loop: {
                        type: "boolean",
                        default: false,
                        description: "Whether to loop the cue list",
                      },
                    },
                    required: ["name", "projectId"],
                  },
                  description: "Array of cue lists to create",
                },
              },
              required: ["cueLists"],
            },
          },
          {
            name: "bulk_update_cue_lists",
            description: "Update multiple cue lists in a single operation.",
            inputSchema: {
              type: "object",
              properties: {
                cueLists: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      cueListId: {
                        type: "string",
                        description: "Cue list ID to update",
                      },
                      name: {
                        type: "string",
                        description: "New cue list name",
                      },
                      description: {
                        type: "string",
                        description: "New cue list description",
                      },
                      loop: {
                        type: "boolean",
                        description: "New loop setting",
                      },
                    },
                    required: ["cueListId"],
                  },
                  description: "Array of cue list updates to apply",
                },
              },
              required: ["cueLists"],
            },
          },
          {
            name: "bulk_delete_cue_lists",
            description: "Delete multiple cue lists in a single operation. Returns count of successfully deleted cue lists and any failed IDs.",
            inputSchema: {
              type: "object",
              properties: {
                cueListIds: {
                  type: "array",
                  items: { type: "string" },
                  description: "Array of cue list IDs to delete",
                },
                confirmDelete: {
                  type: "boolean",
                  description: "Confirm deletion (required to be true for safety)",
                },
              },
              required: ["cueListIds", "confirmDelete"],
            },
          },
          // Cue List Playback Tools
          {
            name: "start_cue_list",
            description: "Start playing a cue list from the beginning or a specific cue",
            inputSchema: {
              type: "object",
              properties: {
                cueListId: {
                  type: "string",
                  description: "Cue list ID to play",
                },
                cueListName: {
                  type: "string",
                  description: "Cue list name to search for (alternative to ID)",
                },
                projectId: {
                  type: "string",
                  description: "Project ID to search within (optional when using cueListName)",
                },
                startFromCue: {
                  type: "number",
                  description: "Cue number to start from (optional, defaults to first cue)",
                },
              },
            },
          },
          {
            name: "next_cue",
            description: "Advance to the next cue in the currently playing cue list",
            inputSchema: {
              type: "object",
              properties: {
                fadeInTime: {
                  type: "number",
                  description: "Override fade in time in seconds (optional)",
                },
              },
            },
          },
          {
            name: "previous_cue",
            description: "Go back to the previous cue in the currently playing cue list",
            inputSchema: {
              type: "object",
              properties: {
                fadeInTime: {
                  type: "number",
                  description: "Override fade in time in seconds (optional)",
                },
              },
            },
          },
          {
            name: "go_to_cue",
            description: "Jump to a specific cue by number or name in the currently playing cue list",
            inputSchema: {
              type: "object",
              properties: {
                cueNumber: {
                  type: "number",
                  description: "Cue number to jump to",
                },
                cueName: {
                  type: "string",
                  description: "Cue name to search for (alternative to cueNumber)",
                },
                fadeInTime: {
                  type: "number",
                  description: "Override fade in time in seconds (optional)",
                },
              },
            },
          },
          {
            name: "stop_cue_list",
            description: "Stop the currently playing cue list",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
          {
            name: "get_cue_list_status",
            description: "Get information about the currently playing cue list and navigation options",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
          // Settings Tools
          {
            name: "get_fade_update_rate",
            description: `Get the current fade engine update rate in Hz.

The fade update rate controls how frequently the fade engine updates DMX channel values during look transitions. Higher rates provide smoother fades but use more CPU.

Returns:
- Current update rate in Hz (default: 60Hz)
- Whether the value is using the default

Typical values:
- 30Hz: Efficient, adequate for most theatrical lighting
- 60Hz: Default, smooth fades for professional use
- 120Hz: Very smooth, for critical applications`,
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
          {
            name: "set_fade_update_rate",
            description: `Set the fade engine update rate in Hz.

The fade update rate controls how frequently the fade engine updates DMX channel values during look transitions.

Valid range: 10-120 Hz

Guidelines:
- 10-30Hz: Lower CPU usage, adequate for simple fades
- 30-60Hz: Good balance of smoothness and efficiency
- 60-120Hz: Maximum smoothness for professional applications

Note: Changes take effect immediately for new look transitions.`,
            inputSchema: {
              type: "object",
              properties: {
                rateHz: {
                  type: "number",
                  description: "Update rate in Hz (10-120)",
                  minimum: 10,
                  maximum: 120,
                },
              },
              required: ["rateHz"],
            },
          },
          {
            name: "get_build_info",
            description: `Get build information for the backend server.

Returns version, git commit hash, and build timestamp for the running lacylights-go server. This is useful for:
- Verifying the server version after updates
- Debugging version mismatches
- Confirming deployment success

Returns:
- version: Semantic version (e.g., "v0.8.10")
- gitCommit: Full git commit hash
- buildTime: UTC timestamp when the binary was built`,
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
          // Look Board Tools
          {
            name: "list_look_boards",
            description: `List all look boards in a project.

Returns lightweight look board summaries with button counts.`,
            inputSchema: {
              type: "object",
              properties: {
                projectId: {
                  type: "string",
                  description: "Project ID to list look boards from",
                },
              },
              required: ["projectId"],
            },
          },
          {
            name: "get_look_board",
            description: `Get a specific look board with all its buttons and layout information.`,
            inputSchema: {
              type: "object",
              properties: {
                lookBoardId: {
                  type: "string",
                  description: "Look board ID to retrieve",
                },
              },
              required: ["lookBoardId"],
            },
          },
          {
            name: "create_look_board",
            description: `Create a new look board for organizing looks with custom layout.`,
            inputSchema: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "Look board name",
                },
                description: {
                  type: "string",
                  description: "Look board description",
                },
                projectId: {
                  type: "string",
                  description: "Project ID to create look board in",
                },
                defaultFadeTime: {
                  type: "number",
                  description: "Default fade time in seconds (default: 3.0)",
                  default: 3.0,
                },
                gridSize: {
                  type: "number",
                  description: "Grid size for layout alignment in pixels (default: 50)",
                  default: 50,
                },
                canvasWidth: {
                  type: "number",
                  description: "Canvas width in pixels (default: 2000)",
                  default: 2000,
                },
                canvasHeight: {
                  type: "number",
                  description: "Canvas height in pixels (default: 2000)",
                  default: 2000,
                },
              },
              required: ["name", "projectId"],
            },
          },
          {
            name: "update_look_board",
            description: `Update an existing look board's metadata and settings.`,
            inputSchema: {
              type: "object",
              properties: {
                lookBoardId: {
                  type: "string",
                  description: "Look board ID to update",
                },
                name: {
                  type: "string",
                  description: "New look board name",
                },
                description: {
                  type: "string",
                  description: "New look board description",
                },
                defaultFadeTime: {
                  type: "number",
                  description: "New default fade time in seconds",
                },
                gridSize: {
                  type: "number",
                  description: "New grid size for layout alignment",
                },
                canvasWidth: {
                  type: "number",
                  description: "New canvas width in pixels",
                },
                canvasHeight: {
                  type: "number",
                  description: "New canvas height in pixels",
                },
              },
              required: ["lookBoardId"],
            },
          },
          {
            name: "delete_look_board",
            description: `Delete a look board and all its buttons.`,
            inputSchema: {
              type: "object",
              properties: {
                lookBoardId: {
                  type: "string",
                  description: "Look board ID to delete",
                },
                confirmDelete: {
                  type: "boolean",
                  description: "Confirm deletion of look board and all its buttons (required to be true for safety)",
                },
              },
              required: ["lookBoardId", "confirmDelete"],
            },
          },
          {
            name: "bulk_create_look_boards",
            description: `Create multiple look boards in a single operation.`,
            inputSchema: {
              type: "object",
              properties: {
                lookBoards: {
                  type: "array",
                  description: "Array of look boards to create",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      description: { type: "string" },
                      projectId: { type: "string" },
                      defaultFadeTime: { type: "number", default: 3.0 },
                      gridSize: { type: "number", default: 50 },
                      canvasWidth: { type: "number", default: 2000 },
                      canvasHeight: { type: "number", default: 2000 },
                    },
                    required: ["name", "projectId"],
                  },
                },
              },
              required: ["lookBoards"],
            },
          },
          {
            name: "bulk_update_look_boards",
            description: `Update multiple look boards in a single operation.`,
            inputSchema: {
              type: "object",
              properties: {
                lookBoards: {
                  type: "array",
                  description: "Array of look board updates to apply",
                  items: {
                    type: "object",
                    properties: {
                      lookBoardId: { type: "string" },
                      name: { type: "string" },
                      description: { type: "string" },
                      defaultFadeTime: { type: "number" },
                      gridSize: { type: "number" },
                      canvasWidth: { type: "number" },
                      canvasHeight: { type: "number" },
                    },
                    required: ["lookBoardId"],
                  },
                },
              },
              required: ["lookBoards"],
            },
          },
          {
            name: "bulk_delete_look_boards",
            description: `Delete multiple look boards in a single operation.`,
            inputSchema: {
              type: "object",
              properties: {
                lookBoardIds: {
                  type: "array",
                  description: "Array of look board IDs to delete",
                  items: { type: "string" },
                },
                confirmDelete: {
                  type: "boolean",
                  description: "Confirm deletion (required to be true for safety)",
                },
              },
              required: ["lookBoardIds", "confirmDelete"],
            },
          },
          {
            name: "add_look_to_board",
            description: `Add a look as a button to a look board at a specific position.`,
            inputSchema: {
              type: "object",
              properties: {
                lookBoardId: {
                  type: "string",
                  description: "Look board ID to add button to",
                },
                lookId: {
                  type: "string",
                  description: "Look ID for this button",
                },
                layoutX: {
                  type: "number",
                  description: "X position in pixels",
                },
                layoutY: {
                  type: "number",
                  description: "Y position in pixels",
                },
                width: {
                  type: "number",
                  description: "Button width in pixels (default: 200)",
                  default: 200,
                },
                height: {
                  type: "number",
                  description: "Button height in pixels (default: 120)",
                  default: 120,
                },
                color: {
                  type: "string",
                  description: "Button color (hex or CSS color value)",
                },
                label: {
                  type: "string",
                  description: "Button label/text override",
                },
              },
              required: ["lookBoardId", "lookId", "layoutX", "layoutY"],
            },
          },
          {
            name: "update_look_board_button",
            description: `Update a look board button's properties (position, size, color, label).`,
            inputSchema: {
              type: "object",
              properties: {
                buttonId: {
                  type: "string",
                  description: "Button ID to update",
                },
                layoutX: {
                  type: "number",
                  description: "New X position in pixels",
                },
                layoutY: {
                  type: "number",
                  description: "New Y position in pixels",
                },
                width: {
                  type: "number",
                  description: "New button width in pixels",
                },
                height: {
                  type: "number",
                  description: "New button height in pixels",
                },
                color: {
                  type: "string",
                  description: "New button color",
                },
                label: {
                  type: "string",
                  description: "New button label/text",
                },
              },
              required: ["buttonId"],
            },
          },
          {
            name: "remove_look_from_board",
            description: `Remove a button from a look board.`,
            inputSchema: {
              type: "object",
              properties: {
                buttonId: {
                  type: "string",
                  description: "Button ID to remove",
                },
              },
              required: ["buttonId"],
            },
          },
          {
            name: "update_look_board_button_positions",
            description: `Update positions of multiple buttons in a single operation (useful for drag-and-drop).`,
            inputSchema: {
              type: "object",
              properties: {
                positions: {
                  type: "array",
                  description: "Array of button position updates",
                  items: {
                    type: "object",
                    properties: {
                      buttonId: { type: "string" },
                      layoutX: { type: "number" },
                      layoutY: { type: "number" },
                    },
                    required: ["buttonId", "layoutX", "layoutY"],
                  },
                },
              },
              required: ["positions"],
            },
          },
          {
            name: "bulk_create_look_board_buttons",
            description: `Create multiple buttons in a single operation.`,
            inputSchema: {
              type: "object",
              properties: {
                buttons: {
                  type: "array",
                  description: "Array of buttons to create",
                  items: {
                    type: "object",
                    properties: {
                      lookBoardId: { type: "string" },
                      lookId: { type: "string" },
                      layoutX: { type: "number" },
                      layoutY: { type: "number" },
                      width: { type: "number", default: 200 },
                      height: { type: "number", default: 120 },
                      color: { type: "string" },
                      label: { type: "string" },
                    },
                    required: ["lookBoardId", "lookId", "layoutX", "layoutY"],
                  },
                },
              },
              required: ["buttons"],
            },
          },
          {
            name: "bulk_update_look_board_buttons",
            description: `Update multiple buttons in a single operation.`,
            inputSchema: {
              type: "object",
              properties: {
                buttons: {
                  type: "array",
                  description: "Array of button updates to apply",
                  items: {
                    type: "object",
                    properties: {
                      buttonId: { type: "string" },
                      layoutX: { type: "number" },
                      layoutY: { type: "number" },
                      width: { type: "number" },
                      height: { type: "number" },
                      color: { type: "string" },
                      label: { type: "string" },
                    },
                    required: ["buttonId"],
                  },
                },
              },
              required: ["buttons"],
            },
          },
          {
            name: "bulk_delete_look_board_buttons",
            description: `Delete multiple buttons in a single operation.`,
            inputSchema: {
              type: "object",
              properties: {
                buttonIds: {
                  type: "array",
                  description: "Array of button IDs to delete",
                  items: { type: "string" },
                },
                confirmDelete: {
                  type: "boolean",
                  description: "Confirm deletion (required to be true for safety)",
                },
              },
              required: ["buttonIds", "confirmDelete"],
            },
          },
          {
            name: "activate_look_from_board",
            description: `Activate a look from a board (uses board's default fade time unless overridden).`,
            inputSchema: {
              type: "object",
              properties: {
                lookBoardId: {
                  type: "string",
                  description: "Look board ID",
                },
                lookId: {
                  type: "string",
                  description: "Look ID to activate",
                },
                fadeTimeOverride: {
                  type: "number",
                  description: "Optional fade time override in seconds",
                },
              },
              required: ["lookBoardId", "lookId"],
            },
          },
          {
            name: "create_look_board_with_buttons",
            description: `Create a complete look board with buttons in a single operation. Allows defining an entire look board layout in one command.`,
            inputSchema: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "Look board name",
                },
                description: {
                  type: "string",
                  description: "Look board description",
                },
                projectId: {
                  type: "string",
                  description: "Project ID to create look board in",
                },
                defaultFadeTime: {
                  type: "number",
                  description: "Default fade time in seconds",
                  default: 3.0,
                },
                gridSize: {
                  type: "number",
                  description: "Grid size for layout alignment",
                  default: 50,
                },
                canvasWidth: {
                  type: "number",
                  description: "Canvas width in pixels",
                  default: 2000,
                },
                canvasHeight: {
                  type: "number",
                  description: "Canvas height in pixels",
                  default: 2000,
                },
                buttons: {
                  type: "array",
                  description: "Optional array of buttons to create with the board",
                  items: {
                    type: "object",
                    properties: {
                      lookId: { type: "string" },
                      layoutX: { type: "number" },
                      layoutY: { type: "number" },
                      width: { type: "number", default: 200 },
                      height: { type: "number", default: 120 },
                      color: { type: "string" },
                      label: { type: "string" },
                    },
                    required: ["lookId", "layoutX", "layoutY"],
                  },
                },
              },
              required: ["name", "projectId"],
            },
          },
          // Undo/Redo Tools
          {
            name: "undo",
            description: `Undo the last operation in a project.

Reverts the most recent change made to the project. Operations that can be undone include:
- Creating, updating, or deleting looks
- Creating, updating, or deleting fixture instances
- Creating, updating, or deleting cues
- Creating, updating, or deleting cue lists

Returns:
- success: Whether the undo was successful
- message: Description of what was undone
- operation: Details of the undone operation
- restoredEntityId: ID of the restored entity (if applicable)

Use get_undo_redo_status to check if undo is available.`,
            inputSchema: {
              type: "object",
              properties: {
                projectId: {
                  type: "string",
                  description: "Project ID to undo operation in",
                },
              },
              required: ["projectId"],
            },
          },
          {
            name: "redo",
            description: `Redo a previously undone operation in a project.

Re-applies an operation that was previously undone. Only available after an undo operation.
If a new operation is performed after undo, the redo history is cleared.

Returns:
- success: Whether the redo was successful
- message: Description of what was redone
- operation: Details of the redone operation
- restoredEntityId: ID of the restored entity (if applicable)

Use get_undo_redo_status to check if redo is available.`,
            inputSchema: {
              type: "object",
              properties: {
                projectId: {
                  type: "string",
                  description: "Project ID to redo operation in",
                },
              },
              required: ["projectId"],
            },
          },
          {
            name: "get_undo_redo_status",
            description: `Get the current undo/redo status for a project.

Returns information about available undo/redo operations:
- canUndo: Whether undo is available
- canRedo: Whether redo is available
- currentSequence: Current position in the operation history
- totalOperations: Total number of operations in history
- undoDescription: Description of the operation that would be undone
- redoDescription: Description of the operation that would be redone

Use this to determine if undo/redo buttons should be enabled and to show tooltips.`,
            inputSchema: {
              type: "object",
              properties: {
                projectId: {
                  type: "string",
                  description: "Project ID to get undo/redo status for",
                },
              },
              required: ["projectId"],
            },
          },
          {
            name: "get_operation_history",
            description: `Get the operation history for a project with pagination.

Returns a list of all recorded operations that can be navigated via undo/redo.
Each operation includes:
- id: Unique operation ID
- description: Human-readable description
- operationType: CREATE, UPDATE, DELETE, or BULK
- entityType: Type of entity affected (Look, FixtureInstance, etc.)
- sequence: Position in the history
- createdAt: When the operation occurred
- isCurrent: Whether this is the current state

Use this to display an operation history timeline and allow jumping to specific points.`,
            inputSchema: {
              type: "object",
              properties: {
                projectId: {
                  type: "string",
                  description: "Project ID to get operation history for",
                },
                page: {
                  type: "number",
                  default: 1,
                  description: "Page number (1-based)",
                },
                perPage: {
                  type: "number",
                  default: 50,
                  description: "Number of operations per page (max 100)",
                },
              },
              required: ["projectId"],
            },
          },
          {
            name: "jump_to_operation",
            description: `Jump to a specific operation in the history.

This allows navigating directly to any point in the operation history,
effectively performing multiple undos or redos to reach the target state.

Parameters:
- projectId: The project containing the operation
- operationId: The ID of the operation to jump to

Returns:
- success: Whether the jump was successful
- message: Description of what happened
- operation: Details of the target operation

Use get_operation_history to get available operation IDs.`,
            inputSchema: {
              type: "object",
              properties: {
                projectId: {
                  type: "string",
                  description: "Project ID",
                },
                operationId: {
                  type: "string",
                  description: "Operation ID to jump to",
                },
              },
              required: ["projectId", "operationId"],
            },
          },
          {
            name: "clear_operation_history",
            description: `Clear all operation history for a project.

WARNING: This is a destructive operation that cannot be undone.
All undo/redo history will be permanently deleted.

Parameters:
- projectId: The project to clear history for
- confirmClear: Must be true to confirm the deletion

Returns:
- success: Whether the history was cleared
- message: Confirmation message`,
            inputSchema: {
              type: "object",
              properties: {
                projectId: {
                  type: "string",
                  description: "Project ID to clear operation history for",
                },
                confirmClear: {
                  type: "boolean",
                  description: "Must be true to confirm clearing history",
                },
              },
              required: ["projectId", "confirmClear"],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      // Log all incoming tool calls
      logger.info(`Tool call: ${name}`, { args });

      try {
        switch (name) {
          // Project Tools
          case "list_projects":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.projectTools.listProjects(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "create_project":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.projectTools.createProject(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "get_project":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.projectTools.getProject(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "get_project_details":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.projectTools.getProjectDetails(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "delete_project":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.projectTools.deleteProject(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "bulk_create_projects":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.projectTools.bulkCreateProjects(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "bulk_delete_projects":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.projectTools.bulkDeleteProjects(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "qlc_import_guidance":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    guidance: "QLC+ Import via Web Interface",
                    message: "QLC+ file import is available in the LacyLights web interface due to file size constraints that make it impractical for AI chat interfaces.",
                    instructions: [
                      "1. Open the LacyLights web application",
                      "2. Click 'Manage Projects' in the main interface",
                      "3. Use the 'Import QLC+ Project' feature to upload .qxw files directly",
                      "4. The web interface supports drag-and-drop file upload and provides detailed import feedback"
                    ],
                    why_not_here: "QLC+ files are typically 10-100KB+ of XML content, which exceeds practical limits for AI chat context windows. The web UI is optimized for file handling.",
                    export_available: "QLC+ export is still available via this MCP interface and can generate .qxw files for download."
                  }, null, 2),
                },
              ],
            };

          // Fixture Tools
          case "list_fixtures":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.fixtureTools.listFixtures(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "get_fixture":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.fixtureTools.getFixture(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "get_fixture_inventory":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.fixtureTools.getFixtureInventory(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "analyze_fixture_capabilities":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.fixtureTools.analyzeFixtureCapabilities(
                      args as any,
                    ),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "create_fixture_instance":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.fixtureTools.createFixtureInstance(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "get_channel_map":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.fixtureTools.getChannelMap(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "suggest_channel_assignment":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.fixtureTools.suggestChannelAssignment(
                      args as any,
                    ),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "update_fixture_instance":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.fixtureTools.updateFixtureInstance(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "delete_fixture_instance":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.fixtureTools.deleteFixtureInstance(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "bulk_update_fixtures":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.fixtureTools.bulkUpdateFixtures(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "bulk_create_fixtures":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.fixtureTools.bulkCreateFixtures(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "bulk_delete_fixtures":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.fixtureTools.bulkDeleteFixtures(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "bulk_create_fixture_definitions":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.fixtureTools.bulkCreateFixtureDefinitions(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          // Look Tools
          // MCP API Refactor - Task 2.4: Look Query Tool Handlers
          case "list_looks":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.lookTools.listLooks(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "get_look":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.lookTools.getLookDetails(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "get_look_fixtures":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.lookTools.getLookFixtures(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "generate_look":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.lookTools.generateLook(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "analyze_script":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.lookTools.analyzeScript(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "optimize_look":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.lookTools.optimizeLook(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "update_look":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.lookTools.updateLook(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "activate_look":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.lookTools.activateLook(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "fade_to_black":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.lookTools.fadeToBlack(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "get_current_active_look":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.lookTools.getCurrentActiveLook(),
                    null,
                    2,
                  ),
                },
              ],
            };

          // Safe Look Management Tools
          case "add_fixtures_to_look":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.lookTools.addFixturesToLook(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "remove_fixtures_from_look":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.lookTools.removeFixturesFromLook(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "get_look_fixture_values":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.lookTools.getLookFixtureValues(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "ensure_fixtures_in_look":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.lookTools.ensureFixturesInLook(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "update_look_partial":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.lookTools.updateLookPartial(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          // Bulk Look Operations
          case "bulk_create_looks":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.lookTools.bulkCreateLooks(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "bulk_update_looks":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.lookTools.bulkUpdateLooks(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "bulk_update_looks_partial":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.lookTools.bulkUpdateLooksPartial(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "bulk_delete_looks":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.lookTools.bulkDeleteLooks(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "copy_fixtures_to_looks":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.lookTools.copyFixturesToLooks(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          // Cue Tools
          case "create_cue_sequence":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.cueTools.createCueSequence(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "generate_act_cues":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.cueTools.generateActCues(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "optimize_cue_timing":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.cueTools.optimizeCueTiming(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "analyze_cue_structure":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.cueTools.analyzeCueStructure(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          // Cue List Management
          case "update_cue_list":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.cueTools.updateCueList(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "add_cue_to_list":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.cueTools.addCueToCueList(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "remove_cue_from_list":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.cueTools.removeCueFromList(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "update_cue":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.cueTools.updateCue(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "toggle_cue_skip":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.cueTools.toggleCueSkip(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "bulk_update_cues":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.cueTools.bulkUpdateCues(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "bulk_create_cues":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.cueTools.bulkCreateCues(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "bulk_delete_cues":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.cueTools.bulkDeleteCues(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "reorder_cues":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.cueTools.reorderCues(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          // Cue List Query Tools (Task 2.5 - included in this PR)
          case "list_cue_lists":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.cueTools.listCueLists(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "get_cue_list_details":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.cueTools.getCueListDetails(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "get_cue":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.cueTools.getCue(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "delete_cue_list":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.cueTools.deleteCueList(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          // Bulk Cue List Operations
          case "bulk_create_cue_lists":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.cueTools.bulkCreateCueLists(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "bulk_update_cue_lists":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.cueTools.bulkUpdateCueLists(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "bulk_delete_cue_lists":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.cueTools.bulkDeleteCueLists(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          // Cue List Playback Tools
          case "start_cue_list":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.cueTools.startCueList(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "next_cue":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.cueTools.nextCue(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "previous_cue":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.cueTools.previousCue(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "go_to_cue":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.cueTools.goToCue(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "stop_cue_list":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.cueTools.stopCueList(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "get_cue_list_status":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.cueTools.getCueListStatus(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          // Settings Tools
          case "get_fade_update_rate":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.settingsTools.getFadeUpdateRate(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "set_fade_update_rate":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.settingsTools.setFadeUpdateRate(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "get_build_info":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.settingsTools.getBuildInfo(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          // Look Board Tools
          case "list_look_boards":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.lookBoardTools.listLookBoards(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "get_look_board":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.lookBoardTools.getLookBoard(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "create_look_board":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.lookBoardTools.createLookBoard(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "update_look_board":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.lookBoardTools.updateLookBoard(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "delete_look_board":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.lookBoardTools.deleteLookBoard(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "bulk_create_look_boards":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.lookBoardTools.bulkCreateLookBoards(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "bulk_update_look_boards":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.lookBoardTools.bulkUpdateLookBoards(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "bulk_delete_look_boards":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.lookBoardTools.bulkDeleteLookBoards(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "add_look_to_board":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.lookBoardTools.addLookToBoard(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "update_look_board_button":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.lookBoardTools.updateLookBoardButton(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "remove_look_from_board":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.lookBoardTools.removeLookFromBoard(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "update_look_board_button_positions":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.lookBoardTools.updateLookBoardButtonPositions(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "bulk_create_look_board_buttons":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.lookBoardTools.bulkCreateLookBoardButtons(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "bulk_update_look_board_buttons":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.lookBoardTools.bulkUpdateLookBoardButtons(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "bulk_delete_look_board_buttons":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.lookBoardTools.bulkDeleteLookBoardButtons(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "activate_look_from_board":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.lookBoardTools.activateLookFromBoard(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "create_look_board_with_buttons":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.lookBoardTools.createLookBoardWithButtons(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          // Undo/Redo Tools
          case "undo":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.undoRedoTools.undo(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "redo":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.undoRedoTools.redo(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "get_undo_redo_status":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.undoRedoTools.getUndoRedoStatus(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "get_operation_history":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.undoRedoTools.getOperationHistory(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "jump_to_operation":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.undoRedoTools.jumpToOperation(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "clear_operation_history":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.undoRedoTools.clearOperationHistory(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;

        // Log the error with full context
        logger.error(`Tool call failed: ${name}`, {
          args,
          error: errorMessage,
          stack: errorStack,
        });

        return {
          content: [
            {
              type: "text",
              text: `Error: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async run() {
    const fingerprint = this.graphqlClient.getDeviceFingerprint();
    const deviceName = getDeviceName();

    // Log server startup
    logger.info('LacyLights MCP Server initializing', {
      logFile: logger.getLogPath(),
      graphqlEndpoint: process.env.LACYLIGHTS_GRAPHQL_ENDPOINT || "http://localhost:4000/graphql",
      deviceFingerprint: redactFingerprint(fingerprint),
      deviceName,
    });

    // Check device authentication status
    await this.checkDeviceStatus(fingerprint, deviceName);

    // Initialize RAG service
    try {
      await this.ragService.initializeCollection();
      logger.info('RAG service initialized');
    } catch (error) {
      logger.warn('RAG service initialization failed (optional)', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info('MCP Server connected and ready');
  }

  /**
   * Check device authentication status with the backend.
   * This method handles:
   * - Auth disabled: logs message and continues
   * - Device approved: logs message and continues
   * - Device pending: logs warning asking admin to approve
   * - Device unknown: auto-registers and logs message
   * - Connection errors: logs warning and continues (allows offline use)
   * - Timeout: logs warning and continues (allows startup when backend is hung)
   */
  private async checkDeviceStatus(fingerprint: string | null, deviceName: string): Promise<void> {
    if (!fingerprint) {
      logger.warn('No device fingerprint available, skipping device authentication check');
      return;
    }

    // Timeout for device status check to prevent blocking startup indefinitely
    const DEVICE_CHECK_TIMEOUT_MS = 5000;

    // Create an AbortController with timeout to cancel underlying fetch requests
    // This ensures that hung requests are actually terminated, not just ignored
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, DEVICE_CHECK_TIMEOUT_MS);

    try {
      // Check if authentication is enabled on the backend with timeout
      const authSettings = await this.graphqlClient.getAuthSettings({ signal: controller.signal });

      if (!authSettings.authEnabled) {
        clearTimeout(timeoutId);
        logger.info('Authentication disabled on server - all access allowed');
        return;
      }

      if (!authSettings.deviceAuthEnabled) {
        clearTimeout(timeoutId);
        logger.info('Device authentication disabled - using standard authentication');
        return;
      }

      logger.info('Device authentication enabled, checking device status...');

      // Check device status (AbortController signal passed for timeout)
      const result = await this.graphqlClient.checkDevice(fingerprint, { signal: controller.signal });

      switch (result.status) {
        case 'APPROVED':
          logger.info('Device approved', {
            deviceId: result.device?.id,
            deviceName: result.device?.name,
            permissions: result.device?.permissions,
          });
          break;

        case 'PENDING':
          logger.warn('Device is pending approval', {
            message: 'Please approve this device in the LacyLights admin panel.',
            deviceName,
            fingerprint: redactFingerprint(fingerprint),
          });
          break;

        case 'REVOKED':
          logger.error('Device has been revoked', {
            message: 'This device has been revoked and cannot access the system.',
            fingerprint: redactFingerprint(fingerprint),
          });
          // Continue anyway - the backend will reject requests
          break;

        case 'UNKNOWN':
        default:
          // Auto-register the device
          logger.info('Registering new device...', { deviceName, fingerprint: redactFingerprint(fingerprint) });
          try {
            const regResult = await this.graphqlClient.registerDevice(fingerprint, deviceName, { signal: controller.signal });
            if (regResult.success) {
              logger.info('Device registered successfully', {
                deviceId: regResult.device?.id,
                message: regResult.message,
              });
              logger.warn('Device pending approval', {
                message: 'Please approve this device in the LacyLights admin panel.',
                deviceName,
                fingerprint: redactFingerprint(fingerprint),
              });
            } else {
              logger.error('Device registration failed', {
                message: regResult.message,
              });
            }
          } catch (regError) {
            // Convert abort errors to timeout errors for clearer messaging
            if (regError instanceof Error && regError.name === 'AbortError') {
              logger.error('Device registration timed out', {
                error: 'Device authentication check timed out',
              });
            } else {
              logger.error('Failed to register device', {
                error: regError instanceof Error ? regError.message : String(regError),
              });
            }
          }
          break;
      }
      // Clear timeout on successful completion
      clearTimeout(timeoutId);
    } catch (error) {
      // Clean up timeout and convert abort errors
      clearTimeout(timeoutId);

      if (error instanceof DeviceNotApprovedError) {
        logger.error('Device not approved to access the system', {
          message: 'Please approve this device in the LacyLights admin panel.',
          fingerprint: redactFingerprint(error.fingerprint),
          deviceName,
        });
        // Continue anyway - the MCP server can still start, requests will fail
        return;
      }

      // Convert AbortError to a clearer timeout message
      const errorMessage = error instanceof Error && error.name === 'AbortError'
        ? 'Device authentication check timed out'
        : error instanceof Error ? error.message : String(error);

      // Connection error, timeout, or other issue - log and continue
      // This allows the MCP server to start even if the backend is temporarily unavailable
      logger.warn('Could not check device authentication status', {
        error: errorMessage,
        message: 'Continuing without device verification. Backend may be unavailable.',
      });
    }
  }
}

async function main() {
  const server = new LacyLightsMCPServer();
  await server.run();
}

// Run the server
main().catch((error) => {
  // Log fatal startup error
  logger.error('Fatal server startup error', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  // Exit with error code but don't log to stderr (interferes with MCP protocol)
  process.exit(1);
});
