export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type ApClient = {
  __typename?: 'APClient';
  connectedAt: Scalars['String']['output'];
  hostname?: Maybe<Scalars['String']['output']>;
  ipAddress?: Maybe<Scalars['String']['output']>;
  macAddress: Scalars['String']['output'];
};

export type ApConfig = {
  __typename?: 'APConfig';
  channel: Scalars['Int']['output'];
  clientCount: Scalars['Int']['output'];
  ipAddress: Scalars['String']['output'];
  minutesRemaining?: Maybe<Scalars['Int']['output']>;
  ssid: Scalars['String']['output'];
  timeoutMinutes: Scalars['Int']['output'];
};

/** Status of an active effect at runtime. */
export type ActiveEffectStatus = {
  __typename?: 'ActiveEffectStatus';
  effectId: Scalars['ID']['output'];
  effectName: Scalars['String']['output'];
  effectType: EffectType;
  /** Current intensity (0-100) */
  intensity: Scalars['Float']['output'];
  /** Whether the effect has completed */
  isComplete: Scalars['Boolean']['output'];
  /** Current phase for waveforms (0-360) */
  phase: Scalars['Float']['output'];
  startTime: Scalars['String']['output'];
};

export type AddEffectToCueInput = {
  cueId: Scalars['ID']['input'];
  effectId: Scalars['ID']['input'];
  intensity?: InputMaybe<Scalars['Float']['input']>;
  onCueChange?: InputMaybe<TransitionBehavior>;
  speed?: InputMaybe<Scalars['Float']['input']>;
};

export type AddFixtureToEffectInput = {
  amplitudeScale?: InputMaybe<Scalars['Float']['input']>;
  effectId: Scalars['ID']['input'];
  effectOrder?: InputMaybe<Scalars['Int']['input']>;
  fixtureId: Scalars['ID']['input'];
  phaseOffset?: InputMaybe<Scalars['Float']['input']>;
};

export type ArtNetStatus = {
  __typename?: 'ArtNetStatus';
  broadcastAddress: Scalars['String']['output'];
  enabled: Scalars['Boolean']['output'];
};

/** Server build information for version verification */
export type BuildInfo = {
  __typename?: 'BuildInfo';
  /** UTC timestamp when this build was created */
  buildTime: Scalars['String']['output'];
  /** Git commit hash from which this build was made */
  gitCommit: Scalars['String']['output'];
  /** Semantic version (e.g., v0.8.10) */
  version: Scalars['String']['output'];
};

export type BulkCueCreateInput = {
  cues: Array<CreateCueInput>;
};

export type BulkCueListCreateInput = {
  cueLists: Array<CreateCueListInput>;
};

export type BulkCueListUpdateInput = {
  cueLists: Array<CueListUpdateItem>;
};

export type BulkCueUpdateInput = {
  cueIds: Array<Scalars['ID']['input']>;
  easingType?: InputMaybe<EasingType>;
  fadeInTime?: InputMaybe<Scalars['Float']['input']>;
  fadeOutTime?: InputMaybe<Scalars['Float']['input']>;
  followTime?: InputMaybe<Scalars['Float']['input']>;
  /** When set, updates the skip status of all selected cues */
  skip?: InputMaybe<Scalars['Boolean']['input']>;
};

export type BulkDeleteResult = {
  __typename?: 'BulkDeleteResult';
  deletedCount: Scalars['Int']['output'];
  deletedIds: Array<Scalars['ID']['output']>;
};

export type BulkFixtureCreateInput = {
  fixtures: Array<CreateFixtureInstanceInput>;
};

export type BulkFixtureDefinitionCreateInput = {
  definitions: Array<CreateFixtureDefinitionInput>;
};

export type BulkFixtureDefinitionUpdateInput = {
  definitions: Array<FixtureDefinitionUpdateItem>;
};

export type BulkFixtureUpdateInput = {
  fixtures: Array<FixtureUpdateItem>;
};

export type BulkLookBoardButtonCreateInput = {
  buttons: Array<CreateLookBoardButtonInput>;
};

export type BulkLookBoardButtonUpdateInput = {
  buttons: Array<LookBoardButtonUpdateItem>;
};

export type BulkLookBoardCreateInput = {
  lookBoards: Array<CreateLookBoardInput>;
};

export type BulkLookBoardUpdateInput = {
  lookBoards: Array<LookBoardUpdateItem>;
};

export type BulkLookCreateInput = {
  looks: Array<CreateLookInput>;
};

/**
 * Updates multiple looks with partial fixture value merging support.
 * Each look can independently specify name, description, fixtureValues, and mergeFixtures.
 * Operations are applied in order and fail on first error.
 */
export type BulkLookPartialUpdateInput = {
  looks: Array<LookPartialUpdateItem>;
};

export type BulkLookUpdateInput = {
  looks: Array<LookUpdateItem>;
};

export type BulkProjectCreateInput = {
  projects: Array<CreateProjectInput>;
};

export type BulkProjectUpdateInput = {
  projects: Array<ProjectUpdateItem>;
};

export type ChannelAssignmentInput = {
  fixtureSpecs: Array<FixtureSpecInput>;
  projectId: Scalars['ID']['input'];
  startingChannel?: InputMaybe<Scalars['Int']['input']>;
  universe?: InputMaybe<Scalars['Int']['input']>;
};

export type ChannelAssignmentSuggestion = {
  __typename?: 'ChannelAssignmentSuggestion';
  assignments: Array<FixtureChannelAssignment>;
  availableChannelsRemaining: Scalars['Int']['output'];
  totalChannelsNeeded: Scalars['Int']['output'];
  universe: Scalars['Int']['output'];
};

export type ChannelDefinition = {
  __typename?: 'ChannelDefinition';
  defaultValue: Scalars['Int']['output'];
  fadeBehavior: FadeBehavior;
  id: Scalars['ID']['output'];
  isDiscrete: Scalars['Boolean']['output'];
  maxValue: Scalars['Int']['output'];
  minValue: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  offset: Scalars['Int']['output'];
  type: ChannelType;
};

export type ChannelFadeBehaviorInput = {
  channelId: Scalars['ID']['input'];
  fadeBehavior: FadeBehavior;
};

export type ChannelMapFixture = {
  __typename?: 'ChannelMapFixture';
  channelCount: Scalars['Int']['output'];
  endChannel: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  startChannel: Scalars['Int']['output'];
  type: FixtureType;
};

export type ChannelMapResult = {
  __typename?: 'ChannelMapResult';
  projectId: Scalars['ID']['output'];
  universes: Array<UniverseChannelMap>;
};

export type ChannelType =
  | 'AMBER'
  | 'BLUE'
  | 'COLD_WHITE'
  | 'COLOR_WHEEL'
  | 'CYAN'
  | 'EFFECT'
  | 'FOCUS'
  | 'GOBO'
  | 'GREEN'
  | 'INDIGO'
  | 'INTENSITY'
  | 'IRIS'
  | 'LIME'
  | 'MACRO'
  | 'MAGENTA'
  | 'OTHER'
  | 'PAN'
  | 'RED'
  | 'STROBE'
  | 'TILT'
  | 'UV'
  | 'WARM_WHITE'
  | 'WHITE'
  | 'YELLOW'
  | 'ZOOM';

export type ChannelUsage = {
  __typename?: 'ChannelUsage';
  channelType: ChannelType;
  fixtureId: Scalars['ID']['output'];
  fixtureName: Scalars['String']['output'];
};

export type ChannelValue = {
  __typename?: 'ChannelValue';
  offset: Scalars['Int']['output'];
  value: Scalars['Int']['output'];
};

export type ChannelValueInput = {
  offset: Scalars['Int']['input'];
  value: Scalars['Int']['input'];
};

/**
 * How multiple effects combine their values.
 * OVERRIDE - Higher priority effect completely replaces lower
 * ADDITIVE - Effects add their values together
 * MULTIPLY - Effects multiply their values together
 */
export type CompositionMode =
  | 'ADDITIVE'
  | 'MULTIPLY'
  | 'OVERRIDE';

export type CreateChannelDefinitionInput = {
  defaultValue: Scalars['Int']['input'];
  fadeBehavior?: InputMaybe<FadeBehavior>;
  isDiscrete?: InputMaybe<Scalars['Boolean']['input']>;
  maxValue: Scalars['Int']['input'];
  minValue: Scalars['Int']['input'];
  name: Scalars['String']['input'];
  offset: Scalars['Int']['input'];
  type: ChannelType;
};

export type CreateCueInput = {
  cueListId: Scalars['ID']['input'];
  cueNumber: Scalars['Float']['input'];
  easingType?: InputMaybe<EasingType>;
  fadeInTime: Scalars['Float']['input'];
  fadeOutTime: Scalars['Float']['input'];
  followTime?: InputMaybe<Scalars['Float']['input']>;
  lookId: Scalars['ID']['input'];
  name: Scalars['String']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
  /** When true, this cue is skipped during playback (default: false) */
  skip?: InputMaybe<Scalars['Boolean']['input']>;
};

export type CreateCueListInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  loop?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
  projectId: Scalars['ID']['input'];
};

export type CreateEffectInput = {
  amplitude?: InputMaybe<Scalars['Float']['input']>;
  compositionMode?: InputMaybe<CompositionMode>;
  description?: InputMaybe<Scalars['String']['input']>;
  effectType: EffectType;
  fadeDuration?: InputMaybe<Scalars['Float']['input']>;
  frequency?: InputMaybe<Scalars['Float']['input']>;
  masterValue?: InputMaybe<Scalars['Float']['input']>;
  name: Scalars['String']['input'];
  offset?: InputMaybe<Scalars['Float']['input']>;
  onCueChange?: InputMaybe<TransitionBehavior>;
  phaseOffset?: InputMaybe<Scalars['Float']['input']>;
  priorityBand?: InputMaybe<PriorityBand>;
  prioritySub?: InputMaybe<Scalars['Int']['input']>;
  projectId: Scalars['ID']['input'];
  waveform?: InputMaybe<WaveformType>;
};

