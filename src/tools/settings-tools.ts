import { z } from 'zod';
import { LacyLightsGraphQLClient } from '../services/graphql-client-simple';

// Schema for get_fade_update_rate
const GetFadeUpdateRateSchema = z.object({});

// Schema for set_fade_update_rate. The 1-240 Hz range is enforced by the backend,
// whose error is surfaced to the caller.
const SetFadeUpdateRateSchema = z.object({
  rateHz: z.number().int(),
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
      const { rateHz, isDefault } = await this.graphqlClient.getFadeUpdateRate();

      return {
        rateHz,
        isDefault,
        message: isDefault
          ? `Using default fade update rate (${rateHz}Hz)`
          : `Current fade update rate is ${rateHz}Hz`,
      };
    } catch (error) {
      throw new Error(`Failed to get fade update rate: ${error}`);
    }
  }

  /**
   * Set the fade engine update rate in Hz
   * Valid range: 1-240 Hz (enforced by the backend)
   * @param rateHz Update rate in Hz
   * @returns Updated rate
   */
  async setFadeUpdateRate(args: z.infer<typeof SetFadeUpdateRateSchema>) {
    const { rateHz } = SetFadeUpdateRateSchema.parse(args);

    try {
      const ok = await this.graphqlClient.updateFadeUpdateRate(rateHz);
      if (!ok) {
        throw new Error('backend did not apply the fade update rate');
      }

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
