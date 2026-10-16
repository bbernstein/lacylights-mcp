import { FixtureTools } from '../../src/tools/fixture-tools';
import { LacyLightsGraphQLClient } from '../../src/services/graphql-client-simple';
import { FixtureDefinition, FixtureType, ChannelType } from '../../src/types/lighting';

jest.mock('../../src/services/graphql-client-simple');

function definition(overrides: Partial<FixtureDefinition>): FixtureDefinition {
  return {
    id: 'def-1',
    manufacturer: 'Acme',
    model: 'Spot',
    type: FixtureType.MOVING_HEAD,
    channels: [{ id: 'c1', name: 'Dimmer', type: ChannelType.INTENSITY, offset: 0, minValue: 0, maxValue: 255, defaultValue: 0 }],
    modes: [{ id: 'm1', name: 'Standard', channelCount: 1 }],
    isBuiltIn: false,
    ...overrides,
  };
}

describe('get_fixture_inventory definition source', () => {
  let client: jest.Mocked<LacyLightsGraphQLClient>;
  let tools: FixtureTools;

  beforeEach(() => {
    client = {
      getProjects: jest.fn().mockResolvedValue([]),
      getFixtureDefinitions: jest.fn(),
    } as any;
    tools = new FixtureTools(client);
  });

  it('lists source next to isBuiltIn', async () => {
    client.getFixtureDefinitions.mockResolvedValue([
      definition({ id: 'g', source: 'GDTF', sourceId: 'abc' }),
      definition({ id: 'b', isBuiltIn: true, source: 'BUILTIN' }),
    ]);

    const result = await tools.getFixtureInventory({ includeDefinitions: true });

    expect(result.definitions.map((d) => [d.id, d.isBuiltIn, d.source])).toEqual([
      ['g', false, 'GDTF'],
      ['b', true, 'BUILTIN'],
    ]);
  });

  it('omits source on backends that do not report it', async () => {
    client.getFixtureDefinitions.mockResolvedValue([definition({ isBuiltIn: true })]);

    const result = await tools.getFixtureInventory({ includeDefinitions: true });
    const json = JSON.parse(JSON.stringify(result.definitions[0]));

    expect(json.isBuiltIn).toBe(true);
    expect(json).not.toHaveProperty('source');
  });
});
