import { z } from 'zod';
import { LacyLightsGraphQLClient } from '../services/graphql-client-simple';

// Schema for get_fade_update_rate
const GetFadeUpdateRateSchema = z.object({});

// Schema for set_fade_update_rate with validation
const SetFadeUpdateRateSchema = z.object({
  rateHz: z.number().int().min(10).max(120),
});

// Schema for get_build_info
const GetBuildInfoSchema = z.object({});

/**
 * Settings tools for managing LacyLights system settings
 */
export class SettingsTools {
  constructor(private graphqlClient: LacyLightsGraphQLClient) {}

  /**
   * Get the current fade engine update rate in Hz
   * @returns Current fade update rate
   */
  async getFadeUpdateRate(args: z.infer<typeof GetFadeUpdateRateSchema>) {
    GetFadeUpdateRateSchema.parse(args);

    try {
      const value = await this.graphqlClient.getSetting('fade_update_rate');

      if (value === null) {
        // Return default if not set
        return {
          rateHz: 60,
          isDefault: true,
          message: 'Using default fade update rate (60Hz)',
        };
      }

      const rateHz = parseInt(value, 10);

      if (isNaN(rateHz)) {
        throw new Error(`Invalid fade update rate value: ${value}`);
      }

      return {
        rateHz,
        isDefault: false,
        message: `Current fade update rate is ${rateHz}Hz`,
      };
    } catch (error) {
      throw new Error(`Failed to get fade update rate: ${error}`);
    }
  }

  /**
   * Set the fade engine update rate in Hz
   * Valid range: 10-120 Hz
   * @param rateHz Update rate in Hz
   * @returns Updated rate
   */
  async setFadeUpdateRate(args: z.infer<typeof SetFadeUpdateRateSchema>) {
    const { rateHz } = SetFadeUpdateRateSchema.parse(args);

    try {
      // Set the setting value as a string
      await this.graphqlClient.setSetting('fade_update_rate', rateHz.toString());

      return {
        rateHz,
        success: true,
        message: `Fade update rate set to ${rateHz}Hz`,
        hint: 'Higher rates (e.g., 120Hz) provide smoother fades but use more CPU. Lower rates (e.g., 30Hz) are more efficient.',
      };
    } catch (error) {
      throw new Error(`Failed to set fade update rate: ${error}`);
    }
  }

  /**
   * Get build information for the backend server
   * @returns Build info including version, git commit, and build time
   */
  async getBuildInfo(args: z.infer<typeof GetBuildInfoSchema>) {
    GetBuildInfoSchema.parse(args);

    try {
      const buildInfo = await this.graphqlClient.getBuildInfo();

      return {
        version: buildInfo.version,
        gitCommit: buildInfo.gitCommit,
        buildTime: buildInfo.buildTime,
        message: `Backend server version ${buildInfo.version} (${buildInfo.gitCommit.substring(0, 7)})`,
      };
    } catch (error) {
      throw new Error(`Failed to get build info: ${error}`);
    }
  }
}