export type CreateFixtureDefinitionInput = {
  channels: Array<CreateChannelDefinitionInput>;
  manufacturer: Scalars['String']['input'];
  model: Scalars['String']['input'];
  modes?: InputMaybe<Array<CreateModeInput>>;
  type: FixtureType;
};

export type CreateFixtureInstanceInput = {
  definitionId: Scalars['ID']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  modeId?: InputMaybe<Scalars['ID']['input']>;
  name: Scalars['String']['input'];
  projectId: Scalars['ID']['input'];
  startChannel: Scalars['Int']['input'];
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  universe: Scalars['Int']['input'];
};

export type CreateLookBoardButtonInput = {
  color?: InputMaybe<Scalars['String']['input']>;
  height?: InputMaybe<Scalars['Int']['input']>;
  label?: InputMaybe<Scalars['String']['input']>;
  layoutX: Scalars['Int']['input'];
  layoutY: Scalars['Int']['input'];
  lookBoardId: Scalars['ID']['input'];
  lookId: Scalars['ID']['input'];
  width?: InputMaybe<Scalars['Int']['input']>;
};

export type CreateLookBoardInput = {
  canvasHeight?: InputMaybe<Scalars['Int']['input']>;
  canvasWidth?: InputMaybe<Scalars['Int']['input']>;
  defaultFadeTime?: InputMaybe<Scalars['Float']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  gridSize?: InputMaybe<Scalars['Int']['input']>;
  name: Scalars['String']['input'];
  projectId: Scalars['ID']['input'];
};

export type CreateLookInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  fixtureValues: Array<FixtureValueInput>;
  name: Scalars['String']['input'];
  projectId: Scalars['ID']['input'];
};

export type CreateModeInput = {
  channels: Array<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  shortName?: InputMaybe<Scalars['String']['input']>;
};

export type CreateProjectInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  layoutCanvasHeight?: InputMaybe<Scalars['Int']['input']>;
  layoutCanvasWidth?: InputMaybe<Scalars['Int']['input']>;
  name: Scalars['String']['input'];
};

export type Cue = {
  __typename?: 'Cue';
  cueList: CueList;
  cueNumber: Scalars['Float']['output'];
  easingType?: Maybe<EasingType>;
  fadeInTime: Scalars['Float']['output'];
  fadeOutTime: Scalars['Float']['output'];
  followTime?: Maybe<Scalars['Float']['output']>;
  id: Scalars['ID']['output'];
  look: Look;
  name: Scalars['String']['output'];
  notes?: Maybe<Scalars['String']['output']>;
  /** When true, this cue is skipped during playback but remains visible in the UI */
  skip: Scalars['Boolean']['output'];
};

/** Links an effect to a cue with runtime parameters. */
export type CueEffect = {
  __typename?: 'CueEffect';
  cueId: Scalars['ID']['output'];
  effect?: Maybe<Effect>;
  effectId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  /** Intensity override (0-100) */
  intensity: Scalars['Float']['output'];
  /** Override effect's default cue change behavior */
  onCueChange?: Maybe<TransitionBehavior>;
  /** Speed/frequency multiplier */
  speed: Scalars['Float']['output'];
};

export type CueList = {
  __typename?: 'CueList';
  createdAt: Scalars['String']['output'];
  cueCount: Scalars['Int']['output'];
  cues: Array<Cue>;
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  loop: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  project: Project;
  totalDuration: Scalars['Float']['output'];
  updatedAt: Scalars['String']['output'];
};

export type CueListDataChangeType =
  | 'CUE_ADDED'
  | 'CUE_LIST_METADATA_CHANGED'
  | 'CUE_REMOVED'
  | 'CUE_REORDERED'
  | 'CUE_UPDATED'
  | 'LOOK_NAME_CHANGED';

/** Payload for cue list data change notifications */
export type CueListDataChangedPayload = {
  __typename?: 'CueListDataChangedPayload';
  /** Affected cue IDs (for cue changes) */
  affectedCueIds?: Maybe<Array<Scalars['ID']['output']>>;
  /** Affected look ID (for look name changes) */
  affectedLookId?: Maybe<Scalars['ID']['output']>;
  changeType: CueListDataChangeType;
  cueListId: Scalars['ID']['output'];
  /** New look name if this is a LOOK_NAME_CHANGED event */
  newLookName?: Maybe<Scalars['String']['output']>;
  /** Timestamp of the change */
  timestamp: Scalars['String']['output'];
};

export type CueListPlaybackStatus = {
  __typename?: 'CueListPlaybackStatus';
  cueListId: Scalars['ID']['output'];
  currentCue?: Maybe<Cue>;
  currentCueIndex?: Maybe<Scalars['Int']['output']>;
  fadeProgress?: Maybe<Scalars['Float']['output']>;
  /** True when a fade-in transition is in progress */
  isFading: Scalars['Boolean']['output'];
  /** True when the cue list is paused (look activated outside cue context, cue index preserved) */
  isPaused: Scalars['Boolean']['output'];
  /** True when a look's values are currently active on DMX fixtures (stays true after fade completes until stopped) */
  isPlaying: Scalars['Boolean']['output'];
  lastUpdated: Scalars['String']['output'];
  nextCue?: Maybe<Cue>;
  previousCue?: Maybe<Cue>;
};

export type CueListSummary = {
  __typename?: 'CueListSummary';
  createdAt: Scalars['String']['output'];
  cueCount: Scalars['Int']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  loop: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  totalDuration: Scalars['Float']['output'];
};

export type CueListUpdateItem = {
  cueListId: Scalars['ID']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  loop?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type CueOrderInput = {
  cueId: Scalars['ID']['input'];
  cueNumber: Scalars['Float']['input'];
};

export type CuePage = {
  __typename?: 'CuePage';
  cues: Array<Cue>;
  pagination: PaginationInfo;
};

export type CueUsageSummary = {
  __typename?: 'CueUsageSummary';
  cueId: Scalars['ID']['output'];
  cueListId: Scalars['ID']['output'];
  cueListName: Scalars['String']['output'];
  cueName: Scalars['String']['output'];
  cueNumber: Scalars['Float']['output'];
};

export type DifferenceType =
  | 'ONLY_IN_LOOK1'
  | 'ONLY_IN_LOOK2'
  | 'VALUES_CHANGED';

export type EasingType =
  | 'BEZIER'
  | 'EASE_IN_OUT_CUBIC'
  | 'EASE_IN_OUT_SINE'
  | 'EASE_OUT_EXPONENTIAL'
  | 'LINEAR'
  | 'S_CURVE';

/**
 * Effect definition for DMX modulation.
 * Effects can be waveform-based (LFO), crossfades, static values, or master faders.
 */
export type Effect = {
  __typename?: 'Effect';
  /** Amplitude as percentage (0-100) */
  amplitude: Scalars['Float']['output'];
  compositionMode: CompositionMode;
  createdAt: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  effectType: EffectType;
  fadeDuration?: Maybe<Scalars['Float']['output']>;
  fixtures: Array<EffectFixture>;
  /** Frequency in Hz */
  frequency: Scalars['Float']['output'];
  id: Scalars['ID']['output'];
  /** Master value for MASTER effects (0.0-1.0) */
  masterValue?: Maybe<Scalars['Float']['output']>;
  name: Scalars['String']['output'];
  /** Offset/baseline as percentage (0-100) */
  offset: Scalars['Float']['output'];
  onCueChange: TransitionBehavior;
  /** Phase offset in degrees (0-360) */
  phaseOffset: Scalars['Float']['output'];
  priorityBand: PriorityBand;
  prioritySub: Scalars['Int']['output'];
  projectId: Scalars['ID']['output'];
  updatedAt: Scalars['String']['output'];
  /** Waveform type for WAVEFORM effects */
  waveform?: Maybe<WaveformType>;
};

/** Per-channel overrides within an EffectFixture. */
export type EffectChannel = {
  __typename?: 'EffectChannel';
  /** Per-channel amplitude multiplier */
  amplitudeScale?: Maybe<Scalars['Float']['output']>;
  /** Channel offset from fixture start address */
  channelOffset?: Maybe<Scalars['Int']['output']>;
  /** Channel type (INTENSITY, RED, etc.) */
  channelType?: Maybe<Scalars['String']['output']>;
  effectFixtureId: Scalars['ID']['output'];
  /** Per-channel frequency multiplier */
  frequencyScale?: Maybe<Scalars['Float']['output']>;
  id: Scalars['ID']['output'];
};

/**
 * Input for adding or updating a channel within an effect fixture.
 * Target by offset OR type (not both).
 */
export type EffectChannelInput = {
  /** Amplitude scale for this channel (0-200%). Null uses effect's amplitude. */
  amplitudeScale?: InputMaybe<Scalars['Float']['input']>;
  /** Target by DMX offset (0-based). Null if targeting by type. */
  channelOffset?: InputMaybe<Scalars['Int']['input']>;
  /** Target by channel type. Null if targeting by offset. */
  channelType?: InputMaybe<ChannelType>;
  /** Frequency scale for this channel. Null uses effect's frequency. */
  frequencyScale?: InputMaybe<Scalars['Float']['input']>;
};

/** Links an effect to a fixture with per-fixture settings. */
export type EffectFixture = {
  __typename?: 'EffectFixture';
  /** Per-fixture amplitude multiplier */
  amplitudeScale?: Maybe<Scalars['Float']['output']>;
  channels: Array<EffectChannel>;
  effectId: Scalars['ID']['output'];
  /** Order of this fixture in the effect */
  effectOrder?: Maybe<Scalars['Int']['output']>;
  fixture?: Maybe<FixtureInstance>;
  fixtureId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  /** Per-fixture phase offset in degrees */
  phaseOffset?: Maybe<Scalars['Float']['output']>;
};

/**
 * Type of effect, determining its calculation behavior.
 * WAVEFORM - LFO-based continuous modulation using waveforms
 * CROSSFADE - Interpolates between channel states over time
 * STATIC - Sets channels to fixed values without modulation
 * MASTER - Multiplier effect for intensity scaling (grand master)
 */
export type EffectType =
  | 'CROSSFADE'
  | 'MASTER'
  | 'STATIC'
  | 'WAVEFORM';

export type ExportOptionsInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  includeCueLists?: InputMaybe<Scalars['Boolean']['input']>;
  includeFixtures?: InputMaybe<Scalars['Boolean']['input']>;
  includeLooks?: InputMaybe<Scalars['Boolean']['input']>;
};

