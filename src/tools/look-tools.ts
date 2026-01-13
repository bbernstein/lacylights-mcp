import { z } from 'zod';
import { LacyLightsGraphQLClient } from '../services/graphql-client-simple';
import { RAGService } from '../services/rag-service-simple';
import { AILightingService } from '../services/ai-lighting';
import { LightingDesignRequest, LookSortField } from '../types/lighting';

// Sparse channel value schema
const channelValueSchema = z.object({
  offset: z.number().int().min(0),
  value: z.number().int().min(0).max(255),
});

// Type definitions for better type safety
interface LookActivationResult {
  success: boolean;
  message?: string;
  error?: string;
}

interface FixtureInfo {
  id: string;
  name: string;
  type: string;
}

interface FixtureValueInfo {
  fixture: FixtureInfo;
  channels: { offset: number; value: number; }[];
  lookOrder?: number;
}

interface LookInfo {
  name: string;
  description: string | null;
  fixtureValues: FixtureValueInfo[];
}

interface GenerateLookResult {
  lookId?: string;
  look?: LookInfo;
  designReasoning?: string;
  fixturesUsed?: number;
  channelsSet?: number;
  activation?: LookActivationResult;
  analysis?: any;
  lightingCues?: any[];
  totalCues?: number;
  lookTemplates?: any[];
  characters?: any[];
  overallMood?: string;
  themes?: any[];
}

// Extended Look interface to include optional project
interface LookWithProject {
  id: string;
  name: string;
  description: string | null;
  fixtureValues: any[];
  project?: {
    id: string;
    name: string;
  };
}

const GenerateLookSchema = z.object({
  projectId: z.string(),
  lookDescription: z.string(),
  scriptContext: z.string().optional(),
  lookType: z.enum(['full', 'additive']).default('full'),
  designPreferences: z.object({
    colorPalette: z.array(z.string()).optional(),
    mood: z.string().optional(),
    intensity: z.enum(['subtle', 'moderate', 'dramatic']).optional(),
    focusAreas: z.array(z.string()).optional()
  }).optional(),
  fixtureFilter: z.object({
    includeTypes: z.array(z.enum(['LED_PAR', 'MOVING_HEAD', 'STROBE', 'DIMMER', 'OTHER'])).optional(),
    excludeTypes: z.array(z.enum(['LED_PAR', 'MOVING_HEAD', 'STROBE', 'DIMMER', 'OTHER'])).optional(),
    includeTags: z.array(z.string()).optional()
  }).optional(),
  activate: z.boolean().optional()
});

const AnalyzeScriptSchema = z.object({
  scriptText: z.string(),
  extractLightingCues: z.boolean().default(true),
  suggestLooks: z.boolean().default(true)
});

const OptimizeLookSchema = z.object({
  lookId: z.string(),
  projectId: z.string(),
  optimizationGoals: z.array(z.enum(['energy_efficiency', 'color_accuracy', 'dramatic_impact', 'technical_simplicity'])).default(['dramatic_impact'])
});

const UpdateLookSchema = z.object({
  lookId: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  fixtureValues: z.array(z.object({
    fixtureId: z.string(),
    channels: z.array(channelValueSchema)
  })).optional()
});

const ActivateLookSchema = z.object({
  projectId: z.string().optional(),
  lookId: z.string().optional(),
  lookName: z.string().optional()
});

const FadeToBlackSchema = z.object({
  fadeOutTime: z.number().default(3.0)
});

// SAFE LOOK UPDATE SCHEMAS
const AddFixturesToLookSchema = z.object({
  lookId: z.string(),
  fixtureValues: z.array(z.object({
    fixtureId: z.string(),
    channels: z.array(channelValueSchema),
    lookOrder: z.number().optional()
  })),
  overwriteExisting: z.boolean().default(false)
});

const RemoveFixturesFromLookSchema = z.object({
  lookId: z.string(),
  fixtureIds: z.array(z.string())
});

const GetLookFixtureValuesSchema = z.object({
  lookId: z.string(),
  includeFixtureDetails: z.boolean().default(true)
});

const EnsureFixturesInLookSchema = z.object({
  lookId: z.string(),
  fixtureValues: z.array(z.object({
    fixtureId: z.string(),
    channels: z.array(channelValueSchema),
    lookOrder: z.number().optional()
  }))
});

