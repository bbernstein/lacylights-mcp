import { EosTools } from '../../src/tools/eos-tools';
import { LacyLightsGraphQLClient } from '../../src/services/graphql-client-simple';

jest.mock('../../src/services/graphql-client-simple');
const MockGraphQLClient = LacyLightsGraphQLClient as jest.MockedClass<typeof LacyLightsGraphQLClient>;

describe('EosTools', () => {
  let eosTools: EosTools;
  let mockGraphQLClient: jest.Mocked<LacyLightsGraphQLClient>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockGraphQLClient = {
      importEosAscii: jest.fn(),
      exportEosAscii: jest.fn(),
    } as any;

    MockGraphQLClient.mockImplementation(() => mockGraphQLClient);
    eosTools = new EosTools(mockGraphQLClient);
  });

  describe('importEosAscii', () => {
    it('forwards content and returns import result with warnings', async () => {
      mockGraphQLClient.importEosAscii.mockResolvedValue({
        projectId: 'p1',
        fixtureDefinitionsCount: 2,
        fixtureInstancesCount: 5,
        looksCount: 3,
        cueListsCount: 1,
        cuesCount: 3,
        groupsCount: 0,
        warnings: [
          { code: 'EFFECT_SKIPPED', severity: 'INFO', message: 'eff', context: [] },
        ],
        synthesizedDefinitionIds: [],
      });

      const result = await eosTools.importEosAscii({
        asciiContent: 'Ident 3:0\n',
      });

      expect(mockGraphQLClient.importEosAscii).toHaveBeenCalledWith('Ident 3:0\n', undefined);
      expect(result.fixtureInstancesCount).toBe(5);
      expect(result.warnings[0].code).toBe('EFFECT_SKIPPED');
    });

    it('passes newProjectName through options', async () => {
      mockGraphQLClient.importEosAscii.mockResolvedValue({
        projectId: 'p2',
        fixtureDefinitionsCount: 0,
        fixtureInstancesCount: 0,
        looksCount: 0,
        cueListsCount: 0,
        cuesCount: 0,
        groupsCount: 0,
        warnings: [],
        synthesizedDefinitionIds: [],
      });

      await eosTools.importEosAscii({
        asciiContent: 'X',
        newProjectName: 'My Show',
      });

      expect(mockGraphQLClient.importEosAscii).toHaveBeenCalledWith('X', {
        newProjectName: 'My Show',
        targetProjectId: undefined,
      });
    });

    it('passes targetProjectId through options', async () => {
      mockGraphQLClient.importEosAscii.mockResolvedValue({
        projectId: 'p3',
        fixtureDefinitionsCount: 0,
        fixtureInstancesCount: 0,
        looksCount: 0,
        cueListsCount: 0,
        cuesCount: 0,
        groupsCount: 0,
        warnings: [],
        synthesizedDefinitionIds: [],
      });

      await eosTools.importEosAscii({
        asciiContent: 'X',
        targetProjectId: 'p3',
      });

      expect(mockGraphQLClient.importEosAscii).toHaveBeenCalledWith('X', {
        newProjectName: undefined,
        targetProjectId: 'p3',
      });
    });

    it('rejects when both newProjectName and targetProjectId are set', async () => {
      await expect(
        eosTools.importEosAscii({
          asciiContent: 'X',
          newProjectName: 'A',
          targetProjectId: 'p1',
        }),
      ).rejects.toThrow(/either newProjectName or targetProjectId/);

      expect(mockGraphQLClient.importEosAscii).not.toHaveBeenCalled();
    });

    it('throws when asciiContent is missing', async () => {
      await expect(eosTools.importEosAscii({} as any)).rejects.toThrow();
      expect(mockGraphQLClient.importEosAscii).not.toHaveBeenCalled();
    });
  });

  describe('exportEosAscii', () => {
    it('forwards projectId and returns export result', async () => {
      mockGraphQLClient.exportEosAscii.mockResolvedValue({
        projectId: 'p1',
        projectName: 'Show',
        asciiContent: 'Ident 3:0\n...\n',
        filenameSuffix: '.asc',
        warnings: [],
      });

      const result = await eosTools.exportEosAscii({ projectId: 'p1' });

      expect(mockGraphQLClient.exportEosAscii).toHaveBeenCalledWith('p1');
      expect(result.asciiContent).toContain('Ident');
      expect(result.filenameSuffix).toBe('.asc');
    });

    it('throws when projectId is missing', async () => {
      await expect(eosTools.exportEosAscii({} as any)).rejects.toThrow();
      expect(mockGraphQLClient.exportEosAscii).not.toHaveBeenCalled();
    });
  });
});
