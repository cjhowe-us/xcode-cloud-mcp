import { BaseAPIClient } from '../base-client.js';
import type {
  CiWorkflow,
  CreateWorkflowParams,
  CreateWorkflowRequest,
  UpdateWorkflowParams,
  UpdateWorkflowRequest,
} from '../types.js';

/**
 * Client for Xcode Cloud Workflows operations
 */
export class WorkflowsClient extends BaseAPIClient {
  /**
   * List workflows for a specific product
   */
  async listForProduct(
    productId: string,
    options?: { limit?: number },
  ): Promise<CiWorkflow[]> {
    const params: Record<string, string> = {};
    if (options?.limit) {
      params.limit = options.limit.toString();
    }

    const response = await this.get<CiWorkflow[]>(
      `/v1/ciProducts/${productId}/workflows`,
      params,
    );
    return response.data;
  }

  /**
   * Get a specific workflow by ID
   */
  async getById(workflowId: string): Promise<CiWorkflow> {
    const response = await this.get<CiWorkflow>(
      `/v1/ciWorkflows/${workflowId}`,
    );
    return response.data;
  }

  /**
   * Create a new workflow for a product
   */
  async create(
    productId: string,
    params: CreateWorkflowParams,
  ): Promise<CiWorkflow> {
    const payload: CreateWorkflowRequest = {
      data: {
        type: 'ciWorkflows',
        attributes: {
          name: params.name,
          description: params.description,
          isEnabled: params.isEnabled ?? true,
          clean: params.clean ?? false,
          containerFilePath: params.containerFilePath,
          actions: params.actions,
        },
        relationships: {
          product: {
            data: {
              type: 'ciProducts',
              id: productId,
            },
          },
          repository: {
            data: {
              type: 'scmRepositories',
              id: params.repositoryId,
            },
          },
          xcodeVersion: {
            data: {
              type: 'ciXcodeVersions',
              id: params.xcodeVersionId,
            },
          },
          macOsVersion: {
            data: {
              type: 'ciMacOsVersions',
              id: params.macOsVersionId,
            },
          },
        },
      },
    };

    if (params.branchStartCondition) {
      payload.data.attributes.branchStartCondition =
        params.branchStartCondition;
    }

    if (params.manualBranchStartCondition) {
      payload.data.attributes.manualBranchStartCondition =
        params.manualBranchStartCondition;
    }

    const response = await this.post<CiWorkflow>('/v1/ciWorkflows', payload);
    return response.data;
  }

  /**
   * Update an existing workflow
   */
  async update(
    workflowId: string,
    params: UpdateWorkflowParams,
  ): Promise<CiWorkflow> {
    const payload: UpdateWorkflowRequest = {
      data: {
        type: 'ciWorkflows',
        id: workflowId,
      },
    };

    // Build attributes object only with provided fields
    const attributes: UpdateWorkflowRequest['data']['attributes'] = {};
    if (params.name !== undefined) attributes.name = params.name;
    if (params.description !== undefined)
      attributes.description = params.description;
    if (params.isEnabled !== undefined) attributes.isEnabled = params.isEnabled;
    if (params.clean !== undefined) attributes.clean = params.clean;
    if (params.containerFilePath !== undefined)
      attributes.containerFilePath = params.containerFilePath;
    if (params.actions !== undefined) attributes.actions = params.actions;
    if (params.branchStartCondition !== undefined)
      attributes.branchStartCondition = params.branchStartCondition;
    if (params.manualBranchStartCondition !== undefined)
      attributes.manualBranchStartCondition = params.manualBranchStartCondition;

    if (Object.keys(attributes).length > 0) {
      payload.data.attributes = attributes;
    }

    // Build relationships object only with provided fields
    const relationships: UpdateWorkflowRequest['data']['relationships'] = {};
    if (params.xcodeVersionId) {
      relationships.xcodeVersion = {
        data: {
          type: 'ciXcodeVersions',
          id: params.xcodeVersionId,
        },
      };
    }
    if (params.macOsVersionId) {
      relationships.macOsVersion = {
        data: {
          type: 'ciMacOsVersions',
          id: params.macOsVersionId,
        },
      };
    }

    if (Object.keys(relationships).length > 0) {
      payload.data.relationships = relationships;
    }

    const response = await this.patch<CiWorkflow>(
      `/v1/ciWorkflows/${workflowId}`,
      payload,
    );
    return response.data;
  }

  /**
   * Delete a workflow
   */
  async delete(workflowId: string): Promise<void> {
    await this.deleteRequest(`/v1/ciWorkflows/${workflowId}`);
  }
}
