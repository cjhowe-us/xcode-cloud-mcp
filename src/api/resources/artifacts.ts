import { BaseAPIClient } from '../base-client.js';
import type { CiArtifact } from '../types.js';

export interface BuildArtifacts {
  logs: CiArtifact[];
  archives: CiArtifact[];
  screenshots: CiArtifact[];
  videos: CiArtifact[];
  resultBundles: CiArtifact[];
  testProducts: CiArtifact[];
  other: CiArtifact[];
}

/**
 * Client for Xcode Cloud Artifacts operations
 */
export class ArtifactsClient extends BaseAPIClient {
  /**
   * Get all artifacts for a build run, organized by type
   */
  async getForBuildRun(buildRunId: string): Promise<BuildArtifacts> {
    const response = await this.get<CiArtifact[]>(
      `/v1/ciBuildRuns/${buildRunId}/artifacts`,
    );

    const artifacts: BuildArtifacts = {
      logs: [],
      archives: [],
      screenshots: [],
      videos: [],
      resultBundles: [],
      testProducts: [],
      other: [],
    };

    response.data.forEach((artifact) => {
      switch (artifact.attributes.fileType) {
        case 'LOG':
          artifacts.logs.push(artifact);
          break;
        case 'ARCHIVE':
        case 'XCODEBUILD_ARCHIVE':
          artifacts.archives.push(artifact);
          break;
        case 'SCREENSHOT':
          artifacts.screenshots.push(artifact);
          break;
        case 'VIDEO':
          artifacts.videos.push(artifact);
          break;
        case 'RESULT_BUNDLE':
          artifacts.resultBundles.push(artifact);
          break;
        case 'TEST_PRODUCTS':
          artifacts.testProducts.push(artifact);
          break;
        default:
          artifacts.other.push(artifact);
      }
    });

    return artifacts;
  }

  /**
   * Download an artifact as binary data
   */
  async download(url: string): Promise<ArrayBuffer> {
    return this.downloadBinary(url);
  }
}