export type ExportResult = {
  __typename?: 'ExportResult';
  jsonContent: Scalars['String']['output'];
  projectId: Scalars['String']['output'];
  projectName: Scalars['String']['output'];
  stats: ExportStats;
};

export type ExportStats = {
  __typename?: 'ExportStats';
  cueListsCount: Scalars['Int']['output'];
  cuesCount: Scalars['Int']['output'];
  fixtureDefinitionsCount: Scalars['Int']['output'];
  fixtureInstancesCount: Scalars['Int']['output'];
  lookBoardsCount: Scalars['Int']['output'];
  looksCount: Scalars['Int']['output'];
};

/**
 * Determines how a channel behaves during look transitions.
 * FADE - Interpolate smoothly between values (default for intensity, colors)
 * SNAP - Jump to target value at start of transition (for gobos, macros, effects)
 * SNAP_END - Jump to target value at end of transition
 */
export type FadeBehavior =
  | 'FADE'
  | 'SNAP'
  | 'SNAP_END';

export type FixtureChannelAssignment = {
  __typename?: 'FixtureChannelAssignment';
  channelCount: Scalars['Int']['output'];
  channelRange: Scalars['String']['output'];
  endChannel: Scalars['Int']['output'];
  fixtureName: Scalars['String']['output'];
  manufacturer: Scalars['String']['output'];
  mode?: Maybe<Scalars['String']['output']>;
  model: Scalars['String']['output'];
  startChannel: Scalars['Int']['output'];
};

export type FixtureConflictStrategy =
  | 'ERROR'
  | 'REPLACE'
  | 'SKIP';

export type FixtureDefinition = {
  __typename?: 'FixtureDefinition';
  channels: Array<ChannelDefinition>;
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isBuiltIn: Scalars['Boolean']['output'];
  manufacturer: Scalars['String']['output'];
  model: Scalars['String']['output'];
  modes: Array<FixtureMode>;
  type: FixtureType;
};

export type FixtureDefinitionFilter = {
  channelTypes?: InputMaybe<Array<ChannelType>>;
  isBuiltIn?: InputMaybe<Scalars['Boolean']['input']>;
  manufacturer?: InputMaybe<Scalars['String']['input']>;
  model?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<FixtureType>;
};

export type FixtureDefinitionUpdateItem = {
  definitionId: Scalars['ID']['input'];
  manufacturer?: InputMaybe<Scalars['String']['input']>;
  model?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<FixtureType>;
};

export type FixtureFilterInput = {
  manufacturer?: InputMaybe<Scalars['String']['input']>;
  model?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  type?: InputMaybe<FixtureType>;
  universe?: InputMaybe<Scalars['Int']['input']>;
};

export type FixtureInstance = {
  __typename?: 'FixtureInstance';
  channelCount: Scalars['Int']['output'];
  channels: Array<InstanceChannel>;
  createdAt: Scalars['String']['output'];
  definitionId: Scalars['ID']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  layoutRotation?: Maybe<Scalars['Float']['output']>;
  layoutX?: Maybe<Scalars['Float']['output']>;
  layoutY?: Maybe<Scalars['Float']['output']>;
  manufacturer: Scalars['String']['output'];
  modeName: Scalars['String']['output'];
  model: Scalars['String']['output'];
  name: Scalars['String']['output'];
  project: Project;
  projectOrder?: Maybe<Scalars['Int']['output']>;
  startChannel: Scalars['Int']['output'];
  tags: Array<Scalars['String']['output']>;
  type: FixtureType;
  universe: Scalars['Int']['output'];
};

export type FixtureInstancePage = {
  __typename?: 'FixtureInstancePage';
  fixtures: Array<FixtureInstance>;
  pagination: PaginationInfo;
};

export type FixtureMapping = {
  __typename?: 'FixtureMapping';
  lacyLightsKey: Scalars['String']['output'];
  qlcManufacturer: Scalars['String']['output'];
  qlcMode: Scalars['String']['output'];
  qlcModel: Scalars['String']['output'];
};

export type FixtureMappingInput = {
  lacyLightsKey: Scalars['String']['input'];
  qlcManufacturer: Scalars['String']['input'];
  qlcMode: Scalars['String']['input'];
  qlcModel: Scalars['String']['input'];
};

export type FixtureMappingSuggestion = {
  __typename?: 'FixtureMappingSuggestion';
  fixture: LacyLightsFixture;
  suggestions: Array<QlcFixtureDefinition>;
};

export type FixtureMode = {
  __typename?: 'FixtureMode';
  channelCount: Scalars['Int']['output'];
  channels: Array<ModeChannel>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  shortName?: Maybe<Scalars['String']['output']>;
};

export type FixtureOrderInput = {
  fixtureId: Scalars['ID']['input'];
  order: Scalars['Int']['input'];
};

export type FixturePositionInput = {
  fixtureId: Scalars['ID']['input'];
  layoutRotation?: InputMaybe<Scalars['Float']['input']>;
  layoutX: Scalars['Float']['input'];
  layoutY: Scalars['Float']['input'];
};

export type FixtureSpecInput = {
  channelCount?: InputMaybe<Scalars['Int']['input']>;
  manufacturer: Scalars['String']['input'];
  mode?: InputMaybe<Scalars['String']['input']>;
  model: Scalars['String']['input'];
  name: Scalars['String']['input'];
};

export type FixtureType =
  | 'DIMMER'
  | 'LED_PAR'
  | 'MOVING_HEAD'
  | 'OTHER'
  | 'STROBE';

export type FixtureUpdateItem = {
  description?: InputMaybe<Scalars['String']['input']>;
  fixtureId: Scalars['ID']['input'];
  layoutRotation?: InputMaybe<Scalars['Float']['input']>;
  layoutX?: InputMaybe<Scalars['Float']['input']>;
  layoutY?: InputMaybe<Scalars['Float']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  startChannel?: InputMaybe<Scalars['Int']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  universe?: InputMaybe<Scalars['Int']['input']>;
};

export type FixtureUsage = {
  __typename?: 'FixtureUsage';
  cues: Array<CueUsageSummary>;
  fixtureId: Scalars['ID']['output'];
  fixtureName: Scalars['String']['output'];
  looks: Array<LookSummary>;
};

export type FixtureValue = {
  __typename?: 'FixtureValue';
  channels: Array<ChannelValue>;
  fixture: FixtureInstance;
  id: Scalars['ID']['output'];
  lookOrder?: Maybe<Scalars['Int']['output']>;
};

export type FixtureValueInput = {
  channels: Array<ChannelValueInput>;
  fixtureId: Scalars['ID']['input'];
  lookOrder?: InputMaybe<Scalars['Int']['input']>;
};

/** Global playback status - returns which cue list is currently playing or paused (if any) */
export type GlobalPlaybackStatus = {
  __typename?: 'GlobalPlaybackStatus';
  /** Total number of cues in the playing cue list (null if not playing) */
  cueCount?: Maybe<Scalars['Int']['output']>;
  /** ID of the currently playing cue list (null if not playing) */
  cueListId?: Maybe<Scalars['ID']['output']>;
  /** Name of the currently playing cue list (null if not playing) */
  cueListName?: Maybe<Scalars['String']['output']>;
  /** Current cue index in the playing cue list (null if not playing) */
  currentCueIndex?: Maybe<Scalars['Int']['output']>;
  /** Name of the currently playing cue (null if not playing) */
  currentCueName?: Maybe<Scalars['String']['output']>;
  /** Fade progress percentage (0-100) */
  fadeProgress?: Maybe<Scalars['Float']['output']>;
  /** True if a fade transition is in progress */
  isFading: Scalars['Boolean']['output'];
  /** True if a cue list is paused (look activated outside cue context) */
  isPaused: Scalars['Boolean']['output'];
  /** True if any cue list is currently playing */
  isPlaying: Scalars['Boolean']['output'];
  lastUpdated: Scalars['String']['output'];
};

export type ImportMode =
  | 'CREATE'
  | 'MERGE';

export type ImportOflFixtureInput = {
  manufacturer: Scalars['String']['input'];
  oflFixtureJson: Scalars['String']['input'];
  replace?: InputMaybe<Scalars['Boolean']['input']>;
};

export type ImportOptionsInput = {
  fixtureConflictStrategy?: InputMaybe<FixtureConflictStrategy>;
  importBuiltInFixtures?: InputMaybe<Scalars['Boolean']['input']>;
  mode: ImportMode;
  projectName?: InputMaybe<Scalars['String']['input']>;
  targetProjectId?: InputMaybe<Scalars['ID']['input']>;
};

export type ImportResult = {
  __typename?: 'ImportResult';
  projectId: Scalars['String']['output'];
  stats: ImportStats;
  warnings: Array<Scalars['String']['output']>;
};

export type ImportStats = {
  __typename?: 'ImportStats';
  cueListsCreated: Scalars['Int']['output'];
  cuesCreated: Scalars['Int']['output'];
  fixtureDefinitionsCreated: Scalars['Int']['output'];
  fixtureInstancesCreated: Scalars['Int']['output'];
  lookBoardsCreated: Scalars['Int']['output'];
  looksCreated: Scalars['Int']['output'];
};

