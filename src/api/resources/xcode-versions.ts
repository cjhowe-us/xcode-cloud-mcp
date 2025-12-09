import { BaseAPIClient } from '../base-client.js';
import type { CiXcodeVersion } from '../types.js';

/**
 * Client for Xcode Cloud Xcode Versions operations
 */
export class XcodeVersionsClient extends BaseAPIClient {
  /**
   * List all available Xcode versions
   */
  async list(options?: { limit?: number }): Promise<CiXcodeVersion[]> {
    const params: Record<string, string> = {};
    if (options?.limit) {
      params.limit = options.limit.toString();
    }

    const response = await this.get<CiXcodeVersion[]>(
      '/v1/ciXcodeVersions',
      params,
    );
    return response.data;
  }

  /**
   * Get a specific Xcode version by ID
   */
  async getById(xcodeVersionId: string): Promise<CiXcodeVersion> {
    const response = await this.get<CiXcodeVersion>(
      `/v1/ciXcodeVersions/${xcodeVersionId}`,
    );
    return response.data;
  }

  /**
   * List macOS versions compatible with a specific Xcode version
   */
  async listMacOsVersions(
    xcodeVersionId: string,
    options?: { limit?: number },
  ): Promise<
    Array<{ type: string; id: string; attributes: { version: string; name: string } }>
  > {
    const params: Record<string, string> = {};
    if (options?.limit) {
      params.limit = options.limit.toString();
    }

    const response = await this.get<
      Array<{ type: string; id: string; attributes: { version: string; name: string } }>
    >(`/v1/ciXcodeVersions/${xcodeVersionId}/macOsVersions`, params);
    return response.data;
  }
}
