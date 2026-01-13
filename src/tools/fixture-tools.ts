import { z } from "zod";
import { LacyLightsGraphQLClient } from "../services/graphql-client-simple";
import { FixtureDefinition, FixtureInstance, Look, FixtureValue, FixtureType } from "../types/lighting";
import { logger } from "../utils/logger";
import { normalizePaginationParams } from "../utils/pagination";

/**
 * All channel types that are considered color channels.
 * Includes RGB (additive mixing), CMY (subtractive mixing), extended gamut (LIME, INDIGO),
 * dual white temperatures (COLD_WHITE, WARM_WHITE), and traditional colors (WHITE, AMBER, UV).
 *
 * @remarks
 * - RGB: Additive color mixing (Red, Green, Blue)
 * - CMY: Subtractive color mixing (Cyan, Magenta, Yellow) - common in professional lighting
 * - Extended gamut: LIME and INDIGO expand the color space beyond standard RGB
 * - Dual white: COLD_WHITE and WARM_WHITE provide independent color temperature control
 * - COLOR_WHEEL: Used for fixtures with dichroic color wheels
 */
const COLOR_CHANNEL_TYPES: readonly string[] = [
  "RED",
  "GREEN",
  "BLUE",
  "WHITE",
  "AMBER",
  "UV",
  "CYAN",
  "MAGENTA",
  "YELLOW",
  "LIME",
  "INDIGO",
  "COLD_WHITE",
  "WARM_WHITE",
  "COLOR_WHEEL",
] as const;

const ListFixturesSchema = z.object({
  projectId: z.string().describe("Project ID to list fixtures from"),
  page: z.number().default(1).optional().describe("Page number (default: 1)"),
  perPage: z.number().default(50).optional().describe("Items per page (default: 50, max: 100)"),
  filter: z.object({
    type: z.enum(["LED_PAR", "MOVING_HEAD", "STROBE", "DIMMER", "OTHER"]).optional().describe("Filter by fixture type"),
    universe: z.number().optional().describe("Filter by DMX universe"),
    tags: z.array(z.string()).optional().describe("Filter by tags (all must match)"),
    manufacturer: z.string().optional().describe("Filter by manufacturer name"),
    model: z.string().optional().describe("Filter by model name"),
  }).optional().describe("Optional filters to apply"),
});

const GetFixtureSchema = z.object({
  fixtureId: z.string().describe("Fixture ID to retrieve"),
});

const GetFixtureInventorySchema = z.object({
  projectId: z.string().optional(),
  fixtureType: z
    .enum(["LED_PAR", "MOVING_HEAD", "STROBE", "DIMMER", "OTHER"])
    .optional(),
  includeDefinitions: z.boolean().default(true),
});

const AnalyzeFixtureCapabilitiesSchema = z.object({
  fixtureId: z.string().optional(),
  fixtureIds: z.array(z.string()).optional(),
  analysisType: z
    .enum(["color_mixing", "positioning", "effects", "general"])
    .default("general"),
});

const CreateFixtureInstanceSchema = z.object({
  projectId: z.string().describe("Project ID to add fixture to"),
  name: z.string().describe("Name for this fixture instance"),
  description: z
    .string()
    .optional()
    .describe("Description of where this fixture is placed or its purpose"),
  manufacturer: z
    .string()
    .describe('Fixture manufacturer (e.g., "Chauvet", "Martin", "ETC")'),
  model: z.string().describe("Fixture model name"),
  mode: z
    .string()
    .optional()
    .describe("Specific mode if the fixture has multiple modes"),
  universe: z
    .number()
    .default(1)
    .describe("DMX universe number (typically 1-4)"),
  startChannel: z
    .number()
    .optional()
    .describe(
      "Starting DMX channel (1-512). If not provided, will auto-assign",
    ),
  tags: z
    .array(z.string())
    .default([])
    .describe('Tags for organization (e.g., ["front", "wash", "blue"])'),
  channelAssignment: z
    .enum(["auto", "manual", "suggest"])
    .default("auto")
    .describe(
      "How to assign channels: auto=find next available, manual=use provided startChannel, suggest=recommend placement",
    ),
});

const GetChannelMapSchema = z.object({
  projectId: z.string().describe("Project ID to analyze"),
  universe: z
    .number()
    .optional()
    .describe("Specific universe to analyze (if not provided, shows all)"),
});

const SuggestChannelAssignmentSchema = z.object({
  projectId: z.string().describe("Project ID"),
  fixtureSpecs: z
    .array(
      z.object({
        name: z.string(),
        manufacturer: z.string(),
        model: z.string(),
        mode: z.string().optional(),
        channelCount: z
          .number()
          .optional()
          .describe("Number of channels (if known)"),
      }),
    )
    .describe("List of fixtures to assign channels for"),
  universe: z.number().default(1).describe("Universe to assign channels in"),
  startingChannel: z
    .number()
    .default(1)
    .describe("Channel to start assignments from"),
  groupingStrategy: z
    .enum(["sequential", "by_type", "by_function"])
    .default("sequential")
    .describe("How to group fixture assignments"),
});

const UpdateFixtureInstanceSchema = z.object({
  fixtureId: z.string().describe("ID of the fixture instance to update"),
  name: z.string().optional().describe("New name for the fixture"),
  description: z.string().optional().describe("New description for the fixture"),
  manufacturer: z.string().optional().describe("New manufacturer (will find/create new definition if changed)"),
  model: z.string().optional().describe("New model (will find/create new definition if changed)"),
  mode: z.string().optional().describe("New mode name"),
  universe: z.number().optional().describe("New DMX universe number"),
  startChannel: z.number().optional().describe("New starting DMX channel"),
  tags: z.array(z.string()).optional().describe("New tags array"),
});

const DeleteFixtureInstanceSchema = z.object({
  fixtureId: z.string().describe("ID of the fixture instance to delete"),
  confirmDelete: z.boolean().describe("Confirm deletion (required to be true for safety)"),
});

const BulkUpdateFixturesSchema = z.object({
  fixtures: z.array(z.object({
    fixtureId: z.string().describe("ID of the fixture instance to update"),
    name: z.string().optional().describe("New name for the fixture"),
    description: z.string().optional().describe("New description"),
    universe: z.number().optional().describe("New DMX universe number"),
    startChannel: z.number().optional().describe("New starting DMX channel"),
    tags: z.array(z.string()).optional().describe("New tags array"),
    layoutX: z.number().optional().describe("X position (0-1 normalized)"),
    layoutY: z.number().optional().describe("Y position (0-1 normalized)"),
    layoutRotation: z.number().optional().describe("Rotation in degrees"),
  })).describe("Array of fixture updates to apply")
});

const BulkCreateFixturesSchema = z.object({
  fixtures: z.array(z.object({
    projectId: z.string().describe("Project ID to add fixture to"),
    name: z.string().describe("Name for this fixture instance"),
    description: z.string().optional().describe("Description of where this fixture is placed or its purpose"),
    manufacturer: z.string().describe('Fixture manufacturer (e.g., "Chauvet", "Martin", "ETC")'),
    model: z.string().describe("Fixture model name"),
    mode: z.string().optional().describe("Specific mode if the fixture has multiple modes"),
    universe: z.number().default(1).describe("DMX universe number (typically 1-4)"),
    startChannel: z.number().optional().describe("Starting DMX channel (1-512). If not provided, will auto-assign"),
    tags: z.array(z.string()).default([]).describe('Tags for organization (e.g., ["front", "wash", "blue"])'),
  })).describe("Array of fixtures to create")
});

const BulkDeleteFixturesSchema = z.object({
  fixtureIds: z.array(z.string()).describe("Array of fixture IDs to delete"),
  confirmDelete: z.boolean().describe("Confirm deletion (required to be true for safety)"),
});

const BulkCreateFixtureDefinitionsSchema = z.object({
  definitions: z.array(z.object({
    manufacturer: z.string().describe('Fixture manufacturer (e.g., "Chauvet", "Martin", "ETC")'),
    model: z.string().describe("Fixture model name"),
    type: z.string().describe('Fixture type (e.g., "LED_PAR", "MOVING_HEAD", "STROBE", "DIMMER", "OTHER")'),
    channels: z.array(z.object({
      name: z.string().describe("Channel name (e.g., \"Dimmer\", \"Red\", \"Pan\")"),
      type: z.string().describe('Channel type (e.g., "INTENSITY", "COLOR", "PAN", "TILT", "STROBE")'),
      offset: z.number().describe("Channel offset from fixture start address (0-based)"),
      minValue: z.number().optional().describe("Minimum DMX value (0-255, default 0)"),
      maxValue: z.number().optional().describe("Maximum DMX value (0-255, default 255)"),
      defaultValue: z.number().optional().describe("Default DMX value (0-255, default 0)"),
    })).describe("Array of channel definitions for the fixture"),
    modes: z.array(z.object({
      name: z.string().describe("Mode name (e.g., \"4-Channel\", \"8-Channel\")"),
      channelCount: z.number().describe("Number of DMX channels in this mode"),
    })).optional().describe("Optional array of operating modes for the fixture"),
  })).describe("Array of fixture definitions to create"),
});