export type InstanceChannel = {
  __typename?: 'InstanceChannel';
  defaultValue: Scalars['Int']['output'];
  fadeBehavior: FadeBehavior;
  id: Scalars['ID']['output'];
  isDiscrete: Scalars['Boolean']['output'];
  maxValue: Scalars['Int']['output'];
  minValue: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  offset: Scalars['Int']['output'];
  type: ChannelType;
};

export type LacyLightsFixture = {
  __typename?: 'LacyLightsFixture';
  manufacturer: Scalars['String']['output'];
  model: Scalars['String']['output'];
};

export type Look = {
  __typename?: 'Look';
  createdAt: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  fixtureValues: Array<FixtureValue>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  project: Project;
  updatedAt: Scalars['String']['output'];
};

export type LookBoard = {
  __typename?: 'LookBoard';
  buttons: Array<LookBoardButton>;
  canvasHeight: Scalars['Int']['output'];
  canvasWidth: Scalars['Int']['output'];
  createdAt: Scalars['String']['output'];
  defaultFadeTime: Scalars['Float']['output'];
  description?: Maybe<Scalars['String']['output']>;
  gridSize?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  project: Project;
  updatedAt: Scalars['String']['output'];
};

export type LookBoardButton = {
  __typename?: 'LookBoardButton';
  color?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  height?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  label?: Maybe<Scalars['String']['output']>;
  layoutX: Scalars['Int']['output'];
  layoutY: Scalars['Int']['output'];
  look: Look;
  lookBoard: LookBoard;
  updatedAt: Scalars['String']['output'];
  width?: Maybe<Scalars['Int']['output']>;
};

export type LookBoardButtonPositionInput = {
  buttonId: Scalars['ID']['input'];
  layoutX: Scalars['Int']['input'];
  layoutY: Scalars['Int']['input'];
};

export type LookBoardButtonUpdateItem = {
  buttonId: Scalars['ID']['input'];
  color?: InputMaybe<Scalars['String']['input']>;
  height?: InputMaybe<Scalars['Int']['input']>;
  label?: InputMaybe<Scalars['String']['input']>;
  layoutX?: InputMaybe<Scalars['Int']['input']>;
  layoutY?: InputMaybe<Scalars['Int']['input']>;
  width?: InputMaybe<Scalars['Int']['input']>;
};

export type LookBoardUpdateItem = {
  canvasHeight?: InputMaybe<Scalars['Int']['input']>;
  canvasWidth?: InputMaybe<Scalars['Int']['input']>;
  defaultFadeTime?: InputMaybe<Scalars['Float']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  gridSize?: InputMaybe<Scalars['Int']['input']>;
  lookBoardId: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
};

export type LookComparison = {
  __typename?: 'LookComparison';
  differences: Array<LookDifference>;
  differentFixtureCount: Scalars['Int']['output'];
  identicalFixtureCount: Scalars['Int']['output'];
  look1: LookSummary;
  look2: LookSummary;
};

export type LookDifference = {
  __typename?: 'LookDifference';
  differenceType: DifferenceType;
  fixtureId: Scalars['ID']['output'];
  fixtureName: Scalars['String']['output'];
  look1Values?: Maybe<Array<Scalars['Int']['output']>>;
  look2Values?: Maybe<Array<Scalars['Int']['output']>>;
};

export type LookFilterInput = {
  nameContains?: InputMaybe<Scalars['String']['input']>;
  usesFixture?: InputMaybe<Scalars['ID']['input']>;
};

export type LookFixtureSummary = {
  __typename?: 'LookFixtureSummary';
  fixtureId: Scalars['ID']['output'];
  fixtureName: Scalars['String']['output'];
  fixtureType: FixtureType;
};

export type LookPage = {
  __typename?: 'LookPage';
  looks: Array<LookSummary>;
  pagination: PaginationInfo;
};

/**
 * Partial update for a single look in a bulk operation.
 * When mergeFixtures is true (default), only specified fixtures are updated.
 * When false, all existing fixtures are replaced with the provided list.
 */
