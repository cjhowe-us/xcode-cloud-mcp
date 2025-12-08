import { BaseAPIClient } from '../base-client.js';
import type { CiWorkflow, CreateWorkflowParams, CreateWorkflowRequest } from '../types.js';

/**
 * Client for Xcode Cloud Workflows operations
 */
export class WorkflowsClient extends BaseAPIClient {
  /**
   * List workflows for a specific product
   */
  async listForProduct(productId: string, options?: { limit?: number }): Promise<CiWorkflow[]> {
    const params: Record<string, string> = {};
    if (options?.limit) {
      params.limit = options.limit.toString();
    }

    const response = await this.get<CiWorkflow[]>(`/v1/ciProducts/${productId}/workflows`, params);
    return response.data;
  }

  /**
   * Get a specific workflow by ID
   */
  async getById(workflowId: string): Promise<CiWorkflow> {
    const response = await this.get<CiWorkflow>(`/v1/ciWorkflows/${workflowId}`);
    return response.data;
  }

  /**
   * Create a new workflow for a product
   */
  async create(productId: string, params: CreateWorkflowParams): Promise<CiWorkflow> {
    const payload: CreateWorkflowRequest = {
      data: {
        type: 'ciWorkflows',
        attributes: {
          name: params.name,
          description: params.description,
          isEnabled: params.isEnabled ?? true,
          clean: params.clean ?? false,
          containerFilePath: params.containerFilePath,
        },
        relationships: {
          product: {
            data: {
              type: 'ciProducts',
              id: productId,
            },
          },
        },
      },
    };

    if (params.repositoryId) {
      payload.data.relationships.repository = {
        data: {
          type: 'scmRepositories',
          id: params.repositoryId,
        },
      };
    }

    if (params.gitReferenceId) {
      payload.data.relationships.sourceBranchOrTag = {
        data: {
          type: 'scmGitReferences',
          id: params.gitReferenceId,
        },
      };
    }

    const response = await this.post<CiWorkflow>('/v1/ciWorkflows', payload);
    return response.data;
  }
}
