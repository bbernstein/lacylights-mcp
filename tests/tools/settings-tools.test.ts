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
      getFadeUpdateRate: jest.fn(),
      updateFadeUpdateRate: jest.fn(),
      getBuildInfo: jest.fn(),
    } as any;

    MockGraphQLClient.mockImplementation(() => mockGraphQLClient);
    settingsTools = new SettingsTools(mockGraphQLClient);
  });

  describe('getFadeUpdateRate', () => {
    it('reports the live engine rate when the setting is present', async () => {
      mockGraphQLClient.getFadeUpdateRate.mockResolvedValue({ rateHz: 90, isDefault: false });

      const result = await settingsTools.getFadeUpdateRate({});

      expect(result).toEqual({
        rateHz: 90,
        isDefault: false,
        message: 'Current fade update rate is 90Hz',
      });
    });

    it('reports isDefault when the setting is absent', async () => {
      mockGraphQLClient.getFadeUpdateRate.mockResolvedValue({ rateHz: 60, isDefault: true });

      const result = await settingsTools.getFadeUpdateRate({});

      expect(result).toEqual({
        rateHz: 60,
        isDefault: true,
        message: 'Using default fade update rate (60Hz)',
      });
    });

    it('should handle GraphQL client errors', async () => {
      mockGraphQLClient.getFadeUpdateRate.mockRejectedValue(new Error('GraphQL error'));

      await expect(settingsTools.getFadeUpdateRate({}))
        .rejects.toThrow('Failed to get fade update rate: Error: GraphQL error');
    });
  });

  describe('setFadeUpdateRate', () => {
    it('calls updateFadeUpdateRate and reports success', async () => {
      mockGraphQLClient.updateFadeUpdateRate.mockResolvedValue(true);

      const result = await settingsTools.setFadeUpdateRate({ rateHz: 120 });

      expect(mockGraphQLClient.updateFadeUpdateRate).toHaveBeenCalledWith(120);
      expect(result).toEqual({
        rateHz: 120,
        success: true,
        message: 'Fade update rate set to 120Hz',
        hint: 'Higher rates (e.g., 120Hz) provide smoother fades but use more CPU. Lower rates (e.g., 30Hz) are more efficient.',
      });
    });

    it('accepts the backend limits 1 and 240', async () => {
      mockGraphQLClient.updateFadeUpdateRate.mockResolvedValue(true);

      await settingsTools.setFadeUpdateRate({ rateHz: 1 });
      await settingsTools.setFadeUpdateRate({ rateHz: 240 });

      expect(mockGraphQLClient.updateFadeUpdateRate).toHaveBeenCalledWith(1);
      expect(mockGraphQLClient.updateFadeUpdateRate).toHaveBeenCalledWith(240);
    });

    it.each([0, 241])('surfaces the backend range error for %d and does not report success', async (rateHz) => {
      mockGraphQLClient.updateFadeUpdateRate.mockRejectedValue(
        new Error('rate must be between 1 and 240'),
      );

      await expect(settingsTools.setFadeUpdateRate({ rateHz }))
        .rejects.toThrow('rate must be between 1 and 240');
      expect(mockGraphQLClient.updateFadeUpdateRate).toHaveBeenCalledWith(rateHz);
    });

    it('throws when the backend returns false', async () => {
      mockGraphQLClient.updateFadeUpdateRate.mockResolvedValue(false);

      await expect(settingsTools.setFadeUpdateRate({ rateHz: 60 }))
        .rejects.toThrow('Failed to set fade update rate');
    });

    it('should validate rate is an integer', async () => {
      await expect(settingsTools.setFadeUpdateRate({ rateHz: 60.5 } as any))
        .rejects.toThrow();
      expect(mockGraphQLClient.updateFadeUpdateRate).not.toHaveBeenCalled();
    });

    it('should require rateHz parameter', async () => {
      await expect(settingsTools.setFadeUpdateRate({} as any))
        .rejects.toThrow();
    });

    it('should handle GraphQL client errors', async () => {
      mockGraphQLClient.updateFadeUpdateRate.mockRejectedValue(new Error('GraphQL error'));

      await expect(settingsTools.setFadeUpdateRate({ rateHz: 60 }))
        .rejects.toThrow('Failed to set fade update rate: Error: GraphQL error');
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
