import { AuthManager } from './auth.js';
import { ProductsClient } from './resources/products.js';
import { WorkflowsClient } from './resources/workflows.js';
import { BuildsClient } from './resources/builds.js';
import { ArtifactsClient } from './resources/artifacts.js';

/**
 * Main client for App Store Connect API with semantic operations
 */
export class AppStoreConnectClient {
  public readonly products: ProductsClient;
  public readonly workflows: WorkflowsClient;
  public readonly builds: BuildsClient;
  public readonly artifacts: ArtifactsClient;

  constructor(auth: AuthManager) {
    // Share auth across all resource clients
    this.products = new ProductsClient(auth);
    this.workflows = new WorkflowsClient(auth);
    this.builds = new BuildsClient(auth);
    this.artifacts = new ArtifactsClient(auth);
  }
}
