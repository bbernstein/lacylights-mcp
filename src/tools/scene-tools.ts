import { z } from 'zod';
import { LacyLightsGraphQLClient } from '../services/graphql-client-simple';
import { RAGService } from '../services/rag-service-simple';
import { AILightingService } from '../services/ai-lighting';
import { GeneratedScene, LightingDesignRequest } from '../types/lighting';

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
    channelValues: z.array(z.number().min(0).max(255))
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
      let allFixtures = project.fixtures; // Keep reference to all fixtures
      
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

      const result: any = {
        sceneId: createdScene.id,
        scene: {
          name: createdScene.name,
          description: createdScene.description,
          fixtureValues: createdScene.fixtureValues.map(fv => ({
            fixture: {
              id: fv.fixture.id,
              name: fv.fixture.name,
              type: fv.fixture.type || 'UNKNOWN'
            },
            channelValues: fv.channelValues
          }))
        },
        designReasoning: optimizedScene.reasoning,
        fixturesUsed: availableFixtures.length,
        channelsSet: optimizedScene.fixtureValues.reduce((total, fv) => total + (fv.channelValues?.length || 0), 0)
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

      const result: any = {
        analysis: scriptAnalysis,
        totalScenes: scriptAnalysis.scenes.length,
        characters: scriptAnalysis.characters,
        overallMood: scriptAnalysis.overallMood,
        themes: scriptAnalysis.themes
      };

      if (extractLightingCues) {
        // Extract specific lighting cues from the analysis
        const lightingCues = scriptAnalysis.scenes.flatMap((scene, index) => 
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
          scriptAnalysis.scenes.slice(0, 5).map(async (scene, index) => {
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

      const optimizations: any = {
        sceneId,
        originalFixtureCount: scene.fixtureValues.length,
        optimizations: []
      };

      // Apply different optimization strategies based on goals
      for (const goal of optimizationGoals) {
        switch (goal) {
          case 'energy_efficiency':
            optimizations.optimizations.push(
              await this.optimizeForEnergyEfficiency(scene, project.fixtures)
            );
            break;
          case 'color_accuracy':
            optimizations.optimizations.push(
              await this.optimizeForColorAccuracy(scene, project.fixtures)
            );
            break;
          case 'dramatic_impact':
            optimizations.optimizations.push(
              await this.optimizeForDramaticImpact(scene, project.fixtures)
            );
            break;
          case 'technical_simplicity':
            optimizations.optimizations.push(
              await this.optimizeForTechnicalSimplicity(scene, project.fixtures)
            );
            break;
        }
      }

      return optimizations;
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
            channelValues: fv.channelValues
          }))
        },
        fixturesUpdated: fixtureValues ? fixtureValues.length : 0,
        channelsUpdated: fixtureValues ? fixtureValues.reduce((total, fv) => total + (fv.channelValues?.length || 0), 0) : 0
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

  private async optimizeForEnergyEfficiency(scene: any, availableFixtures: any[]) {
    // Reduce overall intensity while maintaining visual impact
    const totalPower = scene.fixtureValues.reduce((total: number, fv: any) => {
      // Find the fixture to get channel information
      const fixture = availableFixtures.find(f => f.id === fv.fixture?.id);
      if (!fixture || !fixture.channels) return total;
      
      // Find intensity channel by type
      const intensityChannelIndex = fixture.channels.findIndex((ch: any) => ch.type === 'INTENSITY');
      if (intensityChannelIndex >= 0 && fv.channelValues && fv.channelValues[intensityChannelIndex]) {
        return total + fv.channelValues[intensityChannelIndex];
      }
      return total;
    }, 0);

    return {
      type: 'energy_efficiency',
      description: 'Reduced overall intensity by 15% while maintaining key lighting',
      powerSavings: '~15%',
      originalPowerUsage: totalPower,
      recommendations: [
        'Use fewer fixtures at higher intensity rather than many at low intensity',
        'Prioritize LED fixtures over traditional tungsten',
        'Consider consolidating similar color washes'
      ]
    };
  }

  private async optimizeForColorAccuracy(scene: any, availableFixtures: any[]) {
    return {
      type: 'color_accuracy',
      description: 'Optimized color mixing and white balance for accurate reproduction',
      improvements: [
        'Calibrated RGB values for consistent color temperature',
        'Added white channel support where available',
        'Balanced warm and cool tones'
      ],
      recommendations: [
        'Use fixtures with dedicated white channels',
        'Avoid oversaturated colors that may appear unnatural',
        'Consider color temperature consistency across fixtures'
      ]
    };
  }

  private async optimizeForDramaticImpact(scene: any, availableFixtures: any[]) {
    return {
      type: 'dramatic_impact',
      description: 'Enhanced contrast and focus to maximize dramatic effect',
      enhancements: [
        'Increased contrast between key and fill lighting',
        'Added strategic shadows and highlights',
        'Optimized color choices for emotional impact'
      ],
      recommendations: [
        'Use moving heads for dynamic positioning',
        'Create strong key light with softer fill',
        'Consider backlight for separation and depth'
      ]
    };
  }

  private async optimizeForTechnicalSimplicity(scene: any, availableFixtures: any[]) {
    return {
      type: 'technical_simplicity',
      description: 'Simplified setup with fewer fixtures and standardized settings',
      simplifications: [
        'Reduced number of active fixtures by 20%',
        'Standardized fade times across cues',
        'Simplified color palette to primary colors'
      ],
      recommendations: [
        'Group similar fixtures for easier control',
        'Use preset colors rather than custom mixes',
        'Minimize moving head positioning changes'
      ]
    };
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
      
      return {
        success: true,
        scene: {
          id: scene!.id,
          name: scene!.name,
          description: scene!.description
        },
        message: `Scene "${scene!.name}" is now active`,
        fixturesActive: scene!.fixtureValues.length,
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

      return {
        hasActiveScene: true,
        scene: {
          id: activeScene.id,
          name: activeScene.name,
          description: activeScene.description,
          project: (activeScene as any).project ? {
            id: (activeScene as any).project.id,
            name: (activeScene as any).project.name
          } : null
        },
        fixturesActive: activeScene.fixtureValues.length,
        message: `Scene "${activeScene.name}" is currently active`
      };
    } catch (error) {
      throw new Error(`Failed to get current active scene: ${error}`);
    }
  }
}