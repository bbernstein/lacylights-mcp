// Lighting Domain Types - matching your existing schema
export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  fixtures: FixtureInstance[];
  scenes: Scene[];
  cueLists: CueList[];
}

export interface FixtureDefinition {
  id: string;
  manufacturer: string;
  model: string;
  type: FixtureType;
  channels: ChannelDefinition[];
  modes: FixtureMode[];
  isBuiltIn: boolean;
}

export interface FixtureInstance {
  id: string;
  name: string;
  description?: string;
  
  // Flattened fixture definition info
  definitionId: string;
  manufacturer: string;
  model: string;
  type: FixtureType;
  
  // Flattened mode info
  modeName: string;
  channelCount: number;
  channels: InstanceChannel[];
  
  // DMX configuration
  universe: number;
  startChannel: number;
  tags: string[];
  
}

export interface InstanceChannel {
  id: string;
  offset: number;
  name: string;
  type: ChannelType;
  minValue: number;
  maxValue: number;
  defaultValue: number;
}

export interface ChannelDefinition {
  id: string;
  name: string;
  type: ChannelType;
  offset: number;
  minValue: number;
  maxValue: number;
  defaultValue: number;
}

export interface FixtureMode {
  id: string;
  name: string;
  shortName?: string;
  channelCount: number;
  channels?: Array<{
    id: string;
    offset: number;
    channel: ChannelDefinition;
  }>;
}

export interface Scene {
  id: string;
  name: string;
  description?: string;
  fixtureValues: FixtureValue[];
  createdAt?: string;
  updatedAt?: string;
}

export interface FixtureValue {
  fixture: FixtureInstance;
  channelValues: number[]; // Array of 0-255 values, index = channel offset
  sceneOrder?: number; // Optional ordering within the scene
}

export interface CueList {
  id: string;
  name: string;
  description?: string;
  cues: Cue[];
}

export interface Cue {
  id: string;
  name: string;
  cueNumber: number;
  scene: Scene;
  fadeInTime: number;
  fadeOutTime: number;
  followTime?: number;
  notes?: string;
}

export enum FixtureType {
  LED_PAR = 'LED_PAR',
  MOVING_HEAD = 'MOVING_HEAD',
  STROBE = 'STROBE',
  DIMMER = 'DIMMER',
  OTHER = 'OTHER'
}

export enum ChannelType {
  INTENSITY = 'INTENSITY',
  RED = 'RED',
  GREEN = 'GREEN',
  BLUE = 'BLUE',
  WHITE = 'WHITE',
  AMBER = 'AMBER',
  UV = 'UV',
  PAN = 'PAN',
  TILT = 'TILT',
  ZOOM = 'ZOOM',
  FOCUS = 'FOCUS',
  IRIS = 'IRIS',
  GOBO = 'GOBO',
  COLOR_WHEEL = 'COLOR_WHEEL',
  EFFECT = 'EFFECT',
  STROBE = 'STROBE',
  MACRO = 'MACRO',
  OTHER = 'OTHER'
}

// AI-specific types
export interface ScriptAnalysis {
  scenes: ScriptScene[];
  characters: string[];
  settings: string[];
  overallMood: string;
  themes: string[];
}

export interface ScriptScene {
  sceneNumber: string;
  title?: string;
  content: string;
  mood: string;
  characters: string[];
  stageDirections: string[];
  lightingCues: string[];
  timeOfDay?: string;
  location?: string;
}

export interface LightingDesignRequest {
  scriptContext: string;
  sceneDescription: string;
  availableFixtures: FixtureInstance[];
  sceneType?: 'full' | 'additive';
  allFixtures?: FixtureInstance[]; // For additive scenes, context of all fixtures
  designPreferences?: {
    colorPalette?: string[];
    mood?: string;
    intensity?: 'subtle' | 'moderate' | 'dramatic';
    focusAreas?: string[];
  };
}

export interface GeneratedScene {
  name: string;
  description: string;
  fixtureValues: Array<{
    fixtureId: string;
    channelValues: number[]; // Array of 0-255 values, index = channel offset
  }>;
  reasoning: string;
}

export interface CueSequence {
  name: string;
  description: string;
  cues: Array<{
    name: string;
    cueNumber: number;
    sceneId: string;
    fadeInTime: number;
    fadeOutTime: number;
    followTime?: number;
    notes?: string;
  }>;
  reasoning: string;
}