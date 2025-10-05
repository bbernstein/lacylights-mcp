import { z } from "zod";
import { LacyLightsGraphQLClient } from "../services/graphql-client-simple";
import { FixtureDefinition, FixtureInstance, Scene, FixtureValue, FixtureType } from "../types/lighting";
import { logger } from "../utils/logger";

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

export class FixtureTools {
  constructor(private graphqlClient: LacyLightsGraphQLClient) {}

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
      hasColor: channelTypes.some((t) =>
        ["RED", "GREEN", "BLUE", "WHITE", "AMBER", "UV"].includes(t),
      ),
      hasRGB: ["RED", "GREEN", "BLUE"].every((color) =>
        channelTypes.includes(color as any),
      ),
      hasWhite: channelTypes.includes("WHITE" as any),
      hasAmber: channelTypes.includes("AMBER" as any),
      hasUV: channelTypes.includes("UV" as any),
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
      ["RED", "GREEN", "BLUE", "WHITE", "AMBER", "UV", "COLOR_WHEEL"].includes(
        ch.type,
      ),
    );

    return {
      fixtureId: fixture.id,
      fixtureName: fixture.name,
      colorMixingType: capabilities.hasRGB
        ? "RGB"
        : capabilities.hasColorWheel
          ? "Color Wheel"
          : "None",
      availableColors: colorChannels.map((ch) => ch.type),
      colorResolution: "8-bit (256 levels)",
      canMixColors: capabilities.hasRGB,
      whiteBalance: capabilities.hasWhite
        ? "Dedicated White Channel"
        : "RGB Mixed",
      specialColors: [
        capabilities.hasAmber && "Amber",
        capabilities.hasUV && "UV",
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
      recommendations.push("Full color mixing and washes");
    if (capabilities.hasWhite)
      recommendations.push("Clean white light and color temperature control");
    if (capabilities.hasAmber)
      recommendations.push("Warm color temperatures and tungsten matching");
    if (capabilities.hasUV)
      recommendations.push("Special effects and blacklight applications");
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
    if (capabilities.hasMovement) return "Moving spotlight";
    if (capabilities.hasRGB) return "Color wash light";
    if (capabilities.hasIntensity) return "Intensity dimmer";
    return "Specialty fixture";
  }

  private getSuitabilityRecommendations(capabilities: any): string[] {
    const suitable = [];
    if (capabilities.hasRGB)
      suitable.push("Color washes", "Mood lighting", "Cyc lighting");
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
        const rgbCount = analysis.filter((a) => a.canMixColors).length;
        return {
          totalFixtures,
          rgbCapable: rgbCount,
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
      // First, get the current fixture to understand what we're updating
      logger.debug('Fetching projects to find fixture', { fixtureId });
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

      // Check if fixture is used in any scenes
      const project = await this.graphqlClient.getProject(projectId);
      const scenesUsingFixture = project?.scenes.filter((scene: Scene) => 
        scene.fixtureValues?.some((fv: FixtureValue) => fv.fixture.id === fixtureId)
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
        affectedScenes: scenesUsingFixture.map((scene: Scene) => ({
          id: scene.id,
          name: scene.name,
          description: scene.description,
        })),
        message: `Successfully deleted fixture "${fixtureToDelete.name}" from project "${projectName}"`,
        warnings: scenesUsingFixture.length > 0 
          ? [`Fixture was removed from ${scenesUsingFixture.length} scene(s)`]
          : [],
      };
    } catch (error) {
      throw new Error(`Failed to delete fixture instance: ${error}`);
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
