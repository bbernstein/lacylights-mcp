#!/usr/bin/env node

import {
  Server,
  StdioServerTransport,
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "./mcp-imports";

import { LacyLightsGraphQLClient } from "./services/graphql-client-simple";
import { RAGService } from "./services/rag-service-simple";
import { AILightingService } from "./services/ai-lighting";
import { FixtureTools } from "./tools/fixture-tools";
import { SceneTools } from "./tools/scene-tools";
import { CueTools } from "./tools/cue-tools";
import { ProjectTools } from "./tools/project-tools";
import { logger } from "./utils/logger";

class LacyLightsMCPServer {
  private server: Server;
  private graphqlClient: LacyLightsGraphQLClient;
  private ragService: RAGService;
  private aiLightingService: AILightingService;
  private fixtureTools: FixtureTools;
  private sceneTools: SceneTools;
  private cueTools: CueTools;
  private projectTools: ProjectTools;

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
    this.graphqlClient = new LacyLightsGraphQLClient(graphqlEndpoint);
    this.ragService = new RAGService();
    this.aiLightingService = new AILightingService(this.ragService);

    // Initialize tools
    this.fixtureTools = new FixtureTools(this.graphqlClient);
    this.sceneTools = new SceneTools(
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

    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // Project Tools
          {
            name: "list_projects",
            description: "List all available lighting projects",
            inputSchema: {
              type: "object",
              properties: {
                includeDetails: {
                  type: "boolean",
                  default: false,
                  description: "Include fixture and scene counts",
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
              },
              required: ["name"],
            },
          },
          {
            name: "get_project_details",
            description: "Get detailed information about a specific project",
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
              "Delete a fixture instance from a project (will remove it from all scenes)",
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
          // Scene Tools
          {
            name: "generate_scene",
            description:
              "Generate a lighting scene based on script context and design preferences",
            inputSchema: {
              type: "object",
              properties: {
                projectId: {
                  type: "string",
                  description: "Project ID to create scene in",
                },
                sceneDescription: {
                  type: "string",
                  description: "Description of the scene to light",
                },
                scriptContext: {
                  type: "string",
                  description: "Optional script context for the scene",
                },
                sceneType: {
                  type: "string",
                  enum: ["full", "additive"],
                  default: "full",
                  description: "Type of scene: 'full' uses all fixtures (default), 'additive' only modifies specified fixtures",
                },
                designPreferences: {
                  type: "object",
                  properties: {
                    colorPalette: {
                      type: "array",
                      items: { type: "string" },
                      description: "Preferred colors for the scene",
                    },
                    mood: {
                      type: "string",
                      description: "Mood or atmosphere for the scene",
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
                  description: "Automatically activate the scene after creation",
                },
              },
              required: ["projectId", "sceneDescription"],
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
                suggestScenes: {
                  type: "boolean",
                  default: true,
                  description: "Generate scene suggestions based on analysis",
                },
              },
              required: ["scriptText"],
            },
          },
          {
            name: "optimize_scene",
            description: "Optimize an existing scene for specific goals",
            inputSchema: {
              type: "object",
              properties: {
                sceneId: {
                  type: "string",
                  description: "Scene ID to optimize",
                },
                projectId: {
                  type: "string",
                  description: "Project ID containing the scene",
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
              required: ["sceneId", "projectId"],
            },
          },
          {
            name: "update_scene",
            description: "Update an existing scene with new values",
            inputSchema: {
              type: "object",
              properties: {
                sceneId: {
                  type: "string",
                  description: "Scene ID to update",
                },
                name: {
                  type: "string",
                  description: "Optional new name for the scene",
                },
                description: {
                  type: "string",
                  description: "Optional new description for the scene",
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
                      channelValues: {
                        type: "array",
                        items: {
                          type: "number",
                          minimum: 0,
                          maximum: 255,
                        },
                        description: "Array of channel values (0-255)",
                      },
                    },
                    required: ["fixtureId", "channelValues"],
                  },
                  description: "Optional fixture values to update",
                },
              },
              required: ["sceneId"],
            },
          },
          {
            name: "activate_scene",
            description: "Activate a lighting scene by name or ID",
            inputSchema: {
              type: "object",
              properties: {
                projectId: {
                  type: "string",
                  description: "Optional project ID to search within",
                },
                sceneId: {
                  type: "string",
                  description: "Scene ID to activate",
                },
                sceneName: {
                  type: "string",
                  description: "Scene name to activate (searches across projects if projectId not provided)",
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
            name: "get_current_active_scene",
            description: "Get the currently active scene if any",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
          // Safe Scene Management Tools
          {
            name: "add_fixtures_to_scene",
            description: "Safely add fixtures to a scene without affecting existing fixtures",
            inputSchema: {
              type: "object",
              properties: {
                sceneId: {
                  type: "string",
                  description: "Scene ID to add fixtures to",
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
                      channelValues: {
                        type: "array",
                        items: {
                          type: "number",
                          minimum: 0,
                          maximum: 255,
                        },
                        description: "Array of channel values (0-255)",
                      },
                      sceneOrder: {
                        type: "number",
                        description: "Optional order in scene",
                      },
                    },
                    required: ["fixtureId", "channelValues"],
                  },
                  description: "Fixtures to add to the scene",
                },
                overwriteExisting: {
                  type: "boolean",
                  default: false,
                  description: "Whether to overwrite existing fixture values",
                },
              },
              required: ["sceneId", "fixtureValues"],
            },
          },
          {
            name: "remove_fixtures_from_scene",
            description: "Safely remove specific fixtures from a scene",
            inputSchema: {
              type: "object",
              properties: {
                sceneId: {
                  type: "string",
                  description: "Scene ID to remove fixtures from",
                },
                fixtureIds: {
                  type: "array",
                  items: { type: "string" },
                  description: "Array of fixture IDs to remove",
                },
              },
              required: ["sceneId", "fixtureIds"],
            },
          },
          {
            name: "get_scene_fixture_values",
            description: "Get current fixture values for a scene (read-only)",
            inputSchema: {
              type: "object",
              properties: {
                sceneId: {
                  type: "string",
                  description: "Scene ID to get fixture values for",
                },
              },
              required: ["sceneId"],
            },
          },
          {
            name: "ensure_fixtures_in_scene",
            description: "Ensure specific fixtures exist in a scene with given values, adding only if missing",
            inputSchema: {
              type: "object",
              properties: {
                sceneId: {
                  type: "string",
                  description: "Scene ID to ensure fixtures in",
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
                      channelValues: {
                        type: "array",
                        items: {
                          type: "number",
                          minimum: 0,
                          maximum: 255,
                        },
                        description: "Array of channel values (0-255)",
                      },
                      sceneOrder: {
                        type: "number",
                        description: "Optional order in scene",
                      },
                    },
                    required: ["fixtureId", "channelValues"],
                  },
                  description: "Fixtures to ensure exist in the scene",
                },
              },
              required: ["sceneId", "fixtureValues"],
            },
          },
          {
            name: "update_scene_partial",
            description: "Safely update scene metadata and optionally merge fixture values",
            inputSchema: {
              type: "object",
              properties: {
                sceneId: {
                  type: "string",
                  description: "Scene ID to update",
                },
                name: {
                  type: "string",
                  description: "Optional new name for the scene",
                },
                description: {
                  type: "string",
                  description: "Optional new description for the scene",
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
                      channelValues: {
                        type: "array",
                        items: {
                          type: "number",
                          minimum: 0,
                          maximum: 255,
                        },
                        description: "Array of channel values (0-255)",
                      },
                      sceneOrder: {
                        type: "number",
                        description: "Optional order in scene",
                      },
                    },
                    required: ["fixtureId", "channelValues"],
                  },
                  description: "Optional fixture values to merge/update",
                },
                mergeFixtures: {
                  type: "boolean",
                  default: true,
                  description: "Whether to merge fixtures (true) or replace all (false)",
                },
              },
              required: ["sceneId"],
            },
          },
          // Cue Tools
          {
            name: "create_cue_sequence",
            description:
              "Create a sequence of lighting cues from existing scenes",
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
                sceneIds: {
                  type: "array",
                  items: { type: "string" },
                  description: "Scene IDs to include in sequence",
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
                "sceneIds",
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
                existingScenes: {
                  type: "array",
                  items: { type: "string" },
                  description: "Optional existing scene IDs to reference",
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
                sceneId: {
                  type: "string",
                  description: "Scene ID to use for this cue",
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
              required: ["cueListId", "name", "cueNumber", "sceneId"],
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
                sceneId: {
                  type: "string",
                  description: "New scene ID",
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
                }
              },
              required: ["cueIds"]
            }
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
- Scene details (use get_scene)

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
- includeSceneDetails: Include full scene data for each cue (default: false)
- sortBy: Sort cues by cueNumber, name, or sceneName
- filterBy: Optional filters (cueNumberRange, nameContains, etc.)

By default, each cue includes sceneId and sceneName but NOT full scene
fixture values. Set includeSceneDetails=true only if you need full scene
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
                includeSceneDetails: {
                  type: "boolean",
                  default: false,
                  description:
                    "Include full scene data for each cue (default: false for performance)",
                },
                sortBy: {
                  type: "string",
                  enum: ["cueNumber", "name", "sceneName"],
                  default: "cueNumber",
                  description: "Sort cues by cue number, name, or scene name",
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
                    sceneNameContains: {
                      type: "string",
                      description:
                        "Filter cues where scene name contains this text (case-insensitive)",
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
- Scene information (id, name, description)
- Cue list information (id, name)

Use this when you need to inspect a single cue in detail.

Use cases:
- "Show me details for cue 5.5"
- "What scene does this cue use?"
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

          // Scene Tools
          case "generate_scene":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.sceneTools.generateScene(args as any),
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
                    await this.sceneTools.analyzeScript(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "optimize_scene":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.sceneTools.optimizeScene(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "update_scene":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.sceneTools.updateScene(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "activate_scene":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.sceneTools.activateScene(args as any),
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
                    await this.sceneTools.fadeToBlack(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "get_current_active_scene":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.sceneTools.getCurrentActiveScene(),
                    null,
                    2,
                  ),
                },
              ],
            };

          // Safe Scene Management Tools
          case "add_fixtures_to_scene":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.sceneTools.addFixturesToScene(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "remove_fixtures_from_scene":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.sceneTools.removeFixturesFromScene(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "get_scene_fixture_values":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.sceneTools.getSceneFixtureValues(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "ensure_fixtures_in_scene":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.sceneTools.ensureFixturesInScene(args as any),
                    null,
                    2,
                  ),
                },
              ],
            };

          case "update_scene_partial":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await this.sceneTools.updateScenePartial(args as any),
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
    // Log server startup
    logger.info('LacyLights MCP Server initializing', {
      logFile: logger.getLogPath(),
      graphqlEndpoint: process.env.LACYLIGHTS_GRAPHQL_ENDPOINT || "http://localhost:4000/graphql",
    });

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