const UpdateLookPartialSchema = z.object({
  lookId: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  fixtureValues: z.array(z.object({
    fixtureId: z.string(),
    channels: z.array(channelValueSchema),
    lookOrder: z.number().optional()
  })).optional(),
  mergeFixtures: z.boolean().default(true)
});

// MCP API Refactor - Task 2.4: Look Query Schemas
const ListLooksSchema = z.object({
  projectId: z.string(),
  page: z.number().min(1).optional(),
  perPage: z.number().min(1).max(100).optional(),
  nameContains: z.string().optional(),
  usesFixture: z.string().optional(),
  sortBy: z.nativeEnum(LookSortField).optional()
});

const GetLookSchema = z.object({
  lookId: z.string(),
  includeFixtureValues: z.boolean().default(true)
});

const GetLookFixturesSchema = z.object({
  lookId: z.string()
});

// Bulk Look Operation Schemas
const BulkCreateLooksSchema = z.object({
  looks: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    projectId: z.string(),
    fixtureValues: z.array(z.object({
      fixtureId: z.string(),
      channels: z.array(channelValueSchema),
    })),
  })),
});

const BulkUpdateLooksSchema = z.object({
  looks: z.array(z.object({
    lookId: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    fixtureValues: z.array(z.object({
      fixtureId: z.string(),
      channels: z.array(channelValueSchema),
    })).optional(),
  })),
});

const BulkDeleteLooksSchema = z.object({
  lookIds: z.array(z.string()),
  confirmDelete: z.boolean(),
});

const BulkUpdateLooksPartialSchema = z.object({
  looks: z.array(z.object({
    lookId: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    fixtureValues: z.array(z.object({
      fixtureId: z.string(),
      channels: z.array(channelValueSchema),
      lookOrder: z.number().optional()
    })).optional(),
    mergeFixtures: z.boolean().optional().default(true)
  })),
});

export class LookTools {
  constructor(
    private graphqlClient: LacyLightsGraphQLClient,
    private ragService: RAGService,
    private aiLightingService: AILightingService
  ) {}

