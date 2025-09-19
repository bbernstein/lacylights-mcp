import { z } from 'zod';
import { LacyLightsGraphQLClient } from '../services/graphql-client-simple';
import { RAGService } from '../services/rag-service-simple';
import { AILightingService } from '../services/ai-lighting';
import { GeneratedScene } from '../types/lighting';

const CreateCueSequenceSchema = z.object({
  projectId: z.string(),
  scriptContext: z.string(),
  sceneIds: z.array(z.string()),
  sequenceName: z.string(),
  transitionPreferences: z.object({
    defaultFadeIn: z.number().default(3),
    defaultFadeOut: z.number().default(3),
    followCues: z.boolean().default(false),
    autoAdvance: z.boolean().default(false)
  }).optional()
});

const GenerateActCuesSchema = z.object({
  projectId: z.string(),
  actNumber: z.number(),
  scriptText: z.string(),
  existingScenes: z.array(z.string()).optional(),
  cueListName: z.string().optional()
});

const OptimizeCueTimingSchema = z.object({
  cueListId: z.string(),
  projectId: z.string(),
  optimizationStrategy: z.enum(['smooth_transitions', 'dramatic_timing', 'technical_precision', 'energy_conscious']).default('smooth_transitions')
});

const AnalyzeCueStructureSchema = z.object({
  cueListId: z.string(),
  projectId: z.string(),
  includeRecommendations: z.boolean().default(true)
});

// Playback control schemas
const StartCueListSchema = z.object({
  cueListId: z.string().optional(),
  cueListName: z.string().optional(),
  projectId: z.string().optional(),
  startFromCue: z.number().optional()
});

const NextCueSchema = z.object({
  fadeInTime: z.number().optional()
});

const PreviousCueSchema = z.object({
  fadeInTime: z.number().optional()
});

const GoToCueSchema = z.object({
  cueNumber: z.number().optional(),
  cueName: z.string().optional(),
  fadeInTime: z.number().optional()
});

const StopCueListSchema = z.object({});

const GetCueListStatusSchema = z.object({});

const BulkUpdateCuesSchema = z.object({
  cueIds: z.array(z.string()),
  fadeInTime: z.number().optional(),
  fadeOutTime: z.number().optional(),
  followTime: z.number().nullable().optional(),
  easingType: z.string().optional()
});

// Type for bulk update data
interface BulkUpdateData {
  fadeInTime?: number;
  fadeOutTime?: number;
  followTime?: number | null;
  easingType?: string;
}

// Type for cue response from GraphQL
interface CueResponse {
  id: string;
  name: string;
  cueNumber: number;
  scene: {
    name: string;
  };
  fadeInTime: number;
  fadeOutTime: number;
  followTime?: number | null;
  notes?: string;
}

// Removed CueListPlaybackState interface - now using backend's centralized state

export class CueTools {
  // Track active cue lists for MCP session
  // The actual playback state is managed by the backend
  private activeCueLists: Set<string> = new Set();

  // Cache for scene-to-cue-list mapping to avoid expensive nested loops
  private sceneToCueListCache: Map<string, { cueListId: string; cueId: string; expiresAt: number }> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(
    private graphqlClient: LacyLightsGraphQLClient,
    private ragService: RAGService,
    private aiLightingService: AILightingService
  ) {}

  async createCueSequence(args: z.infer<typeof CreateCueSequenceSchema>) {
    const { 
      projectId, 
      scriptContext, 
      sceneIds, 
      sequenceName, 
      transitionPreferences 
    } = CreateCueSequenceSchema.parse(args);

    try {
      // Get project and validate scenes
      const project = await this.graphqlClient.getProject(projectId);
      if (!project) {
        throw new Error(`Project with ID ${projectId} not found`);
      }

      // Map scenes in the exact order of sceneIds to maintain consistency
      const scenes = sceneIds.map(sceneId => {
        const scene = project.scenes.find(s => s.id === sceneId);
        if (!scene) {
          throw new Error(`Scene with ID ${sceneId} not found in the project`);
        }
        return scene;
      });

      // Convert scenes to GeneratedScene format for AI processing
      const generatedScenes: GeneratedScene[] = scenes.map(scene => ({
        name: scene.name,
        description: scene.description || '',
        fixtureValues: scene.fixtureValues.map(fv => ({
          fixtureId: fv.fixture.id,
          channelValues: fv.channelValues // Already a number array
        })),
        reasoning: `Existing scene: ${scene.name}`
      }));

      // Generate cue sequence using AI
      const cueSequence = await this.aiLightingService.generateCueSequence(
        scriptContext,
        generatedScenes,
        transitionPreferences
      );

      // Create the cue list in the database
      const cueList = await this.graphqlClient.createCueList({
        name: sequenceName,
        description: cueSequence.description,
        projectId
      });

      // Create individual cues
      const createdCues = [];
      for (let i = 0; i < cueSequence.cues.length; i++) {
        const cueData = cueSequence.cues[i];
        // The AI returns sceneId as a string that might be an index or scene reference
        // Try to parse it as an index first
        let sceneId: string;
        const sceneIdAsNumber = parseInt(cueData.sceneId);
        
        if (!isNaN(sceneIdAsNumber) && sceneIdAsNumber >= 0 && sceneIdAsNumber < sceneIds.length) {
          // It's a valid index, use it
          sceneId = sceneIds[sceneIdAsNumber];
        } else {
          // Try to find it in the sceneIds array
          const sceneIndex = sceneIds.findIndex(id => id === cueData.sceneId);
          sceneId = sceneIndex >= 0 ? sceneIds[sceneIndex] : sceneIds[Math.min(i, sceneIds.length - 1)]; // Fallback to corresponding index or last scene
        }

        const cue = await this.graphqlClient.createCue({
          name: cueData.name,
          cueNumber: cueData.cueNumber,
          cueListId: cueList.id,
          sceneId: sceneId,
          fadeInTime: cueData.fadeInTime,
          fadeOutTime: cueData.fadeOutTime,
          followTime: cueData.followTime,
          notes: cueData.notes
        });

        createdCues.push(cue);
      }

      return {
        cueListId: cueList.id,
        cueList: {
          name: cueList.name,
          description: cueList.description,
          totalCues: createdCues.length
        },
        cues: createdCues.map(cue => ({
          id: cue.id,
          name: cue.name,
          cueNumber: cue.cueNumber,
          fadeInTime: cue.fadeInTime,
          fadeOutTime: cue.fadeOutTime,
          followTime: cue.followTime,
          notes: cue.notes,
          sceneName: cue.scene.name
        })),
        sequenceReasoning: cueSequence.reasoning,
        statistics: {
          totalCues: createdCues.length,
          averageFadeTime: createdCues.reduce((sum, cue) => sum + cue.fadeInTime, 0) / createdCues.length,
          followCues: createdCues.filter(cue => cue.followTime !== null).length,
          estimatedDuration: this.estimateSequenceDuration(createdCues)
        }
      };
    } catch (error) {
      throw new Error(`Failed to create cue sequence: ${error}`);
    }
  }