export type LookPartialUpdateItem = {
  description?: InputMaybe<Scalars['String']['input']>;
  fixtureValues?: InputMaybe<Array<FixtureValueInput>>;
  lookId: Scalars['ID']['input'];
  /** When true (default), only specified fixtures are updated. When false, replaces all fixtures. */
  mergeFixtures?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type LookSortField =
  | 'CREATED_AT'
  | 'NAME'
  | 'UPDATED_AT';

export type LookSummary = {
  __typename?: 'LookSummary';
  createdAt: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  fixtureCount: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export type LookUpdateItem = {
  description?: InputMaybe<Scalars['String']['input']>;
  lookId: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
};

export type LookUsage = {
  __typename?: 'LookUsage';
  cues: Array<CueUsageSummary>;
  lookId: Scalars['ID']['output'];
  lookName: Scalars['String']['output'];
};

export type ModeChannel = {
  __typename?: 'ModeChannel';
  channel: ChannelDefinition;
  id: Scalars['ID']['output'];
  offset: Scalars['Int']['output'];
};

/** Status of the modulator engine. */
export type ModulatorStatus = {
  __typename?: 'ModulatorStatus';
  activeEffectCount: Scalars['Int']['output'];
  activeEffects: Array<ActiveEffectStatus>;
  blackoutIntensity: Scalars['Float']['output'];
  grandMasterValue: Scalars['Float']['output'];
  /** Whether there's an active crossfade transition */
  hasActiveTransition: Scalars['Boolean']['output'];
  isBlackoutActive: Scalars['Boolean']['output'];
  isRunning: Scalars['Boolean']['output'];
  /** Progress of the active transition (0-100) */
  transitionProgress: Scalars['Float']['output'];
  updateRateHz: Scalars['Int']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  /** Activate the system blackout with optional fade time */
  activateBlackout: Scalars['Boolean']['output'];
  /** Activate an effect with optional fade time */
  activateEffect: Scalars['Boolean']['output'];
  activateLookFromBoard: Scalars['Boolean']['output'];
  /** Add a channel to an effect fixture */
  addChannelToEffectFixture: EffectChannel;
  /** Add an effect to a cue with runtime parameters */
  addEffectToCue: CueEffect;
  /** Add a fixture to an effect with optional per-fixture settings */
  addFixtureToEffect: EffectFixture;
  addFixturesToLook: Look;
  addLookToBoard: LookBoardButton;
  bulkCreateCueLists: Array<CueList>;
  bulkCreateCues: Array<Cue>;
  bulkCreateFixtureDefinitions: Array<FixtureDefinition>;
  bulkCreateFixtures: Array<FixtureInstance>;
  bulkCreateLookBoardButtons: Array<LookBoardButton>;
  bulkCreateLookBoards: Array<LookBoard>;
  bulkCreateLooks: Array<Look>;
  bulkCreateProjects: Array<Project>;
  bulkDeleteCueLists: BulkDeleteResult;
  bulkDeleteCues: BulkDeleteResult;
  bulkDeleteFixtureDefinitions: BulkDeleteResult;
  bulkDeleteFixtures: BulkDeleteResult;
  bulkDeleteLookBoardButtons: BulkDeleteResult;
  bulkDeleteLookBoards: BulkDeleteResult;
  bulkDeleteLooks: BulkDeleteResult;
  bulkDeleteProjects: BulkDeleteResult;
  bulkUpdateCueLists: Array<CueList>;
  bulkUpdateCues: Array<Cue>;
  bulkUpdateFixtureDefinitions: Array<FixtureDefinition>;
  bulkUpdateFixtures: Array<FixtureInstance>;
  bulkUpdateInstanceChannelsFadeBehavior: Array<InstanceChannel>;
  bulkUpdateLookBoardButtons: Array<LookBoardButton>;
  bulkUpdateLookBoards: Array<LookBoard>;
  bulkUpdateLooks: Array<Look>;
  bulkUpdateLooksPartial: Array<Look>;
  bulkUpdateProjects: Array<Project>;
  /** Cancel an ongoing OFL import */
  cancelOFLImport: Scalars['Boolean']['output'];
  cancelPreviewSession: Scalars['Boolean']['output'];
  cloneLook: Look;
  commitPreviewSession: Scalars['Boolean']['output'];
  connectWiFi: WiFiConnectionResult;
  createCue: Cue;
  createCueList: CueList;
  /** Create a new effect */
  createEffect: Effect;
  createFixtureDefinition: FixtureDefinition;
  createFixtureInstance: FixtureInstance;
  createLook: Look;
  createLookBoard: LookBoard;
  createProject: Project;
  deleteCue: Scalars['Boolean']['output'];
  deleteCueList: Scalars['Boolean']['output'];
  /** Delete an effect */
  deleteEffect: Scalars['Boolean']['output'];
  deleteFixtureDefinition: Scalars['Boolean']['output'];
  deleteFixtureInstance: Scalars['Boolean']['output'];
  deleteLook: Scalars['Boolean']['output'];
  deleteLookBoard: Scalars['Boolean']['output'];
  deleteProject: Scalars['Boolean']['output'];
  disconnectWiFi: WiFiConnectionResult;
  duplicateLook: Look;
  exportProject: ExportResult;
  exportProjectToQLC: QlcExportResult;
  fadeToBlack: Scalars['Boolean']['output'];
  forgetWiFiNetwork: Scalars['Boolean']['output'];
  goToCue: Scalars['Boolean']['output'];
  importOFLFixture: FixtureDefinition;
  importProject: ImportResult;
  importProjectFromQLC: QlcImportResult;
  initializePreviewWithLook: Scalars['Boolean']['output'];
  nextCue: Scalars['Boolean']['output'];
  playCue: Scalars['Boolean']['output'];
  previousCue: Scalars['Boolean']['output'];
  /** Release the system blackout with optional fade time */
  releaseBlackout: Scalars['Boolean']['output'];
  /** Remove a channel from an effect fixture */
  removeChannelFromEffectFixture: Scalars['Boolean']['output'];
  /** Remove an effect from a cue */
  removeEffectFromCue: Scalars['Boolean']['output'];
  /** Remove a fixture from an effect */
  removeFixtureFromEffect: Scalars['Boolean']['output'];
  removeFixturesFromLook: Look;
  removeLookFromBoard: Scalars['Boolean']['output'];
  reorderCues: Scalars['Boolean']['output'];
  reorderLookFixtures: Scalars['Boolean']['output'];
  reorderProjectFixtures: Scalars['Boolean']['output'];
  resetAPTimeout: Scalars['Boolean']['output'];
  /** Resume a paused cue list by snapping to the current cue's look values instantly */
  resumeCueList: Scalars['Boolean']['output'];
  setArtNetEnabled: ArtNetStatus;
  setChannelValue: Scalars['Boolean']['output'];
  /** Set the grand master level (0.0-1.0) */
  setGrandMaster: Scalars['Boolean']['output'];
  setLookLive: Scalars['Boolean']['output'];
  setWiFiEnabled: WiFiStatus;
  startAPMode: WiFiModeResult;
  startCueList: Scalars['Boolean']['output'];
  startPreviewSession: PreviewSession;
  stopAPMode: WiFiModeResult;
  stopCueList: Scalars['Boolean']['output'];
  /** Stop an active effect with optional fade time */
  stopEffect: Scalars['Boolean']['output'];
  /** Toggle the skip status of a cue (skip=true means the cue is bypassed during playback) */
  toggleCueSkip: Cue;
  /** Trigger an OFL import/update operation */
  triggerOFLImport: OflImportResult;
  updateAllRepositories: Array<UpdateResult>;
  updateCue: Cue;
  updateCueList: CueList;
  /** Update an existing effect */
  updateEffect: Effect;
  /** Update an effect channel */
  updateEffectChannel: EffectChannel;
  /** Update fixture-specific settings in an effect */
  updateEffectFixture: EffectFixture;
  updateFadeUpdateRate: Scalars['Boolean']['output'];
  updateFixtureDefinition: FixtureDefinition;
  updateFixtureInstance: FixtureInstance;
  updateFixturePositions: Scalars['Boolean']['output'];
  updateInstanceChannelFadeBehavior: InstanceChannel;
  updateLook: Look;
  updateLookBoard: LookBoard;
  updateLookBoardButton: LookBoardButton;
  updateLookBoardButtonPositions: Scalars['Boolean']['output'];
  updateLookPartial: Look;
  updatePreviewChannel: Scalars['Boolean']['output'];
  updateProject: Project;
  updateRepository: UpdateResult;
  updateSetting: Setting;
};


export type MutationActivateBlackoutArgs = {
  fadeTime?: InputMaybe<Scalars['Float']['input']>;
};


export type MutationActivateEffectArgs = {
  effectId: Scalars['ID']['input'];
  fadeTime?: InputMaybe<Scalars['Float']['input']>;
};


export type MutationActivateLookFromBoardArgs = {
  fadeTimeOverride?: InputMaybe<Scalars['Float']['input']>;
  lookBoardId: Scalars['ID']['input'];
  lookId: Scalars['ID']['input'];
};


export type MutationAddChannelToEffectFixtureArgs = {
  effectFixtureId: Scalars['ID']['input'];
  input: EffectChannelInput;
};


export type MutationAddEffectToCueArgs = {
  input: AddEffectToCueInput;
};


export type MutationAddFixtureToEffectArgs = {
  input: AddFixtureToEffectInput;
};


export type MutationAddFixturesToLookArgs = {
  fixtureValues: Array<FixtureValueInput>;
  lookId: Scalars['ID']['input'];
  overwriteExisting?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationAddLookToBoardArgs = {
  input: CreateLookBoardButtonInput;
};


export type MutationBulkCreateCueListsArgs = {
  input: BulkCueListCreateInput;
};


export type MutationBulkCreateCuesArgs = {
  input: BulkCueCreateInput;
};


export type MutationBulkCreateFixtureDefinitionsArgs = {
  input: BulkFixtureDefinitionCreateInput;
};


export type MutationBulkCreateFixturesArgs = {
  input: BulkFixtureCreateInput;
};


export type MutationBulkCreateLookBoardButtonsArgs = {
  input: BulkLookBoardButtonCreateInput;
};


export type MutationBulkCreateLookBoardsArgs = {
  input: BulkLookBoardCreateInput;
};


export type MutationBulkCreateLooksArgs = {
  input: BulkLookCreateInput;
};


export type MutationBulkCreateProjectsArgs = {
  input: BulkProjectCreateInput;
};


export type MutationBulkDeleteCueListsArgs = {
  cueListIds: Array<Scalars['ID']['input']>;
};


export type MutationBulkDeleteCuesArgs = {
  cueIds: Array<Scalars['ID']['input']>;
};


export type MutationBulkDeleteFixtureDefinitionsArgs = {
  definitionIds: Array<Scalars['ID']['input']>;
};


export type MutationBulkDeleteFixturesArgs = {
  fixtureIds: Array<Scalars['ID']['input']>;
};


export type MutationBulkDeleteLookBoardButtonsArgs = {
  buttonIds: Array<Scalars['ID']['input']>;
};


export type MutationBulkDeleteLookBoardsArgs = {
  lookBoardIds: Array<Scalars['ID']['input']>;
};


export type MutationBulkDeleteLooksArgs = {
  lookIds: Array<Scalars['ID']['input']>;
};


export type MutationBulkDeleteProjectsArgs = {
  projectIds: Array<Scalars['ID']['input']>;
};


export type MutationBulkUpdateCueListsArgs = {
  input: BulkCueListUpdateInput;
};


export type MutationBulkUpdateCuesArgs = {
  input: BulkCueUpdateInput;
};


export type MutationBulkUpdateFixtureDefinitionsArgs = {
  input: BulkFixtureDefinitionUpdateInput;
};


export type MutationBulkUpdateFixturesArgs = {
  input: BulkFixtureUpdateInput;
};


export type MutationBulkUpdateInstanceChannelsFadeBehaviorArgs = {
  updates: Array<ChannelFadeBehaviorInput>;
};


export type MutationBulkUpdateLookBoardButtonsArgs = {
  input: BulkLookBoardButtonUpdateInput;
};


export type MutationBulkUpdateLookBoardsArgs = {
  input: BulkLookBoardUpdateInput;
};


export type MutationBulkUpdateLooksArgs = {
  input: BulkLookUpdateInput;
};


export type MutationBulkUpdateLooksPartialArgs = {
  input: BulkLookPartialUpdateInput;
};


export type MutationBulkUpdateProjectsArgs = {
  input: BulkProjectUpdateInput;
};


export type MutationCancelPreviewSessionArgs = {
  sessionId: Scalars['ID']['input'];
};


export type MutationCloneLookArgs = {
  lookId: Scalars['ID']['input'];
  newName: Scalars['String']['input'];
};


export type MutationCommitPreviewSessionArgs = {
  sessionId: Scalars['ID']['input'];
};


export type MutationConnectWiFiArgs = {
  password?: InputMaybe<Scalars['String']['input']>;
  ssid: Scalars['String']['input'];
};


export type MutationCreateCueArgs = {
  input: CreateCueInput;
};


export type MutationCreateCueListArgs = {
  input: CreateCueListInput;
};


export type MutationCreateEffectArgs = {
  input: CreateEffectInput;
};


export type MutationCreateFixtureDefinitionArgs = {
  input: CreateFixtureDefinitionInput;
};


export type MutationCreateFixtureInstanceArgs = {
  input: CreateFixtureInstanceInput;
};


export type MutationCreateLookArgs = {
  input: CreateLookInput;
};


export type MutationCreateLookBoardArgs = {
  input: CreateLookBoardInput;
};


export type MutationCreateProjectArgs = {
  input: CreateProjectInput;
};


export type MutationDeleteCueArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteCueListArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteEffectArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteFixtureDefinitionArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteFixtureInstanceArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteLookArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteLookBoardArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteProjectArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDuplicateLookArgs = {
  id: Scalars['ID']['input'];
};


export type MutationExportProjectArgs = {
  options?: InputMaybe<ExportOptionsInput>;
  projectId: Scalars['ID']['input'];
};


export type MutationExportProjectToQlcArgs = {
  fixtureMappings?: InputMaybe<Array<FixtureMappingInput>>;
  projectId: Scalars['ID']['input'];
};


export type MutationFadeToBlackArgs = {
  fadeOutTime: Scalars['Float']['input'];
};


export type MutationForgetWiFiNetworkArgs = {
  ssid: Scalars['String']['input'];
};


export type MutationGoToCueArgs = {
  cueIndex: Scalars['Int']['input'];
  cueListId: Scalars['ID']['input'];
  fadeInTime?: InputMaybe<Scalars['Float']['input']>;
};


export type MutationImportOflFixtureArgs = {
  input: ImportOflFixtureInput;
};


export type MutationImportProjectArgs = {
  jsonContent: Scalars['String']['input'];
  options: ImportOptionsInput;
};


export type MutationImportProjectFromQlcArgs = {
  originalFileName: Scalars['String']['input'];
  xmlContent: Scalars['String']['input'];
};


export type MutationInitializePreviewWithLookArgs = {
  lookId: Scalars['ID']['input'];
  sessionId: Scalars['ID']['input'];
};


export type MutationNextCueArgs = {
  cueListId: Scalars['ID']['input'];
  fadeInTime?: InputMaybe<Scalars['Float']['input']>;
};


export type MutationPlayCueArgs = {
  cueId: Scalars['ID']['input'];
  fadeInTime?: InputMaybe<Scalars['Float']['input']>;
};


export type MutationPreviousCueArgs = {
  cueListId: Scalars['ID']['input'];
  fadeInTime?: InputMaybe<Scalars['Float']['input']>;
};


export type MutationReleaseBlackoutArgs = {
  fadeTime?: InputMaybe<Scalars['Float']['input']>;
};


export type MutationRemoveChannelFromEffectFixtureArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRemoveEffectFromCueArgs = {
  cueId: Scalars['ID']['input'];
  effectId: Scalars['ID']['input'];
};


export type MutationRemoveFixtureFromEffectArgs = {
  effectId: Scalars['ID']['input'];
  fixtureId: Scalars['ID']['input'];
};


export type MutationRemoveFixturesFromLookArgs = {
  fixtureIds: Array<Scalars['ID']['input']>;
  lookId: Scalars['ID']['input'];
};


export type MutationRemoveLookFromBoardArgs = {
  buttonId: Scalars['ID']['input'];
};


export type MutationReorderCuesArgs = {
  cueListId: Scalars['ID']['input'];
  cueOrders: Array<CueOrderInput>;
};


export type MutationReorderLookFixturesArgs = {
  fixtureOrders: Array<FixtureOrderInput>;
  lookId: Scalars['ID']['input'];
};


export type MutationReorderProjectFixturesArgs = {
  fixtureOrders: Array<FixtureOrderInput>;
  projectId: Scalars['ID']['input'];
};


export type MutationResumeCueListArgs = {
  cueListId: Scalars['ID']['input'];
};


export type MutationSetArtNetEnabledArgs = {
  enabled: Scalars['Boolean']['input'];
  fadeTime?: InputMaybe<Scalars['Float']['input']>;
};


export type MutationSetChannelValueArgs = {
  channel: Scalars['Int']['input'];
  universe: Scalars['Int']['input'];
  value: Scalars['Int']['input'];
};


export type MutationSetGrandMasterArgs = {
  value: Scalars['Float']['input'];
};


export type MutationSetLookLiveArgs = {
  lookId: Scalars['ID']['input'];
};


export type MutationSetWiFiEnabledArgs = {
  enabled: Scalars['Boolean']['input'];
};


export type MutationStartCueListArgs = {
  cueListId: Scalars['ID']['input'];
  fadeInTime?: InputMaybe<Scalars['Float']['input']>;
  startFromCue?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationStartPreviewSessionArgs = {
  projectId: Scalars['ID']['input'];
};


export type MutationStopApModeArgs = {
  connectToSSID?: InputMaybe<Scalars['String']['input']>;
};


export type MutationStopCueListArgs = {
  cueListId: Scalars['ID']['input'];
};


export type MutationStopEffectArgs = {
  effectId: Scalars['ID']['input'];
  fadeTime?: InputMaybe<Scalars['Float']['input']>;
};


export type MutationToggleCueSkipArgs = {
  cueId: Scalars['ID']['input'];
};


export type MutationTriggerOflImportArgs = {
  options?: InputMaybe<OflImportOptionsInput>;
};


export type MutationUpdateCueArgs = {
  id: Scalars['ID']['input'];
  input: CreateCueInput;
};


export type MutationUpdateCueListArgs = {
  id: Scalars['ID']['input'];
  input: CreateCueListInput;
};


export type MutationUpdateEffectArgs = {
  id: Scalars['ID']['input'];
  input: UpdateEffectInput;
};


export type MutationUpdateEffectChannelArgs = {
  id: Scalars['ID']['input'];
  input: EffectChannelInput;
};


export type MutationUpdateEffectFixtureArgs = {
  id: Scalars['ID']['input'];
  input: UpdateEffectFixtureInput;
};


export type MutationUpdateFadeUpdateRateArgs = {
  rateHz: Scalars['Int']['input'];
};


export type MutationUpdateFixtureDefinitionArgs = {
  id: Scalars['ID']['input'];
  input: CreateFixtureDefinitionInput;
};


export type MutationUpdateFixtureInstanceArgs = {
  id: Scalars['ID']['input'];
  input: UpdateFixtureInstanceInput;
};


export type MutationUpdateFixturePositionsArgs = {
  positions: Array<FixturePositionInput>;
};


export type MutationUpdateInstanceChannelFadeBehaviorArgs = {
  channelId: Scalars['ID']['input'];
  fadeBehavior: FadeBehavior;
};


export type MutationUpdateLookArgs = {
  id: Scalars['ID']['input'];
  input: UpdateLookInput;
};


export type MutationUpdateLookBoardArgs = {
  id: Scalars['ID']['input'];
  input: UpdateLookBoardInput;
};


export type MutationUpdateLookBoardButtonArgs = {
  id: Scalars['ID']['input'];
  input: UpdateLookBoardButtonInput;
};


export type MutationUpdateLookBoardButtonPositionsArgs = {
  positions: Array<LookBoardButtonPositionInput>;
};


export type MutationUpdateLookPartialArgs = {
  description?: InputMaybe<Scalars['String']['input']>;
  fixtureValues?: InputMaybe<Array<FixtureValueInput>>;
  lookId: Scalars['ID']['input'];
  mergeFixtures?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};


export type MutationUpdatePreviewChannelArgs = {
  channelIndex: Scalars['Int']['input'];
  fixtureId: Scalars['ID']['input'];
  sessionId: Scalars['ID']['input'];
  value: Scalars['Int']['input'];
};


export type MutationUpdateProjectArgs = {
  id: Scalars['ID']['input'];
  input: CreateProjectInput;
};


export type MutationUpdateRepositoryArgs = {
  repository: Scalars['String']['input'];
  version?: InputMaybe<Scalars['String']['input']>;
};


export type MutationUpdateSettingArgs = {
  input: UpdateSettingInput;
};

export type NetworkInterfaceOption = {
  __typename?: 'NetworkInterfaceOption';
  address: Scalars['String']['output'];
  broadcast: Scalars['String']['output'];
  description: Scalars['String']['output'];
  interfaceType: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

/** Type of fixture change detected during OFL update check */
export type OflFixtureChangeType =
  | 'NEW'
  | 'UNCHANGED'
  | 'UPDATED';

/** Information about a fixture that may need updating */
export type OflFixtureUpdate = {
  __typename?: 'OFLFixtureUpdate';
  /** Type of change */
  changeType: OflFixtureChangeType;
  /** Current hash (null if new) */
  currentHash?: Maybe<Scalars['String']['output']>;
  /** Unique key (manufacturer/model) */
  fixtureKey: Scalars['String']['output'];
  /** Number of instances using this definition */
  instanceCount: Scalars['Int']['output'];
  /** Whether this fixture is currently in use by any project */
  isInUse: Scalars['Boolean']['output'];
  /** Manufacturer name */
  manufacturer: Scalars['String']['output'];
  /** Model name */
  model: Scalars['String']['output'];
  /** New hash from OFL */
  newHash: Scalars['String']['output'];
};

/** Options for triggering an OFL import */
export type OflImportOptionsInput = {
  /** Force reimport of all fixtures, even if unchanged */
  forceReimport?: InputMaybe<Scalars['Boolean']['input']>;
  /** Only import specific manufacturers (empty = all) */
  manufacturers?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Prefer bundled data over fetching from GitHub */
  preferBundled?: InputMaybe<Scalars['Boolean']['input']>;
  /** Update fixtures that are currently in use by projects */
  updateInUseFixtures?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Phases of the OFL import process */
export type OflImportPhase =
  | 'CANCELLED'
  | 'COMPLETE'
  | 'DOWNLOADING'
  | 'EXTRACTING'
  | 'FAILED'
  | 'IDLE'
  | 'IMPORTING'
  | 'PARSING';

/** Final result of an OFL import operation */
export type OflImportResult = {
  __typename?: 'OFLImportResult';
  errorMessage?: Maybe<Scalars['String']['output']>;
  oflVersion: Scalars['String']['output'];
  stats: OflImportStats;
  success: Scalars['Boolean']['output'];
};

/** Statistics about an OFL import */
export type OflImportStats = {
  __typename?: 'OFLImportStats';
  durationSeconds: Scalars['Float']['output'];
  failedImports: Scalars['Int']['output'];
  skippedDuplicates: Scalars['Int']['output'];
  successfulImports: Scalars['Int']['output'];
  totalProcessed: Scalars['Int']['output'];
  updatedFixtures: Scalars['Int']['output'];
};

/** Real-time status of an OFL import operation */
export type OflImportStatus = {
  __typename?: 'OFLImportStatus';
  /** When the import completed (if done) */
  completedAt?: Maybe<Scalars['String']['output']>;
  /** Name of the current fixture being imported */
  currentFixture?: Maybe<Scalars['String']['output']>;
  /** Current manufacturer being processed */
  currentManufacturer?: Maybe<Scalars['String']['output']>;
  /** Error message if phase is FAILED */
  errorMessage?: Maybe<Scalars['String']['output']>;
  /** Estimated seconds remaining (null if unknown) */
  estimatedSecondsRemaining?: Maybe<Scalars['Int']['output']>;
  /** Number of fixtures that failed to import */
  failedCount: Scalars['Int']['output'];
  /** Number of fixtures successfully imported */
  importedCount: Scalars['Int']['output'];
  /** Whether an import is currently in progress */
  isImporting: Scalars['Boolean']['output'];
  /** OFL version/commit being imported */
  oflVersion?: Maybe<Scalars['String']['output']>;
  /** Percentage complete (0-100) */
  percentComplete: Scalars['Float']['output'];
  /** Current phase of the import */
  phase: OflImportPhase;
  /** Number of fixtures skipped (already exist) */
  skippedCount: Scalars['Int']['output'];
  /** When the import started */
  startedAt?: Maybe<Scalars['String']['output']>;
  /** Total number of fixtures to import */
  totalFixtures: Scalars['Int']['output'];
  /** Whether using bundled data (offline) or fetched from GitHub */
  usingBundledData: Scalars['Boolean']['output'];
};

/** Result of checking for OFL updates */
export type OflUpdateCheckResult = {
  __typename?: 'OFLUpdateCheckResult';
  /** Number of changed fixtures */
  changedFixtureCount: Scalars['Int']['output'];
  /** Number of changed fixtures that are in use */
  changedInUseCount: Scalars['Int']['output'];
  /** When this check was performed */
  checkedAt: Scalars['String']['output'];
  /** Total fixtures in current database */
  currentFixtureCount: Scalars['Int']['output'];
  /** Detailed list of fixture changes (limited) */
  fixtureUpdates: Array<OflFixtureUpdate>;
  /** Number of new fixtures available */
  newFixtureCount: Scalars['Int']['output'];
  /** Total fixtures in OFL source */
  oflFixtureCount: Scalars['Int']['output'];
  /** OFL version/commit being checked */
  oflVersion: Scalars['String']['output'];
};

export type PaginationInfo = {
  __typename?: 'PaginationInfo';
  hasMore: Scalars['Boolean']['output'];
  page: Scalars['Int']['output'];
  perPage: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
  totalPages: Scalars['Int']['output'];
};

export type PreviewSession = {
  __typename?: 'PreviewSession';
  createdAt: Scalars['String']['output'];
  dmxOutput: Array<UniverseOutput>;
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  project: Project;
  user: User;
};

/**
 * Priority band determines effect processing order.
 * Effects in higher bands (SYSTEM) override effects in lower bands (BASE).
 */
export type PriorityBand =
  | 'BASE'
  | 'CUE'
  | 'SYSTEM'
  | 'USER';

export type Project = {
  __typename?: 'Project';
  createdAt: Scalars['String']['output'];
  cueListCount: Scalars['Int']['output'];
  cueLists: Array<CueList>;
  description?: Maybe<Scalars['String']['output']>;
  fixtureCount: Scalars['Int']['output'];
  fixtures: Array<FixtureInstance>;
  id: Scalars['ID']['output'];
  layoutCanvasHeight: Scalars['Int']['output'];
  layoutCanvasWidth: Scalars['Int']['output'];
  lookBoards: Array<LookBoard>;
  lookCount: Scalars['Int']['output'];
  looks: Array<Look>;
  name: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  users: Array<ProjectUser>;
};

export type ProjectRole =
  | 'EDITOR'
  | 'OWNER'
  | 'VIEWER';

export type ProjectUpdateItem = {
  description?: InputMaybe<Scalars['String']['input']>;
  layoutCanvasHeight?: InputMaybe<Scalars['Int']['input']>;
  layoutCanvasWidth?: InputMaybe<Scalars['Int']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  projectId: Scalars['ID']['input'];
};

export type ProjectUser = {
  __typename?: 'ProjectUser';
  id: Scalars['ID']['output'];
  joinedAt: Scalars['String']['output'];
  project: Project;
  role: ProjectRole;
  user: User;
};

export type QlcExportResult = {
  __typename?: 'QLCExportResult';
  cueListCount: Scalars['Int']['output'];
  fixtureCount: Scalars['Int']['output'];
  lookCount: Scalars['Int']['output'];
  projectName: Scalars['String']['output'];
  xmlContent: Scalars['String']['output'];
};

export type QlcFixtureDefinition = {
  __typename?: 'QLCFixtureDefinition';
  manufacturer: Scalars['String']['output'];
  model: Scalars['String']['output'];
  modes: Array<QlcFixtureMode>;
  type: Scalars['String']['output'];
};

export type QlcFixtureMappingResult = {
  __typename?: 'QLCFixtureMappingResult';
  defaultMappings: Array<FixtureMapping>;
  lacyLightsFixtures: Array<LacyLightsFixture>;
  projectId: Scalars['String']['output'];
  suggestions: Array<FixtureMappingSuggestion>;
};

export type QlcFixtureMode = {
  __typename?: 'QLCFixtureMode';
  channelCount: Scalars['Int']['output'];
  name: Scalars['String']['output'];
};

export type QlcImportResult = {
  __typename?: 'QLCImportResult';
  cueListCount: Scalars['Int']['output'];
  fixtureCount: Scalars['Int']['output'];
  lookCount: Scalars['Int']['output'];
  originalFileName: Scalars['String']['output'];
  project: Project;
  warnings: Array<Scalars['String']['output']>;
};

export type Query = {
  __typename?: 'Query';
  allDmxOutput: Array<UniverseOutput>;
  apClients: Array<ApClient>;
  apConfig?: Maybe<ApConfig>;
  artNetStatus: ArtNetStatus;
  availableVersions: Array<Scalars['String']['output']>;
  /** Get server build information for version verification */
  buildInfo: BuildInfo;
  channelMap: ChannelMapResult;
  /** Check for available OFL updates without importing */
  checkOFLUpdates: OflUpdateCheckResult;
  compareLooks: LookComparison;
  cue?: Maybe<Cue>;
  cueList?: Maybe<CueList>;
  cueListPlaybackStatus?: Maybe<CueListPlaybackStatus>;
  cueLists: Array<CueListSummary>;
  cueListsByIds: Array<CueList>;
  cuesByIds: Array<Cue>;
  currentActiveLook?: Maybe<Look>;
  dmxOutput: Array<Scalars['Int']['output']>;
  /** Get a single effect by ID */
  effect?: Maybe<Effect>;
  /** List all effects in a project */
  effects: Array<Effect>;
  fixtureDefinition?: Maybe<FixtureDefinition>;
  fixtureDefinitions: Array<FixtureDefinition>;
  fixtureDefinitionsByIds: Array<FixtureDefinition>;
  fixtureInstance?: Maybe<FixtureInstance>;
  fixtureInstances: FixtureInstancePage;
  fixtureUsage: FixtureUsage;
  fixturesByIds: Array<FixtureInstance>;
  getQLCFixtureMappingSuggestions: QlcFixtureMappingResult;
  /** Get global playback status - which cue list is currently playing (if any) */
  globalPlaybackStatus: GlobalPlaybackStatus;
  look?: Maybe<Look>;
  lookBoard?: Maybe<LookBoard>;
  lookBoardButton?: Maybe<LookBoardButton>;
  lookBoards: Array<LookBoard>;
  lookBoardsByIds: Array<LookBoard>;
  lookFixtures: Array<LookFixtureSummary>;
  lookUsage: LookUsage;
  looks: LookPage;
  looksByIds: Array<Look>;
  /** Get the current status of the modulator engine */
  modulatorStatus: ModulatorStatus;
  networkInterfaceOptions: Array<NetworkInterfaceOption>;
  /** Get the current status of any ongoing OFL import */
  oflImportStatus: OflImportStatus;
  previewSession?: Maybe<PreviewSession>;
  project?: Maybe<Project>;
  projects: Array<Project>;
  projectsByIds: Array<Project>;
  savedWifiNetworks: Array<WiFiNetwork>;
  searchCues: CuePage;
  searchFixtures: FixtureInstancePage;
  searchLooks: LookPage;
  setting?: Maybe<Setting>;
  settings: Array<Setting>;
  suggestChannelAssignment: ChannelAssignmentSuggestion;
  systemInfo: SystemInfo;
  systemVersions: SystemVersionInfo;
  wifiMode: WiFiMode;
  wifiNetworks: Array<WiFiNetwork>;
  wifiStatus: WiFiStatus;
};


export type QueryAvailableVersionsArgs = {
  repository: Scalars['String']['input'];
};


export type QueryChannelMapArgs = {
  projectId: Scalars['ID']['input'];
  universe?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryCompareLooksArgs = {
  lookId1: Scalars['ID']['input'];
  lookId2: Scalars['ID']['input'];
};


export type QueryCueArgs = {
  id: Scalars['ID']['input'];
};


export type QueryCueListArgs = {
  id: Scalars['ID']['input'];
  includeLookDetails?: InputMaybe<Scalars['Boolean']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  perPage?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryCueListPlaybackStatusArgs = {
  cueListId: Scalars['ID']['input'];
};


export type QueryCueListsArgs = {
  projectId: Scalars['ID']['input'];
};


export type QueryCueListsByIdsArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type QueryCuesByIdsArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type QueryDmxOutputArgs = {
  universe: Scalars['Int']['input'];
};


export type QueryEffectArgs = {
  id: Scalars['ID']['input'];
};


export type QueryEffectsArgs = {
  projectId: Scalars['ID']['input'];
};


export type QueryFixtureDefinitionArgs = {
  id: Scalars['ID']['input'];
};


export type QueryFixtureDefinitionsArgs = {
  filter?: InputMaybe<FixtureDefinitionFilter>;
};


export type QueryFixtureDefinitionsByIdsArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type QueryFixtureInstanceArgs = {
  id: Scalars['ID']['input'];
};


export type QueryFixtureInstancesArgs = {
  filter?: InputMaybe<FixtureFilterInput>;
  page?: InputMaybe<Scalars['Int']['input']>;
  perPage?: InputMaybe<Scalars['Int']['input']>;
  projectId: Scalars['ID']['input'];
};


export type QueryFixtureUsageArgs = {
  fixtureId: Scalars['ID']['input'];
};


export type QueryFixturesByIdsArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type QueryGetQlcFixtureMappingSuggestionsArgs = {
  projectId: Scalars['ID']['input'];
};


export type QueryLookArgs = {
  id: Scalars['ID']['input'];
  includeFixtureValues?: InputMaybe<Scalars['Boolean']['input']>;
};


export type QueryLookBoardArgs = {
  id: Scalars['ID']['input'];
};


export type QueryLookBoardButtonArgs = {
  id: Scalars['ID']['input'];
};


export type QueryLookBoardsArgs = {
  projectId: Scalars['ID']['input'];
};


export type QueryLookBoardsByIdsArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type QueryLookFixturesArgs = {
  lookId: Scalars['ID']['input'];
};


export type QueryLookUsageArgs = {
  lookId: Scalars['ID']['input'];
};


export type QueryLooksArgs = {
  filter?: InputMaybe<LookFilterInput>;
  page?: InputMaybe<Scalars['Int']['input']>;
  perPage?: InputMaybe<Scalars['Int']['input']>;
  projectId: Scalars['ID']['input'];
  sortBy?: InputMaybe<LookSortField>;
};


export type QueryLooksByIdsArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type QueryPreviewSessionArgs = {
  sessionId: Scalars['ID']['input'];
};


export type QueryProjectArgs = {
  id: Scalars['ID']['input'];
};


export type QueryProjectsByIdsArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type QuerySearchCuesArgs = {
  cueListId: Scalars['ID']['input'];
  page?: InputMaybe<Scalars['Int']['input']>;
  perPage?: InputMaybe<Scalars['Int']['input']>;
  query: Scalars['String']['input'];
};


export type QuerySearchFixturesArgs = {
  filter?: InputMaybe<FixtureFilterInput>;
  page?: InputMaybe<Scalars['Int']['input']>;
  perPage?: InputMaybe<Scalars['Int']['input']>;
  projectId: Scalars['ID']['input'];
  query: Scalars['String']['input'];
};


export type QuerySearchLooksArgs = {
  filter?: InputMaybe<LookFilterInput>;
  page?: InputMaybe<Scalars['Int']['input']>;
  perPage?: InputMaybe<Scalars['Int']['input']>;
  projectId: Scalars['ID']['input'];
  query: Scalars['String']['input'];
};


export type QuerySettingArgs = {
  key: Scalars['String']['input'];
};


export type QuerySuggestChannelAssignmentArgs = {
  input: ChannelAssignmentInput;
};


export type QueryWifiNetworksArgs = {
  deduplicate?: InputMaybe<Scalars['Boolean']['input']>;
  rescan?: InputMaybe<Scalars['Boolean']['input']>;
};

export type RepositoryVersion = {
  __typename?: 'RepositoryVersion';
  installed: Scalars['String']['output'];
  latest: Scalars['String']['output'];
  repository: Scalars['String']['output'];
  updateAvailable: Scalars['Boolean']['output'];
};

export type Setting = {
  __typename?: 'Setting';
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  key: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

export type Subscription = {
  __typename?: 'Subscription';
  /** Real-time updates when cue list data changes (cue added/updated/removed, reordering, metadata changes, look name changes) */
  cueListDataChanged: CueListDataChangedPayload;
  cueListPlaybackUpdated: CueListPlaybackStatus;
  dmxOutputChanged: UniverseOutput;
  /** Global playback status updates - triggered when any cue list starts/stops/changes cue */
  globalPlaybackStatusUpdated: GlobalPlaybackStatus;
  /** Real-time updates during OFL import */
  oflImportProgress: OflImportStatus;
  previewSessionUpdated: PreviewSession;
  projectUpdated: Project;
  systemInfoUpdated: SystemInfo;
  wifiModeChanged: WiFiMode;
  wifiStatusUpdated: WiFiStatus;
};


export type SubscriptionCueListDataChangedArgs = {
  cueListId: Scalars['ID']['input'];
};


export type SubscriptionCueListPlaybackUpdatedArgs = {
  cueListId: Scalars['ID']['input'];
};


export type SubscriptionDmxOutputChangedArgs = {
  universe?: InputMaybe<Scalars['Int']['input']>;
};


export type SubscriptionPreviewSessionUpdatedArgs = {
  projectId: Scalars['ID']['input'];
};


export type SubscriptionProjectUpdatedArgs = {
  projectId: Scalars['ID']['input'];
};

export type SystemInfo = {
  __typename?: 'SystemInfo';
  artnetBroadcastAddress: Scalars['String']['output'];
  artnetEnabled: Scalars['Boolean']['output'];
  fadeUpdateRateHz: Scalars['Int']['output'];
};

export type SystemVersionInfo = {
  __typename?: 'SystemVersionInfo';
  lastChecked: Scalars['String']['output'];
  repositories: Array<RepositoryVersion>;
  versionManagementSupported: Scalars['Boolean']['output'];
};

/**
 * How an effect behaves when a cue change occurs.
 * FADE_OUT - Effect fades out when cue changes
 * PERSIST - Effect persists across cue changes
 * SNAP_OFF - Effect immediately stops when cue changes
 * CROSSFADE_PARAMS - Effect parameters crossfade to new values
 */
export type TransitionBehavior =
  | 'CROSSFADE_PARAMS'
  | 'FADE_OUT'
  | 'PERSIST'
  | 'SNAP_OFF';

export type UniverseChannelMap = {
  __typename?: 'UniverseChannelMap';
  availableChannels: Scalars['Int']['output'];
  channelUsage: Array<Maybe<ChannelUsage>>;
  fixtures: Array<ChannelMapFixture>;
  universe: Scalars['Int']['output'];
  usedChannels: Scalars['Int']['output'];
};

export type UniverseOutput = {
  __typename?: 'UniverseOutput';
  channels: Array<Scalars['Int']['output']>;
  universe: Scalars['Int']['output'];
};

/** Input for updating an effect fixture's settings. */
export type UpdateEffectFixtureInput = {
  /** Amplitude scale for this fixture (0-200%). */
  amplitudeScale?: InputMaybe<Scalars['Float']['input']>;
  /** Order for auto-phase distribution. */
  effectOrder?: InputMaybe<Scalars['Int']['input']>;
  /** Phase offset override for this fixture (degrees). */
  phaseOffset?: InputMaybe<Scalars['Float']['input']>;
};

export type UpdateEffectInput = {
  amplitude?: InputMaybe<Scalars['Float']['input']>;
  compositionMode?: InputMaybe<CompositionMode>;
  description?: InputMaybe<Scalars['String']['input']>;
  effectType?: InputMaybe<EffectType>;
  fadeDuration?: InputMaybe<Scalars['Float']['input']>;
  frequency?: InputMaybe<Scalars['Float']['input']>;
  masterValue?: InputMaybe<Scalars['Float']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  offset?: InputMaybe<Scalars['Float']['input']>;
  onCueChange?: InputMaybe<TransitionBehavior>;
  phaseOffset?: InputMaybe<Scalars['Float']['input']>;
  priorityBand?: InputMaybe<PriorityBand>;
  prioritySub?: InputMaybe<Scalars['Int']['input']>;
  waveform?: InputMaybe<WaveformType>;
};

export type UpdateFixtureInstanceInput = {
  definitionId?: InputMaybe<Scalars['ID']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  layoutRotation?: InputMaybe<Scalars['Float']['input']>;
  layoutX?: InputMaybe<Scalars['Float']['input']>;
  layoutY?: InputMaybe<Scalars['Float']['input']>;
  modeId?: InputMaybe<Scalars['ID']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  projectOrder?: InputMaybe<Scalars['Int']['input']>;
  startChannel?: InputMaybe<Scalars['Int']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  universe?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdateLookBoardButtonInput = {
  color?: InputMaybe<Scalars['String']['input']>;
  height?: InputMaybe<Scalars['Int']['input']>;
  label?: InputMaybe<Scalars['String']['input']>;
  layoutX?: InputMaybe<Scalars['Int']['input']>;
  layoutY?: InputMaybe<Scalars['Int']['input']>;
  width?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdateLookBoardInput = {
  canvasHeight?: InputMaybe<Scalars['Int']['input']>;
  canvasWidth?: InputMaybe<Scalars['Int']['input']>;
  defaultFadeTime?: InputMaybe<Scalars['Float']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  gridSize?: InputMaybe<Scalars['Int']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateLookInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  fixtureValues?: InputMaybe<Array<FixtureValueInput>>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateResult = {
  __typename?: 'UpdateResult';
  error?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  newVersion: Scalars['String']['output'];
  previousVersion: Scalars['String']['output'];
  repository: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type UpdateSettingInput = {
  key: Scalars['String']['input'];
  value: Scalars['String']['input'];
};

export type User = {
  __typename?: 'User';
  createdAt: Scalars['String']['output'];
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name?: Maybe<Scalars['String']['output']>;
  role: UserRole;
};

export type UserRole =
  | 'ADMIN'
  | 'USER';

/** Waveform type for LFO-based effects. */
export type WaveformType =
  | 'COSINE'
  | 'RANDOM'
  | 'SAWTOOTH'
  | 'SINE'
  | 'SQUARE'
  | 'TRIANGLE';

export type WiFiConnectionResult = {
  __typename?: 'WiFiConnectionResult';
  connected: Scalars['Boolean']['output'];
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type WiFiMode =
  | 'AP'
  | 'CLIENT'
  | 'CONNECTING'
  | 'DISABLED'
  | 'STARTING_AP';

export type WiFiModeResult = {
  __typename?: 'WiFiModeResult';
  message?: Maybe<Scalars['String']['output']>;
  mode: WiFiMode;
  success: Scalars['Boolean']['output'];
};

export type WiFiNetwork = {
  __typename?: 'WiFiNetwork';
  frequency: Scalars['String']['output'];
  inUse: Scalars['Boolean']['output'];
  saved: Scalars['Boolean']['output'];
  security: WiFiSecurityType;
  signalStrength: Scalars['Int']['output'];
  ssid: Scalars['String']['output'];
};

export type WiFiSecurityType =
  | 'OPEN'
  | 'OWE'
  | 'WEP'
  | 'WPA3_EAP'
  | 'WPA3_PSK'
  | 'WPA_EAP'
  | 'WPA_PSK';

export type WiFiStatus = {
  __typename?: 'WiFiStatus';
  apConfig?: Maybe<ApConfig>;
  available: Scalars['Boolean']['output'];
  connected: Scalars['Boolean']['output'];
  connectedClients?: Maybe<Array<ApClient>>;
  enabled: Scalars['Boolean']['output'];
  frequency?: Maybe<Scalars['String']['output']>;
  ipAddress?: Maybe<Scalars['String']['output']>;
  macAddress?: Maybe<Scalars['String']['output']>;
  mode: WiFiMode;
  signalStrength?: Maybe<Scalars['Int']['output']>;
  ssid?: Maybe<Scalars['String']['output']>;
};