  async generateLook(args: z.infer<typeof GenerateLookSchema>) {
    const {
      projectId,
      lookDescription,
      scriptContext,
      lookType,
      designPreferences,
      fixtureFilter,
      activate
    } = GenerateLookSchema.parse(args);

    try {
      // Get project and available fixtures
      const project = await this.graphqlClient.getProject(projectId);
      if (!project) {
        throw new Error(`Project with ID ${projectId} not found`);
      }

      // Get all fixtures for context, then filter based on look type and criteria
      let availableFixtures = project.fixtures;
      const allFixtures = project.fixtures; // Keep reference to all fixtures

      // For additive looks, we need fixtureFilter to specify which fixtures to modify
      if (lookType === 'additive' && !fixtureFilter) {
        throw new Error('Additive looks require fixtureFilter to specify which fixtures to modify');
      }

      if (fixtureFilter) {
        if (fixtureFilter.includeTypes) {
          availableFixtures = availableFixtures.filter(f =>
            f.type && fixtureFilter.includeTypes!.includes(f.type)
          );
        }
        if (fixtureFilter.excludeTypes) {
          availableFixtures = availableFixtures.filter(f =>
            f.type && !fixtureFilter.excludeTypes!.includes(f.type)
          );
        }
        if (fixtureFilter.includeTags) {
          availableFixtures = availableFixtures.filter(f =>
            fixtureFilter.includeTags!.some(tag => f.tags.includes(tag))
          );
        }
      }

      if (availableFixtures.length === 0) {
        throw new Error('No fixtures available matching the specified criteria');
      }

      // Create lighting design request
      const lightingRequest: LightingDesignRequest = {
        scriptContext: scriptContext || lookDescription,
        lookDescription,
        availableFixtures,
        lookType,
        allFixtures: lookType === 'additive' ? allFixtures : undefined,
        designPreferences
      };

      // Generate look using AI
      const generatedLook = await this.aiLightingService.generateLook(lightingRequest);

      // Optimize the look for available fixtures
      const optimizedLook = await this.aiLightingService.optimizeLookForFixtures(
        generatedLook,
        availableFixtures
      );

      // Create the look in the database
      const createdLook = await this.graphqlClient.createLook({
        name: optimizedLook.name,
        description: optimizedLook.description,
        projectId,
        fixtureValues: optimizedLook.fixtureValues
      });

      const result: GenerateLookResult = {
        lookId: createdLook.id,
        look: {
          name: createdLook.name,
          description: createdLook.description || null,
          fixtureValues: createdLook.fixtureValues.map(fv => ({
            fixture: {
              id: fv.fixture.id,
              name: fv.fixture.name,
              type: fv.fixture.type || 'UNKNOWN'
            },
            channels: fv.channels,
            lookOrder: fv.lookOrder
          }))
        },
        designReasoning: optimizedLook.reasoning,
        fixturesUsed: availableFixtures.length,
        channelsSet: optimizedLook.fixtureValues.reduce((total, fv) => total + (fv.channels?.length || 0), 0)
      };

      // Activate the look if requested
      if (activate) {
        try {
          const success = await this.graphqlClient.setLookLive(createdLook.id);
          result.activation = {
            success,
            message: success
              ? `Look "${createdLook.name}" is now active`
              : 'Look created but activation failed'
          };
        } catch (activationError) {
          // Include activation error but don't fail the entire operation
          result.activation = {
            success: false,
            error: `Look created but activation failed: ${activationError}`
          };
        }
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to generate look: ${error}`);
    }
  }

  async analyzeScript(args: z.infer<typeof AnalyzeScriptSchema>) {
    const { scriptText, extractLightingCues, suggestLooks } = AnalyzeScriptSchema.parse(args);

    try {
      // Analyze script using RAG service
      const scriptAnalysis = await this.ragService.analyzeScript(scriptText);

      const result: GenerateLookResult = {
        analysis: scriptAnalysis,
        totalCues: scriptAnalysis.scenes.length,
        characters: scriptAnalysis.characters,
        overallMood: scriptAnalysis.overallMood,
        themes: scriptAnalysis.themes
      };

      if (extractLightingCues) {
        // Extract specific lighting cues from the analysis
        const lightingCues = scriptAnalysis.scenes.flatMap((scene, _index) =>
          scene.lightingCues.map(cue => ({
            sceneNumber: scene.sceneNumber,
            cue,
            context: scene.content.substring(0, 200) + '...',
            suggestedTiming: this.suggestCueTiming(cue, scene.mood)
          }))
        );

        result.lightingCues = lightingCues;
        result.totalCues = lightingCues.length;
      }

      if (suggestLooks) {
        // Generate look suggestions based on script analysis
        const lookTemplates = await Promise.all(
          scriptAnalysis.scenes.slice(0, 5).map(async (scene, _index) => {
            const recommendations = await this.ragService.generateLightingRecommendations(
              scene.content,
              scene.mood,
              ['LED_PAR', 'MOVING_HEAD'] // Default fixture types
            );

            return {
              sceneNumber: scene.sceneNumber,
              title: scene.title || `Scene ${scene.sceneNumber}`,
              mood: scene.mood,
              timeOfDay: scene.timeOfDay,
              location: scene.location,
              suggestedLighting: {
                colorPalette: recommendations.colorSuggestions,
                intensity: this.mapIntensityLevel(recommendations.intensityLevels),
                focusAreas: recommendations.focusAreas,
                reasoning: recommendations.reasoning
              },
              estimatedFixtureCount: this.estimateFixtureNeeds(recommendations)
            };
          })
        );

        result.lookTemplates = lookTemplates;
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to analyze script: ${error}`);
    }
  }

  async optimizeLook(args: z.infer<typeof OptimizeLookSchema>) {
    const { lookId, projectId, optimizationGoals } = OptimizeLookSchema.parse(args);

    try {
      // Get the current look
      const project = await this.graphqlClient.getProject(projectId);
      if (!project) {
        throw new Error(`Project with ID ${projectId} not found`);
      }

      const look = project.looks.find(l => l.id === lookId);
      if (!look) {
        throw new Error(`Look with ID ${lookId} not found`);
      }

      // Look optimization is planned for future implementation
      // Currently returns analysis and recommendations without modifying the look
      return {
        lookId,
        lookName: look.name,
        originalFixtureCount: look.fixtureValues.length,
        requestedGoals: optimizationGoals,
        status: 'not_implemented',
        message: 'Look optimization is planned for future releases. Current implementation provides recommendations only.',
        recommendations: this.getOptimizationRecommendations(optimizationGoals),
      };
    } catch (error) {
      throw new Error(`Failed to optimize look: ${error}`);
    }
  }