  async generateActCues(args: z.infer<typeof GenerateActCuesSchema>) {
    const { 
      projectId: _projectId, 
      actNumber, 
      scriptText, 
      existingScenes: _existingScenes, 
      cueListName 
    } = GenerateActCuesSchema.parse(args);

    try {
      // Analyze the script for this act
      const scriptAnalysis = await this.ragService.analyzeScript(scriptText);
      
      // Filter scenes for this act (assuming scene numbers indicate acts)
      const actScenes = scriptAnalysis.scenes.filter(scene => {
        const sceneNum = parseFloat(scene.sceneNumber);
        return Math.floor(sceneNum) === actNumber;
      });

      if (actScenes.length === 0) {
        throw new Error(`No scenes found for Act ${actNumber} in the provided script`);
      }

      // Generate cue suggestions for each scene in the act
      const cueTemplates = await Promise.all(
        actScenes.map(async (scene, _index) => {
          const recommendations = await this.ragService.generateLightingRecommendations(
            scene.content,
            scene.mood,
            ['LED_PAR', 'MOVING_HEAD'] // Default fixture types
          );

          return {
            sceneNumber: scene.sceneNumber,
            cueName: `Cue ${scene.sceneNumber}`,
            description: scene.title || `Scene ${scene.sceneNumber}`,
            mood: scene.mood,
            timeOfDay: scene.timeOfDay,
            location: scene.location,
            lightingCues: scene.lightingCues,
            suggestedTiming: {
              fadeIn: this.calculateFadeTime(scene.mood, 'in'),
              fadeOut: this.calculateFadeTime(scene.mood, 'out'),
              autoFollow: scene.lightingCues.some(cue => 
                cue.toLowerCase().includes('auto') || cue.toLowerCase().includes('follow')
              )
            },
            colorSuggestions: recommendations.colorSuggestions,
            intensityLevel: recommendations.intensityLevels
          };
        })
      );

      return {
        actNumber,
        totalScenes: actScenes.length,
        suggestedCueListName: cueListName || `Act ${actNumber} Cues`,
        cueTemplates,
        actAnalysis: {
          overallMood: this.determineActMood(actScenes),
          keyMoments: this.identifyKeyMoments(actScenes),
          transitionTypes: this.analyzeTransitions(actScenes),
          estimatedDuration: this.estimateActDuration(cueTemplates)
        },
        recommendations: {
          preShowChecks: this.generatePreShowChecklist(cueTemplates),
          criticalCues: this.identifyCriticalCues(cueTemplates),
          backupPlans: this.suggestBackupPlans(cueTemplates)
        }
      };
    } catch (error) {
      throw new Error(`Failed to generate act cues: ${error}`);
    }
  }

  async optimizeCueTiming(args: z.infer<typeof OptimizeCueTimingSchema>) {
    const { cueListId, projectId, optimizationStrategy } = OptimizeCueTimingSchema.parse(args);

    try {
      const project = await this.graphqlClient.getProject(projectId);
      if (!project) {
        throw new Error(`Project with ID ${projectId} not found`);
      }

      const cueList = project.cueLists.find(cl => cl.id === cueListId);
      if (!cueList) {
        throw new Error(`Cue list with ID ${cueListId} not found`);
      }

      const optimizations = this.generateTimingOptimizations(cueList.cues, optimizationStrategy);

      return {
        cueListId,
        strategy: optimizationStrategy,
        originalTiming: {
          totalCues: cueList.cues.length,
          averageFadeIn: this.calculateAverageFadeTime(cueList.cues, 'fadeInTime'),
          averageFadeOut: this.calculateAverageFadeTime(cueList.cues, 'fadeOutTime'),
          followCues: cueList.cues.filter(cue => cue.followTime !== undefined).length
        },
        optimizedTiming: optimizations.newTiming,
        changes: optimizations.changes,
        reasoning: optimizations.reasoning,
        estimatedImprovement: optimizations.improvement
      };
    } catch (error) {
      throw new Error(`Failed to optimize cue timing: ${error}`);
    }
  }

  async analyzeCueStructure(args: z.infer<typeof AnalyzeCueStructureSchema>) {
    const { cueListId, projectId, includeRecommendations } = AnalyzeCueStructureSchema.parse(args);

    try {
      const project = await this.graphqlClient.getProject(projectId);
      if (!project) {
        throw new Error(`Project with ID ${projectId} not found`);
      }

      const cueList = project.cueLists.find(cl => cl.id === cueListId);
      if (!cueList) {
        throw new Error(`Cue list with ID ${cueListId} not found`);
      }

      const analysis = {
        cueListId,
        name: cueList.name,
        structure: {
          totalCues: cueList.cues.length,
          cueNumbering: this.analyzeCueNumbering(cueList.cues),
          fadeTimings: this.analyzeFadeTimings(cueList.cues),
          sceneUsage: this.analyzeSceneUsage(cueList.cues, project.scenes),
          followStructure: this.analyzeFollowStructure(cueList.cues)
        },
        patterns: {
          commonFadeTimes: this.findCommonFadeTimes(cueList.cues),
          timingPatterns: this.identifyTimingPatterns(cueList.cues),
          sceneTransitions: this.analyzeSceneTransitions(cueList.cues)
        },
        potentialIssues: this.identifyPotentialIssues(cueList.cues),
        statistics: {
          estimatedRuntime: this.estimateSequenceDuration(cueList.cues),
          manualCues: cueList.cues.filter(cue => !cue.followTime).length,
          autoCues: cueList.cues.filter(cue => cue.followTime).length,
          averageCueSpacing: this.calculateAverageCueSpacing(cueList.cues)
        }
      };

      if (includeRecommendations) {
        (analysis as any).recommendations = {
          numbering: this.recommendNumberingImprovements(cueList.cues),
          timing: this.recommendTimingImprovements(cueList.cues),
          structure: this.recommendStructureImprovements(cueList.cues),
          safety: this.recommendSafetyConsiderations(cueList.cues)
        };
      }

      return analysis;
    } catch (error) {
      throw new Error(`Failed to analyze cue structure: ${error}`);
    }
  }

