import { SettingsTools } from '../../src/tools/settings-tools';
import { LacyLightsGraphQLClient } from '../../src/services/graphql-client-simple';

// Mock the GraphQL client
jest.mock('../../src/services/graphql-client-simple');
const MockGraphQLClient = LacyLightsGraphQLClient as jest.MockedClass<typeof LacyLightsGraphQLClient>;

describe('SettingsTools', () => {
  let settingsTools: SettingsTools;
  let mockGraphQLClient: jest.Mocked<LacyLightsGraphQLClient>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockGraphQLClient = {
      getSetting: jest.fn(),
      setSetting: jest.fn(),
      getBuildInfo: jest.fn(),
    } as any;

    MockGraphQLClient.mockImplementation(() => mockGraphQLClient);
    settingsTools = new SettingsTools(mockGraphQLClient);
  });

  describe('getFadeUpdateRate', () => {
    it('should get the current fade update rate', async () => {
      mockGraphQLClient.getSetting.mockResolvedValue('60');

      const result = await settingsTools.getFadeUpdateRate({});

      expect(mockGraphQLClient.getSetting).toHaveBeenCalledWith('fade_update_rate');
      expect(result).toEqual({
        rateHz: 60,
        isDefault: false,
        message: 'Current fade update rate is 60Hz',
      });
    });

    it('should return default when setting is not found', async () => {
      mockGraphQLClient.getSetting.mockResolvedValue(null);

      const result = await settingsTools.getFadeUpdateRate({});

      expect(mockGraphQLClient.getSetting).toHaveBeenCalledWith('fade_update_rate');
      expect(result).toEqual({
        rateHz: 60,
        isDefault: true,
        message: 'Using default fade update rate (60Hz)',
      });
    });

    it('should handle different rate values', async () => {
      mockGraphQLClient.getSetting.mockResolvedValue('120');

      const result = await settingsTools.getFadeUpdateRate({});

      expect(result.rateHz).toBe(120);
      expect(result.isDefault).toBe(false);
    });

    it('should throw error for invalid rate value', async () => {
      mockGraphQLClient.getSetting.mockResolvedValue('invalid');

      await expect(settingsTools.getFadeUpdateRate({}))
        .rejects.toThrow('Failed to get fade update rate');
    });

    it('should handle GraphQL client errors', async () => {
      mockGraphQLClient.getSetting.mockRejectedValue(new Error('GraphQL error'));

      await expect(settingsTools.getFadeUpdateRate({}))
        .rejects.toThrow('Failed to get fade update rate: Error: GraphQL error');
    });
  });

  describe('setFadeUpdateRate', () => {
    it('should set the fade update rate', async () => {
      mockGraphQLClient.setSetting.mockResolvedValue('60');

      const result = await settingsTools.setFadeUpdateRate({ rateHz: 60 });

      expect(mockGraphQLClient.setSetting).toHaveBeenCalledWith('fade_update_rate', '60');
      expect(result).toEqual({
        rateHz: 60,
        success: true,
        message: 'Fade update rate set to 60Hz',
        hint: 'Higher rates (e.g., 120Hz) provide smoother fades but use more CPU. Lower rates (e.g., 30Hz) are more efficient.',
      });
    });

    it('should set different rate values', async () => {
      mockGraphQLClient.setSetting.mockResolvedValue('30');

      const result = await settingsTools.setFadeUpdateRate({ rateHz: 30 });

      expect(mockGraphQLClient.setSetting).toHaveBeenCalledWith('fade_update_rate', '30');
      expect(result.rateHz).toBe(30);
      expect(result.success).toBe(true);
    });

    it('should set maximum allowed rate', async () => {
      mockGraphQLClient.setSetting.mockResolvedValue('120');

      const result = await settingsTools.setFadeUpdateRate({ rateHz: 120 });

      expect(mockGraphQLClient.setSetting).toHaveBeenCalledWith('fade_update_rate', '120');
      expect(result.rateHz).toBe(120);
    });

    it('should set minimum allowed rate', async () => {
      mockGraphQLClient.setSetting.mockResolvedValue('10');

      const result = await settingsTools.setFadeUpdateRate({ rateHz: 10 });

      expect(mockGraphQLClient.setSetting).toHaveBeenCalledWith('fade_update_rate', '10');
      expect(result.rateHz).toBe(10);
    });

    it('should validate rate is within range - too low', async () => {
      await expect(settingsTools.setFadeUpdateRate({ rateHz: 5 }))
        .rejects.toThrow();
    });

    // Note: The implementation enforces a maximum of 120 Hz (10-120 Hz range)
    it('should validate rate is within range (10-120 Hz) - too high', async () => {
      await expect(settingsTools.setFadeUpdateRate({ rateHz: 150 }))
        .rejects.toThrow();
    });

    it('should validate rate is an integer', async () => {
      await expect(settingsTools.setFadeUpdateRate({ rateHz: 60.5 } as any))
        .rejects.toThrow();
    });

    it('should require rateHz parameter', async () => {
      await expect(settingsTools.setFadeUpdateRate({} as any))
        .rejects.toThrow();
    });

    it('should handle GraphQL client errors', async () => {
      mockGraphQLClient.setSetting.mockRejectedValue(new Error('GraphQL error'));

      await expect(settingsTools.setFadeUpdateRate({ rateHz: 60 }))
        .rejects.toThrow('Failed to set fade update rate: Error: GraphQL error');
    });

    it('should convert rate to string when calling GraphQL', async () => {
      mockGraphQLClient.setSetting.mockResolvedValue('90');

      await settingsTools.setFadeUpdateRate({ rateHz: 90 });

      expect(mockGraphQLClient.setSetting).toHaveBeenCalledWith('fade_update_rate', '90');
      expect(mockGraphQLClient.setSetting).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String)
      );
    });
  });

  describe('getBuildInfo', () => {
    it('should get build info from the server', async () => {
      mockGraphQLClient.getBuildInfo.mockResolvedValue({
        version: 'v0.8.10',
        gitCommit: 'abc123def456',
        buildTime: '2025-01-15T10:00:00Z',
      });

      const result = await settingsTools.getBuildInfo({});

      expect(mockGraphQLClient.getBuildInfo).toHaveBeenCalled();
      expect(result).toEqual({
        version: 'v0.8.10',
        gitCommit: 'abc123def456',
        buildTime: '2025-01-15T10:00:00Z',
        message: 'Backend server version v0.8.10 (abc123d)',
      });
    });

    it('should truncate long git commit in message', async () => {
      mockGraphQLClient.getBuildInfo.mockResolvedValue({
        version: 'v1.0.0',
        gitCommit: 'abcdef1234567890abcdef',
        buildTime: '2025-12-22T00:00:00Z',
      });

      const result = await settingsTools.getBuildInfo({});

      expect(result.message).toBe('Backend server version v1.0.0 (abcdef1)');
      expect(result.gitCommit).toBe('abcdef1234567890abcdef');
    });

    it('should handle GraphQL client errors', async () => {
      mockGraphQLClient.getBuildInfo.mockRejectedValue(new Error('GraphQL error'));

      await expect(settingsTools.getBuildInfo({}))
        .rejects.toThrow('Failed to get build info: Error: GraphQL error');
    });
  });
});
