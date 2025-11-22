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

export type BulkCueUpdateInput = {
  cueIds: Array<Scalars['ID']['input']>;
  easingType?: InputMaybe<EasingType>;
  fadeInTime?: InputMaybe<Scalars['Float']['input']>;
  fadeOutTime?: InputMaybe<Scalars['Float']['input']>;
  followTime?: InputMaybe<Scalars['Float']['input']>;
};

export type BulkFixtureCreateInput = {
  fixtures: Array<CreateFixtureInstanceInput>;
};

export type BulkFixtureUpdateInput = {
  fixtures: Array<FixtureUpdateItem>;
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
  id: Scalars['ID']['output'];
  maxValue: Scalars['Int']['output'];
  minValue: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  offset: Scalars['Int']['output'];
  type: ChannelType;
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
  | 'COLOR_WHEEL'
  | 'EFFECT'
  | 'FOCUS'
  | 'GOBO'
  | 'GREEN'
  | 'INTENSITY'
  | 'IRIS'
  | 'MACRO'
  | 'OTHER'
  | 'PAN'
  | 'RED'
  | 'STROBE'
  | 'TILT'
  | 'UV'
  | 'WHITE'
  | 'ZOOM';

export type ChannelUsage = {
  __typename?: 'ChannelUsage';
  channelType: ChannelType;
  fixtureId: Scalars['ID']['output'];
  fixtureName: Scalars['String']['output'];
};

export type CreateChannelDefinitionInput = {
  defaultValue: Scalars['Int']['input'];
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
  name: Scalars['String']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
  sceneId: Scalars['ID']['input'];
};

export type CreateCueListInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  loop?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
  projectId: Scalars['ID']['input'];
};

export type CreateFixtureDefinitionInput = {
  channels: Array<CreateChannelDefinitionInput>;
  manufacturer: Scalars['String']['input'];
  model: Scalars['String']['input'];
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

export type CreateProjectInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};

export type CreateSceneBoardButtonInput = {
  color?: InputMaybe<Scalars['String']['input']>;
  height?: InputMaybe<Scalars['Int']['input']>;
  label?: InputMaybe<Scalars['String']['input']>;
  layoutX: Scalars['Int']['input'];
  layoutY: Scalars['Int']['input'];
  sceneBoardId: Scalars['ID']['input'];
  sceneId: Scalars['ID']['input'];
  width?: InputMaybe<Scalars['Int']['input']>;
};

export type CreateSceneBoardInput = {
  canvasHeight?: InputMaybe<Scalars['Int']['input']>;
  canvasWidth?: InputMaybe<Scalars['Int']['input']>;
  defaultFadeTime?: InputMaybe<Scalars['Float']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  gridSize?: InputMaybe<Scalars['Int']['input']>;
  name: Scalars['String']['input'];
  projectId: Scalars['ID']['input'];
};

export type CreateSceneInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  fixtureValues: Array<FixtureValueInput>;
  name: Scalars['String']['input'];
  projectId: Scalars['ID']['input'];
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
  name: Scalars['String']['output'];
  notes?: Maybe<Scalars['String']['output']>;
  scene: Scene;
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

export type CueListPlaybackStatus = {
  __typename?: 'CueListPlaybackStatus';
  cueListId: Scalars['ID']['output'];
  currentCue?: Maybe<Cue>;
  currentCueIndex?: Maybe<Scalars['Int']['output']>;
  fadeProgress?: Maybe<Scalars['Float']['output']>;
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
  | 'ONLY_IN_SCENE1'
  | 'ONLY_IN_SCENE2'
  | 'VALUES_CHANGED';

export type EasingType =
  | 'BEZIER'
  | 'EASE_IN_OUT_CUBIC'
  | 'EASE_IN_OUT_SINE'
  | 'EASE_OUT_EXPONENTIAL'
  | 'LINEAR'
  | 'S_CURVE';

export type ExportOptionsInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  includeCueLists?: InputMaybe<Scalars['Boolean']['input']>;
  includeFixtures?: InputMaybe<Scalars['Boolean']['input']>;
  includeScenes?: InputMaybe<Scalars['Boolean']['input']>;
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
  scenesCount: Scalars['Int']['output'];
};

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
  scenes: Array<SceneSummary>;
};

export type FixtureValue = {
  __typename?: 'FixtureValue';
  channelValues: Array<Scalars['Int']['output']>;
  fixture: FixtureInstance;
  id: Scalars['ID']['output'];
  sceneOrder?: Maybe<Scalars['Int']['output']>;
};