  async updateLook(args: z.infer<typeof UpdateLookSchema>) {
    const { lookId, name, description, fixtureValues } = UpdateLookSchema.parse(args);

    try {
      // Build the update input object with only provided fields
      const updateInput: any = {};
      if (name !== undefined) updateInput.name = name;
      if (description !== undefined) updateInput.description = description;
      if (fixtureValues !== undefined) updateInput.fixtureValues = fixtureValues;

      // Update the look
      const updatedLook = await this.graphqlClient.updateLook(lookId, updateInput);

      return {
        lookId: updatedLook.id,
        look: {
          name: updatedLook.name,
          description: updatedLook.description,
          updatedAt: updatedLook.updatedAt,
          fixtureValues: updatedLook.fixtureValues.map(fv => ({
            fixture: {
              id: fv.fixture.id,
              name: fv.fixture.name
            },
            channels: fv.channels,
            lookOrder: fv.lookOrder
          }))
        },
        fixturesUpdated: fixtureValues ? fixtureValues.length : 0,
        channelsUpdated: fixtureValues ? fixtureValues.reduce((total, fv) => total + (fv.channels?.length || 0), 0) : 0
      };
    } catch (error) {
      throw new Error(`Failed to update look: ${error}`);
    }
  }

  private suggestCueTiming(cue: string, mood: string): string {
    // Basic heuristics for cue timing based on content and mood
    const cueWords = cue.toLowerCase();

    if (cueWords.includes('blackout') || cueWords.includes('lights out')) {
      return 'Fast (1-2 seconds)';
    }
    if (cueWords.includes('fade') || cueWords.includes('dim')) {
      return mood === 'tense' ? 'Medium (3-5 seconds)' : 'Slow (5-8 seconds)';
    }
    if (cueWords.includes('snap') || cueWords.includes('flash')) {
      return 'Instant (0 seconds)';
    }

    return 'Medium (3-5 seconds)';
  }

  private mapIntensityLevel(intensityLevels: Record<string, number>): string {
    const avgIntensity = Object.values(intensityLevels).reduce((a, b) => a + b, 0) / Object.values(intensityLevels).length;

    if (avgIntensity < 30) return 'subtle';
    if (avgIntensity < 70) return 'moderate';
    return 'dramatic';
  }

  private estimateFixtureNeeds(recommendations: any): number {
    let baseCount = 4; // Minimum for basic coverage

    if (recommendations.focusAreas?.length > 2) baseCount += 2;
    if (recommendations.colorSuggestions?.length > 3) baseCount += 2;
    if (recommendations.intensityLevels?.key > 80) baseCount += 1;

    return Math.min(baseCount, 12); // Cap at reasonable maximum
  }

  /**
   * Provides general recommendations for look optimization goals
   */
  private getOptimizationRecommendations(goals: string[]): string[] {
    const recommendations: string[] = [];

    for (const goal of goals) {
      switch (goal) {
        case 'energy_efficiency':
          recommendations.push(
            'Use fewer fixtures at higher intensity rather than many at low intensity',
            'Prioritize LED fixtures over traditional tungsten',
            'Consider consolidating similar color washes'
          );
          break;
        case 'color_accuracy':
          recommendations.push(
            'Use fixtures with dedicated white channels',
            'Avoid oversaturated colors that may appear unnatural',
            'Consider color temperature consistency across fixtures'
          );
          break;
        case 'dramatic_impact':
          recommendations.push(
            'Use moving heads for dynamic positioning',
            'Create strong key light with softer fill',
            'Consider backlight for separation and depth'
          );
          break;
        case 'technical_simplicity':
          recommendations.push(
            'Group similar fixtures for easier control',
            'Use preset colors rather than custom mixes',
            'Minimize moving head positioning changes'
          );
          break;
      }
    }

    return recommendations;
  }

