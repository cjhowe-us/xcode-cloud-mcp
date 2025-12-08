import { AuthManager } from './auth.js';

const APP_STORE_CONNECT_API_BASE = 'https://api.appstoreconnect.apple.com';

/**
 * Error response from App Store Connect API
 */
interface APIError {
  errors: Array<{
    status: string;
    code: string;
    title: string;
    detail: string;
  }>;
}

/**
 * Generic response from App Store Connect API
 */
export interface APIResponse<T> {
  data: T;
  links?: {
    self?: string;
    next?: string;
  };
  meta?: {
    paging?: {
      total?: number;
      limit?: number;
    };
  };
  included?: unknown[];
}

/**
 * Base HTTP client for App Store Connect API
 * Internal use only - use semantic clients instead
 */
export class BaseAPIClient {
  protected auth: AuthManager;
  protected baseUrl: string;

  constructor(auth: AuthManager, baseUrl: string = APP_STORE_CONNECT_API_BASE) {
    this.auth = auth;
    this.baseUrl = baseUrl;
  }

  /**
   * Make a GET request to the API
   */
  protected async get<T>(
    endpoint: string,
    params?: Record<string, string>,
  ): Promise<APIResponse<T>> {
    const url = this.buildUrl(endpoint, params);
    return this.request<T>('GET', url);
  }

  /**
   * Make a POST request to the API
   */
  protected async post<T>(
    endpoint: string,
    body: unknown,
  ): Promise<APIResponse<T>> {
    const url = this.buildUrl(endpoint);
    return this.request<T>('POST', url, body);
  }

  /**
   * Make a DELETE request to the API
   */
  protected async delete(endpoint: string): Promise<void> {
    const url = this.buildUrl(endpoint);
    await this.request('DELETE', url);
  }

  /**
   * Download binary content (for artifacts like screenshots/videos)
   */
  protected async downloadBinary(url: string): Promise<ArrayBuffer> {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.auth.getToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to download binary: ${response.status} ${response.statusText}`,
      );
    }

    return response.arrayBuffer();
  }

  /**
   * Build full URL with query parameters
   */
  private buildUrl(endpoint: string, params?: Record<string, string>): string {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }
    return url.toString();
  }

  /**
   * Make HTTP request with authentication and error handling
   */
  private async request<T>(
    method: string,
    url: string,
    body?: unknown,
  ): Promise<APIResponse<T>> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.auth.getToken()}`,
      'Content-Type': 'application/json',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);

      // Handle DELETE requests which may not return content
      if (method === 'DELETE' && response.ok) {
        return { data: null as T };
      }

      const data = await response.json();

      if (!response.ok) {
        const errorData = data as APIError;
        const errorMessages = errorData.errors
          .map((e) => `${e.title}: ${e.detail}`)
          .join('; ');
        throw new Error(`API Error (${response.status}): ${errorMessages}`);
      }

      return data as APIResponse<T>;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Request failed: ${error}`);
    }
  }
}
