// Lighting Domain Types - matching your existing schema
export interface Project {
  id: string;
  name: string;
  description?: string;
  groupId?: string;
  createdAt?: string;
  updatedAt?: string;
  fixtures: FixtureInstance[];
  looks: Look[];
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

export interface Look {
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
  lookOrder?: number; // Optional ordering within the look
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
  look: Look;
  cueList?: { id: string; name: string }; // Added for Task 2.5 (Cue List Query Tools)
  fadeInTime: number;
  fadeOutTime: number;
  followTime?: number;
  notes?: string;
  /** When true, this cue is skipped during playback but remains visible in the UI */
  skip: boolean;
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
  CYAN = 'CYAN',
  MAGENTA = 'MAGENTA',
  YELLOW = 'YELLOW',
  LIME = 'LIME',
  INDIGO = 'INDIGO',
  COLD_WHITE = 'COLD_WHITE',
  WARM_WHITE = 'WARM_WHITE',
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
  lookDescription: string;
  availableFixtures: FixtureInstance[];
  lookType?: 'full' | 'additive';
  allFixtures?: FixtureInstance[]; // For additive looks, context of all fixtures
  designPreferences?: {
    colorPalette?: string[];
    mood?: string;
    intensity?: 'subtle' | 'moderate' | 'dramatic';
    focusAreas?: string[];
  };
}

export interface GeneratedLook {
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
    lookId: string;
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
  looks: LookSummary[];
  cues: CueUsageSummary[];
}

export interface LookUsage {
  lookId: string;
  lookName: string;
  cues: CueUsageSummary[];
}

export enum DifferenceType {
  VALUES_CHANGED = 'VALUES_CHANGED',
  ONLY_IN_LOOK1 = 'ONLY_IN_LOOK1',
  ONLY_IN_LOOK2 = 'ONLY_IN_LOOK2'
}

export interface LookDifference {
  fixtureId: string;
  fixtureName: string;
  differenceType: DifferenceType;
  look1Values?: { offset: number; value: number; }[];
  look2Values?: { offset: number; value: number; }[];
}

export interface LookComparison {
  look1: LookSummary;
  look2: LookSummary;
  differences: LookDifference[];
  identicalFixtureCount: number;
  differentFixtureCount: number;
}

export interface LookSummary {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  fixtureCount?: number;
}

// MCP API Refactor - Task 2.4: Look Query Types

export interface LookFixtureSummary {
  fixtureId: string;
  fixtureName: string;
  fixtureType: FixtureType;
}

export enum LookSortField {
  NAME = 'NAME',
  CREATED_AT = 'CREATED_AT',
  UPDATED_AT = 'UPDATED_AT'
}

// Look Board Types

export interface LookBoard {
  id: string;
  name: string;
  description?: string;
  project: { id: string; name: string };
  defaultFadeTime: number;
  gridSize?: number;
  canvasWidth: number;
  canvasHeight: number;
  buttons: LookBoardButton[];
  createdAt: string;
  updatedAt: string;
}

export interface LookBoardButton {
  id: string;
  lookBoard: { id: string; name: string };
  look: { id: string; name: string };
  layoutX: number;
  layoutY: number;
  width?: number;
  height?: number;
  color?: string;
  label?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LookBoardSummary {
  id: string;
  name: string;
  description?: string;
  defaultFadeTime: number;
  gridSize?: number;
  canvasWidth: number;
  canvasHeight: number;
  buttonCount: number;
  createdAt: string;
  updatedAt: string;
}