  async activateLook(args: z.infer<typeof ActivateLookSchema>) {
    const { projectId, lookId, lookName } = ActivateLookSchema.parse(args);

    try {
      let resolvedLookId = lookId;

      // If look name is provided, find the look by name
      if (lookName) {
        if (!projectId) {
          // Get all projects to search for the look
          const projects = await this.graphqlClient.getProjects();

          // Search for a look with this name across all projects
          for (const project of projects) {
            const look = project.looks.find(l =>
              l.name.toLowerCase() === lookName.toLowerCase() ||
              l.name.toLowerCase().includes(lookName.toLowerCase())
            );

            if (look) {
              resolvedLookId = look.id;
              break;
            }
          }

          if (!resolvedLookId) {
            throw new Error(`Look with name "${lookName}" not found in any project`);
          }
        } else {
          // Search in specific project
          const project = await this.graphqlClient.getProject(projectId);
          if (!project) {
            throw new Error(`Project with ID ${projectId} not found`);
          }

          const look = project.looks.find(l =>
            l.name.toLowerCase() === lookName.toLowerCase() ||
            l.name.toLowerCase().includes(lookName.toLowerCase())
          );

          if (!look) {
            throw new Error(`Look with name "${lookName}" not found in project ${project.name}`);
          }

          resolvedLookId = look.id;
        }
      } else if (!lookId) {
        throw new Error('Either lookId or lookName must be provided');
      }

      // Ensure resolvedLookId is defined before using it
      if (!resolvedLookId) {
        throw new Error('Resolved look ID is undefined');
      }

      // Activate the look
      const success = await this.graphqlClient.setLookLive(resolvedLookId);

      if (!success) {
        throw new Error('Failed to activate look');
      }

      // Get look details for response
      const look = await this.graphqlClient.getLook(resolvedLookId);

      if (!look) {
        throw new Error('Look could not be retrieved after activation');
      }

      return {
        success: true,
        look: {
          id: look.id,
          name: look.name,
          description: look.description
        },
        message: `Look "${look.name}" is now active`,
        fixturesActive: look.fixtureValues.length,
        hint: 'Use fade_to_black to turn off all lights'
      };
    } catch (error) {
      throw new Error(`Failed to activate look: ${error}`);
    }
  }

  async fadeToBlack(args: z.infer<typeof FadeToBlackSchema>) {
    const { fadeOutTime } = FadeToBlackSchema.parse(args);

    try {
      const success = await this.graphqlClient.fadeToBlack(fadeOutTime);

      return {
        success,
        message: success
          ? `Lights faded to black over ${fadeOutTime} seconds`
          : 'Failed to fade to black',
        fadeOutTime
      };
    } catch (error) {
      throw new Error(`Failed to fade to black: ${error}`);
    }
  }

  async getCurrentActiveLook() {
    try {
      const activeLook = await this.graphqlClient.getCurrentActiveLook();

      if (!activeLook) {
        return {
          hasActiveLook: false,
          message: 'No look is currently active'
        };
      }

      const lookWithProject = activeLook as LookWithProject;

      return {
        hasActiveLook: true,
        look: {
          id: lookWithProject.id,
          name: lookWithProject.name,
          description: lookWithProject.description,
          project: lookWithProject.project ? {
            id: lookWithProject.project.id,
            name: lookWithProject.project.name
          } : null
        },
        fixturesActive: lookWithProject.fixtureValues.length,
        message: `Look "${lookWithProject.name}" is currently active`
      };
    } catch (error) {
      throw new Error(`Failed to get current active look: ${error}`);
    }
  }

  // SAFE LOOK UPDATE METHODS

  async addFixturesToLook(args: z.infer<typeof AddFixturesToLookSchema>) {
    const { lookId, fixtureValues, overwriteExisting } = AddFixturesToLookSchema.parse(args);

    try {
      const updatedLook = await this.graphqlClient.addFixturesToLook(
        lookId,
        fixtureValues,
        overwriteExisting
      );

      return {
        lookId: updatedLook.id,
        look: {
          name: updatedLook.name,
          description: updatedLook.description,
          updatedAt: updatedLook.updatedAt,
          totalFixtures: updatedLook.fixtureValues.length,
          fixtureValues: updatedLook.fixtureValues.map(fv => ({
            fixture: {
              id: fv.fixture.id,
              name: fv.fixture.name
            },
            channels: fv.channels,
            lookOrder: fv.lookOrder
          }))
        },
        fixturesAdded: fixtureValues.length,
        overwriteMode: overwriteExisting,
        message: `Successfully added ${fixtureValues.length} fixtures to look "${updatedLook.name}"${overwriteExisting ? ' (overwriting existing)' : ' (preserving existing)'}`
      };
    } catch (error) {
      throw new Error(`Failed to add fixtures to look: ${error}`);
    }
  }