export class FixtureTools {
  constructor(private graphqlClient: LacyLightsGraphQLClient) {}

  /**
   * List fixtures in a project with pagination and filtering
   * Part of MCP API Refactor - Task 2.3
   */
  async listFixtures(args: z.infer<typeof ListFixturesSchema>) {
    const { projectId, page, perPage, filter } = ListFixturesSchema.parse(args);

    try {
      // Normalize pagination parameters
      const normalizedParams = normalizePaginationParams(page, perPage);

      // Call the GraphQL query
      const result = await this.graphqlClient.getFixtureInstances({
        projectId,
        page: normalizedParams.page,
        perPage: normalizedParams.perPage,
        filter,
      });

      return {
        fixtures: result.fixtures.map(f => ({
          id: f.id,
          name: f.name,
          description: f.description,
          manufacturer: f.manufacturer,
          model: f.model,
          type: f.type,
          universe: f.universe,
          startChannel: f.startChannel,
          channelCount: f.channelCount,
          tags: f.tags,
        })),
        pagination: result.pagination,
      };
    } catch (error) {
      logger.error('Failed to list fixtures', {
        projectId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`Failed to list fixtures: ${error}`);
    }
  }

  /**
   * Get a single fixture instance by ID
   * Part of MCP API Refactor - Task 2.3
   */
  async getFixture(args: z.infer<typeof GetFixtureSchema>) {
    const { fixtureId } = GetFixtureSchema.parse(args);

    try {
      const fixture = await this.graphqlClient.getFixtureInstance(fixtureId);

      if (!fixture) {
        throw new Error(`Fixture with ID ${fixtureId} not found`);
      }

      return {
        fixture: {
          id: fixture.id,
          name: fixture.name,
          description: fixture.description,
          manufacturer: fixture.manufacturer,
          model: fixture.model,
          type: fixture.type,
          mode: fixture.modeName,
          universe: fixture.universe,
          startChannel: fixture.startChannel,
          channelCount: fixture.channelCount,
          tags: fixture.tags,
          channels: fixture.channels.map(ch => ({
            offset: ch.offset,
            name: ch.name,
            type: ch.type,
            minValue: ch.minValue,
            maxValue: ch.maxValue,
            defaultValue: ch.defaultValue,
          })),
        },
      };
    } catch (error) {
      logger.error('Failed to get fixture', {
        fixtureId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`Failed to get fixture: ${error}`);
    }
  }

  async getFixtureInventory(args: z.infer<typeof GetFixtureInventorySchema>) {
    const { projectId, fixtureType, includeDefinitions } =
      GetFixtureInventorySchema.parse(args);

    try {
      let fixtures: FixtureInstance[] = [];
      let definitions: FixtureDefinition[] = [];

      if (projectId) {
        const project = await this.graphqlClient.getProject(projectId);
        if (!project) {
          throw new Error(`Project with ID ${projectId} not found`);
        }
        fixtures = project.fixtures;
      } else {
        const projects = await this.graphqlClient.getProjects();
        fixtures = projects.flatMap((p) => p.fixtures);
      }

      // Filter by fixture type if specified
      if (fixtureType) {
        fixtures = fixtures.filter((f) => f.type === fixtureType);
      }

      if (includeDefinitions) {
        definitions = await this.graphqlClient.getFixtureDefinitions();
        if (fixtureType) {
          definitions = definitions.filter((d) => d.type === fixtureType);
        }
      }

      const summary = {
        totalFixtures: fixtures.length,
        fixturesByType: fixtures.reduce(
          (acc, f) => {
            const type = f.type || 'UNKNOWN';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ),
        availableDefinitions: definitions.length,
      };

      return {
        fixtures: fixtures
          .map((f) => ({
            id: f.id,
            name: f.name,
            description: f.description,
            type: f.type,
            manufacturer: f.manufacturer,
            model: f.model,
          universe: f.universe,
          startChannel: f.startChannel,
          tags: f.tags,
          capabilities: this.extractFixtureCapabilities(f),
          channelCount: f.channelCount,
          modes: [{
            id: 'current',
            name: f.modeName,
            channelCount: f.channelCount,
          }],
        })),
        definitions: includeDefinitions
          ? definitions.map((d) => ({
              id: d.id,
              manufacturer: d.manufacturer,
              model: d.model,
              type: d.type,
              isBuiltIn: d.isBuiltIn,
              channelTypes: d.channels.map((ch) => ch.type),
              modes: d.modes.length,
            }))
          : [],
        summary,
      };
    } catch (error) {
      throw new Error(`Failed to get fixture inventory: ${error}`);
    }
  }

  async analyzeFixtureCapabilities(
    args: z.infer<typeof AnalyzeFixtureCapabilitiesSchema>,
  ) {
    const { fixtureId, fixtureIds, analysisType } =
      AnalyzeFixtureCapabilitiesSchema.parse(args);

    try {
      let targetFixtures: FixtureInstance[] = [];

      if (fixtureId) {
        // Get fixture from any project (we'll need to search)
        const projects = await this.graphqlClient.getProjects();
        for (const project of projects) {
          const fixture = project.fixtures.find((f) => f.id === fixtureId);
          if (fixture) {
            targetFixtures = [fixture];
            break;
          }
        }
      } else if (fixtureIds) {
        const projects = await this.graphqlClient.getProjects();
        targetFixtures = projects
          .flatMap((p) => p.fixtures)
          .filter((f) => fixtureIds.includes(f.id));
      } else {
        throw new Error("Either fixtureId or fixtureIds must be provided");
      }

      if (targetFixtures.length === 0) {
        throw new Error("No fixtures found with the provided IDs");
      }

      const analysis = targetFixtures.map((fixture) => {
        const capabilities = this.extractFixtureCapabilities(fixture);

        switch (analysisType) {
          case "color_mixing":
            return this.analyzeColorCapabilities(fixture, capabilities);
          case "positioning":
            return this.analyzePositioningCapabilities(fixture, capabilities);
          case "effects":
            return this.analyzeEffectCapabilities(fixture, capabilities);
          default:
            return this.analyzeGeneralCapabilities(fixture, capabilities);
        }
      });

      return {
        analysisType,
        fixtures: analysis,
        summary: this.generateCapabilitySummary(analysis, analysisType),
      };
    } catch (error) {
      throw new Error(`Failed to analyze fixture capabilities: ${error}`);
    }
  }

  private extractFixtureCapabilities(fixture: FixtureInstance) {
    // Use mode-specific channels if available, otherwise fall back to definition channels
    let channelTypes: string[];
    let channelCount: number;
    
    // Debug info (temporarily embedded in response)
    const debugInfo = {
      fixtureName: fixture.name,
      hasMode: !!fixture.modeName,
      modeName: fixture.modeName,
      modeChannelCount: fixture.channelCount,
      modeChannelsLength: fixture.channels?.length,
      definitionChannelsLength: fixture.channels.length
    };
    
    if (fixture.channels && fixture.channels.length > 0) {
      // Use mode-specific channels
      channelTypes = fixture.channels.map((ch: any) => ch.type);
      channelCount = fixture.channelCount;
    } else {
      // Fall back to fixture channels
      channelTypes = fixture.channels.map((ch) => ch.type);
      channelCount = fixture.channels.length;
    }

    return {
      hasColor: channelTypes.some((t) => COLOR_CHANNEL_TYPES.includes(t)),
      hasRGB: ["RED", "GREEN", "BLUE"].every((color) =>
        channelTypes.includes(color as any),
      ),
      hasWhite: channelTypes.includes("WHITE" as any),
      hasColdWhite: channelTypes.includes("COLD_WHITE" as any),
      hasWarmWhite: channelTypes.includes("WARM_WHITE" as any),
      hasAmber: channelTypes.includes("AMBER" as any),
      hasUV: channelTypes.includes("UV" as any),
      hasLime: channelTypes.includes("LIME" as any),
      hasIndigo: channelTypes.includes("INDIGO" as any),
      hasCMY: ["CYAN", "MAGENTA", "YELLOW"].every((color) =>
        channelTypes.includes(color as any),
      ),
      hasExtendedGamut: channelTypes.some((t) => ["LIME", "INDIGO"].includes(t)),
      hasMovement: channelTypes.some((t) => ["PAN", "TILT"].includes(t)),
      hasPan: channelTypes.includes("PAN" as any),
      hasTilt: channelTypes.includes("TILT" as any),
      hasIntensity: channelTypes.includes("INTENSITY" as any),
      hasZoom: channelTypes.includes("ZOOM" as any),
      hasFocus: channelTypes.includes("FOCUS" as any),
      hasGobo: channelTypes.includes("GOBO" as any),
      hasColorWheel: channelTypes.includes("COLOR_WHEEL" as any),
      hasStrobe: channelTypes.includes("STROBE" as any),
      hasEffects: channelTypes.includes("EFFECT" as any),
      hasMacros: channelTypes.includes("MACRO" as any),
      channelTypes: channelTypes,
      channelCount: channelCount,
      // Temporary debug info
      _debug_extractCapabilities: debugInfo,
    };
  }

  private analyzeColorCapabilities(
    fixture: FixtureInstance,
    capabilities: any,
  ) {
    const colorChannels = fixture.channels.filter((ch) =>
      COLOR_CHANNEL_TYPES.includes(ch.type),
    );

    // Determine color mixing type based on capabilities
    let colorMixingType = "None";
    if (capabilities.hasCMY) {
      colorMixingType = "CMY (Subtractive)";
    } else if (capabilities.hasRGB) {
      colorMixingType = "RGB (Additive)";
    } else if (capabilities.hasColorWheel) {
      colorMixingType = "Color Wheel";
    }

    return {
      fixtureId: fixture.id,
      fixtureName: fixture.name,
      colorMixingType,
      availableColors: colorChannels.map((ch) => ch.type),
      colorResolution: "8-bit (256 levels)",
      canMixColors: capabilities.hasRGB || capabilities.hasCMY,
      whiteBalance: capabilities.hasWhite
        ? "Dedicated White Channel"
        : "RGB Mixed",
      specialColors: [
        capabilities.hasAmber && "Amber",
        capabilities.hasUV && "UV",
        capabilities.hasLime && "Lime",
        capabilities.hasIndigo && "Indigo",
        capabilities.hasColdWhite && "Cold White",
        capabilities.hasWarmWhite && "Warm White",
      ].filter(Boolean),
      recommendedUse: this.getColorRecommendations(capabilities),
    };
  }

  private analyzePositioningCapabilities(
    fixture: FixtureInstance,
    capabilities: any,
  ) {
    return {
      fixtureId: fixture.id,
      fixtureName: fixture.name,
      movementType: capabilities.hasMovement ? "Moving Head" : "Fixed Position",
      panRange: capabilities.hasPan ? "540°" : "N/A", // Default assumption
      tiltRange: capabilities.hasTilt ? "270°" : "N/A", // Default assumption
      positioning: capabilities.hasMovement
        ? "16-bit precision"
        : "Manual adjustment required",
      recommendedPlacement: this.getPositioningRecommendations(
        fixture,
        capabilities,
      ),
    };
  }

  private analyzeEffectCapabilities(
    fixture: FixtureInstance,
    capabilities: any,
  ) {
    return {
      fixtureId: fixture.id,
      fixtureName: fixture.name,
      strobeCapable: capabilities.hasStrobe,
      goboEffects: capabilities.hasGobo,
      focusControl: capabilities.hasFocus,
      zoomControl: capabilities.hasZoom,
      macroEffects: capabilities.hasMacros,
      customEffects: capabilities.hasEffects,
      recommendedEffects: this.getEffectRecommendations(capabilities),
    };
  }

  private analyzeGeneralCapabilities(
    fixture: FixtureInstance,
    capabilities: any,
  ) {
    // Temporary debug info (embedded in response)
    const debugAnalyze = {
      fixtureName: fixture.name,
      capabilitiesChannelCount: capabilities.channelCount,
      modeChannelCount: fixture.channelCount,
      definitionChannelCount: fixture.channels.length,
      hasMode: !!fixture.modeName,
      modeChannelsLength: fixture.channels?.length,
      extractCapabilitiesDebug: capabilities._debug_extractCapabilities
    };
    
    return {
      fixtureId: fixture.id,
      fixtureName: fixture.name,
      type: fixture.type,
      manufacturer: fixture.manufacturer,
      model: fixture.model,
      totalChannels: capabilities.channelCount,
      primaryFunction: this.determinePrimaryFunction(capabilities),
      suitableFor: this.getSuitabilityRecommendations(capabilities),
      limitations: this.identifyLimitations(capabilities),
      strengths: this.identifyStrengths(capabilities),
      // Temporary debug info
      _debug_analyzeGeneral: debugAnalyze,
    };
  }

  private getColorRecommendations(capabilities: any): string[] {
    const recommendations = [];
    if (capabilities.hasRGB)
      recommendations.push("Full RGB color mixing and washes");
    if (capabilities.hasCMY)
      recommendations.push("Professional CMY subtractive color mixing");
    if (capabilities.hasWhite)
      recommendations.push("Clean white light and color temperature control");
    if (capabilities.hasAmber)
      recommendations.push("Warm color temperatures and tungsten matching");
    if (capabilities.hasUV)
      recommendations.push("Special effects and blacklight applications");
    if (capabilities.hasLime)
      recommendations.push("Extended green gamut for richer colors");
    if (capabilities.hasIndigo)
      recommendations.push("Extended blue-purple gamut");
    if (capabilities.hasColdWhite)
      recommendations.push("Cool white balance (daylight temperatures)");
    if (capabilities.hasWarmWhite)
      recommendations.push("Warm white balance (tungsten temperatures)");
    if (capabilities.hasExtendedGamut)
      recommendations.push("Wide color gamut reproduction");
    if (capabilities.hasColorWheel)
      recommendations.push("Quick color changes and dichroic effects");
    return recommendations;
  }

  private getPositioningRecommendations(
    fixture: FixtureInstance,
    capabilities: any,
  ): string[] {
    const recommendations = [];
    if (capabilities.hasMovement) {
      recommendations.push("Upstage center for maximum coverage");
      recommendations.push("FOH positions for front lighting");
      recommendations.push("Side lighting positions for dramatic angles");
    } else {
      recommendations.push(
        `Universe ${fixture.universe}, Channel ${fixture.startChannel}`,
      );
      recommendations.push("Fixed position - plan placement carefully");
    }
    return recommendations;
  }

  private getEffectRecommendations(capabilities: any): string[] {
    const recommendations = [];
    if (capabilities.hasStrobe)
      recommendations.push("Lightning effects, strobing, freeze moments");
    if (capabilities.hasGobo)
      recommendations.push("Texture projection, pattern effects");
    if (capabilities.hasFocus)
      recommendations.push("Sharp beam definition, focus pulling");
    if (capabilities.hasZoom)
      recommendations.push("Beam size adjustment, coverage control");
    if (capabilities.hasMacros)
      recommendations.push("Pre-programmed sequences, quick setups");
    return recommendations;
  }

  private determinePrimaryFunction(capabilities: any): string {
    if (capabilities.hasMovement && capabilities.hasRGB)
      return "Moving wash light";
    if (capabilities.hasMovement && capabilities.hasCMY)
      return "Professional moving wash (CMY)";
    if (capabilities.hasMovement) return "Moving spotlight";
    if (capabilities.hasCMY) return "CMY color wash light";
    if (capabilities.hasRGB) return "RGB color wash light";
    if (capabilities.hasIntensity) return "Intensity dimmer";
    return "Specialty fixture";
  }

  private getSuitabilityRecommendations(capabilities: any): string[] {
    const suitable = [];
    if (capabilities.hasRGB)
      suitable.push("Color washes", "Mood lighting", "Cyc lighting");
    if (capabilities.hasCMY)
      suitable.push("Professional color mixing", "Broadcast lighting", "Theatre productions");
    if (capabilities.hasExtendedGamut)
      suitable.push("High-end color reproduction", "Wide gamut applications");
    if (capabilities.hasColdWhite || capabilities.hasWarmWhite)
      suitable.push("Color temperature control", "White balance tuning");
    if (capabilities.hasMovement)
      suitable.push("Follow spots", "Dynamic effects", "Area lighting");
    if (capabilities.hasStrobe)
      suitable.push("Concert lighting", "Dance scenes", "Special effects");
    if (capabilities.hasGobo)
      suitable.push("Texture effects", "Pattern projection", "Atmosphere");
    return suitable;
  }

  private identifyLimitations(capabilities: any): string[] {
    const limitations = [];
    if (!capabilities.hasColor) limitations.push("No color mixing capability");
    if (!capabilities.hasMovement) limitations.push("Fixed position only");
    if (!capabilities.hasIntensity) limitations.push("No dimming control");
    if (capabilities.channelCount < 4)
      limitations.push("Limited control channels");
    return limitations;
  }

  private identifyStrengths(capabilities: any): string[] {
    const strengths = [];
    if (capabilities.hasRGB && capabilities.hasWhite)
      strengths.push("Full color spectrum with white point");
    if (capabilities.hasCMY)
      strengths.push("Professional subtractive color mixing");
    if (capabilities.hasExtendedGamut)
      strengths.push("Extended color gamut beyond standard RGB");
    if (capabilities.hasColdWhite && capabilities.hasWarmWhite)
      strengths.push("Independent dual white temperature control");
    if (capabilities.hasMovement && capabilities.hasColor)
      strengths.push("Dynamic color positioning");
    if (capabilities.hasStrobe && capabilities.hasColor)
      strengths.push("Color strobing effects");
    if (capabilities.hasRGB)
      strengths.push("Full RGB color mixing capability");
    if (capabilities.hasAmber)
      strengths.push("Amber channel for warm color temperatures");
    if (capabilities.channelCount >= 3 && capabilities.channelCount <= 4)
      strengths.push("Compact and efficient channel usage");
    if (capabilities.channelCount > 4 && capabilities.channelCount <= 10)
      strengths.push("Good balance of control and simplicity");
    if (capabilities.channelCount > 10)
      strengths.push("Extensive control options");
    return strengths;
  }

  private generateCapabilitySummary(analysis: any[], analysisType: string) {
    const totalFixtures = analysis.length;

    switch (analysisType) {
      case "color_mixing": {
        const rgbCount = analysis.filter((a) => a.canMixColors && a.colorMixingType.includes("RGB")).length;
        const cmyCount = analysis.filter((a) => a.colorMixingType.includes("CMY")).length;
        return {
          totalFixtures,
          rgbCapable: rgbCount,
          cmyCapable: cmyCount,
          colorWheelFixtures: analysis.filter(
            (a) => a.colorMixingType === "Color Wheel",
          ).length,
          whiteLights: analysis.filter(
            (a) => a.whiteBalance === "Dedicated White Channel",
          ).length,
        };
      }
      case "positioning": {
        const movingHeads = analysis.filter(
          (a) => a.movementType === "Moving Head",
        ).length;
        return {
          totalFixtures,
          movingHeads,
          fixedPositions: totalFixtures - movingHeads,
        };
      }
      default:
        return { totalFixtures, analysisComplete: true };
    }
  }

  async createFixtureInstance(
    args: z.infer<typeof CreateFixtureInstanceSchema>,
  ) {
    const {
      projectId,
      name,
      description,
      manufacturer,
      model,
      mode,
      universe,
      startChannel,
      tags,
      channelAssignment,
    } = CreateFixtureInstanceSchema.parse(args);

    try {
      // Get project to verify it exists
      const project = await this.graphqlClient.getProject(projectId);
      if (!project) {
        throw new Error(`Project with ID ${projectId} not found`);
      }

      // Find or create fixture definition
      const definitions = await this.graphqlClient.getFixtureDefinitions();
      let fixtureDefinition = definitions.find(
        (d) =>
          d.manufacturer.toLowerCase() === manufacturer.toLowerCase() &&
          d.model.toLowerCase() === model.toLowerCase(),
      );

      if (!fixtureDefinition) {
        // Create fixture definition based on intelligent analysis
        const { channels, fixtureType } = this.createIntelligentFixtureChannels(mode, model, manufacturer);
        
        fixtureDefinition = await this.graphqlClient.createFixtureDefinition({
          manufacturer,
          model,
          type: fixtureType,
          channels,
          modes: mode ? [{ name: mode, channelCount: channels.length }] : [],
        });
      }

      if (!fixtureDefinition) {
        throw new Error("Failed to create or find fixture definition");
      }

      // Check if mode is required when multiple modes are available
      if (fixtureDefinition.modes.length > 1 && !mode) {
        const availableModes = fixtureDefinition.modes.map(m => ({
          name: m.name,
          channelCount: m.channelCount,
          shortName: m.shortName
        }));
        
        throw new Error(
          `Mode selection required. This fixture (${manufacturer} ${model}) has ${fixtureDefinition.modes.length} available modes. ` +
          `Please specify a mode from: ${availableModes.map(m => `"${m.name}" (${m.channelCount} channels)`).join(', ')}. ` +
          `Available modes: ${JSON.stringify(availableModes, null, 2)}`
        );
      }

      // Find the specific mode if requested
      let selectedMode: any = null;
      if (mode && fixtureDefinition.modes.length > 0) {
        selectedMode = fixtureDefinition.modes.find(
          (m) =>
            m.name.toLowerCase().includes(mode.toLowerCase()) ||
            mode.toLowerCase().includes(m.name.toLowerCase()),
        );

        if (!selectedMode) {
          // If exact match not found, try to find by channel count
          const modeChannelCount = parseInt(mode.match(/\d+/)?.[0] || "0");
          if (modeChannelCount > 0) {
            selectedMode = fixtureDefinition.modes.find(
              (m) => m.channelCount === modeChannelCount,
            );
          }
        }

        // If mode was specified but no match found, provide helpful error
        if (!selectedMode && fixtureDefinition.modes.length > 0) {
          const availableModes = fixtureDefinition.modes.map(m => ({
            name: m.name,
            channelCount: m.channelCount,
            shortName: m.shortName
          }));
          
          throw new Error(
            `Invalid mode "${mode}" for fixture ${manufacturer} ${model}. ` +
            `Available modes: ${availableModes.map(m => `"${m.name}" (${m.channelCount} channels)`).join(', ')}. ` +
            `Mode details: ${JSON.stringify(availableModes, null, 2)}`
          );
        }
      }

      // Handle channel assignment
      let finalStartChannel = startChannel;
      if (channelAssignment === "auto" && !startChannel) {
        finalStartChannel = await this.findNextAvailableChannel(
          projectId,
          universe,
          fixtureDefinition.channels.length,
        );
      } else if (channelAssignment === "suggest") {
        const suggestion = await this.suggestChannelAssignment({
          projectId,
          fixtureSpecs: [{ name, manufacturer, model, mode }],
          universe,
          startingChannel: startChannel || 1,
          groupingStrategy: "sequential",
        });
        finalStartChannel = suggestion.assignments[0]?.startChannel || 1;
      }

      if (!finalStartChannel) {
        finalStartChannel = 1;
      }

      // Create fixture instance
      const fixture = await this.graphqlClient.createFixtureInstance({
        projectId,
        name,
        description,
        definitionId: fixtureDefinition.id,
        modeId: selectedMode?.id,
        universe,
        startChannel: finalStartChannel || 1,
        tags,
      });

      return {
        fixture: {
          id: fixture.id,
          name: fixture.name,
          description: fixture.description,
          manufacturer: fixtureDefinition.manufacturer,
          model: fixtureDefinition.model,
          mode: selectedMode?.name || mode || "Default",
          modeId: selectedMode?.id,
          requestedMode: mode,
          universe: fixture.universe,
          startChannel: fixture.startChannel,
          channelCount:
            selectedMode?.channelCount || fixtureDefinition.channels.length,
          tags: fixture.tags,
        },
        channelAssignment: {
          method: channelAssignment,
          assignedChannel: finalStartChannel,
          channelRange: `${finalStartChannel}-${finalStartChannel + (selectedMode?.channelCount || fixtureDefinition.channels.length) - 1}`,
        },
        message: `Successfully created fixture "${name}" in project`,
      };
    } catch (error) {
      throw new Error(`Failed to create fixture instance: ${error}`);
    }
  }

  async getChannelMap(args: z.infer<typeof GetChannelMapSchema>) {
    const { projectId, universe } = GetChannelMapSchema.parse(args);

    try {
      const project = await this.graphqlClient.getProject(projectId);
      if (!project) {
        throw new Error(`Project with ID ${projectId} not found`);
      }

      let fixtures = project.fixtures;
      if (universe) {
        fixtures = fixtures.filter((f) => f.universe === universe);
      }

      // Group fixtures by universe
      const universeMap = fixtures.reduce(
        (acc, fixture) => {
          if (!acc[fixture.universe]) {
            acc[fixture.universe] = {
              universe: fixture.universe,
              fixtures: [],
              channelUsage: new Array(512).fill(null),
            };
          }

          const channelCount = fixture.channelCount;
          const endChannel = fixture.startChannel + channelCount - 1;

          // Mark channels as used
          for (let i = fixture.startChannel; i <= endChannel; i++) {
            if (i <= 512) {
              const channelIndex = i - fixture.startChannel;
              let channelType = "UNKNOWN";
              
              // Use mode-specific channels if available
              if (fixture.channels && fixture.channels.length > channelIndex) {
                channelType = fixture.channels[channelIndex].type;
              }
              
              acc[fixture.universe].channelUsage[i - 1] = {
                fixtureId: fixture.id,
                fixtureName: fixture.name,
                channelType: channelType,
              };
            }
          }

          acc[fixture.universe].fixtures.push({
            id: fixture.id,
            name: fixture.name,
            type: fixture.type,
            manufacturer: fixture.manufacturer,
            model: fixture.model,
            startChannel: fixture.startChannel,
            endChannel,
            channelCount,
          });

          return acc;
        },
        {} as Record<number, any>,
      );

      // Sort fixtures within each universe by start channel
      Object.values(universeMap).forEach((universeData: any) => {
        universeData.fixtures.sort(
          (a: any, b: any) => a.startChannel - b.startChannel,
        );
      });

      // Calculate available channels for each universe
      Object.values(universeMap).forEach((universeData: any) => {
        const usedChannels = universeData.channelUsage.filter(
          (ch: any) => ch !== null,
        ).length;
        universeData.availableChannels = 512 - usedChannels;
        universeData.nextAvailableChannel =
          this.findNextAvailableChannelInArray(universeData.channelUsage);
      });

      return {
        projectId,
        totalUniverses: Object.keys(universeMap).length,
        universes: Object.values(universeMap),
        summary: {
          totalFixtures: fixtures.length,
          totalChannelsUsed: Object.values(universeMap).reduce(
            (sum: number, u: any) => sum + (512 - u.availableChannels),
            0,
          ),
          totalChannelsAvailable: Object.values(universeMap).reduce(
            (sum: number, u: any) => sum + u.availableChannels,
            0,
          ),
        },
      };
    } catch (error) {
      throw new Error(`Failed to get channel map: ${error}`);
    }
  }

  async suggestChannelAssignment(
    args: z.infer<typeof SuggestChannelAssignmentSchema>,
  ) {
    const {
      projectId,
      fixtureSpecs,
      universe,
      startingChannel,
      groupingStrategy,
    } = SuggestChannelAssignmentSchema.parse(args);

    try {
      const channelMap = await this.getChannelMap({ projectId, universe });
      const universeData = channelMap.universes.find(
        (u: any) => u.universe === universe,
      );

      if (!universeData) {
        throw new Error(`Universe ${universe} not found in project`);
      }

      const assignments = [];
      let currentChannel = startingChannel;

      for (const spec of fixtureSpecs) {
        // Estimate channel count (default to 4 if not provided)
        const channelCount = spec.channelCount || 4;

        // Find next available channel block
        const availableChannel = this.findNextAvailableChannelBlock(
          universeData.channelUsage,
          currentChannel,
          channelCount,
        );

        if (availableChannel + channelCount - 1 > 512) {
          throw new Error(
            `Not enough channels available in universe ${universe} for fixture ${spec.name}`,
          );
        }

        assignments.push({
          fixtureName: spec.name,
          manufacturer: spec.manufacturer,
          model: spec.model,
          mode: spec.mode,
          startChannel: availableChannel,
          endChannel: availableChannel + channelCount - 1,
          channelCount,
          channelRange: `${availableChannel}-${availableChannel + channelCount - 1}`,
        });

        // Update for next fixture based on grouping strategy
        switch (groupingStrategy) {
          case "sequential":
            currentChannel = availableChannel + channelCount;
            break;
          case "by_type":
            // Group similar fixture types together
            currentChannel = availableChannel + channelCount;
            break;
          case "by_function":
            // Group by function (e.g., all wash lights together)
            currentChannel = availableChannel + channelCount;
            break;
        }
      }

      return {
        projectId,
        universe,
        groupingStrategy,
        assignments,
        summary: {
          totalFixtures: assignments.length,
          channelsUsed: assignments.reduce((sum, a) => sum + a.channelCount, 0),
          startChannel: assignments[0]?.startChannel,
          endChannel: assignments[assignments.length - 1]?.endChannel,
        },
        recommendations: this.generateChannelRecommendations(
          assignments,
          universeData,
        ),
      };
    } catch (error) {
      throw new Error(`Failed to suggest channel assignment: ${error}`);
    }
  }

  private async findNextAvailableChannel(
    projectId: string,
    universe: number,
    channelCount: number,
  ): Promise<number> {
    const channelMap = await this.getChannelMap({ projectId, universe });
    const universeData = channelMap.universes.find(
      (u: any) => u.universe === universe,
    );

    if (!universeData) {
      return 1; // New universe, start at channel 1
    }

    return this.findNextAvailableChannelBlock(
      universeData.channelUsage,
      1,
      channelCount,
    );
  }

  private findNextAvailableChannelInArray(channelUsage: any[]): number {
    for (let i = 0; i < channelUsage.length; i++) {
      if (channelUsage[i] === null) {
        return i + 1; // Convert to 1-based indexing
      }
    }
    return 513; // No channels available
  }

  private findNextAvailableChannelBlock(
    channelUsage: any[],
    startFrom: number,
    blockSize: number,
  ): number {
    for (let i = startFrom - 1; i <= 512 - blockSize; i++) {
      let blockAvailable = true;
      for (let j = i; j < i + blockSize; j++) {
        if (channelUsage[j] !== null) {
          blockAvailable = false;
          break;
        }
      }
      if (blockAvailable) {
        return i + 1; // Convert to 1-based indexing
      }
    }
    throw new Error(`No available channel block of size ${blockSize} found`);
  }

  private generateChannelRecommendations(
    assignments: any[],
    _universeData: any,
  ): string[] {
    const recommendations = [];

    // Check for channel efficiency
    const totalChannelsUsed = assignments.reduce(
      (sum, a) => sum + a.channelCount,
      0,
    );
    if (totalChannelsUsed > 256) {
      recommendations.push(
        "Consider splitting fixtures across multiple universes for better organization",
      );
    }

    // Check for gaps
    const gaps = this.findChannelGaps(assignments);
    if (gaps.length > 0) {
      recommendations.push(
        `Channel gaps detected: ${gaps.join(", ")} - consider reorganizing for efficiency`,
      );
    }

    // Check for fixture grouping
    const typeGroups = assignments.reduce(
      (acc, a) => {
        acc[a.manufacturer] = (acc[a.manufacturer] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    if (Object.keys(typeGroups).length > 1) {
      recommendations.push(
        "Consider grouping fixtures by manufacturer/type for easier patching",
      );
    }

    return recommendations;
  }

  private findChannelGaps(assignments: any[]): string[] {
    const gaps = [];
    for (let i = 1; i < assignments.length; i++) {
      const prevEnd = assignments[i - 1].endChannel;
      const currentStart = assignments[i].startChannel;
      if (currentStart > prevEnd + 1) {
        gaps.push(`${prevEnd + 1}-${currentStart - 1}`);
      }
    }
    return gaps;
  }

  async updateFixtureInstance(args: z.infer<typeof UpdateFixtureInstanceSchema>) {
    const {
      fixtureId,
      name,
      description,
      manufacturer,
      model,
      mode,
      universe,
      startChannel,
      tags,
    } = UpdateFixtureInstanceSchema.parse(args);

    logger.debug('updateFixtureInstance called', {
      fixtureId,
      name,
      description,
      manufacturer,
      model,
      mode,
      universe,
      startChannel,
      tags,
    });

    try {
      // Check if this is a simple update (no manufacturer/model/mode changes)
      const isSimpleUpdate = manufacturer === undefined && model === undefined && mode === undefined;

      // For simple updates, we can skip fetching all projects
      if (isSimpleUpdate) {
        logger.debug('Performing simple update without fetching projects', { fixtureId });
        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (universe !== undefined) updateData.universe = universe;
        if (startChannel !== undefined) updateData.startChannel = startChannel;
        if (tags !== undefined) updateData.tags = tags;

        logger.debug('Calling GraphQL updateFixtureInstance', { fixtureId, updateData });
        const updatedFixture = await this.graphqlClient.updateFixtureInstance(fixtureId, updateData);

        logger.info('Fixture updated successfully (simple update)', {
          id: updatedFixture.id,
          name: updatedFixture.name,
        });

        return {
          fixture: {
            id: updatedFixture.id,
            name: updatedFixture.name,
            description: updatedFixture.description,
            manufacturer: updatedFixture.manufacturer,
            model: updatedFixture.model,
            mode: updatedFixture.modeName,
            universe: updatedFixture.universe,
            startChannel: updatedFixture.startChannel,
            channelCount: updatedFixture.channelCount,
            tags: updatedFixture.tags
          },
          message: `Successfully updated fixture "${updatedFixture.name}"`
        };
      }

      // For complex updates, we need the current fixture data
      logger.debug('Fetching projects to find fixture (complex update)', { fixtureId });
      const projects = await this.graphqlClient.getProjects();
      let currentFixture: FixtureInstance | null = null;
      
      for (const project of projects) {
        const fixture = project.fixtures.find((f: FixtureInstance) => f.id === fixtureId);
        if (fixture) {
          currentFixture = fixture;
          break;
        }
      }

      if (!currentFixture) {
        logger.error('Fixture not found', { fixtureId });
        throw new Error(`Fixture with ID ${fixtureId} not found`);
      }

      logger.debug('Found current fixture', {
        id: currentFixture.id,
        name: currentFixture.name,
        manufacturer: currentFixture.manufacturer,
        model: currentFixture.model,
      });

      // Prepare update data
      const updateData: any = {};
      
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (universe !== undefined) updateData.universe = universe;
      if (startChannel !== undefined) updateData.startChannel = startChannel;
      if (tags !== undefined) updateData.tags = tags;

      // Handle definition changes (manufacturer/model)
      if (manufacturer !== undefined || model !== undefined) {
        const newManufacturer = manufacturer || currentFixture.manufacturer;
        const newModel = model || currentFixture.model;
        
        // Find or create fixture definition
        const definitions = await this.graphqlClient.getFixtureDefinitions();
        let fixtureDefinition = definitions.find(d => 
          d.manufacturer.toLowerCase() === newManufacturer.toLowerCase() && 
          d.model.toLowerCase() === newModel.toLowerCase()
        );

        if (!fixtureDefinition) {
          // Create a basic fixture definition
          // Use intelligent fixture creation for new definitions
          const { channels, fixtureType } = this.createIntelligentFixtureChannels(mode, newModel, newManufacturer);
          
          fixtureDefinition = await this.graphqlClient.createFixtureDefinition({
            manufacturer: newManufacturer,
            model: newModel,
            type: fixtureType,
            channels,
            modes: []
          });
        }

        updateData.definitionId = fixtureDefinition.id;
      }

      // Handle mode changes
      if (mode !== undefined) {
        const definitions = await this.graphqlClient.getFixtureDefinitions();
        const currentDefinitionId = updateData.definitionId || currentFixture.definitionId;
        const definition = definitions.find(d => d.id === currentDefinitionId);
        
        if (definition) {
          const selectedMode = definition.modes.find(m => 
            m.name.toLowerCase().includes(mode.toLowerCase()) ||
            mode.toLowerCase().includes(m.name.toLowerCase())
          );
          
          if (!selectedMode) {
            // Try to find by channel count
            const modeChannelCount = parseInt(mode.match(/\d+/)?.[0] || '0');
            if (modeChannelCount > 0) {
              const modeByCount = definition.modes.find(m => m.channelCount === modeChannelCount);
              if (modeByCount) {
                updateData.modeId = modeByCount.id;
              }
            }
          } else {
            updateData.modeId = selectedMode.id;
          }
          
          if (!updateData.modeId) {
            console.warn(`Mode "${mode}" not found for fixture definition ${definition.manufacturer} ${definition.model}`);
          }
        }
      }

      // Update the fixture
      logger.debug('Calling GraphQL updateFixtureInstance', { fixtureId, updateData });
      const updatedFixture = await this.graphqlClient.updateFixtureInstance(fixtureId, updateData);

      logger.info('Fixture updated successfully', {
        id: updatedFixture.id,
        name: updatedFixture.name,
      });

      return {
        fixture: {
          id: updatedFixture.id,
          name: updatedFixture.name,
          description: updatedFixture.description,
          manufacturer: updatedFixture.manufacturer,
          model: updatedFixture.model,
          mode: updatedFixture.modeName,
          universe: updatedFixture.universe,
          startChannel: updatedFixture.startChannel,
          channelCount: updatedFixture.channelCount,
          tags: updatedFixture.tags
        },
        changes: {
          name: name !== undefined ? { from: currentFixture.name, to: name } : undefined,
          description: description !== undefined ? { from: currentFixture.description, to: description } : undefined,
          manufacturer: manufacturer !== undefined ? { from: currentFixture.manufacturer, to: manufacturer } : undefined,
          model: model !== undefined ? { from: currentFixture.model, to: model } : undefined,
          mode: mode !== undefined ? { from: currentFixture.modeName, to: updatedFixture.modeName } : undefined,
          universe: universe !== undefined ? { from: currentFixture.universe, to: universe } : undefined,
          startChannel: startChannel !== undefined ? { from: currentFixture.startChannel, to: startChannel } : undefined,
          tags: tags !== undefined ? { from: currentFixture.tags, to: tags } : undefined,
        },
        message: `Successfully updated fixture "${updatedFixture.name}"`
      };
    } catch (error) {
      logger.error('Failed to update fixture instance', {
        fixtureId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new Error(`Failed to update fixture instance: ${error}`);
    }
  }

  async deleteFixtureInstance(args: z.infer<typeof DeleteFixtureInstanceSchema>) {
    const { fixtureId, confirmDelete } = DeleteFixtureInstanceSchema.parse(args);

    if (!confirmDelete) {
      throw new Error('Delete operation requires confirmDelete: true for safety');
    }

    try {
      // First, get information about the fixture to be deleted
      const projects = await this.graphqlClient.getProjects();
      let fixtureToDelete: FixtureInstance | null = null;
      let projectId: string = '';
      let projectName: string = '';
      
      for (const project of projects) {
        const fixture = project.fixtures.find((f: FixtureInstance) => f.id === fixtureId);
        if (fixture) {
          fixtureToDelete = fixture;
          projectId = project.id;
          projectName = project.name;
          break;
        }
      }

      if (!fixtureToDelete) {
        throw new Error(`Fixture with ID ${fixtureId} not found`);
      }

      // Check if fixture is used in any looks
      const project = await this.graphqlClient.getProject(projectId);
      const looksUsingFixture = project?.looks.filter((look: Look) =>
        look.fixtureValues?.some((fv: FixtureValue) => fv.fixture.id === fixtureId)
      ) || [];

      // Delete the fixture
      const deleted = await this.graphqlClient.deleteFixtureInstance(fixtureId);

      if (!deleted) {
        throw new Error('Failed to delete fixture instance');
      }

      return {
        success: true,
        deletedFixture: {
          id: fixtureToDelete.id,
          name: fixtureToDelete.name,
          manufacturer: fixtureToDelete.manufacturer,
          model: fixtureToDelete.model,
          universe: fixtureToDelete.universe,
          startChannel: fixtureToDelete.startChannel,
          projectId,
          projectName,
        },
        affectedLooks: looksUsingFixture.map((look: Look) => ({
          id: look.id,
          name: look.name,
          description: look.description,
        })),
        message: `Successfully deleted fixture "${fixtureToDelete.name}" from project "${projectName}"`,
        warnings: looksUsingFixture.length > 0
          ? [`Fixture was removed from ${looksUsingFixture.length} look(s)`]
          : [],
      };
    } catch (error) {
      throw new Error(`Failed to delete fixture instance: ${error}`);
    }
  }

  async bulkUpdateFixtures(args: z.infer<typeof BulkUpdateFixturesSchema>) {
    const { fixtures } = BulkUpdateFixturesSchema.parse(args);

    try {
      logger.info('Bulk updating fixtures', { count: fixtures.length });

      // Call the GraphQL bulk update mutation
      const updatedFixtures = await this.graphqlClient.bulkUpdateFixtures({
        fixtures
      });

      logger.info('Bulk update completed successfully', {
        updatedCount: updatedFixtures.length
      });

      return {
        success: true,
        updatedCount: updatedFixtures.length,
        fixtures: updatedFixtures.map(f => ({
          id: f.id,
          name: f.name,
          description: f.description,
          manufacturer: f.manufacturer,
          model: f.model,
          universe: f.universe,
          startChannel: f.startChannel,
          tags: f.tags,
          layoutX: f.layoutX,
          layoutY: f.layoutY,
          layoutRotation: f.layoutRotation,
        })),
        message: `Successfully updated ${updatedFixtures.length} fixture(s)`
      };
    } catch (error) {
      logger.error('Failed to bulk update fixtures', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new Error(`Failed to bulk update fixtures: ${error}`);
    }
  }

  async bulkCreateFixtures(args: z.infer<typeof BulkCreateFixturesSchema>) {
    const { fixtures } = BulkCreateFixturesSchema.parse(args);

    logger.info('Bulk creating fixtures', { count: fixtures.length });

    // Get all fixture definitions once to avoid repeated queries
    const definitions = await this.graphqlClient.getFixtureDefinitions();

    // Track successes and failures
    const succeeded: any[] = [];
    const failed: any[] = [];

    // Process each fixture individually for best-effort approach
    for (let i = 0; i < fixtures.length; i++) {
      const fixtureSpec = fixtures[i];
      const {
        projectId,
        name,
        description,
        manufacturer,
        model,
        mode,
        universe,
        startChannel,
        tags
      } = fixtureSpec;

      try {
        // Find or create fixture definition
        let fixtureDefinition = definitions.find(
          (d) =>
            d.manufacturer.toLowerCase() === manufacturer.toLowerCase() &&
            d.model.toLowerCase() === model.toLowerCase(),
        );

        if (!fixtureDefinition) {
          // Create fixture definition based on intelligent analysis
          const { channels, fixtureType } = this.createIntelligentFixtureChannels(mode, model, manufacturer);

          fixtureDefinition = await this.graphqlClient.createFixtureDefinition({
            manufacturer,
            model,
            type: fixtureType,
            channels,
            modes: mode ? [{ name: mode, channelCount: channels.length }] : [],
          });

          // Add to definitions list for future fixtures in this batch
          definitions.push(fixtureDefinition);
        }

        if (!fixtureDefinition) {
          throw new Error(`Failed to create or find fixture definition for ${manufacturer} ${model}`);
        }

        // Find the specific mode if requested
        let selectedMode: any = null;
        if (mode && fixtureDefinition.modes.length > 0) {
          selectedMode = fixtureDefinition.modes.find(
            (m) =>
              m.name.toLowerCase().includes(mode.toLowerCase()) ||
              mode.toLowerCase().includes(m.name.toLowerCase()),
          );

          if (!selectedMode) {
            // If exact match not found, try to find by channel count
            const modeChannelCount = parseInt(mode.match(/\d+/)?.[0] || "0");
            if (modeChannelCount > 0) {
              selectedMode = fixtureDefinition.modes.find(
                (m) => m.channelCount === modeChannelCount,
              );
            }
          }

          // If mode was specified but no match found, throw error
          if (!selectedMode && fixtureDefinition.modes.length > 0) {
            const availableModes = fixtureDefinition.modes.map(m => ({
              name: m.name,
              channelCount: m.channelCount,
              shortName: m.shortName
            }));

            throw new Error(
              `Invalid mode "${mode}". Available modes: ${availableModes.map(m => `"${m.name}" (${m.channelCount} channels)`).join(', ')}`
            );
          }
        }

        // Determine channel count for validation
        const channelCount = selectedMode?.channelCount || fixtureDefinition.channels.length;

        // Handle channel assignment with validation
        let finalStartChannel = startChannel;
        if (!startChannel) {
          // Auto-assign: find next available channel
          try {
            finalStartChannel = await this.findNextAvailableChannel(
              projectId,
              universe,
              channelCount,
            );
          } catch (_error) {
            throw new Error(`No available channel space in universe ${universe} for ${channelCount}-channel fixture`);
          }
        } else {
          // Manual assignment: validate the specified channel range is available
          const channelMap = await this.getChannelMap({ projectId, universe });
          const universeData = channelMap.universes.find((u: any) => u.universe === universe);

          if (universeData) {
            // Check if the requested channel range is available
            const endChannel = startChannel + channelCount - 1;

            if (endChannel > 512) {
              throw new Error(`Channel range ${startChannel}-${endChannel} exceeds universe size (512 channels)`);
            }

            for (let ch = startChannel; ch <= endChannel; ch++) {
              if (universeData.channelUsage[ch - 1] !== null) {
                const conflict = universeData.channelUsage[ch - 1];
                throw new Error(
                  `Channel ${ch} already in use by fixture "${conflict.fixtureName}". ` +
                  `Cannot assign ${channelCount} channels starting at ${startChannel}.`
                );
              }
            }
          }
          // If universe doesn't exist yet, all channels are available
        }

        // Create the fixture instance
        const createdFixture = await this.graphqlClient.createFixtureInstance({
          projectId,
          name,
          description,
          definitionId: fixtureDefinition.id,
          modeId: selectedMode?.id,
          universe,
          startChannel: finalStartChannel || 1,
          tags: tags || [],
        });

        succeeded.push({
          index: i,
          fixture: {
            id: createdFixture.id,
            name: createdFixture.name,
            description: createdFixture.description,
            manufacturer: createdFixture.manufacturer,
            model: createdFixture.model,
            mode: createdFixture.modeName,
            universe: createdFixture.universe,
            startChannel: createdFixture.startChannel,
            channelCount: createdFixture.channelCount,
            tags: createdFixture.tags,
            channelRange: `${createdFixture.startChannel}-${createdFixture.startChannel + createdFixture.channelCount - 1}`,
          }
        });

        logger.info('Created fixture', {
          index: i,
          name: createdFixture.name,
          universe: createdFixture.universe,
          startChannel: createdFixture.startChannel
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        failed.push({
          index: i,
          fixture: {
            name,
            manufacturer,
            model,
            mode,
            universe,
            startChannel,
          },
          error: errorMessage
        });

        logger.warn('Failed to create fixture', {
          index: i,
          name,
          error: errorMessage
        });
      }
    }

    // Build response with success/failure details
    const response = {
      totalRequested: fixtures.length,
      successCount: succeeded.length,
      failureCount: failed.length,
      succeeded: succeeded.map(s => s.fixture),
      failed: failed,
      message: succeeded.length === fixtures.length
        ? `Successfully created all ${succeeded.length} fixture(s)`
        : succeeded.length > 0
        ? `Partially successful: ${succeeded.length} created, ${failed.length} failed`
        : `All ${failed.length} fixtures failed to create`,
      channelSummary: succeeded.length > 0 ? {
        totalChannelsUsed: succeeded.reduce((sum, s) => sum + s.fixture.channelCount, 0),
        universes: Array.from(new Set(succeeded.map(s => s.fixture.universe))).sort(),
      } : null
    };

    logger.info('Bulk create completed', {
      successCount: succeeded.length,
      failureCount: failed.length
    });

    return response;
  }

  async bulkDeleteFixtures(args: z.infer<typeof BulkDeleteFixturesSchema>) {
    const { fixtureIds, confirmDelete } = BulkDeleteFixturesSchema.parse(args);

    if (!confirmDelete) {
      throw new Error('Delete operation requires confirmDelete: true for safety');
    }

    try {
      if (fixtureIds.length === 0) {
        throw new Error('No fixture IDs provided for bulk deletion');
      }

      logger.info('Bulk deleting fixtures', { count: fixtureIds.length });

      // Use the GraphQL client's bulk delete method
      const result = await this.graphqlClient.bulkDeleteFixtures(fixtureIds);

      logger.info('Bulk delete completed', {
        successCount: result.successCount,
        failureCount: result.failedIds.length
      });

      // Note: 'success' is true if at least one deletion succeeded, even if some deletions failed.
      // Partial successes are possible; see 'deletedCount' and 'failedIds' for details.
      return {
        success: result.successCount > 0,
        deletedCount: result.successCount,
        failedIds: result.failedIds,
        summary: {
          totalRequested: fixtureIds.length,
          successCount: result.successCount,
          failureCount: result.failedIds.length,
        },
        message: result.failedIds.length === 0
          ? `Successfully deleted ${result.successCount} fixtures`
          : `Deleted ${result.successCount} fixtures, ${result.failedIds.length} failed`,
      };
    } catch (error) {
      logger.error('Failed to bulk delete fixtures', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new Error(`Failed to bulk delete fixtures: ${error}`);
    }
  }

  /**
   * Create multiple fixture definitions in a single operation
   */
  async bulkCreateFixtureDefinitions(args: z.infer<typeof BulkCreateFixtureDefinitionsSchema>) {
    const { definitions } = BulkCreateFixtureDefinitionsSchema.parse(args);

    try {
      if (definitions.length === 0) {
        throw new Error('No fixture definitions provided for bulk creation');
      }

      logger.info('Bulk creating fixture definitions', { count: definitions.length });

      // Use the GraphQL client's bulk create method
      const createdDefinitions = await this.graphqlClient.bulkCreateFixtureDefinitions({
        definitions,
      });

      logger.info('Bulk fixture definition creation completed', {
        createdCount: createdDefinitions.length
      });

      return {
        success: true,
        createdDefinitions: createdDefinitions.map(def => ({
          definitionId: def.id,
          manufacturer: def.manufacturer,
          model: def.model,
          type: def.type,
          channelCount: def.channels?.length || 0,
          modeCount: def.modes?.length || 0,
        })),
        summary: {
          totalCreated: createdDefinitions.length,
          manufacturers: [...new Set(definitions.map(d => d.manufacturer))],
          fixtureTypes: [...new Set(definitions.map(d => d.type))],
        },
        message: `Successfully created ${createdDefinitions.length} fixture definitions`,
      };
    } catch (error) {
      logger.error('Failed to bulk create fixture definitions', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new Error(`Failed to bulk create fixture definitions: ${error}`);
    }
  }

  /**
   * Create intelligent fixture channels based on mode, model, and manufacturer analysis
   */
  private createIntelligentFixtureChannels(mode?: string, model?: string, manufacturer?: string) {
    const modeStr = (mode || "").toLowerCase();
    const modelStr = (model || "").toLowerCase();
    const manufacturerStr = (manufacturer || "").toLowerCase();
    
    // Extract channel count from mode if present (e.g., "4-channel", "8-channel", "RGBA", "RGB")
    const channelCountMatch = modeStr.match(/(\d+)[-_]?ch|(\d+)[-_]?channel/);
    const suggestedChannelCount = channelCountMatch ? parseInt(channelCountMatch[1] || channelCountMatch[2]) : null;
    
    // Determine fixture type based on keywords
    let fixtureType = FixtureType.OTHER;
    if (modelStr.includes("par") || modelStr.includes("wash")) {
      fixtureType = FixtureType.LED_PAR;
    } else if (modelStr.includes("moving") || modelStr.includes("head") || modelStr.includes("spot")) {
      fixtureType = FixtureType.MOVING_HEAD;
    } else if (modelStr.includes("strobe") || modelStr.includes("flash")) {
      fixtureType = FixtureType.STROBE;
    } else if (modelStr.includes("dimmer")) {
      fixtureType = FixtureType.DIMMER;
    }
    
    // Analyze what type of intensity control this fixture likely uses
    const channels = [];
    let channelOffset = 0;
    
    // Check for color mode indicators using mutually exclusive detection
    // Order matters: Check from most specific (RGBAW) to least specific (RGB)
    let hasRGBAW = false, hasRGBW = false, hasRGBA = false, hasRGB = false;
    
    // Use word boundaries to ensure accurate matching
    if (/\brgbaw\b/i.test(modeStr)) {
      hasRGBAW = true;
    } else if (/\brgbw\b/i.test(modeStr)) {
      hasRGBW = true;
    } else if (/\brgba\b/i.test(modeStr)) {
      hasRGBA = true;
    } else if (/\brgb\b/i.test(modeStr)) {
      hasRGB = true;
    }
    const hasIntensityMode = modeStr.includes("intensity") || modeStr.includes("dimmer") || 
                            suggestedChannelCount === 1 || fixtureType === FixtureType.DIMMER;
    
    // Determine channel configuration based on mode analysis
    if (hasIntensityMode && suggestedChannelCount === 1) {
      // Single channel dimmer
      channels.push({
        name: "Intensity",
        type: "INTENSITY",
        offset: channelOffset++,
        minValue: 0,
        maxValue: 255,
        defaultValue: 0
      });
    } else if (hasRGBAW) {
      // RGBAW fixture
      channels.push(
        {
          name: "Red",
          type: "RED",
          offset: channelOffset++,
          minValue: 0,
          maxValue: 255,
          defaultValue: 0
        },
        {
          name: "Green", 
          type: "GREEN",
          offset: channelOffset++,
          minValue: 0,
          maxValue: 255,
          defaultValue: 0
        },
        {
          name: "Blue",
          type: "BLUE", 
          offset: channelOffset++,
          minValue: 0,
          maxValue: 255,
          defaultValue: 0
        },
        {
          name: "Amber",
          type: "AMBER",
          offset: channelOffset++,
          minValue: 0,
          maxValue: 255,
          defaultValue: 0
        },
        {
          name: "White",
          type: "WHITE",
          offset: channelOffset++,
          minValue: 0,
          maxValue: 255,
          defaultValue: 0
        }
      );
    } else if (hasRGBW) {
      // RGBW fixture (RGB + White)
      channels.push(
        {
          name: "Red",
          type: "RED",
          offset: channelOffset++,
          minValue: 0,
          maxValue: 255,
          defaultValue: 0
        },
        {
          name: "Green",
          type: "GREEN",
          offset: channelOffset++,
          minValue: 0,
          maxValue: 255,
          defaultValue: 0
        },
        {
          name: "Blue",
          type: "BLUE",
          offset: channelOffset++,
          minValue: 0,
          maxValue: 255,
          defaultValue: 0
        },
        {
          name: "White",
          type: "WHITE",
          offset: channelOffset++,
          minValue: 0,
          maxValue: 255,
          defaultValue: 0
        }
      );
    } else if (hasRGBA) {
      // RGBA fixture (RGB + Amber)
      channels.push(
        {
          name: "Red",
          type: "RED",
          offset: channelOffset++,
          minValue: 0,
          maxValue: 255,
          defaultValue: 0
        },
        {
          name: "Green",
          type: "GREEN",
          offset: channelOffset++,
          minValue: 0,
          maxValue: 255,
          defaultValue: 0
        },
        {
          name: "Blue",
          type: "BLUE",
          offset: channelOffset++,
          minValue: 0,
          maxValue: 255,
          defaultValue: 0
        },
        {
          name: "Amber",
          type: "AMBER",
          offset: channelOffset++,
          minValue: 0,
          maxValue: 255,
          defaultValue: 0
        }
      );
    } else if (hasRGB) {
      // RGB fixture  
      channels.push(
        {
          name: "Red",
          type: "RED",
          offset: channelOffset++,
          minValue: 0,
          maxValue: 255,
          defaultValue: 0
        },
        {
          name: "Green",
          type: "GREEN",
          offset: channelOffset++,
          minValue: 0,
          maxValue: 255,
          defaultValue: 0
        },
        {
          name: "Blue",
          type: "BLUE",
          offset: channelOffset++,
          minValue: 0,
          maxValue: 255,
          defaultValue: 0
        }
      );
    } else {
      // Default: assume it's a fixture that has both intensity and color mixing
      // This covers fixtures that have intensity + RGB, or more complex fixtures
      const hasComplexMode = suggestedChannelCount && suggestedChannelCount > 4;
      
      if (hasComplexMode) {
        // Complex fixture - add intensity + RGB + common controls
        channels.push(
          {
            name: "Intensity",
            type: "INTENSITY",
            offset: channelOffset++,
            minValue: 0,
            maxValue: 255,
            defaultValue: 0
          },
          {
            name: "Red",
            type: "RED",
            offset: channelOffset++,
            minValue: 0,
            maxValue: 255,
            defaultValue: 0
          },
          {
            name: "Green",
            type: "GREEN",
            offset: channelOffset++,
            minValue: 0,
            maxValue: 255,
            defaultValue: 0
          },
          {
            name: "Blue",
            type: "BLUE",
            offset: channelOffset++,
            minValue: 0,
            maxValue: 255,
            defaultValue: 0
          }
        );
        
        // Add additional channels based on fixture type
        if (fixtureType === FixtureType.MOVING_HEAD) {
          channels.push(
            {
              name: "Pan",
              type: "PAN",
              offset: channelOffset++,
              minValue: 0,
              maxValue: 255,
              defaultValue: 128
            },
            {
              name: "Tilt",
              type: "TILT",
              offset: channelOffset++,
              minValue: 0,
              maxValue: 255,
              defaultValue: 128
            }
          );
        }
        
        // Fill remaining channels with OTHER type
        while (channels.length < suggestedChannelCount) {
          channels.push({
            name: `Channel ${channels.length + 1}`,
            type: "OTHER",
            offset: channelOffset++,
            minValue: 0,
            maxValue: 255,
            defaultValue: 0
          });
        }
      } else {
        // Simple fixture - just RGB
        channels.push(
          {
            name: "Red",
            type: "RED",
            offset: channelOffset++,
            minValue: 0,
            maxValue: 255,
            defaultValue: 0
          },
          {
            name: "Green",
            type: "GREEN",
            offset: channelOffset++,
            minValue: 0,
            maxValue: 255,
            defaultValue: 0
          },
          {
            name: "Blue",
            type: "BLUE",
            offset: channelOffset++,
            minValue: 0,
            maxValue: 255,
            defaultValue: 0
          }
        );
        
        // Add white channel if it seems like a 4-channel fixture
        // Use word boundaries to avoid false positives with manufacturer names like "Whitestone"
        // Case-insensitive to match "White", "WHITE", or "white"
        if (suggestedChannelCount === 4 || /\bwhite\b/i.test(modelStr) || /\bwhite\b/i.test(manufacturerStr)) {
          channels.push({
            name: "White",
            type: "WHITE",
            offset: channelOffset++,
            minValue: 0,
            maxValue: 255,
            defaultValue: 0
          });
        }
      }
    }
    
    return {
      channels,
      fixtureType
    };
  }
}