export type FixtureValueInput = {
  channelValues: Array<Scalars['Int']['input']>;
  fixtureId: Scalars['ID']['input'];
  sceneOrder?: InputMaybe<Scalars['Int']['input']>;
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
  scenesCreated: Scalars['Int']['output'];
};

export type InstanceChannel = {
  __typename?: 'InstanceChannel';
  defaultValue: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
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

export type ModeChannel = {
  __typename?: 'ModeChannel';
  channel: ChannelDefinition;
  id: Scalars['ID']['output'];
  offset: Scalars['Int']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  activateSceneFromBoard: Scalars['Boolean']['output'];
  addFixturesToScene: Scene;
  addSceneToBoard: SceneBoardButton;
  bulkCreateFixtures: Array<FixtureInstance>;
  bulkUpdateCues: Array<Cue>;
  bulkUpdateFixtures: Array<FixtureInstance>;
  cancelPreviewSession: Scalars['Boolean']['output'];
  cloneScene: Scene;
  commitPreviewSession: Scalars['Boolean']['output'];
  connectWiFi: WiFiConnectionResult;
  createCue: Cue;
  createCueList: CueList;
  createFixtureDefinition: FixtureDefinition;
  createFixtureInstance: FixtureInstance;
  createProject: Project;
  createScene: Scene;
  createSceneBoard: SceneBoard;
  deleteCue: Scalars['Boolean']['output'];
  deleteCueList: Scalars['Boolean']['output'];
  deleteFixtureDefinition: Scalars['Boolean']['output'];
  deleteFixtureInstance: Scalars['Boolean']['output'];
  deleteProject: Scalars['Boolean']['output'];
  deleteScene: Scalars['Boolean']['output'];
  deleteSceneBoard: Scalars['Boolean']['output'];
  disconnectWiFi: WiFiConnectionResult;
  duplicateScene: Scene;
  exportProject: ExportResult;
  exportProjectToQLC: QlcExportResult;
  fadeToBlack: Scalars['Boolean']['output'];
  forgetWiFiNetwork: Scalars['Boolean']['output'];
  goToCue: Scalars['Boolean']['output'];
  importOFLFixture: FixtureDefinition;
  importProject: ImportResult;
  importProjectFromQLC: QlcImportResult;
  initializePreviewWithScene: Scalars['Boolean']['output'];
  nextCue: Scalars['Boolean']['output'];
  playCue: Scalars['Boolean']['output'];
  previousCue: Scalars['Boolean']['output'];
  removeFixturesFromScene: Scene;
  removeSceneFromBoard: Scalars['Boolean']['output'];
  reorderCues: Scalars['Boolean']['output'];
  reorderProjectFixtures: Scalars['Boolean']['output'];
  reorderSceneFixtures: Scalars['Boolean']['output'];
  setChannelValue: Scalars['Boolean']['output'];
  setSceneLive: Scalars['Boolean']['output'];
  setWiFiEnabled: WiFiStatus;
  startCueList: Scalars['Boolean']['output'];
  startPreviewSession: PreviewSession;
  stopCueList: Scalars['Boolean']['output'];
  updateAllRepositories: Array<UpdateResult>;
  updateCue: Cue;
  updateCueList: CueList;
  updateFixtureDefinition: FixtureDefinition;
  updateFixtureInstance: FixtureInstance;
  updateFixturePositions: Scalars['Boolean']['output'];
  updatePreviewChannel: Scalars['Boolean']['output'];
  updateProject: Project;
  updateRepository: UpdateResult;
  updateScene: Scene;
  updateSceneBoard: SceneBoard;
  updateSceneBoardButton: SceneBoardButton;
  updateSceneBoardButtonPositions: Scalars['Boolean']['output'];
  updateScenePartial: Scene;
  updateSetting: Setting;
};


export type MutationActivateSceneFromBoardArgs = {
  fadeTimeOverride?: InputMaybe<Scalars['Float']['input']>;
  sceneBoardId: Scalars['ID']['input'];
  sceneId: Scalars['ID']['input'];
};


export type MutationAddFixturesToSceneArgs = {
  fixtureValues: Array<FixtureValueInput>;
  overwriteExisting?: InputMaybe<Scalars['Boolean']['input']>;
  sceneId: Scalars['ID']['input'];
};


export type MutationAddSceneToBoardArgs = {
  input: CreateSceneBoardButtonInput;
};


export type MutationBulkCreateFixturesArgs = {
  input: BulkFixtureCreateInput;
};


export type MutationBulkUpdateCuesArgs = {
  input: BulkCueUpdateInput;
};


export type MutationBulkUpdateFixturesArgs = {
  input: BulkFixtureUpdateInput;
};


export type MutationCancelPreviewSessionArgs = {
  sessionId: Scalars['ID']['input'];
};


export type MutationCloneSceneArgs = {
  newName: Scalars['String']['input'];
  sceneId: Scalars['ID']['input'];
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


export type MutationCreateFixtureDefinitionArgs = {
  input: CreateFixtureDefinitionInput;
};


export type MutationCreateFixtureInstanceArgs = {
  input: CreateFixtureInstanceInput;
};


export type MutationCreateProjectArgs = {
  input: CreateProjectInput;
};


export type MutationCreateSceneArgs = {
  input: CreateSceneInput;
};


export type MutationCreateSceneBoardArgs = {
  input: CreateSceneBoardInput;
};


export type MutationDeleteCueArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteCueListArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteFixtureDefinitionArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteFixtureInstanceArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteProjectArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteSceneArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteSceneBoardArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDuplicateSceneArgs = {
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


export type MutationInitializePreviewWithSceneArgs = {
  sceneId: Scalars['ID']['input'];
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


export type MutationRemoveFixturesFromSceneArgs = {
  fixtureIds: Array<Scalars['ID']['input']>;
  sceneId: Scalars['ID']['input'];
};


export type MutationRemoveSceneFromBoardArgs = {
  buttonId: Scalars['ID']['input'];
};


export type MutationReorderCuesArgs = {
  cueListId: Scalars['ID']['input'];
  cueOrders: Array<CueOrderInput>;
};


export type MutationReorderProjectFixturesArgs = {
  fixtureOrders: Array<FixtureOrderInput>;
  projectId: Scalars['ID']['input'];
};


export type MutationReorderSceneFixturesArgs = {
  fixtureOrders: Array<FixtureOrderInput>;
  sceneId: Scalars['ID']['input'];
};


export type MutationSetChannelValueArgs = {
  channel: Scalars['Int']['input'];
  universe: Scalars['Int']['input'];
  value: Scalars['Int']['input'];
};


export type MutationSetSceneLiveArgs = {
  sceneId: Scalars['ID']['input'];
};


export type MutationSetWiFiEnabledArgs = {
  enabled: Scalars['Boolean']['input'];
};


export type MutationStartCueListArgs = {
  cueListId: Scalars['ID']['input'];
  startFromCue?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationStartPreviewSessionArgs = {
  projectId: Scalars['ID']['input'];
};


export type MutationStopCueListArgs = {
  cueListId: Scalars['ID']['input'];
};


export type MutationUpdateCueArgs = {
  id: Scalars['ID']['input'];
  input: CreateCueInput;
};


export type MutationUpdateCueListArgs = {
  id: Scalars['ID']['input'];
  input: CreateCueListInput;
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


export type MutationUpdateSceneArgs = {
  id: Scalars['ID']['input'];
  input: UpdateSceneInput;
};


export type MutationUpdateSceneBoardArgs = {
  id: Scalars['ID']['input'];
  input: UpdateSceneBoardInput;
};


export type MutationUpdateSceneBoardButtonArgs = {
  id: Scalars['ID']['input'];
  input: UpdateSceneBoardButtonInput;
};


export type MutationUpdateSceneBoardButtonPositionsArgs = {
  positions: Array<SceneBoardButtonPositionInput>;
};


export type MutationUpdateScenePartialArgs = {
  description?: InputMaybe<Scalars['String']['input']>;
  fixtureValues?: InputMaybe<Array<FixtureValueInput>>;
  mergeFixtures?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  sceneId: Scalars['ID']['input'];
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

export type Project = {
  __typename?: 'Project';
  createdAt: Scalars['String']['output'];
  cueListCount: Scalars['Int']['output'];
  cueLists: Array<CueList>;
  description?: Maybe<Scalars['String']['output']>;
  fixtureCount: Scalars['Int']['output'];
  fixtures: Array<FixtureInstance>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  sceneBoards: Array<SceneBoard>;
  sceneCount: Scalars['Int']['output'];
  scenes: Array<Scene>;
  updatedAt: Scalars['String']['output'];
  users: Array<ProjectUser>;
};

export type ProjectRole =
  | 'EDITOR'
  | 'OWNER'
  | 'VIEWER';

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
  projectName: Scalars['String']['output'];
  sceneCount: Scalars['Int']['output'];
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
  originalFileName: Scalars['String']['output'];
  project: Project;
  sceneCount: Scalars['Int']['output'];
  warnings: Array<Scalars['String']['output']>;
};

export type Query = {
  __typename?: 'Query';
  allDmxOutput: Array<UniverseOutput>;
  availableVersions: Array<Scalars['String']['output']>;
  channelMap: ChannelMapResult;
  compareScenes: SceneComparison;
  cue?: Maybe<Cue>;
  cueList?: Maybe<CueList>;
  cueListPlaybackStatus?: Maybe<CueListPlaybackStatus>;
  cueLists: Array<CueListSummary>;
  currentActiveScene?: Maybe<Scene>;
  dmxOutput: Array<Scalars['Int']['output']>;
  fixtureDefinition?: Maybe<FixtureDefinition>;
  fixtureDefinitions: Array<FixtureDefinition>;
  fixtureInstance?: Maybe<FixtureInstance>;
  fixtureInstances: FixtureInstancePage;
  fixtureUsage: FixtureUsage;
  getQLCFixtureMappingSuggestions: QlcFixtureMappingResult;
  networkInterfaceOptions: Array<NetworkInterfaceOption>;
  previewSession?: Maybe<PreviewSession>;
  project?: Maybe<Project>;
  projects: Array<Project>;
  savedWifiNetworks: Array<WiFiNetwork>;
  scene?: Maybe<Scene>;
  sceneBoard?: Maybe<SceneBoard>;
  sceneBoardButton?: Maybe<SceneBoardButton>;
  sceneBoards: Array<SceneBoard>;
  sceneFixtures: Array<SceneFixtureSummary>;
  sceneUsage: SceneUsage;
  scenes: ScenePage;
  searchCues: CuePage;
  searchFixtures: FixtureInstancePage;
  searchScenes: ScenePage;
  setting?: Maybe<Setting>;
  settings: Array<Setting>;
  suggestChannelAssignment: ChannelAssignmentSuggestion;
  systemInfo: SystemInfo;
  systemVersions: SystemVersionInfo;
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


export type QueryCompareScenesArgs = {
  sceneId1: Scalars['ID']['input'];
  sceneId2: Scalars['ID']['input'];
};


export type QueryCueArgs = {
  id: Scalars['ID']['input'];
};


export type QueryCueListArgs = {
  id: Scalars['ID']['input'];
  includeSceneDetails?: InputMaybe<Scalars['Boolean']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  perPage?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryCueListPlaybackStatusArgs = {
  cueListId: Scalars['ID']['input'];
};


export type QueryCueListsArgs = {
  projectId: Scalars['ID']['input'];
};


export type QueryDmxOutputArgs = {
  universe: Scalars['Int']['input'];
};


export type QueryFixtureDefinitionArgs = {
  id: Scalars['ID']['input'];
};


export type QueryFixtureDefinitionsArgs = {
  filter?: InputMaybe<FixtureDefinitionFilter>;
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


export type QueryGetQlcFixtureMappingSuggestionsArgs = {
  projectId: Scalars['ID']['input'];
};


export type QueryPreviewSessionArgs = {
  sessionId: Scalars['ID']['input'];
};


export type QueryProjectArgs = {
  id: Scalars['ID']['input'];
};


export type QuerySceneArgs = {
  id: Scalars['ID']['input'];
  includeFixtureValues?: InputMaybe<Scalars['Boolean']['input']>;
};


export type QuerySceneBoardArgs = {
  id: Scalars['ID']['input'];
};


export type QuerySceneBoardButtonArgs = {
  id: Scalars['ID']['input'];
};


export type QuerySceneBoardsArgs = {
  projectId: Scalars['ID']['input'];
};


export type QuerySceneFixturesArgs = {
  sceneId: Scalars['ID']['input'];
};


export type QuerySceneUsageArgs = {
  sceneId: Scalars['ID']['input'];
};


export type QueryScenesArgs = {
  filter?: InputMaybe<SceneFilterInput>;
  page?: InputMaybe<Scalars['Int']['input']>;
  perPage?: InputMaybe<Scalars['Int']['input']>;
  projectId: Scalars['ID']['input'];
  sortBy?: InputMaybe<SceneSortField>;
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


export type QuerySearchScenesArgs = {
  filter?: InputMaybe<SceneFilterInput>;
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

export type Scene = {
  __typename?: 'Scene';
  createdAt: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  fixtureValues: Array<FixtureValue>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  project: Project;
  updatedAt: Scalars['String']['output'];
};

export type SceneBoard = {
  __typename?: 'SceneBoard';
  buttons: Array<SceneBoardButton>;
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

export type SceneBoardButton = {
  __typename?: 'SceneBoardButton';
  color?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  height?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  label?: Maybe<Scalars['String']['output']>;
  layoutX: Scalars['Int']['output'];
  layoutY: Scalars['Int']['output'];
  scene: Scene;
  sceneBoard: SceneBoard;
  updatedAt: Scalars['String']['output'];
  width?: Maybe<Scalars['Int']['output']>;
};

export type SceneBoardButtonPositionInput = {
  buttonId: Scalars['ID']['input'];
  layoutX: Scalars['Int']['input'];
  layoutY: Scalars['Int']['input'];
};

export type SceneComparison = {
  __typename?: 'SceneComparison';
  differences: Array<SceneDifference>;
  differentFixtureCount: Scalars['Int']['output'];
  identicalFixtureCount: Scalars['Int']['output'];
  scene1: SceneSummary;
  scene2: SceneSummary;
};

export type SceneDifference = {
  __typename?: 'SceneDifference';
  differenceType: DifferenceType;
  fixtureId: Scalars['ID']['output'];
  fixtureName: Scalars['String']['output'];
  scene1Values?: Maybe<Array<Scalars['Int']['output']>>;
  scene2Values?: Maybe<Array<Scalars['Int']['output']>>;
};

export type SceneFilterInput = {
  nameContains?: InputMaybe<Scalars['String']['input']>;
  usesFixture?: InputMaybe<Scalars['ID']['input']>;
};

export type SceneFixtureSummary = {
  __typename?: 'SceneFixtureSummary';
  fixtureId: Scalars['ID']['output'];
  fixtureName: Scalars['String']['output'];
  fixtureType: FixtureType;
};

export type ScenePage = {
  __typename?: 'ScenePage';
  pagination: PaginationInfo;
  scenes: Array<SceneSummary>;
};

export type SceneSortField =
  | 'CREATED_AT'
  | 'NAME'
  | 'UPDATED_AT';

export type SceneSummary = {
  __typename?: 'SceneSummary';
  createdAt: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  fixtureCount: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export type SceneUsage = {
  __typename?: 'SceneUsage';
  cues: Array<CueUsageSummary>;
  sceneId: Scalars['ID']['output'];
  sceneName: Scalars['String']['output'];
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
  cueListPlaybackUpdated: CueListPlaybackStatus;
  dmxOutputChanged: UniverseOutput;
  previewSessionUpdated: PreviewSession;
  projectUpdated: Project;
  systemInfoUpdated: SystemInfo;
  wifiStatusUpdated: WiFiStatus;
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
};

export type SystemVersionInfo = {
  __typename?: 'SystemVersionInfo';
  lastChecked: Scalars['String']['output'];
  repositories: Array<RepositoryVersion>;
  versionManagementSupported: Scalars['Boolean']['output'];
};

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

export type UpdateResult = {
  __typename?: 'UpdateResult';
  error?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  newVersion: Scalars['String']['output'];
  previousVersion: Scalars['String']['output'];
  repository: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type UpdateSceneBoardButtonInput = {
  color?: InputMaybe<Scalars['String']['input']>;
  height?: InputMaybe<Scalars['Int']['input']>;
  label?: InputMaybe<Scalars['String']['input']>;
  layoutX?: InputMaybe<Scalars['Int']['input']>;
  layoutY?: InputMaybe<Scalars['Int']['input']>;
  width?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdateSceneBoardInput = {
  canvasHeight?: InputMaybe<Scalars['Int']['input']>;
  canvasWidth?: InputMaybe<Scalars['Int']['input']>;
  defaultFadeTime?: InputMaybe<Scalars['Float']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  gridSize?: InputMaybe<Scalars['Int']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateSceneInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  fixtureValues?: InputMaybe<Array<FixtureValueInput>>;
  name?: InputMaybe<Scalars['String']['input']>;
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

export type WiFiConnectionResult = {
  __typename?: 'WiFiConnectionResult';
  connected: Scalars['Boolean']['output'];
  message?: Maybe<Scalars['String']['output']>;
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
  available: Scalars['Boolean']['output'];
  connected: Scalars['Boolean']['output'];
  enabled: Scalars['Boolean']['output'];
  frequency?: Maybe<Scalars['String']['output']>;
  ipAddress?: Maybe<Scalars['String']['output']>;
  macAddress?: Maybe<Scalars['String']['output']>;
  signalStrength?: Maybe<Scalars['Int']['output']>;
  ssid?: Maybe<Scalars['String']['output']>;
};