  async removeFixturesFromLook(args: z.infer<typeof RemoveFixturesFromLookSchema>) {
    const { lookId, fixtureIds } = RemoveFixturesFromLookSchema.parse(args);

    try {
      const updatedLook = await this.graphqlClient.removeFixturesFromLook(lookId, fixtureIds);

      return {
        lookId: updatedLook.id,
        look: {
          name: updatedLook.name,
          description: updatedLook.description,
          updatedAt: updatedLook.updatedAt,
          totalFixtures: updatedLook.fixtureValues.length,
          fixtureValues: updatedLook.fixtureValues.map(fv => ({
            fixture: {
              id: fv.fixture.id,
              name: fv.fixture.name
            },
            channels: fv.channels,
            lookOrder: fv.lookOrder
          }))
        },
        fixturesRemoved: fixtureIds.length,
        message: `Successfully removed ${fixtureIds.length} fixtures from look "${updatedLook.name}"`
      };
    } catch (error) {
      throw new Error(`Failed to remove fixtures from look: ${error}`);
    }
  }

  async getLookFixtureValues(args: z.infer<typeof GetLookFixtureValuesSchema>) {
    const { lookId, includeFixtureDetails } = GetLookFixtureValuesSchema.parse(args);

    try {
      const look = await this.graphqlClient.getLook(lookId);

      if (!look) {
        throw new Error(`Look with ID ${lookId} not found`);
      }

      return {
        lookId: look.id,
        look: {
          name: look.name,
          description: look.description,
          totalFixtures: look.fixtureValues.length
        },
        fixtureValues: look.fixtureValues.map(fv => ({
          fixtureId: fv.fixture.id,
          fixtureName: includeFixtureDetails ? fv.fixture.name : undefined,
          channels: fv.channels,
          lookOrder: fv.lookOrder,
          channelCount: fv.channels.length
        })),
        message: `Retrieved fixture values for ${look.fixtureValues.length} fixtures in look "${look.name}"`
      };
    } catch (error) {
      throw new Error(`Failed to get look fixture values: ${error}`);
    }
  }

  async ensureFixturesInLook(args: z.infer<typeof EnsureFixturesInLookSchema>) {
    const { lookId, fixtureValues } = EnsureFixturesInLookSchema.parse(args);

    try {
      // Use addFixturesToLook with overwriteExisting: false for safe behavior
      const updatedLook = await this.graphqlClient.addFixturesToLook(
        lookId,
        fixtureValues,
        false // Don't overwrite existing
      );

      return {
        lookId: updatedLook.id,
        look: {
          name: updatedLook.name,
          description: updatedLook.description,
          totalFixtures: updatedLook.fixtureValues.length
        },
        fixturesAdded: fixtureValues.length,
        message: `Added ${fixtureValues.length} fixtures to look "${updatedLook.name}" (only if missing)`
      };
    } catch (error) {
      throw new Error(`Failed to ensure fixtures in look: ${error}`);
    }
  }

  async updateLookPartial(args: z.infer<typeof UpdateLookPartialSchema>) {
    const { lookId, name, description, fixtureValues, mergeFixtures } = UpdateLookPartialSchema.parse(args);

    try {
      const updatedLook = await this.graphqlClient.updateLookPartial(lookId, {
        name,
        description,
        fixtureValues,
        mergeFixtures
      });

      return {
        lookId: updatedLook.id,
        look: {
          name: updatedLook.name,
          description: updatedLook.description,
          updatedAt: updatedLook.updatedAt,
          totalFixtures: updatedLook.fixtureValues.length,
          fixtureValues: updatedLook.fixtureValues.map(fv => ({
            fixture: {
              id: fv.fixture.id,
              name: fv.fixture.name
            },
            channels: fv.channels,
            lookOrder: fv.lookOrder
          }))
        },
        updateType: mergeFixtures ? 'merged' : 'replaced',
        fixturesUpdated: fixtureValues ? fixtureValues.length : 0,
        message: `Successfully updated look "${updatedLook.name}"${mergeFixtures ? ' (safe merge)' : ' (full replace)'}`
      };
    } catch (error) {
      throw new Error(`Failed to update look partially: ${error}`);
    }
  }

