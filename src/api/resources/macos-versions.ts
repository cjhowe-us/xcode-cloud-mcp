import { BaseAPIClient } from '../base-client.js';
import type { CiMacOsVersion } from '../types.js';

/**
 * Client for Xcode Cloud macOS Versions operations
 */
export class MacOsVersionsClient extends BaseAPIClient {
  /**
   * List all available macOS versions
   */
  async list(options?: { limit?: number }): Promise<CiMacOsVersion[]> {
    const params: Record<string, string> = {};
    if (options?.limit) {
      params.limit = options.limit.toString();
    }

    const response = await this.get<CiMacOsVersion[]>(
      '/v1/ciMacOsVersions',
      params,
    );
    return response.data;
  }

  /**
   * Get a specific macOS version by ID
   */
  async getById(macOsVersionId: string): Promise<CiMacOsVersion> {
    const response = await this.get<CiMacOsVersion>(
      `/v1/ciMacOsVersions/${macOsVersionId}`,
    );
    return response.data;
  }

  /**
   * List Xcode versions compatible with a specific macOS version
   */
  async listXcodeVersions(
    macOsVersionId: string,
    options?: { limit?: number },
  ): Promise<
    Array<{
      type: string;
      id: string;
      attributes: { version: string; name: string };
    }>
  > {
    const params: Record<string, string> = {};
    if (options?.limit) {
      params.limit = options.limit.toString();
    }

    const response = await this.get<
      Array<{
        type: string;
        id: string;
        attributes: { version: string; name: string };
      }>
    >(`/v1/ciMacOsVersions/${macOsVersionId}/xcodeVersions`, params);
    return response.data;
  }
}
