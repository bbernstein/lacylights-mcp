import {
  FixtureType,
  ChannelType,
  Project,
  FixtureInstance,
  Scene,
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

    it('should have 25 channel types', () => {
      const types = Object.values(ChannelType);
      expect(types).toHaveLength(25);
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

    it('should allow creation of Scene with fixture values', () => {
      const scene: Scene = {
        id: 'scene-id',
        name: 'Test Scene',
        fixtureValues: [],
      };

      expect(scene.id).toBe('scene-id');
      expect(scene.fixtureValues).toEqual([]);
    });

    it('should allow creation of Cue with required fields', () => {
      const mockScene: Scene = {
        id: 'scene-id',
        name: 'Test Scene',
        fixtureValues: [],
      };

      const cue: Cue = {
        id: 'cue-id',
        name: 'Test Cue',
        cueNumber: 1.0,
        scene: mockScene,
        fadeInTime: 3,
        fadeOutTime: 3,
      };

      expect(cue.cueNumber).toBe(1.0);
      expect(cue.scene.id).toBe('scene-id');
    });
  });
});