  private estimateSequenceDuration(cues: any[]): number {
    // Estimate total runtime in seconds
    let totalTime = 0;
    
    for (const cue of cues) {
      totalTime += cue.fadeInTime;
      if (cue.followTime) {
        totalTime += cue.followTime;
      } else {
        totalTime += 5; // Assume 5 seconds for manual advance
      }
    }
    
    return totalTime;
  }

  private calculateFadeTime(mood: string, direction: 'in' | 'out'): number {
    const baseTimes = {
      'tense': { in: 1, out: 2 },
      'romantic': { in: 5, out: 8 },
      'dramatic': { in: 3, out: 5 },
      'cheerful': { in: 2, out: 3 },
      'mysterious': { in: 6, out: 4 },
      'default': { in: 3, out: 3 }
    };

    return baseTimes[mood as keyof typeof baseTimes]?.[direction] || baseTimes.default[direction];
  }

  private determineActMood(scenes: any[]): string {
    const moods = scenes.map(s => s.mood);
    // Return the most common mood, or 'mixed' if no clear pattern
    const moodCounts = moods.reduce((acc, mood) => {
      acc[mood] = (acc[mood] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const dominantMood = Object.entries(moodCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))[0];

    return dominantMood && (dominantMood[1] as number) > scenes.length / 2 ? dominantMood[0] : 'mixed';
  }

  private identifyKeyMoments(scenes: any[]): string[] {
    return scenes
      .filter(scene => 
        scene.lightingCues.length > 0 || 
        ['dramatic', 'climactic', 'tense'].includes(scene.mood)
      )
      .map(scene => `Scene ${scene.sceneNumber}: ${scene.title || scene.mood}`);
  }

  private analyzeTransitions(scenes: any[]): string[] {
    const transitions = [];
    for (let i = 0; i < scenes.length - 1; i++) {
      const current = scenes[i];
      const next = scenes[i + 1];
      
      if (current.mood !== next.mood) {
        transitions.push(`${current.mood} → ${next.mood}`);
      }
    }
    return transitions;
  }

  private estimateActDuration(cueTemplates: any[]): number {
    return cueTemplates.reduce((total, template) => {
      return total + template.suggestedTiming.fadeIn + 60; // Assume 1 minute per scene minimum
    }, 0);
  }

  private generatePreShowChecklist(_cueTemplates: any[]): string[] {
    return [
      'Test all moving head positions',
      'Verify color mixing on LED fixtures',
      'Check fade engine calibration',
      'Confirm backup lighting positions',
      'Test emergency blackout procedures'
    ];
  }

  private identifyCriticalCues(cueTemplates: any[]): string[] {
    return cueTemplates
      .filter(template => template.mood === 'dramatic' || template.lightingCues.length > 2)
      .map(template => `Cue ${template.sceneNumber}: ${template.description}`);
  }

  private suggestBackupPlans(_cueTemplates: any[]): string[] {
    return [
      'Manual override available for all automated cues',
      'Simplified lighting states for technical failures',
      'Alternative fixtures identified for primary positions',
      'Emergency work lights accessible'
    ];
  }

  private generateTimingOptimizations(cues: any[], strategy: string) {
    // Simplified optimization logic - in practice this would be more sophisticated
    const changes = [];
    let improvement = '';

    switch (strategy) {
      case 'smooth_transitions':
        changes.push('Standardized fade times for consistency');
        changes.push('Added buffer time between manual cues');
        improvement = 'Smoother visual transitions';
        break;
      case 'dramatic_timing':
        changes.push('Shortened fade times for dramatic moments');
        changes.push('Added follow cues for automatic sequences');
        improvement = 'Enhanced dramatic impact';
        break;
      case 'technical_precision':
        changes.push('Standardized cue numbering increments');
        changes.push('Consistent fade time patterns');
        improvement = 'Easier operation and fewer mistakes';
        break;
      case 'energy_conscious':
        changes.push('Longer fade times to reduce power spikes');
        changes.push('Staggered fixture activation');
        improvement = 'Reduced power consumption peaks';
        break;
    }

    return {
      newTiming: { /* optimized timing values */ },
      changes,
      reasoning: `Applied ${strategy} optimization strategy`,
      improvement
    };
  }

  private calculateAverageFadeTime(cues: any[], field: string): number {
    return cues.reduce((sum, cue) => sum + (cue[field] || 0), 0) / cues.length;
  }

  private analyzeCueNumbering(cues: any[]) {
    const numbers = cues.map(c => c.cueNumber).sort((a, b) => a - b);
    return {
      sequential: this.isSequential(numbers),
      gaps: this.findGaps(numbers),
      duplicates: this.findDuplicates(numbers),
      format: this.analyzeNumberFormat(numbers)
    };
  }

  private analyzeFadeTimings(cues: any[]) {
    return {
      fadeInRange: { min: Math.min(...cues.map(c => c.fadeInTime)), max: Math.max(...cues.map(c => c.fadeInTime)) },
      fadeOutRange: { min: Math.min(...cues.map(c => c.fadeOutTime)), max: Math.max(...cues.map(c => c.fadeOutTime)) },
      commonTimes: this.findCommonFadeTimes(cues)
    };
  }

  private analyzeSceneUsage(cues: any[], scenes: any[]) {
    const sceneUsage = scenes.map(scene => ({
      sceneId: scene.id,
      sceneName: scene.name,
      usageCount: cues.filter(cue => cue.scene.id === scene.id).length
    }));

    return {
      totalScenes: scenes.length,
      usedScenes: sceneUsage.filter(s => s.usageCount > 0).length,
      unusedScenes: sceneUsage.filter(s => s.usageCount === 0),
      mostUsedScene: sceneUsage.sort((a, b) => b.usageCount - a.usageCount)[0]
    };
  }

  private analyzeFollowStructure(cues: any[]) {
    return {
      totalFollowCues: cues.filter(c => c.followTime).length,
      manualCues: cues.filter(c => !c.followTime).length,
      averageFollowTime: this.calculateAverageFadeTime(cues.filter(c => c.followTime), 'followTime'),
      followChains: this.identifyFollowChains(cues)
    };
  }

  private findCommonFadeTimes(cues: any[]): number[] {
    const fadeTimes = [...cues.map(c => c.fadeInTime), ...cues.map(c => c.fadeOutTime)];
    const timeCounts = fadeTimes.reduce((acc, time) => {
      acc[time] = (acc[time] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return Object.entries(timeCounts)
      .filter(([, count]) => (count as number) > 2)
      .map(([time]) => parseFloat(time))
      .sort((a, b) => a - b);
  }

  private identifyTimingPatterns(_cues: any[]): string[] {
    // Simplified pattern identification
    return ['Standard 3-second fades', 'Quick blackouts at 1 second', 'Slow mood transitions at 5+ seconds'];
  }

  private analyzeSceneTransitions(cues: any[]): any[] {
    const transitions = [];
    for (let i = 0; i < cues.length - 1; i++) {
      transitions.push({
        from: cues[i].scene.name,
        to: cues[i + 1].scene.name,
        fadeTime: cues[i + 1].fadeInTime,
        gap: cues[i + 1].cueNumber - cues[i].cueNumber
      });
    }
    return transitions;
  }

  private identifyPotentialIssues(cues: any[]): string[] {
    const issues = [];
    
    // Check for very fast fade times that might be difficult to execute
    if (cues.some(c => c.fadeInTime < 0.5)) {
      issues.push('Some fade times may be too fast for smooth execution');
    }
    
    // Check for large gaps in cue numbering
    const numbers = cues.map(c => c.cueNumber);
    if (Math.max(...numbers) - Math.min(...numbers) > cues.length * 2) {
      issues.push('Large gaps in cue numbering may cause confusion');
    }
    
    return issues;
  }

  private calculateAverageCueSpacing(cues: any[]): number {
    if (cues.length < 2) return 0;
    const numbers = cues.map(c => c.cueNumber).sort((a, b) => a - b);
    const gaps = [];
    for (let i = 1; i < numbers.length; i++) {
      gaps.push(numbers[i] - numbers[i - 1]);
    }
    return gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
  }

  private isSequential(numbers: number[]): boolean {
    for (let i = 1; i < numbers.length; i++) {
      if (numbers[i] !== numbers[i - 1] + 1) return false;
    }
    return true;
  }

  private findGaps(numbers: number[]): number[] {
    const gaps = [];
    for (let i = 1; i < numbers.length; i++) {
      if (numbers[i] - numbers[i - 1] > 1) {
        gaps.push(numbers[i - 1] + 1);
      }
    }
    return gaps;
  }

  private findDuplicates(numbers: number[]): number[] {
    return numbers.filter((num, index) => numbers.indexOf(num) !== index);
  }

  private analyzeNumberFormat(numbers: number[]): string {
    const hasDecimals = numbers.some(n => n % 1 !== 0);
    return hasDecimals ? 'Mixed integer and decimal' : 'Integer only';
  }

  private identifyFollowChains(cues: any[]): any[] {
    // Identify sequences of follow cues
    const chains = [];
    let currentChain = [];
    
    for (const cue of cues) {
      if (cue.followTime) {
        currentChain.push(cue.cueNumber);
      } else {
        if (currentChain.length > 1) {
          chains.push([...currentChain]);
        }
        currentChain = [];
      }
    }
    
    if (currentChain.length > 1) {
      chains.push(currentChain);
    }
    
    return chains;
  }

  private recommendNumberingImprovements(_cues: any[]): string[] {
    return ['Consider using decimal increments (1.0, 1.5, 2.0) for easier insertion of new cues'];
  }

  private recommendTimingImprovements(_cues: any[]): string[] {
    return ['Standardize common fade times to reduce operator confusion'];
  }

  private recommendStructureImprovements(_cues: any[]): string[] {
    return ['Group related cues with consistent numbering patterns'];
  }

  private recommendSafetyConsiderations(_cues: any[]): string[] {
    return ['Ensure all blackout cues can be executed manually in emergency'];
  }

  async updateCueList(args: { cueListId: string; name?: string; description?: string }) {
    const { cueListId, name, description } = args;
    
    try {
      if (!name && !description) {
        throw new Error('At least one field (name or description) must be provided');
      }

      const updatedCueList = await this.graphqlClient.updateCueList(cueListId, {
        name,
        description
      });

      return {
        cueListId: updatedCueList.id,
        cueList: {
          name: updatedCueList.name,
          description: updatedCueList.description,
          totalCues: updatedCueList.cues.length
        },
        success: true
      };
    } catch (error) {
      throw new Error(`Failed to update cue list: ${error}`);
    }
  }

  async addCueToCueList(args: {
    cueListId: string;
    name: string;
    cueNumber: number;
    sceneId: string;
    fadeInTime?: number;
    fadeOutTime?: number;
    followTime?: number;
    notes?: string;
    position?: 'before' | 'after';
    referenceCueNumber?: number;
  }) {
    const { 
      cueListId, 
      name, 
      cueNumber, 
      sceneId, 
      fadeInTime = 3, 
      fadeOutTime = 3, 
      followTime,
      notes,
      position,
      referenceCueNumber
    } = args;

    try {
      // If position and reference are provided, adjust cue numbers
      let finalCueNumber = cueNumber;
      
      if (position && referenceCueNumber !== undefined) {
        // Get existing cues to renumber if needed
        const cueList = await this.graphqlClient.getCueList(cueListId);
        
        if (cueList) {
          const cues = cueList.cues.sort((a, b) => a.cueNumber - b.cueNumber);
          const refIndex = cues.findIndex(c => c.cueNumber === referenceCueNumber);
          
          if (refIndex >= 0) {
            if (position === 'before') {
              const prevCue = refIndex > 0 ? cues[refIndex - 1] : null;
              finalCueNumber = prevCue 
                ? (prevCue.cueNumber + referenceCueNumber) / 2 
                : referenceCueNumber - 0.5;
            } else {
              const nextCue = refIndex < cues.length - 1 ? cues[refIndex + 1] : null;
              finalCueNumber = nextCue 
                ? (referenceCueNumber + nextCue.cueNumber) / 2 
                : referenceCueNumber + 0.5;
            }
          }
        }
      }

      const createdCue = await this.graphqlClient.createCue({
        name,
        cueNumber: finalCueNumber,
        cueListId,
        sceneId,
        fadeInTime,
        fadeOutTime,
        followTime,
        notes
      });

      return {
        cueId: createdCue.id,
        cue: {
          name: createdCue.name,
          cueNumber: createdCue.cueNumber,
          sceneName: createdCue.scene.name,
          fadeInTime: createdCue.fadeInTime,
          fadeOutTime: createdCue.fadeOutTime,
          followTime: createdCue.followTime,
          notes: createdCue.notes
        },
        success: true
      };
    } catch (error) {
      throw new Error(`Failed to add cue to list: ${error}`);
    }
  }

  async removeCueFromList(args: { cueId: string }) {
    const { cueId } = args;
    
    try {
      const success = await this.graphqlClient.deleteCue(cueId);

      return {
        cueId,
        success,
        message: success ? 'Cue removed successfully' : 'Failed to remove cue'
      };
    } catch (error) {
      throw new Error(`Failed to remove cue: ${error}`);
    }
  }

  async updateCue(args: {
    cueId: string;
    name?: string;
    cueNumber?: number;
    sceneId?: string;
    fadeInTime?: number;
    fadeOutTime?: number;
    followTime?: number | null;
    notes?: string;
  }) {
    const { cueId, ...updateFields } = args;
    
    try {
      const updatedCue = await this.graphqlClient.updateCue(cueId, updateFields);

      return {
        cueId: updatedCue.id,
        cue: {
          name: updatedCue.name,
          cueNumber: updatedCue.cueNumber,
          sceneName: updatedCue.scene.name,
          fadeInTime: updatedCue.fadeInTime,
          fadeOutTime: updatedCue.fadeOutTime,
          followTime: updatedCue.followTime,
          notes: updatedCue.notes
        },
        success: true
      };
    } catch (error) {
      throw new Error(`Failed to update cue: ${error}`);
    }
  }

  async bulkUpdateCues(args: z.infer<typeof BulkUpdateCuesSchema>) {
    const { cueIds, fadeInTime, fadeOutTime, followTime, easingType } = BulkUpdateCuesSchema.parse(args);

    try {
      if (cueIds.length === 0) {
        throw new Error('No cue IDs provided for bulk update');
      }

      // Build update data - only include fields that are provided
      const updateData: BulkUpdateData = {};
      if (fadeInTime !== undefined) updateData.fadeInTime = fadeInTime;
      if (fadeOutTime !== undefined) updateData.fadeOutTime = fadeOutTime;
      if (followTime !== undefined) updateData.followTime = followTime;
      if (easingType !== undefined) updateData.easingType = easingType;

      if (Object.keys(updateData).length === 0) {
        throw new Error('No update fields provided. At least one of fadeInTime, fadeOutTime, followTime, or easingType must be specified.');
      }

      // Use the GraphQL client's bulk update method
      const updatedCues = await this.graphqlClient.bulkUpdateCues({
        cueIds,
        ...updateData
      });

      // Format the response
      const formattedCues = updatedCues.map((cue: CueResponse) => ({
        cueId: cue.id,
        name: cue.name,
        cueNumber: cue.cueNumber,
        sceneName: cue.scene.name,
        fadeInTime: cue.fadeInTime,
        fadeOutTime: cue.fadeOutTime,
        followTime: cue.followTime,
        notes: cue.notes
      }));

      // Generate summary statistics
      const summary = {
        totalUpdated: updatedCues.length,
        updatesApplied: Object.keys(updateData),
        averageFadeInTime: fadeInTime !== undefined ? fadeInTime : 
          formattedCues.reduce((sum, cue) => sum + cue.fadeInTime, 0) / formattedCues.length,
        averageFadeOutTime: fadeOutTime !== undefined ? fadeOutTime :
          formattedCues.reduce((sum, cue) => sum + cue.fadeOutTime, 0) / formattedCues.length,
        followCuesCount: formattedCues.filter(cue => cue.followTime !== null && cue.followTime !== undefined).length
      };

      return {
        success: true,
        updatedCues: formattedCues,
        summary,
        message: `Successfully updated ${updatedCues.length} cues with: ${Object.keys(updateData).join(', ')}`
      };
    } catch (error) {
      throw new Error(`Failed to bulk update cues: ${error}`);
    }
  }

  async reorderCues(args: {
    cueListId: string;
    cueReordering: Array<{
      cueId: string;
      newCueNumber: number;
    }>;
  }) {
    const { cueListId, cueReordering } = args;
    
    try {
      // Update each cue with its new number
      const updatePromises = cueReordering.map(({ cueId, newCueNumber }) =>
        this.graphqlClient.updateCue(cueId, { cueNumber: newCueNumber })
      );

      const updatedCues = await Promise.all(updatePromises);

      return {
        cueListId,
        updatedCues: updatedCues.map((cue: any) => ({
          cueId: cue.id,
          name: cue.name,
          cueNumber: cue.cueNumber
        })),
        success: true,
        totalUpdated: updatedCues.length
      };
    } catch (error) {
      throw new Error(`Failed to reorder cues: ${error}`);
    }
  }

  async getCueListDetails(args: {
    cueListId: string;
    includeSceneDetails?: boolean;
    sortBy?: 'cueNumber' | 'name' | 'sceneName';
    filterBy?: {
      cueNumberRange?: { min: number; max: number };
      nameContains?: string;
      sceneNameContains?: string;
      hasFollowTime?: boolean;
      fadeTimeRange?: { min: number; max: number };
    };
  }) {
    const { 
      cueListId, 
      includeSceneDetails = true, 
      sortBy = 'cueNumber', 
      filterBy 
    } = args;
    
    try {
      const cueList = await this.graphqlClient.getCueList(cueListId);
      
      if (!cueList) {
        throw new Error(`Cue list with ID ${cueListId} not found`);
      }

      let cues = [...cueList.cues];

      // Apply filters
      if (filterBy) {
        if (filterBy.cueNumberRange) {
          cues = cues.filter(cue => 
            cue.cueNumber >= filterBy.cueNumberRange!.min && 
            cue.cueNumber <= filterBy.cueNumberRange!.max
          );
        }

        if (filterBy.nameContains) {
          cues = cues.filter(cue => 
            cue.name.toLowerCase().includes(filterBy.nameContains!.toLowerCase())
          );
        }

        if (filterBy.sceneNameContains) {
          cues = cues.filter(cue => 
            cue.scene.name.toLowerCase().includes(filterBy.sceneNameContains!.toLowerCase())
          );
        }

        if (filterBy.hasFollowTime !== undefined) {
          cues = cues.filter(cue => 
            filterBy.hasFollowTime ? cue.followTime !== undefined : cue.followTime === undefined
          );
        }

        if (filterBy.fadeTimeRange) {
          cues = cues.filter(cue => 
            cue.fadeInTime >= filterBy.fadeTimeRange!.min && 
            cue.fadeInTime <= filterBy.fadeTimeRange!.max
          );
        }
      }

      // Apply sorting
      switch (sortBy) {
        case 'cueNumber':
          cues.sort((a, b) => a.cueNumber - b.cueNumber);
          break;
        case 'name':
          cues.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case 'sceneName':
          cues.sort((a, b) => a.scene.name.localeCompare(b.scene.name));
          break;
      }

      // Format cue details
      const formattedCues = cues.map(cue => {
        const baseInfo = {
          cueId: cue.id,
          cueNumber: cue.cueNumber,
          name: cue.name,
          fadeInTime: cue.fadeInTime,
          fadeOutTime: cue.fadeOutTime,
          followTime: cue.followTime,
          notes: cue.notes,
          sceneName: cue.scene.name,
          sceneId: cue.scene.id
        };

        if (includeSceneDetails) {
          return {
            ...baseInfo,
            scene: {
              id: cue.scene.id,
              name: cue.scene.name,
              description: cue.scene.description
            }
          };
        }

        return baseInfo;
      });

      // Generate summary statistics
      const statistics = {
        totalCues: cues.length,
        cueNumberRange: cues.length > 0 ? {
          min: Math.min(...cues.map(c => c.cueNumber)),
          max: Math.max(...cues.map(c => c.cueNumber))
        } : null,
        averageFadeInTime: cues.length > 0 ? 
          cues.reduce((sum, c) => sum + c.fadeInTime, 0) / cues.length : 0,
        averageFadeOutTime: cues.length > 0 ? 
          cues.reduce((sum, c) => sum + c.fadeOutTime, 0) / cues.length : 0,
        cuesTotalFollowTime: cues.filter(c => c.followTime).length,
        uniqueScenes: [...new Set(cues.map(c => c.scene.id))].length,
        estimatedTotalTime: this.estimateSequenceDuration(cues)
      };

      // Create lookup tables for easy reference
      const lookupTables = {
        byCueNumber: Object.fromEntries(
          cues.map(cue => [cue.cueNumber.toString(), {
            cueId: cue.id,
            name: cue.name,
            sceneName: cue.scene.name
          }])
        ),
        byName: Object.fromEntries(
          cues.map(cue => [cue.name.toLowerCase(), {
            cueId: cue.id,
            cueNumber: cue.cueNumber,
            sceneName: cue.scene.name
          }])
        ),
        bySceneName: cues.reduce((acc: any, cue) => {
          const sceneName = cue.scene.name.toLowerCase();
          if (!acc[sceneName]) {
            acc[sceneName] = [];
          }
          acc[sceneName].push({
            cueId: cue.id,
            cueNumber: cue.cueNumber,
            cueName: cue.name
          });
          return acc;
        }, {}),
        bySceneId: cues.reduce((acc: any, cue) => {
          const sceneId = cue.scene.id;
          if (!acc[sceneId]) {
            acc[sceneId] = [];
          }
          acc[sceneId].push({
            cueId: cue.id,
            cueNumber: cue.cueNumber,
            cueName: cue.name
          });
          return acc;
        }, {})
      };

      return {
        cueListId: cueList.id,
        cueList: {
          name: cueList.name,
          description: cueList.description,
          projectId: (cueList as any).project?.id
        },
        cues: formattedCues,
        statistics,
        lookupTables,
        query: {
          sortedBy: sortBy,
          filtersApplied: filterBy ? Object.keys(filterBy).length : 0,
          totalBeforeFiltering: cueList.cues.length,
          totalAfterFiltering: cues.length
        }
      };
    } catch (error) {
      throw new Error(`Failed to get cue list details: ${error}`);
    }
  }

  async deleteCueList(args: { cueListId: string; confirmDelete: boolean }) {
    const { cueListId, confirmDelete } = args;
    
    try {
      if (!confirmDelete) {
        throw new Error('confirmDelete must be true to delete a cue list');
      }

      // Get the cue list details before deleting for the response
      const cueList = await this.graphqlClient.getCueList(cueListId);
      
      if (!cueList) {
        throw new Error(`Cue list with ID ${cueListId} not found`);
      }

      const cueListInfo = {
        id: cueList.id,
        name: cueList.name,
        description: cueList.description,
        totalCues: cueList.cues.length
      };

      const success = await this.graphqlClient.deleteCueList(cueListId);

      return {
        cueListId,
        deletedCueList: cueListInfo,
        success,
        message: success ? 'Cue list deleted successfully' : 'Failed to delete cue list'
      };
    } catch (error) {
      throw new Error(`Failed to delete cue list: ${error}`);
    }
  }

  // Playback control methods
  async startCueList(args: z.infer<typeof StartCueListSchema>) {
    const { cueListId, cueListName, projectId, startFromCue } = StartCueListSchema.parse(args);

    try {
      let resolvedCueListId = cueListId;

      // Find cue list by name if not provided by ID
      if (!cueListId && cueListName) {
        if (!projectId) {
          // Search across all projects
          const projects = await this.graphqlClient.getProjects();
          for (const project of projects) {
            const cueList = project.cueLists.find(cl => 
              cl.name.toLowerCase() === cueListName.toLowerCase() ||
              cl.name.toLowerCase().includes(cueListName.toLowerCase())
            );
            if (cueList) {
              resolvedCueListId = cueList.id;
              break;
            }
          }
        } else {
          // Search in specific project
          const project = await this.graphqlClient.getProject(projectId);
          if (!project) {
            throw new Error(`Project with ID ${projectId} not found`);
          }
          
          const cueList = project.cueLists.find(cl => 
            cl.name.toLowerCase() === cueListName.toLowerCase() ||
            cl.name.toLowerCase().includes(cueListName.toLowerCase())
          );
          
          if (cueList) {
            resolvedCueListId = cueList.id;
          }
        }
        
        if (!resolvedCueListId) {
          throw new Error(`Cue list with name "${cueListName}" not found`);
        }
      }

      if (!resolvedCueListId) {
        throw new Error('Either cueListId or cueListName must be provided');
      }

      // Get the full cue list with cues
      const cueList = await this.graphqlClient.getCueList(resolvedCueListId);
      if (!cueList) {
        throw new Error(`Cue list with ID ${resolvedCueListId} not found`);
      }

      if (cueList.cues.length === 0) {
        throw new Error('Cue list has no cues to play');
      }

      // Sort cues by cue number
      const sortedCues = cueList.cues.sort((a, b) => a.cueNumber - b.cueNumber);

      // Find starting cue index
      let startIndex = 0;
      if (startFromCue !== undefined) {
        startIndex = sortedCues.findIndex(cue => cue.cueNumber === startFromCue);
        if (startIndex === -1) {
          throw new Error(`Cue number ${startFromCue} not found in cue list`);
        }
      }

      // Use backend mutation to start the cue list
      await this.graphqlClient.startCueList(resolvedCueListId, startIndex);

      // Track this cue list as active
      this.activeCueLists.add(resolvedCueListId);

      const firstCue = sortedCues[startIndex];

      return {
        success: true,
        cueList: {
          id: cueList.id,
          name: cueList.name,
          totalCues: sortedCues.length
        },
        currentCue: {
          index: startIndex + 1, // 1-based for user display
          number: firstCue.cueNumber,
          name: firstCue.name,
          scene: firstCue.scene.name
        },
        message: `Started playing cue list "${cueList.name}" from cue ${firstCue.cueNumber}`
      };
    } catch (error) {
      throw new Error(`Failed to start cue list: ${error}`);
    }
  }

  // Helper function to get scene name for a cue by index
  private getSceneNameFromCueList(cueList: any, cueIndex: number): string {
    const sortedCues = cueList.cues.sort((a: any, b: any) => a.cueNumber - b.cueNumber);
    if (cueIndex >= 0 && cueIndex < sortedCues.length && sortedCues[cueIndex].scene) {
      return sortedCues[cueIndex].scene.name;
    }
    return 'Unknown Scene';
  }

  // Helper method to find cue list containing a specific scene with caching
  private async findCueListForScene(sceneId: string): Promise<{ cueListId: string; cueId: string } | null> {
    // Check cache first
    const cached = this.sceneToCueListCache.get(sceneId);
    if (cached && cached.expiresAt > Date.now()) {
      return { cueListId: cached.cueListId, cueId: cached.cueId };
    }

    // Cache miss or expired - search through projects
    try {
      const projects = await this.graphqlClient.getProjects();
      for (const project of projects) {
        for (const cueList of project.cueLists) {
          try {
            const fullCueList = await this.graphqlClient.getCueList(cueList.id);
            if (!fullCueList) continue;

            const matchingCue = fullCueList.cues.find(cue => cue.scene.id === sceneId);
            if (matchingCue) {
              // Cache the result
              this.sceneToCueListCache.set(sceneId, {
                cueListId: cueList.id,
                cueId: matchingCue.id,
                expiresAt: Date.now() + this.CACHE_TTL_MS
              });
              return { cueListId: cueList.id, cueId: matchingCue.id };
            }
          } catch (error) {
            // Skip this cue list if we can't access it
            continue;
          }
        }
      }
    } catch (error) {
      // If we can't search, return null
      return null;
    }

    return null;
  }

  async nextCue(args: z.infer<typeof NextCueSchema>) {
    const { fadeInTime } = NextCueSchema.parse(args);

    // Find the first active cue list
    if (this.activeCueLists.size === 0) {
      throw new Error('No cue list is currently playing. Use start_cue_list first.');
    }

    const cueListId = Array.from(this.activeCueLists)[0];

    try {
      // Use backend mutation to advance to next cue
      await this.graphqlClient.nextCue(cueListId, fadeInTime);

      // Get updated playback status from backend
      const status = await this.graphqlClient.getCueListPlaybackStatus(cueListId);

      if (!status || status.currentCueIndex === null) {
        return {
          success: false,
          message: 'Could not advance to next cue'
        };
      }

      // Get cue list to extract scene name
      const cueList = await this.graphqlClient.getCueList(cueListId);
      const sceneName = cueList ? this.getSceneNameFromCueList(cueList, status.currentCueIndex) : 'Unknown Scene';

      return {
        success: true,
        currentCue: {
          index: status.currentCueIndex + 1, // 1-based for user display
          number: status.currentCue?.cueNumber || 0,
          name: status.currentCue?.name || '',
          scene: sceneName
        },
        fadeTime: fadeInTime || status.currentCue?.fadeInTime,
        message: `Advanced to cue ${status.currentCue?.cueNumber} - "${status.currentCue?.name}"`
      };
    } catch (error) {
      throw new Error(`Failed to advance to next cue: ${error}`);
    }
  }

  async previousCue(args: z.infer<typeof PreviousCueSchema>) {
    const { fadeInTime } = PreviousCueSchema.parse(args);

    // Find the first active cue list
    if (this.activeCueLists.size === 0) {
      throw new Error('No cue list is currently playing. Use start_cue_list first.');
    }

    const cueListId = Array.from(this.activeCueLists)[0];

    try {
      // Use backend mutation to go to previous cue
      await this.graphqlClient.previousCue(cueListId, fadeInTime);

      // Get updated playback status from backend
      const status = await this.graphqlClient.getCueListPlaybackStatus(cueListId);

      if (!status || status.currentCueIndex === null) {
        return {
          success: false,
          message: 'Could not go to previous cue'
        };
      }

      // Get cue list to extract scene name
      const cueList = await this.graphqlClient.getCueList(cueListId);
      const sceneName = cueList ? this.getSceneNameFromCueList(cueList, status.currentCueIndex) : 'Unknown Scene';

      return {
        success: true,
        currentCue: {
          index: status.currentCueIndex + 1, // 1-based for user display
          number: status.currentCue?.cueNumber || 0,
          name: status.currentCue?.name || '',
          scene: sceneName
        },
        fadeTime: fadeInTime || status.currentCue?.fadeInTime,
        message: `Went back to cue ${status.currentCue?.cueNumber} - "${status.currentCue?.name}"`
      };
    } catch (error) {
      throw new Error(`Failed to go back to previous cue: ${error}`);
    }
  }

  async goToCue(args: z.infer<typeof GoToCueSchema>) {
    const { cueNumber, cueName, fadeInTime } = GoToCueSchema.parse(args);

    // Find the first active cue list
    if (this.activeCueLists.size === 0) {
      throw new Error('No cue list is currently playing. Use start_cue_list first.');
    }

    if (!cueNumber && !cueName) {
      throw new Error('Either cueNumber or cueName must be provided');
    }

    const cueListId = Array.from(this.activeCueLists)[0];

    try {
      // Get the cue list to find the target cue index
      const cueList = await this.graphqlClient.getCueList(cueListId);
      if (!cueList) {
        throw new Error('Active cue list not found');
      }

      const sortedCues = cueList.cues.sort((a, b) => a.cueNumber - b.cueNumber);
      let targetIndex = -1;

      if (cueNumber !== undefined) {
        targetIndex = sortedCues.findIndex(cue => cue.cueNumber === cueNumber);
      } else if (cueName) {
        targetIndex = sortedCues.findIndex(cue =>
          cue.name.toLowerCase() === cueName.toLowerCase() ||
          cue.name.toLowerCase().includes(cueName.toLowerCase())
        );
      }

      if (targetIndex === -1) {
        const searchTerm = cueNumber !== undefined ? `number ${cueNumber}` : `name "${cueName}"`;
        throw new Error(`Cue with ${searchTerm} not found in current cue list`);
      }

      // Use backend mutation to go to specific cue
      await this.graphqlClient.goToCue(cueListId, targetIndex, fadeInTime);

      // Get updated status
      const status = await this.graphqlClient.getCueListPlaybackStatus(cueListId);

      const sceneName = this.getSceneNameFromCueList(cueList, targetIndex);

      return {
        success: true,
        currentCue: {
          index: targetIndex + 1, // 1-based for user display
          number: status?.currentCue?.cueNumber || sortedCues[targetIndex].cueNumber,
          name: status?.currentCue?.name || sortedCues[targetIndex].name,
          scene: sceneName
        },
        fadeTime: fadeInTime || status?.currentCue?.fadeInTime,
        message: `Jumped to cue ${status?.currentCue?.cueNumber} - "${status?.currentCue?.name}"`
      };
    } catch (error) {
      throw new Error(`Failed to go to cue: ${error}`);
    }
  }

  async stopCueList(_args: z.infer<typeof StopCueListSchema>) {
    if (this.activeCueLists.size === 0) {
      return {
        success: true,
        message: 'No cue list is currently active'
      };
    }

    const cueListId = Array.from(this.activeCueLists)[0];

    try {
      // Get current status before stopping
      const status = await this.graphqlClient.getCueListPlaybackStatus(cueListId);

      // Use backend mutation to stop
      await this.graphqlClient.stopCueList(cueListId);

      // Remove from active list
      this.activeCueLists.delete(cueListId);

      return {
        success: true,
        stoppedCueList: {
          lastPlayedCue: status?.currentCue ? {
            number: status.currentCue.cueNumber,
            name: status.currentCue.name
          } : null
        },
        message: `Stopped cue list playback`
      };
    } catch (error) {
      throw new Error(`Failed to stop cue list: ${error}`);
    }
  }

  async getCueListStatus(_args: z.infer<typeof GetCueListStatusSchema>) {
    try {
      // First check if we have an active cue list playback
      if (this.activeCueLists.size > 0) {
        const cueListId = Array.from(this.activeCueLists)[0];
        const status = await this.graphqlClient.getCueListPlaybackStatus(cueListId);

        if (status && status.isPlaying) {
          // Active cue list playback - return full status
          const cueList = await this.graphqlClient.getCueList(cueListId);
          if (cueList) {
            const sortedCues = cueList.cues.sort((a, b) => a.cueNumber - b.cueNumber);
            const currentIndex = status.currentCueIndex || 0;
            const isFirstCue = currentIndex === 0;
            const isLastCue = currentIndex === sortedCues.length - 1;

            return {
              isPlaying: true,
              cueList: {
                id: cueListId,
                name: cueList.name,
                totalCues: sortedCues.length
              },
              currentCue: status.currentCue ? {
                index: currentIndex + 1,
                number: status.currentCue.cueNumber,
                name: status.currentCue.name,
                scene: this.getSceneNameFromCueList(cueList, currentIndex),
                fadeInTime: status.currentCue.fadeInTime,
                fadeOutTime: status.currentCue.fadeOutTime,
                followTime: status.currentCue.followTime
              } : null,
              navigation: {
                canGoPrevious: !isFirstCue,
                canGoNext: !isLastCue,
                previousCue: !isFirstCue && currentIndex > 0 ? {
                  number: sortedCues[currentIndex - 1].cueNumber,
                  name: sortedCues[currentIndex - 1].name
                } : null,
                nextCue: !isLastCue && currentIndex < sortedCues.length - 1 ? {
                  number: sortedCues[currentIndex + 1].cueNumber,
                  name: sortedCues[currentIndex + 1].name
                } : null
              },
              startedAt: status.lastUpdated
            };
          }
        }
      }

      // No active cue list playback - check if there's an active scene that matches a cue
      const currentScene = await this.graphqlClient.getCurrentActiveScene();
      if (!currentScene) {
        return {
          isPlaying: false,
          message: 'No cue list is currently playing and no active scene was found'
        };
      }

      // Use cached search to find cue list containing this scene
      const cueListMatch = await this.findCueListForScene(currentScene.id);
      if (cueListMatch) {
        try {
          const fullCueList = await this.graphqlClient.getCueList(cueListMatch.cueListId);
          if (fullCueList) {
            const matchingCue = fullCueList.cues.find(cue => cue.id === cueListMatch.cueId);
            if (matchingCue) {
              const sortedCues = fullCueList.cues.sort((a, b) => a.cueNumber - b.cueNumber);
              const currentIndex = sortedCues.findIndex(cue => cue.id === matchingCue.id);
              const isFirstCue = currentIndex === 0;
              const isLastCue = currentIndex === sortedCues.length - 1;

              return {
                isPlaying: false, // Scene is active but not formal cue list playback
                cueList: {
                  id: cueListMatch.cueListId,
                  name: fullCueList.name,
                  totalCues: sortedCues.length
                },
                currentCue: {
                  index: currentIndex + 1,
                  number: matchingCue.cueNumber,
                  name: matchingCue.name,
                  scene: currentScene.name,
                  fadeInTime: matchingCue.fadeInTime,
                  fadeOutTime: matchingCue.fadeOutTime,
                  followTime: matchingCue.followTime
                },
                navigation: {
                  canGoPrevious: !isFirstCue,
                  canGoNext: !isLastCue,
                  previousCue: !isFirstCue && currentIndex > 0 ? {
                    number: sortedCues[currentIndex - 1].cueNumber,
                    name: sortedCues[currentIndex - 1].name
                  } : null,
                  nextCue: !isLastCue && currentIndex < sortedCues.length - 1 ? {
                    number: sortedCues[currentIndex + 1].cueNumber,
                    name: sortedCues[currentIndex + 1].name
                  } : null
                },
                message: `Scene "${currentScene.name}" matches cue ${matchingCue.cueNumber} in "${fullCueList.name}". Use start_cue_list to enable formal playback.`,
                startedAt: new Date().toISOString()
              };
            }
          }
        } catch (error) {
          // If we can't get the cue list details, fall through to the not found case
        }
      }

      return {
        isPlaying: false,
        message: `Active scene "${currentScene.name}" was found but does not match any cue in available cue lists`
      };
    } catch (error) {
      throw new Error(`Failed to get cue list status: ${error}`);
    }
  }
}