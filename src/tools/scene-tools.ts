import { z } from 'zod';
import { LacyLightsGraphQLClient } from '../services/graphql-client-simple';
import { RAGService } from '../services/rag-service-simple';
import { AILightingService } from '../services/ai-lighting';
import { LightingDesignRequest, SceneSortField } from '../types/lighting';

// Sparse channel value schema
const channelValueSchema = z.object({
  offset: z.number().int().min(0),
  value: z.number().int().min(0).max(255),
});

// Type definitions for better type safety
interface SceneActivationResult {
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
  sceneOrder?: number;
}

interface SceneInfo {
  name: string;
  description: string | null;
  fixtureValues: FixtureValueInfo[];
}

interface GenerateSceneResult {
  sceneId?: string;
  scene?: SceneInfo;
  designReasoning?: string;
  fixturesUsed?: number;
  channelsSet?: number;
  activation?: SceneActivationResult;
  analysis?: any;
  lightingCues?: any[];
  totalCues?: number;
  sceneTemplates?: any[];
  characters?: any[];
  overallMood?: string;
  themes?: any[];
}

// Extended Scene interface to include optional project
interface SceneWithProject {
  id: string;
  name: string;
  description: string | null;
  fixtureValues: any[];
  project?: {
    id: string;
    name: string;
  };
}

const GenerateSceneSchema = z.object({
  projectId: z.string(),
  sceneDescription: z.string(),
  scriptContext: z.string().optional(),
  sceneType: z.enum(['full', 'additive']).default('full'),
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
  suggestScenes: z.boolean().default(true)
});

const OptimizeSceneSchema = z.object({
  sceneId: z.string(),
  projectId: z.string(),
  optimizationGoals: z.array(z.enum(['energy_efficiency', 'color_accuracy', 'dramatic_impact', 'technical_simplicity'])).default(['dramatic_impact'])
});

const UpdateSceneSchema = z.object({
  sceneId: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  fixtureValues: z.array(z.object({
    fixtureId: z.string(),
    channels: z.array(channelValueSchema)
  })).optional()
});

const ActivateSceneSchema = z.object({
  projectId: z.string().optional(),
  sceneId: z.string().optional(),
  sceneName: z.string().optional()
});

const FadeToBlackSchema = z.object({
  fadeOutTime: z.number().default(3.0)
});

// 🛡️ SAFE SCENE UPDATE SCHEMAS
const AddFixturesToSceneSchema = z.object({
  sceneId: z.string(),
  fixtureValues: z.array(z.object({
    fixtureId: z.string(),
    channels: z.array(channelValueSchema),
    sceneOrder: z.number().optional()
  })),
  overwriteExisting: z.boolean().default(false)
});

const RemoveFixturesFromSceneSchema = z.object({
  sceneId: z.string(),
  fixtureIds: z.array(z.string())
});

const GetSceneFixtureValuesSchema = z.object({
  sceneId: z.string(),
  includeFixtureDetails: z.boolean().default(true)
});

const EnsureFixturesInSceneSchema = z.object({
  sceneId: z.string(),
  fixtureValues: z.array(z.object({
    fixtureId: z.string(),
    channels: z.array(channelValueSchema),
    sceneOrder: z.number().optional()
  }))
});

const UpdateScenePartialSchema = z.object({
  sceneId: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  fixtureValues: z.array(z.object({
    fixtureId: z.string(),
    channels: z.array(channelValueSchema),
    sceneOrder: z.number().optional()
  })).optional(),
  mergeFixtures: z.boolean().default(true)
});

// MCP API Refactor - Task 2.4: Scene Query Schemas
const ListScenesSchema = z.object({
  projectId: z.string(),
  page: z.number().min(1).optional(),
  perPage: z.number().min(1).max(100).optional(),
  nameContains: z.string().optional(),
  usesFixture: z.string().optional(),
  sortBy: z.nativeEnum(SceneSortField).optional()
});

const GetSceneSchema = z.object({
  sceneId: z.string(),
  includeFixtureValues: z.boolean().default(true)
});

