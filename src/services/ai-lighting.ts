import OpenAI from 'openai';
import { 
  FixtureInstance, 
  GeneratedScene, 
  CueSequence, 
  LightingDesignRequest,
  ChannelType,
  FixtureType 
} from '../types/lighting';
import { RAGService } from './rag-service-simple';

export class AILightingService {
  private openai: OpenAI;
  private ragService: RAGService;

  constructor(ragService: RAGService) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.ragService = ragService;
  }

  async generateScene(request: LightingDesignRequest): Promise<GeneratedScene> {
    // Get AI recommendations from RAG
    const recommendations = await this.ragService.generateLightingRecommendations(
      request.sceneDescription,
      request.designPreferences?.mood || 'neutral',
      request.availableFixtures.map(f => f.type || 'OTHER')
    );

    // Generate fixture values using AI
    const fixturePrompt = this.buildFixturePrompt(request, recommendations);
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: fixturePrompt }],
      temperature: 0.3
    });

    const content = response.choices[0].message.content || '{}';
    let aiResponse: any = {};
    
    try {
      aiResponse = JSON.parse(content);
    } catch (error) {
      // If JSON parsing fails, try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          aiResponse = JSON.parse(jsonMatch[0]);
        } catch (e) {
          // If still fails, use fallback
          aiResponse = {};
        }
      }
    }

    // Debug logging - embed in response for troubleshooting
    const debugInfo = {
      promptLength: fixturePrompt.length,
      responseLength: content.length,
      parsedResponse: !!aiResponse,
      hasFixtureValues: !!(aiResponse.fixtureValues && Array.isArray(aiResponse.fixtureValues)),
      fixtureValuesCount: aiResponse.fixtureValues?.length || 0,
      availableFixturesCount: request.availableFixtures.length,
      firstFixtureChannelCount: request.availableFixtures[0]?.channelCount || 0
    };

    // Validate and clean fixture values to ensure channel IDs exist
    const validatedFixtureValues = this.validateFixtureValues(
      aiResponse.fixtureValues || [],
      request.availableFixtures
    );

    return {
      name: aiResponse.name || `Scene for ${request.sceneDescription}`,
      description: aiResponse.description || request.sceneDescription,
      fixtureValues: validatedFixtureValues,
      reasoning: aiResponse.reasoning || recommendations.reasoning + `\n\nDEBUG: ${JSON.stringify(debugInfo)}`
    };
  }

  async generateCueSequence(
    scriptContext: string,
    scenes: GeneratedScene[],
    transitionPreferences?: {
      defaultFadeIn: number;
      defaultFadeOut: number;
      followCues: boolean;
    }
  ): Promise<CueSequence> {
    const prompt = `
Create a theatrical cue sequence based on this script context and generated scenes.

Script Context: ${scriptContext}

Generated Scenes:
${scenes.map((scene, i) => `[${i}] ${scene.name}: ${scene.description}`).join('\n')}

Transition Preferences:
- Default Fade In: ${transitionPreferences?.defaultFadeIn || 3}s
- Default Fade Out: ${transitionPreferences?.defaultFadeOut || 3}s
- Follow Cues: ${transitionPreferences?.followCues || false}

Create a cue sequence in this JSON format:
{
  "name": "Cue sequence name",
  "description": "Sequence description",
  "cues": [
    {
      "name": "Cue name",
      "cueNumber": 1.0,
      "sceneId": "0",  // Use the scene index number from above (0, 1, 2, etc.)
      "fadeInTime": 3.0,
      "fadeOutTime": 3.0,
      "followTime": null or number,
      "notes": "Director notes or cue description"
    }
  ],
  "reasoning": "Explanation of cue timing and sequencing decisions"
}

Consider:
- Dramatic pacing and story beats
- Smooth transitions between moods
- Technical practicality of fade times
- Standard theatrical cueing practices
- Moments that need manual vs automatic advancement
`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4
    });

    const content = response.choices[0].message.content || '{}';
    try {
      return JSON.parse(content);
    } catch (error) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (e) {
          return {
            name: "Generated Cue Sequence",
            description: "Fallback cue sequence due to parsing error",
            cues: [],
            reasoning: "Unable to parse AI response, using fallback structure"
          };
        }
      }
      return {
        name: "Generated Cue Sequence",
        description: "Fallback cue sequence due to parsing error",
        cues: [],
        reasoning: "Unable to parse AI response, using fallback structure"
      };
    }
  }

  private buildFixturePrompt(
    request: LightingDesignRequest,
    recommendations: any
  ): string {
    // Create condensed fixture summaries to reduce token usage
    const fixtureDetails = request.availableFixtures
      .filter(fixture => fixture.channels && fixture.channels.length > 0)
      .map(fixture => {
        // Direct access to channels - much simpler!
        const channels = fixture.channels
          .map(ch => `${ch.type}`);
        
        return {
          id: fixture.id,
          name: fixture.name,
          type: fixture.type,
          mode: fixture.modeName,
          channelCount: fixture.channelCount,
          channels: channels.join(',')
        };
      });

    // Limit context length by truncating if too many fixtures
    const maxFixtures = 15; // Reduced limit due to channel ID inclusion
    const limitedFixtures = fixtureDetails.slice(0, maxFixtures);
    const fixtureWarning = fixtureDetails.length > maxFixtures ? 
      `\n(Showing first ${maxFixtures} of ${fixtureDetails.length} fixtures)` : '';

    const sceneType = request.sceneType || 'full';
    const isAdditive = sceneType === 'additive';
    
    let prompt = `Scene: ${request.sceneDescription}
Mood: ${recommendations.reasoning || 'Standard'}
Colors: ${recommendations.colorSuggestions?.join(',') || 'Default'}

`;

    if (isAdditive) {
      // For additive scenes, provide context about other fixtures but only modify specific ones
      const allFixtureDetails = request.allFixtures
        ?.filter(fixture => fixture.channels && fixture.channels.length > 0)
        .map(fixture => {
          const channels = fixture.channels.map(ch => `${ch.type}`);
          return {
            id: fixture.id,
            name: fixture.name,
            type: fixture.type,
            included: limitedFixtures.some(lf => lf.id === fixture.id)
          };
        }) || [];

      prompt += `ADDITIVE SCENE: Only modify the specified fixtures below. Other fixtures will remain unchanged.

Fixtures to modify (${limitedFixtures.length} of ${allFixtureDetails.length} total)${fixtureWarning}:
${limitedFixtures.map(f => `${f.id}: ${f.name} (${f.type}, ${f.mode}) - Channels: ${f.channels}`).join('\n')}

Other fixtures in project (will remain unchanged):
${allFixtureDetails.filter(f => !f.included).slice(0, 5).map(f => `${f.id}: ${f.name} (${f.type}) - NOT MODIFIED`).join('\n')}${allFixtureDetails.filter(f => !f.included).length > 5 ? '\n... and more' : ''}

IMPORTANT: Only include fixtureValues for the ${limitedFixtures.length} fixtures listed above to modify.
`;
    } else {
      prompt += `FULL SCENE: Use ALL fixtures to create a complete lighting state.

Fixtures (use ALL ${limitedFixtures.length} fixtures)${fixtureWarning}:
${limitedFixtures.map(f => `${f.id}: ${f.name} (${f.type}, ${f.mode}) - Channels: ${f.channels}`).join('\n')}

IMPORTANT: Include values for ALL ${limitedFixtures.length} fixtures above.
`;
    }

    prompt += `
Return JSON:
{
  "name": "Scene name",
  "fixtureValues": [
    {"fixtureId": "fixture_id", "channelValues": [0-255 values for each channel in order]}
  ],
  "reasoning": "explanation"
}

For each fixture, provide channel values as an array of integers (0-255) where:
- The array index corresponds to the channel offset (0, 1, 2, ...)
- The array length should match the fixture's channel count`;

    return prompt;
  }

  async optimizeSceneForFixtures(
    scene: GeneratedScene,
    availableFixtures: FixtureInstance[]
  ): Promise<GeneratedScene> {
    // Validate and optimize the generated scene
    const optimizedFixtureValues = scene.fixtureValues.map(fv => {
      const fixture = availableFixtures.find(f => f.id === fv.fixtureId);
      if (!fixture || !fixture.channels) return fv;

      // Ensure all channel values are within valid ranges
      const optimizedChannelValues = fv.channelValues.map((value, index) => {
        const channel = fixture.channels[index];
        if (!channel) return value;

        // Clamp value to channel's min/max range
        return Math.max(channel.minValue, Math.min(channel.maxValue, value));
      });

      // Ensure array length matches fixture channel count
      while (optimizedChannelValues.length < fixture.channelCount) {
        optimizedChannelValues.push(0);
      }
      if (optimizedChannelValues.length > fixture.channelCount) {
        optimizedChannelValues.length = fixture.channelCount;
      }

      return {
        ...fv,
        channelValues: optimizedChannelValues
      };
    });

    return {
      ...scene,
      fixtureValues: optimizedFixtureValues
    };
  }

  async suggestFixtureUsage(
    sceneContext: string,
    availableFixtures: FixtureInstance[]
  ): Promise<{
    primaryFixtures: string[];
    supportingFixtures: string[];
    unusedFixtures: string[];
    reasoning: string;
  }> {
    const fixtureInfo = availableFixtures
      .map(f => ({
        id: f.id,
        name: f.name,
        type: f.type,
        tags: f.tags,
        position: `Universe ${f.universe}, Channel ${f.startChannel}`
      }));

    const prompt = `
Analyze these available fixtures and suggest which ones to use for this scene.

Scene Context: ${sceneContext}

Available Fixtures:
${JSON.stringify(fixtureInfo, null, 2)}

Recommend fixture usage in this JSON format:
{
  "primaryFixtures": ["fixture_ids for main lighting"],
  "supportingFixtures": ["fixture_ids for accent/fill lighting"], 
  "unusedFixtures": ["fixture_ids not needed for this scene"],
  "reasoning": "Explanation of fixture selection strategy"
}

Consider:
- Fixture types and capabilities
- Positioning and coverage
- Scene requirements and mood
- Efficient use of available equipment
- Standard lighting practices (key, fill, back light)
`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3
    });

    const content = response.choices[0].message.content || '{}';
    try {
      return JSON.parse(content);
    } catch (error) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (e) {
          return {
            primaryFixtures: [],
            supportingFixtures: [],
            unusedFixtures: [],
            reasoning: "Unable to parse AI response, using fallback structure"
          };
        }
      }
      return {
        primaryFixtures: [],
        supportingFixtures: [],
        unusedFixtures: [],
        reasoning: "Unable to parse AI response, using fallback structure"
      };
    }
  }

  private validateFixtureValues(
    fixtureValues: any[],
    availableFixtures: FixtureInstance[]
  ): Array<{
    fixtureId: string;
    channelValues: number[];
  }> {
    if (!Array.isArray(fixtureValues)) {
      return [];
    }

    const validatedValues: Array<{
      fixtureId: string;
      channelValues: number[];
    }> = [];

    for (const fv of fixtureValues) {
      if (!fv || typeof fv !== 'object' || !fv.fixtureId) {
        continue;
      }

      // Find the fixture to validate against
      const fixture = availableFixtures.find(f => f.id === fv.fixtureId);
      if (!fixture || !fixture.channels) {
        continue; // Skip invalid fixture IDs or missing channels
      }

      // Handle both new array format and legacy object format
      let channelValues: number[] = [];

      if (Array.isArray(fv.channelValues)) {
        // New format: simple array of numbers
        channelValues = fv.channelValues.map((value: any) => {
          const numValue = Number(value) || 0;
          return Math.max(0, Math.min(255, numValue));
        });
      } else if (fv.channelValues && typeof fv.channelValues === 'object') {
        // Legacy format: array of {channelId, value} objects
        // Convert to array format based on channel offsets
        const legacyValues = Array.isArray(fv.channelValues) ? fv.channelValues : [];
        channelValues = new Array(fixture.channelCount).fill(0);
        
        for (const cv of legacyValues) {
          if (cv && typeof cv === 'object' && cv.channelId) {
            // Find the channel to get its offset
            const channel = fixture.channels.find(ch => ch.id === cv.channelId);
            if (channel) {
              const value = Math.max(0, Math.min(255, Number(cv.value) || 0));
              channelValues[channel.offset] = value;
            }
          }
        }
      }

      // Ensure array length matches fixture channel count
      while (channelValues.length < fixture.channelCount) {
        channelValues.push(0);
      }
      if (channelValues.length > fixture.channelCount) {
        channelValues.length = fixture.channelCount;
      }

      validatedValues.push({
        fixtureId: fv.fixtureId,
        channelValues: channelValues
      });
    }

    return validatedValues;
  }
}