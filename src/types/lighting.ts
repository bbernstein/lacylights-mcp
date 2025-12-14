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

  // Layout positioning (optional)
  layoutX?: number;
  layoutY?: number;
  layoutRotation?: number;

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
  channels: { offset: number; value: number; }[]; // Sparse array of channel values
  sceneOrder?: number; // Optional ordering within the scene
}

export interface CueList {
  id: string;
  name: string;
  description?: string;
  loop: boolean;
  cues: Cue[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Cue {
  id: string;
  name: string;
  cueNumber: number;
  scene: Scene;
  cueList?: { id: string; name: string }; // Added for Task 2.5 (Cue List Query Tools)
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
    channels: { offset: number; value: number; }[]; // Sparse array of channel values
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

// Relationship Query Types (Task 2.7)

export interface CueUsageSummary {
  cueId: string;
  cueNumber: number;
  cueName: string;
  cueListId: string;
  cueListName: string;
}

export interface FixtureUsage {
  fixtureId: string;
  fixtureName: string;
  scenes: SceneSummary[];
  cues: CueUsageSummary[];
}

export interface SceneUsage {
  sceneId: string;
  sceneName: string;
  cues: CueUsageSummary[];
}

export enum DifferenceType {
  VALUES_CHANGED = 'VALUES_CHANGED',
  ONLY_IN_SCENE1 = 'ONLY_IN_SCENE1',
  ONLY_IN_SCENE2 = 'ONLY_IN_SCENE2'
}

export interface SceneDifference {
  fixtureId: string;
  fixtureName: string;
  differenceType: DifferenceType;
  scene1Values?: { offset: number; value: number; }[];
  scene2Values?: { offset: number; value: number; }[];
}

export interface SceneComparison {
  scene1: SceneSummary;
  scene2: SceneSummary;
  differences: SceneDifference[];
  identicalFixtureCount: number;
  differentFixtureCount: number;
}

export interface SceneSummary {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  fixtureCount?: number;
}

// MCP API Refactor - Task 2.4: Scene Query Types

export interface SceneFixtureSummary {
  fixtureId: string;
  fixtureName: string;
  fixtureType: FixtureType;
}

export enum SceneSortField {
  NAME = 'NAME',
  CREATED_AT = 'CREATED_AT',
  UPDATED_AT = 'UPDATED_AT'
}