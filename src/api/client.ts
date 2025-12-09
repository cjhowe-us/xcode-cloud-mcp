import { AuthManager } from './auth.js';
import { ProductsClient } from './resources/products.js';
import { WorkflowsClient } from './resources/workflows.js';
import { BuildsClient } from './resources/builds.js';
import { ArtifactsClient } from './resources/artifacts.js';
import { XcodeVersionsClient } from './resources/xcode-versions.js';
import { MacOsVersionsClient } from './resources/macos-versions.js';
import { RepositoriesClient } from './resources/repositories.js';

/**
 * Main client for App Store Connect API with semantic operations
 */
export class AppStoreConnectClient {
  public readonly products: ProductsClient;
  public readonly workflows: WorkflowsClient;
  public readonly builds: BuildsClient;
  public readonly artifacts: ArtifactsClient;
  public readonly xcodeVersions: XcodeVersionsClient;
  public readonly macOsVersions: MacOsVersionsClient;
  public readonly repositories: RepositoriesClient;

  constructor(auth: AuthManager) {
    // Share auth across all resource clients
    this.products = new ProductsClient(auth);
    this.workflows = new WorkflowsClient(auth);
    this.builds = new BuildsClient(auth);
    this.artifacts = new ArtifactsClient(auth);
    this.xcodeVersions = new XcodeVersionsClient(auth);
    this.macOsVersions = new MacOsVersionsClient(auth);
    this.repositories = new RepositoriesClient(auth);
  }
}