  // MCP API Refactor - Task 2.4: Look Query Tools

  /**
   * List looks in a project with pagination and filtering
   * Returns lightweight look summaries without fixture values
   */
  async listLooks(args: z.infer<typeof ListLooksSchema>) {
    const { projectId, page, perPage, nameContains, usesFixture, sortBy } = ListLooksSchema.parse(args);

    try {
      const result = await this.graphqlClient.listLooks({
        projectId,
        page,
        perPage,
        nameContains,
        usesFixture,
        sortBy
      });

      return {
        looks: result.items,
        pagination: result.pagination,
        message: `Found ${result.pagination.total} looks in project (page ${result.pagination.page} of ${result.pagination.totalPages})`
      };
    } catch (error) {
      throw new Error(`Failed to list looks: ${error}`);
    }
  }

  /**
   * Get full look details with optional fixture values
   * Set includeFixtureValues=false for faster queries when values not needed
   */
  async getLookDetails(args: z.infer<typeof GetLookSchema>) {
    const { lookId, includeFixtureValues } = GetLookSchema.parse(args);

    try {
      const look = await this.graphqlClient.getLookWithOptions(lookId, includeFixtureValues);

      if (!look) {
        throw new Error(`Look with ID ${lookId} not found`);
      }

      return {
        look: {
          id: look.id,
          name: look.name,
          description: look.description,
          createdAt: look.createdAt,
          updatedAt: look.updatedAt,
          fixtureValues: includeFixtureValues ? look.fixtureValues.map(fv => ({
            fixture: {
              id: fv.fixture.id,
              name: fv.fixture.name
            },
            channels: fv.channels,
            lookOrder: fv.lookOrder
          })) : undefined
        },
        includeFixtureValues,
        fixtureCount: includeFixtureValues ? look.fixtureValues.length : undefined,
        message: includeFixtureValues
          ? `Retrieved look "${look.name}" with ${look.fixtureValues.length} fixtures`
          : `Retrieved look "${look.name}" metadata (fixture values excluded for performance)`
      };
    } catch (error) {
      throw new Error(`Failed to get look details: ${error}`);
    }
  }

  /**
   * Get just the fixtures used in a look without their values
   * Fastest way to understand look composition
   */
  async getLookFixtures(args: z.infer<typeof GetLookFixturesSchema>) {
    const { lookId } = GetLookFixturesSchema.parse(args);

    try {
      const fixtures = await this.graphqlClient.getLookFixtures(lookId);

      return {
        lookId,
        fixtures: fixtures.map(f => ({
          fixtureId: f.fixtureId,
          fixtureName: f.fixtureName,
          fixtureType: f.fixtureType
        })),
        fixtureCount: fixtures.length,
        message: `Look uses ${fixtures.length} fixtures`
      };
    } catch (error) {
      throw new Error(`Failed to get look fixtures: ${error}`);
    }
  }

  // Bulk Look Operations

  /**
   * Create multiple looks in a single operation
   */
  async bulkCreateLooks(args: z.infer<typeof BulkCreateLooksSchema>) {
    const { looks } = BulkCreateLooksSchema.parse(args);

    try {
      if (looks.length === 0) {
        throw new Error('No looks provided for bulk creation');
      }

      // Use the GraphQL client's bulk create method
      const createdLooks = await this.graphqlClient.bulkCreateLooks({
        looks,
      });

      return {
        success: true,
        createdLooks: createdLooks.map(look => ({
          lookId: look.id,
          name: look.name,
          description: look.description,
          fixtureCount: look.fixtureValues?.length || 0,
        })),
        summary: {
          totalCreated: createdLooks.length,
          projectIds: [...new Set(looks.map(l => l.projectId))],
          totalFixtureValues: createdLooks.reduce(
            (sum, l) => sum + (l.fixtureValues?.length || 0),
            0
          ),
        },
        message: `Successfully created ${createdLooks.length} looks`,
      };
    } catch (error) {
      throw new Error(`Failed to bulk create looks: ${error}`);
    }
  }