const GetSceneFixturesSchema = z.object({
  sceneId: z.string()
});

// Bulk Scene Operation Schemas
const BulkCreateScenesSchema = z.object({
  scenes: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    projectId: z.string(),
    fixtureValues: z.array(z.object({
      fixtureId: z.string(),
      channels: z.array(channelValueSchema),
    })),
  })),
});

const BulkUpdateScenesSchema = z.object({
  scenes: z.array(z.object({
    sceneId: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    fixtureValues: z.array(z.object({
      fixtureId: z.string(),
      channels: z.array(channelValueSchema),
    })).optional(),
  })),
});

const BulkDeleteScenesSchema = z.object({
  sceneIds: z.array(z.string()),
  confirmDelete: z.boolean(),
});

const BulkUpdateScenesPartialSchema = z.object({
  scenes: z.array(z.object({
    sceneId: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    fixtureValues: z.array(z.object({
      fixtureId: z.string(),
      channels: z.array(channelValueSchema),
      sceneOrder: z.number().optional()
    })).optional(),
    mergeFixtures: z.boolean().default(true)
  })),
});

export class SceneTools {
  constructor(
    private graphqlClient: LacyLightsGraphQLClient,
    private ragService: RAGService,
    private aiLightingService: AILightingService
  ) {}

  async generateScene(args: z.infer<typeof GenerateSceneSchema>) {
    const { 
      projectId, 
      sceneDescription, 
      scriptContext, 
      sceneType,
      designPreferences, 
      fixtureFilter,
      activate 
    } = GenerateSceneSchema.parse(args);

    try {
      // Get project and available fixtures
      const project = await this.graphqlClient.getProject(projectId);
      if (!project) {
        throw new Error(`Project with ID ${projectId} not found`);
      }

      // Get all fixtures for context, then filter based on scene type and criteria
      let availableFixtures = project.fixtures;
      const allFixtures = project.fixtures; // Keep reference to all fixtures
      
      // For additive scenes, we need fixtureFilter to specify which fixtures to modify
      if (sceneType === 'additive' && !fixtureFilter) {
        throw new Error('Additive scenes require fixtureFilter to specify which fixtures to modify');
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
        scriptContext: scriptContext || sceneDescription,
        sceneDescription,
        availableFixtures,
        sceneType,
        allFixtures: sceneType === 'additive' ? allFixtures : undefined,
        designPreferences
      };

      // Generate scene using AI
      const generatedScene = await this.aiLightingService.generateScene(lightingRequest);

      // Optimize the scene for available fixtures
      const optimizedScene = await this.aiLightingService.optimizeSceneForFixtures(
        generatedScene,
        availableFixtures
      );

      // Create the scene in the database
      const createdScene = await this.graphqlClient.createScene({
        name: optimizedScene.name,
        description: optimizedScene.description,
        projectId,
        fixtureValues: optimizedScene.fixtureValues
      });

      const result: GenerateSceneResult = {
        sceneId: createdScene.id,
        scene: {
          name: createdScene.name,
          description: createdScene.description || null,
          fixtureValues: createdScene.fixtureValues.map(fv => ({
            fixture: {
              id: fv.fixture.id,
              name: fv.fixture.name,
              type: fv.fixture.type || 'UNKNOWN'
            },
            channels: fv.channels,
            sceneOrder: fv.sceneOrder
          }))
        },
        designReasoning: optimizedScene.reasoning,
        fixturesUsed: availableFixtures.length,
        channelsSet: optimizedScene.fixtureValues.reduce((total, fv) => total + (fv.channels?.length || 0), 0)
      };

      // Activate the scene if requested
      if (activate) {
        try {
          const success = await this.graphqlClient.setSceneLive(createdScene.id);
          result.activation = {
            success,
            message: success 
              ? `Scene "${createdScene.name}" is now active` 
              : 'Scene created but activation failed'
          };
        } catch (activationError) {
          // Include activation error but don't fail the entire operation
          result.activation = {
            success: false,
            error: `Scene created but activation failed: ${activationError}`
          };
        }
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to generate scene: ${error}`);
    }
  }

  async analyzeScript(args: z.infer<typeof AnalyzeScriptSchema>) {
    const { scriptText, extractLightingCues, suggestScenes } = AnalyzeScriptSchema.parse(args);

    try {
      // Analyze script using RAG service
      const scriptAnalysis = await this.ragService.analyzeScript(scriptText);

      const result: GenerateSceneResult = {
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

      if (suggestScenes) {
        // Generate scene suggestions based on script analysis
        const sceneTemplates = await Promise.all(
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

        result.sceneTemplates = sceneTemplates;
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to analyze script: ${error}`);
    }
  }

