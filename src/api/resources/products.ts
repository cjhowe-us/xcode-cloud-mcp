import { BaseAPIClient } from '../base-client.js';
import type { CiProduct } from '../types.js';

/**
 * Client for Xcode Cloud Products operations
 */
export class ProductsClient extends BaseAPIClient {
  /**
   * List all Xcode Cloud products
   */
  async list(options?: { limit?: number }): Promise<CiProduct[]> {
    const params: Record<string, string> = {};
    if (options?.limit) {
      params.limit = options.limit.toString();
    }

    const response = await this.get<CiProduct[]>('/v1/ciProducts', params);
    return response.data;
  }

  /**
   * Get a specific product by ID
   */
  async getById(productId: string): Promise<CiProduct> {
    const response = await this.get<CiProduct>(`/v1/ciProducts/${productId}`);
    return response.data;
  }
}