  /**
   * Update multiple looks in a single operation
   */
  async bulkUpdateLooks(args: z.infer<typeof BulkUpdateLooksSchema>) {
    const { looks } = BulkUpdateLooksSchema.parse(args);

    try {
      if (looks.length === 0) {
        throw new Error('No looks provided for bulk update');
      }

      // Use the GraphQL client's bulk update method
      const updatedLooks = await this.graphqlClient.bulkUpdateLooks({
        looks,
      });

      return {
        success: true,
        updatedLooks: updatedLooks.map(look => ({
          lookId: look.id,
          name: look.name,
          description: look.description,
          fixtureCount: look.fixtureValues?.length || 0,
        })),
        summary: {
          totalUpdated: updatedLooks.length,
          looksWithNameChange: looks.filter(l => l.name).length,
          looksWithDescriptionChange: looks.filter(l => l.description).length,
          looksWithFixtureValueChange: looks.filter(l => l.fixtureValues).length,
        },
        message: `Successfully updated ${updatedLooks.length} looks`,
      };
    } catch (error) {
      throw new Error(`Failed to bulk update looks: ${error}`);
    }
  }

  /**
   * Update multiple looks with partial fixture value merging support.
   * Each look can independently specify name, description, fixtureValues, and mergeFixtures.
   * This is useful for batch operations like changing a channel value across many looks.
   */
  async bulkUpdateLooksPartial(args: z.infer<typeof BulkUpdateLooksPartialSchema>) {
    const { looks } = BulkUpdateLooksPartialSchema.parse(args);

    try {
      if (looks.length === 0) {
        throw new Error('No looks provided for bulk partial update');
      }

      // Use the GraphQL client's bulk partial update method
      const updatedLooks = await this.graphqlClient.bulkUpdateLooksPartial({
        looks,
      });

      return {
        success: true,
        updatedLooks: updatedLooks.map(look => ({
          lookId: look.id,
          name: look.name,
          description: look.description,
          fixtureCount: look.fixtureValues?.length || 0,
          fixtureValues: look.fixtureValues?.map(fv => ({
            fixture: { id: fv.fixture.id, name: fv.fixture.name },
            channels: fv.channels,
            lookOrder: fv.lookOrder
          }))
        })),
        summary: {
          totalUpdated: updatedLooks.length,
          looksWithNameChange: looks.filter(l => l.name).length,
          looksWithDescriptionChange: looks.filter(l => l.description).length,
          looksWithFixtureValueChange: looks.filter(l => l.fixtureValues).length,
          looksWithMergeEnabled: looks.filter(l => l.mergeFixtures !== false).length,
        },
        message: `Successfully updated ${updatedLooks.length} looks with partial merge`,
      };
    } catch (error) {
      throw new Error(`Failed to bulk update looks partially: ${error}`);
    }
  }

  /**
   * Delete multiple looks in a single operation
   */
  async bulkDeleteLooks(args: z.infer<typeof BulkDeleteLooksSchema>) {
    const { lookIds, confirmDelete } = BulkDeleteLooksSchema.parse(args);

    try {
      if (!confirmDelete) {
        throw new Error('confirmDelete must be true to delete looks');
      }

      if (lookIds.length === 0) {
        throw new Error('No look IDs provided for bulk deletion');
      }

      // Use the GraphQL client's bulk delete method
      const result = await this.graphqlClient.bulkDeleteLooks(lookIds);

      // Note: 'success' is true if at least one deletion succeeded, even if some deletions failed.
      // Partial successes are possible; see 'deletedCount' and 'failedIds' for details.
      return {
        success: result.successCount > 0,
        deletedCount: result.successCount,
        failedIds: result.failedIds,
        summary: {
          totalRequested: lookIds.length,
          successCount: result.successCount,
          failureCount: result.failedIds.length,
        },
        message: result.failedIds.length === 0
          ? `Successfully deleted ${result.successCount} looks`
          : `Deleted ${result.successCount} looks, ${result.failedIds.length} failed`,
      };
    } catch (error) {
      throw new Error(`Failed to bulk delete looks: ${error}`);
    }
  }
}