  async optimizeScene(args: z.infer<typeof OptimizeSceneSchema>) {
    const { sceneId, projectId, optimizationGoals } = OptimizeSceneSchema.parse(args);

    try {
      // Get the current scene
      const project = await this.graphqlClient.getProject(projectId);
      if (!project) {
        throw new Error(`Project with ID ${projectId} not found`);
      }

      const scene = project.scenes.find(s => s.id === sceneId);
      if (!scene) {
        throw new Error(`Scene with ID ${sceneId} not found`);
      }

      // Scene optimization is planned for future implementation
      // Currently returns analysis and recommendations without modifying the scene
      return {
        sceneId,
        sceneName: scene.name,
        originalFixtureCount: scene.fixtureValues.length,
        requestedGoals: optimizationGoals,
        status: 'not_implemented',
        message: 'Scene optimization is planned for future releases. Current implementation provides recommendations only.',
        recommendations: this.getOptimizationRecommendations(optimizationGoals),
      };
    } catch (error) {
      throw new Error(`Failed to optimize scene: ${error}`);
    }
  }

  async updateScene(args: z.infer<typeof UpdateSceneSchema>) {
    const { sceneId, name, description, fixtureValues } = UpdateSceneSchema.parse(args);

    try {
      // Build the update input object with only provided fields
      const updateInput: any = {};
      if (name !== undefined) updateInput.name = name;
      if (description !== undefined) updateInput.description = description;
      if (fixtureValues !== undefined) updateInput.fixtureValues = fixtureValues;

      // Update the scene
      const updatedScene = await this.graphqlClient.updateScene(sceneId, updateInput);

      return {
        sceneId: updatedScene.id,
        scene: {
          name: updatedScene.name,
          description: updatedScene.description,
          updatedAt: updatedScene.updatedAt,
          fixtureValues: updatedScene.fixtureValues.map(fv => ({
            fixture: {
              id: fv.fixture.id,
              name: fv.fixture.name
            },
            channels: fv.channels,
            sceneOrder: fv.sceneOrder
          }))
        },
        fixturesUpdated: fixtureValues ? fixtureValues.length : 0,
        channelsUpdated: fixtureValues ? fixtureValues.reduce((total, fv) => total + (fv.channels?.length || 0), 0) : 0
      };
    } catch (error) {
      throw new Error(`Failed to update scene: ${error}`);
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
   * Provides general recommendations for scene optimization goals
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

  async activateScene(args: z.infer<typeof ActivateSceneSchema>) {
    const { projectId, sceneId, sceneName } = ActivateSceneSchema.parse(args);

    try {
      let resolvedSceneId = sceneId;

      // If scene name is provided, find the scene by name
      if (sceneName) {
        if (!projectId) {
          // Get all projects to search for the scene
          const projects = await this.graphqlClient.getProjects();
          
          // Search for a scene with this name across all projects
          for (const project of projects) {
            const scene = project.scenes.find(s => 
              s.name.toLowerCase() === sceneName.toLowerCase() ||
              s.name.toLowerCase().includes(sceneName.toLowerCase())
            );
            
            if (scene) {
              resolvedSceneId = scene.id;
              break;
            }
          }
          
          if (!resolvedSceneId) {
            throw new Error(`Scene with name "${sceneName}" not found in any project`);
          }
        } else {
          // Search in specific project
          const project = await this.graphqlClient.getProject(projectId);
          if (!project) {
            throw new Error(`Project with ID ${projectId} not found`);
          }
          
          const scene = project.scenes.find(s => 
            s.name.toLowerCase() === sceneName.toLowerCase() ||
            s.name.toLowerCase().includes(sceneName.toLowerCase())
          );
          
          if (!scene) {
            throw new Error(`Scene with name "${sceneName}" not found in project ${project.name}`);
          }
          
          resolvedSceneId = scene.id;
        }
      } else if (!sceneId) {
        throw new Error('Either sceneId or sceneName must be provided');
      }

      // Ensure resolvedSceneId is defined before using it
      if (!resolvedSceneId) {
        throw new Error('Resolved scene ID is undefined');
      }

      // Activate the scene
      const success = await this.graphqlClient.setSceneLive(resolvedSceneId);
      
      if (!success) {
        throw new Error('Failed to activate scene');
      }

      // Get scene details for response
      const scene = await this.graphqlClient.getScene(resolvedSceneId);
      
      if (!scene) {
        throw new Error('Scene could not be retrieved after activation');
      }
      
      return {
        success: true,
        scene: {
          id: scene.id,
          name: scene.name,
          description: scene.description
        },
        message: `Scene "${scene.name}" is now active`,
        fixturesActive: scene.fixtureValues.length,
        hint: 'Use fade_to_black to turn off all lights'
      };
    } catch (error) {
      throw new Error(`Failed to activate scene: ${error}`);
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

  async getCurrentActiveScene() {
    try {
      const activeScene = await this.graphqlClient.getCurrentActiveScene();
      
      if (!activeScene) {
        return {
          hasActiveScene: false,
          message: 'No scene is currently active'
        };
      }

      const sceneWithProject = activeScene as SceneWithProject;
      
      return {
        hasActiveScene: true,
        scene: {
          id: sceneWithProject.id,
          name: sceneWithProject.name,
          description: sceneWithProject.description,
          project: sceneWithProject.project ? {
            id: sceneWithProject.project.id,
            name: sceneWithProject.project.name
          } : null
        },
        fixturesActive: sceneWithProject.fixtureValues.length,
        message: `Scene "${sceneWithProject.name}" is currently active`
      };
    } catch (error) {
      throw new Error(`Failed to get current active scene: ${error}`);
    }
  }

  // 🛡️ SAFE SCENE UPDATE METHODS

  async addFixturesToScene(args: z.infer<typeof AddFixturesToSceneSchema>) {
    const { sceneId, fixtureValues, overwriteExisting } = AddFixturesToSceneSchema.parse(args);

    try {
      const updatedScene = await this.graphqlClient.addFixturesToScene(
        sceneId,
        fixtureValues,
        overwriteExisting
      );

      return {
        sceneId: updatedScene.id,
        scene: {
          name: updatedScene.name,
          description: updatedScene.description,
          updatedAt: updatedScene.updatedAt,
          totalFixtures: updatedScene.fixtureValues.length,
          fixtureValues: updatedScene.fixtureValues.map(fv => ({
            fixture: {
              id: fv.fixture.id,
              name: fv.fixture.name
            },
            channels: fv.channels,
            sceneOrder: fv.sceneOrder
          }))
        },
        fixturesAdded: fixtureValues.length,
        overwriteMode: overwriteExisting,
        message: `Successfully added ${fixtureValues.length} fixtures to scene "${updatedScene.name}"${overwriteExisting ? ' (overwriting existing)' : ' (preserving existing)'}`
      };
    } catch (error) {
      throw new Error(`Failed to add fixtures to scene: ${error}`);
    }
  }

  async removeFixturesFromScene(args: z.infer<typeof RemoveFixturesFromSceneSchema>) {
    const { sceneId, fixtureIds } = RemoveFixturesFromSceneSchema.parse(args);

    try {
      const updatedScene = await this.graphqlClient.removeFixturesFromScene(sceneId, fixtureIds);

      return {
        sceneId: updatedScene.id,
        scene: {
          name: updatedScene.name,
          description: updatedScene.description,
          updatedAt: updatedScene.updatedAt,
          totalFixtures: updatedScene.fixtureValues.length,
          fixtureValues: updatedScene.fixtureValues.map(fv => ({
            fixture: {
              id: fv.fixture.id,
              name: fv.fixture.name
            },
            channels: fv.channels,
            sceneOrder: fv.sceneOrder
          }))
        },
        fixturesRemoved: fixtureIds.length,
        message: `Successfully removed ${fixtureIds.length} fixtures from scene "${updatedScene.name}"`
      };
    } catch (error) {
      throw new Error(`Failed to remove fixtures from scene: ${error}`);
    }
  }

  async getSceneFixtureValues(args: z.infer<typeof GetSceneFixtureValuesSchema>) {
    const { sceneId, includeFixtureDetails } = GetSceneFixtureValuesSchema.parse(args);

    try {
      const scene = await this.graphqlClient.getScene(sceneId);
      
      if (!scene) {
        throw new Error(`Scene with ID ${sceneId} not found`);
      }

      return {
        sceneId: scene.id,
        scene: {
          name: scene.name,
          description: scene.description,
          totalFixtures: scene.fixtureValues.length
        },
        fixtureValues: scene.fixtureValues.map(fv => ({
          fixtureId: fv.fixture.id,
          fixtureName: includeFixtureDetails ? fv.fixture.name : undefined,
          channels: fv.channels,
          sceneOrder: fv.sceneOrder,
          channelCount: fv.channels.length
        })),
        message: `Retrieved fixture values for ${scene.fixtureValues.length} fixtures in scene "${scene.name}"`
      };
    } catch (error) {
      throw new Error(`Failed to get scene fixture values: ${error}`);
    }
  }

  async ensureFixturesInScene(args: z.infer<typeof EnsureFixturesInSceneSchema>) {
    const { sceneId, fixtureValues } = EnsureFixturesInSceneSchema.parse(args);

    try {
      // Use addFixturesToScene with overwriteExisting: false for safe behavior
      const updatedScene = await this.graphqlClient.addFixturesToScene(
        sceneId,
        fixtureValues,
        false // Don't overwrite existing
      );

      return {
        sceneId: updatedScene.id,
        scene: {
          name: updatedScene.name,
          description: updatedScene.description,
          totalFixtures: updatedScene.fixtureValues.length
        },
        fixturesAdded: fixtureValues.length,
        message: `Added ${fixtureValues.length} fixtures to scene "${updatedScene.name}" (only if missing)`
      };
    } catch (error) {
      throw new Error(`Failed to ensure fixtures in scene: ${error}`);
    }
  }

  async updateScenePartial(args: z.infer<typeof UpdateScenePartialSchema>) {
    const { sceneId, name, description, fixtureValues, mergeFixtures } = UpdateScenePartialSchema.parse(args);

    try {
      const updatedScene = await this.graphqlClient.updateScenePartial(sceneId, {
        name,
        description,
        fixtureValues,
        mergeFixtures
      });

      return {
        sceneId: updatedScene.id,
        scene: {
          name: updatedScene.name,
          description: updatedScene.description,
          updatedAt: updatedScene.updatedAt,
          totalFixtures: updatedScene.fixtureValues.length,
          fixtureValues: updatedScene.fixtureValues.map(fv => ({
            fixture: {
              id: fv.fixture.id,
              name: fv.fixture.name
            },
            channels: fv.channels,
            sceneOrder: fv.sceneOrder
          }))
        },
        updateType: mergeFixtures ? 'merged' : 'replaced',
        fixturesUpdated: fixtureValues ? fixtureValues.length : 0,
        message: `Successfully updated scene "${updatedScene.name}"${mergeFixtures ? ' (safe merge)' : ' (full replace)'}`
      };
    } catch (error) {
      throw new Error(`Failed to update scene partially: ${error}`);
    }
  }

  // MCP API Refactor - Task 2.4: Scene Query Tools

  /**
   * List scenes in a project with pagination and filtering
   * Returns lightweight scene summaries without fixture values
   */
  async listScenes(args: z.infer<typeof ListScenesSchema>) {
    const { projectId, page, perPage, nameContains, usesFixture, sortBy } = ListScenesSchema.parse(args);

    try {
      const result = await this.graphqlClient.listScenes({
        projectId,
        page,
        perPage,
        nameContains,
        usesFixture,
        sortBy
      });

      return {
        scenes: result.items,
        pagination: result.pagination,
        message: `Found ${result.pagination.total} scenes in project (page ${result.pagination.page} of ${result.pagination.totalPages})`
      };
    } catch (error) {
      throw new Error(`Failed to list scenes: ${error}`);
    }
  }

  /**
   * Get full scene details with optional fixture values
   * Set includeFixtureValues=false for faster queries when values not needed
   */
  async getSceneDetails(args: z.infer<typeof GetSceneSchema>) {
    const { sceneId, includeFixtureValues } = GetSceneSchema.parse(args);

    try {
      const scene = await this.graphqlClient.getSceneWithOptions(sceneId, includeFixtureValues);

      if (!scene) {
        throw new Error(`Scene with ID ${sceneId} not found`);
      }

      return {
        scene: {
          id: scene.id,
          name: scene.name,
          description: scene.description,
          createdAt: scene.createdAt,
          updatedAt: scene.updatedAt,
          fixtureValues: includeFixtureValues ? scene.fixtureValues.map(fv => ({
            fixture: {
              id: fv.fixture.id,
              name: fv.fixture.name
            },
            channels: fv.channels,
            sceneOrder: fv.sceneOrder
          })) : undefined
        },
        includeFixtureValues,
        fixtureCount: includeFixtureValues ? scene.fixtureValues.length : undefined,
        message: includeFixtureValues
          ? `Retrieved scene "${scene.name}" with ${scene.fixtureValues.length} fixtures`
          : `Retrieved scene "${scene.name}" metadata (fixture values excluded for performance)`
      };
    } catch (error) {
      throw new Error(`Failed to get scene details: ${error}`);
    }
  }

  /**
   * Get just the fixtures used in a scene without their values
   * Fastest way to understand scene composition
   */
  async getSceneFixtures(args: z.infer<typeof GetSceneFixturesSchema>) {
    const { sceneId } = GetSceneFixturesSchema.parse(args);

    try {
      const fixtures = await this.graphqlClient.getSceneFixtures(sceneId);

      return {
        sceneId,
        fixtures: fixtures.map(f => ({
          fixtureId: f.fixtureId,
          fixtureName: f.fixtureName,
          fixtureType: f.fixtureType
        })),
        fixtureCount: fixtures.length,
        message: `Scene uses ${fixtures.length} fixtures`
      };
    } catch (error) {
      throw new Error(`Failed to get scene fixtures: ${error}`);
    }
  }

  // Bulk Scene Operations

  /**
   * Create multiple scenes in a single operation
   */
  async bulkCreateScenes(args: z.infer<typeof BulkCreateScenesSchema>) {
    const { scenes } = BulkCreateScenesSchema.parse(args);

    try {
      if (scenes.length === 0) {
        throw new Error('No scenes provided for bulk creation');
      }

      // Use the GraphQL client's bulk create method
      const createdScenes = await this.graphqlClient.bulkCreateScenes({
        scenes,
      });

      return {
        success: true,
        createdScenes: createdScenes.map(scene => ({
          sceneId: scene.id,
          name: scene.name,
          description: scene.description,
          fixtureCount: scene.fixtureValues?.length || 0,
        })),
        summary: {
          totalCreated: createdScenes.length,
          projectIds: [...new Set(scenes.map(s => s.projectId))],
          totalFixtureValues: createdScenes.reduce(
            (sum, s) => sum + (s.fixtureValues?.length || 0),
            0
          ),
        },
        message: `Successfully created ${createdScenes.length} scenes`,
      };
    } catch (error) {
      throw new Error(`Failed to bulk create scenes: ${error}`);
    }
  }

  /**
   * Update multiple scenes in a single operation
   */
  async bulkUpdateScenes(args: z.infer<typeof BulkUpdateScenesSchema>) {
    const { scenes } = BulkUpdateScenesSchema.parse(args);

    try {
      if (scenes.length === 0) {
        throw new Error('No scenes provided for bulk update');
      }

      // Use the GraphQL client's bulk update method
      const updatedScenes = await this.graphqlClient.bulkUpdateScenes({
        scenes,
      });

      return {
        success: true,
        updatedScenes: updatedScenes.map(scene => ({
          sceneId: scene.id,
          name: scene.name,
          description: scene.description,
          fixtureCount: scene.fixtureValues?.length || 0,
        })),
        summary: {
          totalUpdated: updatedScenes.length,
          scenesWithNameChange: scenes.filter(s => s.name).length,
          scenesWithDescriptionChange: scenes.filter(s => s.description).length,
          scenesWithFixtureValueChange: scenes.filter(s => s.fixtureValues).length,
        },
        message: `Successfully updated ${updatedScenes.length} scenes`,
      };
    } catch (error) {
      throw new Error(`Failed to bulk update scenes: ${error}`);
    }
  }

  /**
   * Update multiple scenes with partial fixture value merging support.
   * Each scene can independently specify name, description, fixtureValues, and mergeFixtures.
   * This is useful for batch operations like changing a channel value across many scenes.
   */
  async bulkUpdateScenesPartial(args: z.infer<typeof BulkUpdateScenesPartialSchema>) {
    const { scenes } = BulkUpdateScenesPartialSchema.parse(args);

    try {
      if (scenes.length === 0) {
        throw new Error('No scenes provided for bulk partial update');
      }

      // Use the GraphQL client's bulk partial update method
      const updatedScenes = await this.graphqlClient.bulkUpdateScenesPartial({
        scenes,
      });

      return {
        success: true,
        updatedScenes: updatedScenes.map(scene => ({
          sceneId: scene.id,
          name: scene.name,
          description: scene.description,
          fixtureCount: scene.fixtureValues?.length || 0,
          fixtureValues: scene.fixtureValues?.map(fv => ({
            fixture: { id: fv.fixture.id, name: fv.fixture.name },
            channels: fv.channels,
            sceneOrder: fv.sceneOrder
          }))
        })),
        summary: {
          totalUpdated: updatedScenes.length,
          scenesWithNameChange: scenes.filter(s => s.name).length,
          scenesWithDescriptionChange: scenes.filter(s => s.description).length,
          scenesWithFixtureValueChange: scenes.filter(s => s.fixtureValues).length,
          scenesWithMergeEnabled: scenes.filter(s => s.mergeFixtures !== false).length,
        },
        message: `Successfully updated ${updatedScenes.length} scenes with partial merge`,
      };
    } catch (error) {
      throw new Error(`Failed to bulk update scenes partially: ${error}`);
    }
  }

  /**
   * Delete multiple scenes in a single operation
   */
  async bulkDeleteScenes(args: z.infer<typeof BulkDeleteScenesSchema>) {
    const { sceneIds, confirmDelete } = BulkDeleteScenesSchema.parse(args);

    try {
      if (!confirmDelete) {
        throw new Error('confirmDelete must be true to delete scenes');
      }

      if (sceneIds.length === 0) {
        throw new Error('No scene IDs provided for bulk deletion');
      }

      // Use the GraphQL client's bulk delete method
      const result = await this.graphqlClient.bulkDeleteScenes(sceneIds);

      // Note: 'success' is true if at least one deletion succeeded, even if some deletions failed.
      // Partial successes are possible; see 'deletedCount' and 'failedIds' for details.
      return {
        success: result.successCount > 0,
        deletedCount: result.successCount,
        failedIds: result.failedIds,
        summary: {
          totalRequested: sceneIds.length,
          successCount: result.successCount,
          failureCount: result.failedIds.length,
        },
        message: result.failedIds.length === 0
          ? `Successfully deleted ${result.successCount} scenes`
          : `Deleted ${result.successCount} scenes, ${result.failedIds.length} failed`,
      };
    } catch (error) {
      throw new Error(`Failed to bulk delete scenes: ${error}`);
    }
  }
}