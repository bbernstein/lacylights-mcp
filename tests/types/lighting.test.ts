import {
  FixtureType,
  ChannelType,
  Project,
  FixtureInstance,
  Look,
  CueList,
  Cue,
} from '../../src/types/lighting';

describe('Lighting Types', () => {
  describe('FixtureType enum', () => {
    it('should have correct values', () => {
      expect(FixtureType.LED_PAR).toBe('LED_PAR');
      expect(FixtureType.MOVING_HEAD).toBe('MOVING_HEAD');
      expect(FixtureType.STROBE).toBe('STROBE');
      expect(FixtureType.DIMMER).toBe('DIMMER');
      expect(FixtureType.OTHER).toBe('OTHER');
    });

    it('should have 5 fixture types', () => {
      const types = Object.values(FixtureType);
      expect(types).toHaveLength(5);
    });
  });

  describe('ChannelType enum', () => {
    it('should have correct values', () => {
      expect(ChannelType.INTENSITY).toBe('INTENSITY');
      expect(ChannelType.RED).toBe('RED');
      expect(ChannelType.GREEN).toBe('GREEN');
      expect(ChannelType.BLUE).toBe('BLUE');
      expect(ChannelType.WHITE).toBe('WHITE');
      expect(ChannelType.CYAN).toBe('CYAN');
      expect(ChannelType.MAGENTA).toBe('MAGENTA');
      expect(ChannelType.YELLOW).toBe('YELLOW');
      expect(ChannelType.LIME).toBe('LIME');
      expect(ChannelType.INDIGO).toBe('INDIGO');
      expect(ChannelType.COLD_WHITE).toBe('COLD_WHITE');
      expect(ChannelType.WARM_WHITE).toBe('WARM_WHITE');
      expect(ChannelType.PAN).toBe('PAN');
      expect(ChannelType.TILT).toBe('TILT');
    });

    it('should have 29 channel types', () => {
      const types = Object.values(ChannelType);
      expect(types).toHaveLength(29);
    });

    it('should include all CMY color channels', () => {
      expect(ChannelType.CYAN).toBe('CYAN');
      expect(ChannelType.MAGENTA).toBe('MAGENTA');
      expect(ChannelType.YELLOW).toBe('YELLOW');
    });

    it('should include extended gamut channels', () => {
      expect(ChannelType.LIME).toBe('LIME');
      expect(ChannelType.INDIGO).toBe('INDIGO');
    });

    it('should include color temperature and hue/saturation channels', () => {
      expect(ChannelType.COLOR_TEMPERATURE).toBe('COLOR_TEMPERATURE');
      expect(ChannelType.HUE).toBe('HUE');
      expect(ChannelType.SATURATION).toBe('SATURATION');
    });

    it('should include speed channel', () => {
      expect(ChannelType.SPEED).toBe('SPEED');
    });

    it('should order channel types to match the GraphQL schema', () => {
      const types = Object.values(ChannelType);
      expect(types.indexOf(ChannelType.COLOR_TEMPERATURE)).toBe(types.indexOf(ChannelType.WARM_WHITE) + 1);
      expect(types.indexOf(ChannelType.HUE)).toBe(types.indexOf(ChannelType.COLOR_TEMPERATURE) + 1);
      expect(types.indexOf(ChannelType.SATURATION)).toBe(types.indexOf(ChannelType.HUE) + 1);
      expect(types.indexOf(ChannelType.SPEED)).toBe(types.indexOf(ChannelType.EFFECT) + 1);
    });

    it('should include dual white temperature channels', () => {
      expect(ChannelType.COLD_WHITE).toBe('COLD_WHITE');
      expect(ChannelType.WARM_WHITE).toBe('WARM_WHITE');
    });
  });

  describe('Type interfaces', () => {
    it('should allow creation of FixtureInstance with required fields', () => {
      const fixture: FixtureInstance = {
        id: 'test-id',
        name: 'Test Fixture',
        definitionId: 'def-id',
        manufacturer: 'Test Manufacturer',
        model: 'Test Model',
        type: FixtureType.LED_PAR,
        modeName: 'Standard',
        channelCount: 3,
        channels: [],
        universe: 1,
        startChannel: 1,
        tags: ['test'],
      };

      expect(fixture.id).toBe('test-id');
      expect(fixture.type).toBe(FixtureType.LED_PAR);
    });

    it('should allow creation of Look with fixture values', () => {
      const look: Look = {
        id: 'look-id',
        name: 'Test Look',
        fixtureValues: [],
      };

      expect(look.id).toBe('look-id');
      expect(look.fixtureValues).toEqual([]);
    });

    it('should allow creation of Cue with required fields', () => {
      const mockLook: Look = {
        id: 'look-id',
        name: 'Test Look',
        fixtureValues: [],
      };

      const cue: Cue = {
        id: 'cue-id',
        name: 'Test Cue',
        cueNumber: 1.0,
        look: mockLook,
        fadeInTime: 3,
        fadeOutTime: 3,
        skip: false,
      };

      expect(cue.cueNumber).toBe(1.0);
      expect(cue.look.id).toBe('look-id');
    });
  });
});