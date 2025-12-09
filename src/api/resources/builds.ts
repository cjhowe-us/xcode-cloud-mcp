import { BaseAPIClient } from '../base-client.js';
import type {
  CiBuildRun,
  CiBuildAction,
  StartBuildRunRequest,
} from '../types.js';

/**
 * Client for Xcode Cloud Build operations
 */
export class BuildsClient extends BaseAPIClient {
  /**
   * Start a new build for a workflow
   */
  async start(
    workflowId: string,
    gitReferenceId?: string,
  ): Promise<CiBuildRun> {
    const requestBody: StartBuildRunRequest = {
      data: {
        type: 'ciBuildRuns',
        relationships: {
          workflow: {
            data: {
              type: 'ciWorkflows',
              id: workflowId,
            },
          },
        },
      },
    };

    if (gitReferenceId) {
      requestBody.data.relationships.sourceBranchOrTag = {
        data: {
          type: 'scmGitReferences',
          id: gitReferenceId,
        },
      };
    }

    const response = await this.post<CiBuildRun>(
      '/v1/ciBuildRuns',
      requestBody,
    );
    return response.data;
  }

  /**
   * Cancel a running build
   */
  async cancel(buildRunId: string): Promise<void> {
    await this.deleteRequest(`/v1/ciBuildRuns/${buildRunId}`);
  }

  /**
   * Get a specific build run by ID
   */
  async getById(buildRunId: string): Promise<CiBuildRun> {
    const response = await this.get<CiBuildRun>(
      `/v1/ciBuildRuns/${buildRunId}`,
    );
    return response.data;
  }

  /**
   * List build runs for a workflow
   */
  async listForWorkflow(
    workflowId: string,
    options?: { limit?: number },
  ): Promise<CiBuildRun[]> {
    const params: Record<string, string> = {};
    if (options?.limit) {
      params.limit = options.limit.toString();
    }

    const response = await this.get<CiBuildRun[]>(
      `/v1/ciWorkflows/${workflowId}/buildRuns`,
      params,
    );
    return response.data;
  }

  /**
   * Get build actions for a build run
   */
  async getActions(buildRunId: string): Promise<CiBuildAction[]> {
    const response = await this.get<CiBuildAction[]>(
      `/v1/ciBuildRuns/${buildRunId}/actions`,
    );
    return response.data;
  }
}
