import { BaseAPIClient } from '../base-client.js';

export interface ScmRepository {
  type: 'scmRepositories';
  id: string;
  attributes: {
    lastAccessedDate?: string;
    httpCloneUrl?: string;
    sshCloneUrl?: string;
    ownerName?: string;
    repositoryName?: string;
  };
}

/**
 * Client for SCM Repositories operations
 */
export class RepositoriesClient extends BaseAPIClient {
  /**
   * Get repository for a product
   */
  async getForProduct(productId: string): Promise<ScmRepository | null> {
    // Get repositories through the product's primary repositories relationship
    const response = await this.get<ScmRepository[]>(
      `/v1/ciProducts/${productId}/primaryRepositories`,
    );
    return response.data.length > 0 ? response.data[0] : null;
  }

  /**
   * Get repository for a workflow
   */
  async getForWorkflow(workflowId: string): Promise<ScmRepository> {
    const response = await this.get<ScmRepository>(
      `/v1/ciWorkflows/${workflowId}/repository`,
    );
    return response.data;
  }

  /**
   * Get a specific repository by ID
   */
  async getById(repositoryId: string): Promise<ScmRepository> {
    const response = await this.get<ScmRepository>(
      `/v1/scmRepositories/${repositoryId}`,
    );
    return response.data;
  }

  /**
   * List git references (branches and tags) for a repository
   */
  async listGitReferences(
    repositoryId: string,
    options?: { limit?: number },
  ): Promise<
    Array<{
      type: string;
      id: string;
      attributes: {
        name: string;
        canonicalName: string;
        isDeleted: boolean;
        kind: 'BRANCH' | 'TAG';
      };
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
        attributes: {
          name: string;
          canonicalName: string;
          isDeleted: boolean;
          kind: 'BRANCH' | 'TAG';
        };
      }>
    >(`/v1/scmRepositories/${repositoryId}/gitReferences`, params);
    return response.data;
  }
}
