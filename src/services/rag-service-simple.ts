import OpenAI from 'openai';
import { ScriptAnalysis } from '../types/lighting';

export class RAGService {
  private openai: OpenAI;
  private patterns: Map<string, any> = new Map();

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.initializeDefaultPatterns();
  }

  async initializeCollection() {
    // Simple in-memory initialization - no ChromaDB required
    // Don't log to stdout/stderr as it interferes with MCP protocol
  }

  async indexLightingPattern(pattern: {
    id: string;
    description: string;
    context: string;
    mood: string;
    fixtureTypes: string[];
    colorPalette: string[];
    intensity: string;
    metadata: Record<string, any>;
  }) {
    this.patterns.set(pattern.id, pattern);
  }

  async analyzeScript(scriptText: string): Promise<ScriptAnalysis> {
    const prompt = `
Analyze this theatrical script and extract lighting-relevant information. Return a JSON object with the following structure:

{
  "scenes": [
    {
      "sceneNumber": "string",
      "title": "string (optional)",
      "content": "string (excerpt)",
      "mood": "string (e.g., tense, romantic, mysterious)",
      "characters": ["string"],
      "stageDirections": ["string"],
      "lightingCues": ["string"],
      "timeOfDay": "string (optional)",
      "location": "string (optional)"
    }
  ],
  "characters": ["string"],
  "settings": ["string"],
  "overallMood": "string",
  "themes": ["string"]
}

Script text:
${scriptText}

Focus on:
- Mood and atmosphere descriptions
- Time of day and location changes
- Stage directions that imply lighting
- Character entrances and emotional beats
- Explicit lighting cues in the text
`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3
    });

    const content = response.choices[0].message.content || '{}';
    try {
      return JSON.parse(content);
    } catch (_error) {
      // If JSON parsing fails, try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (_e) {
          // If still fails, return a fallback structure
          return {
            scenes: [],
            characters: [],
            settings: [],
            overallMood: 'unknown',
            themes: []
          };
        }
      }
      return {
        scenes: [],
        characters: [],
        settings: [],
        overallMood: 'unknown',
        themes: []
      };
    }
  }

  async findSimilarLightingPatterns(
    sceneDescription: string,
    mood: string,
    limit: number = 5
  ) {
    // Simple pattern matching based on mood
    const matchingPatterns = Array.from(this.patterns.values())
      .filter(pattern => 
        pattern.mood.toLowerCase() === mood.toLowerCase() ||
        pattern.context.toLowerCase().includes(sceneDescription.toLowerCase())
      )
      .slice(0, limit);

    return {
      documents: matchingPatterns.map(p => p.description),
      metadatas: matchingPatterns.map(p => ({
        context: p.context,
        mood: p.mood,
        fixtureTypes: p.fixtureTypes.join(','),
        colorPalette: p.colorPalette.join(','),
        intensity: p.intensity
      })),
      distances: matchingPatterns.map(() => Math.random()) // Mock similarity scores
    };
  }

  async generateLightingRecommendations(
    sceneContext: string,
    mood: string,
    availableFixtures: string[]
  ): Promise<{
    colorSuggestions: string[];
    intensityLevels: Record<string, number>;
    focusAreas: string[];
    reasoning: string;
  }> {
    // Find similar patterns
    const _similarPatterns = await this.findSimilarLightingPatterns(sceneContext, mood);
    
    const prompt = `Scene: ${sceneContext}
Mood: ${mood}
Fixtures: ${availableFixtures.slice(0, 5).join(', ')}

JSON:
{
  "colorSuggestions": ["colors"],
  "intensityLevels": {"ambient": 50, "key": 75, "fill": 60, "background": 30},
  "focusAreas": ["areas"],
  "reasoning": "brief explanation"
}

Recommend colors and intensities for ${mood} mood.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4
    });

    const content = response.choices[0].message.content || '{}';
    try {
      return JSON.parse(content);
    } catch (_error) {
      // If JSON parsing fails, try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (_e) {
          // If still fails, return a fallback structure
          return {
            colorSuggestions: [],
            intensityLevels: {
              ambient: 50,
              key: 75,
              fill: 60,
              background: 30
            },
            focusAreas: [],
            reasoning: 'Unable to parse AI response, using default values'
          };
        }
      }
      return {
        colorSuggestions: [],
        intensityLevels: {
          ambient: 50,
          key: 75,
          fill: 60,
          background: 30
        },
        focusAreas: [],
        reasoning: 'Unable to parse AI response, using default values'
      };
    }
  }

  private initializeDefaultPatterns() {
    const defaultPatterns = [
      {
        id: 'romantic-warm',
        description: 'Warm romantic lighting with soft amber tones',
        context: 'intimate dialogue, love scenes, tender moments',
        mood: 'romantic',
        fixtureTypes: ['LED_PAR'],
        colorPalette: ['amber', 'warm white', 'rose'],
        intensity: 'moderate',
        metadata: { colorTemp: '2700K', focusType: 'soft' }
      },
      {
        id: 'dramatic-tension',
        description: 'High contrast dramatic lighting with sharp angles',
        context: 'conflict scenes, confrontations, climactic moments',
        mood: 'tense',
        fixtureTypes: ['MOVING_HEAD', 'LED_PAR'],
        colorPalette: ['deep red', 'stark white', 'blue'],
        intensity: 'dramatic',
        metadata: { contrast: 'high', focusType: 'sharp' }
      },
      {
        id: 'mysterious-cool',
        description: 'Cool mysterious lighting with blue undertones',
        context: 'supernatural scenes, night scenes, mystery',
        mood: 'mysterious',
        fixtureTypes: ['LED_PAR', 'MOVING_HEAD'],
        colorPalette: ['deep blue', 'purple', 'cool white'],
        intensity: 'subtle',
        metadata: { colorTemp: '5600K', atmosphere: 'ethereal' }
      },
      {
        id: 'cheerful-bright',
        description: 'Bright cheerful lighting with natural tones',
        context: 'comedy scenes, daytime scenes, celebrations',
        mood: 'cheerful',
        fixtureTypes: ['LED_PAR'],
        colorPalette: ['warm white', 'yellow', 'light blue'],
        intensity: 'dramatic',
        metadata: { colorTemp: '4000K', feel: 'natural' }
      }
    ];

    for (const pattern of defaultPatterns) {
      this.patterns.set(pattern.id, pattern);
    }
  }

  async seedDefaultPatterns() {
    // Already done in constructor
    console.log('Default patterns loaded');
  }
}