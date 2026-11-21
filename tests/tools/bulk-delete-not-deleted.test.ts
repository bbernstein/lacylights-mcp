import { CueTools } from '../../src/tools/cue-tools';
import { LookTools } from '../../src/tools/look-tools';
import { FixtureTools } from '../../src/tools/fixture-tools';
import { ProjectTools } from '../../src/tools/project-tools';
import { LookBoardTools } from '../../src/tools/look-board-tools';
import { LacyLightsGraphQLClient } from '../../src/services/graphql-client-simple';
import { RAGService } from '../../src/services/rag-service-simple';
import { AILightingService } from '../../src/services/ai-lighting';

jest.mock('../../src/services/graphql-client-simple');
jest.mock('../../src/services/rag-service-simple');
jest.mock('../../src/services/ai-lighting');

// lacylights-go returns BulkDeleteResult { deletedCount, deletedIds }. When only a
// subset is deleted, the tools must report the rest as notDeletedIds.
describe('bulk delete tools report notDeletedIds (mcp#209)', () => {
  let client: jest.Mocked<LacyLightsGraphQLClient>;
  let cueTools: CueTools;
  let lookTools: LookTools;
  let fixtureTools: FixtureTools;
  let projectTools: ProjectTools;
  let lookBoardTools: LookBoardTools;

  const partial = { deletedCount: 1, deletedIds: ['a'] };

  beforeEach(() => {
    jest.clearAllMocks();
    client = new LacyLightsGraphQLClient('http://localhost:4000/graphql') as jest.Mocked<LacyLightsGraphQLClient>;
    const rag = new RAGService() as jest.Mocked<RAGService>;
    const ai = new AILightingService(rag) as jest.Mocked<AILightingService>;
    cueTools = new CueTools(client, rag, ai);
    lookTools = new LookTools(client, rag, ai);
    fixtureTools = new FixtureTools(client);
    projectTools = new ProjectTools(client);
    lookBoardTools = new LookBoardTools(client);
  });

  const expectPartial = (result: any) => {
    expect(result.deletedCount).toBe(1);
    expect(result.deletedIds).toEqual(['a']);
    expect(result.notDeletedIds).toEqual(['b']);
    expect(result.failedIds).toBeUndefined();
    expect(result.message).toContain('1');
  };

  it('bulkDeleteFixtures', async () => {
    client.bulkDeleteFixtures.mockResolvedValue(partial);
    expectPartial(await fixtureTools.bulkDeleteFixtures({ fixtureIds: ['a', 'b'], confirmDelete: true }));
  });

  it('bulkDeleteLooks', async () => {
    client.bulkDeleteLooks.mockResolvedValue(partial);
    expectPartial(await lookTools.bulkDeleteLooks({ lookIds: ['a', 'b'], confirmDelete: true }));
  });

  it('bulkDeleteCues', async () => {
    client.bulkDeleteCues.mockResolvedValue(partial);
    expectPartial(await cueTools.bulkDeleteCues({ cueIds: ['a', 'b'], confirmDelete: true }));
  });

  it('bulkDeleteCueLists', async () => {
    client.bulkDeleteCueLists.mockResolvedValue(partial);
    expectPartial(await cueTools.bulkDeleteCueLists({ cueListIds: ['a', 'b'], confirmDelete: true }));
  });

  it('bulkDeleteProjects', async () => {
    client.bulkDeleteProjects.mockResolvedValue(partial);
    expectPartial(await projectTools.bulkDeleteProjects({ projectIds: ['a', 'b'], confirmDelete: true }));
  });

  it('bulkDeleteLookBoards', async () => {
    client.bulkDeleteLookBoards.mockResolvedValue(partial);
    expectPartial(await lookBoardTools.bulkDeleteLookBoards({ lookBoardIds: ['a', 'b'], confirmDelete: true }));
  });

  it('bulkDeleteLookBoardButtons', async () => {
    client.bulkDeleteLookBoardButtons.mockResolvedValue(partial);
    expectPartial(await lookBoardTools.bulkDeleteLookBoardButtons({ buttonIds: ['a', 'b'], confirmDelete: true }));
  });

  it('reports an empty notDeletedIds when everything was deleted', async () => {
    client.bulkDeleteLooks.mockResolvedValue({ deletedCount: 2, deletedIds: ['a', 'b'] });
    const result = await lookTools.bulkDeleteLooks({ lookIds: ['a', 'b'], confirmDelete: true });
    expect(result.notDeletedIds).toEqual([]);
    expect(result.deletedCount).toBe(2);
  });

  it('preserves request order in notDeletedIds', async () => {
    client.bulkDeleteCues.mockResolvedValue({ deletedCount: 1, deletedIds: ['b'] });
    const result = await cueTools.bulkDeleteCues({ cueIds: ['c', 'b', 'a'], confirmDelete: true });
    expect(result.notDeletedIds).toEqual(['c', 'a']);
  });
});
