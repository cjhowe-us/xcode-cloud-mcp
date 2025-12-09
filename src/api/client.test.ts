import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  mock,
  spyOn,
} from 'bun:test';
import { AppStoreConnectClient } from './client.js';
import { AuthManager } from './auth.js';

describe('AppStoreConnectClient', () => {
  let mockAuth: Pick<AuthManager, 'getToken'>;
  let client: AppStoreConnectClient;
  let fetchSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    mockAuth = {
      getToken: mock(() => 'mock-jwt-token'),
    };
    client = new AppStoreConnectClient(mockAuth as AuthManager);
    fetchSpy = spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe('products', () => {
    it('should list products', async () => {
      fetchSpy.mockResolvedValue(
        Response.json({
          data: [
            {
              id: '1',
              attributes: {
                name: 'test',
                productType: 'APP',
                createdDate: '2025-01-01',
              },
            },
          ],
        }),
      );

      const products = await client.products.list();

      expect(fetchSpy).toHaveBeenCalled();
      expect(products).toHaveLength(1);
      expect(products[0].attributes.name).toBe('test');
    });

    it('should list products with limit', async () => {
      fetchSpy.mockResolvedValue(Response.json({ data: [] }));

      await client.products.list({ limit: 10 });

      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).toContain('limit=10');
    });

    it('should get product by id', async () => {
      fetchSpy.mockResolvedValue(
        Response.json({
          data: {
            id: 'product-123',
            attributes: {
              name: 'test',
              productType: 'APP',
              createdDate: '2025-01-01',
            },
          },
        }),
      );

      const product = await client.products.getById('product-123');

      expect(product.id).toBe('product-123');
      expect(fetchSpy.mock.calls[0][0]).toContain('/v1/ciProducts/product-123');
    });
  });

  describe('workflows', () => {
    it('should list workflows for product', async () => {
      fetchSpy.mockResolvedValue(
        Response.json({
          data: [
            {
              id: '1',
              attributes: {
                name: 'CI',
                isEnabled: true,
                clean: false,
                isLockedForEditing: false,
                containerFilePath: '',
                lastModifiedDate: '2025-01-01',
              },
            },
          ],
        }),
      );

      const workflows = await client.workflows.listForProduct('product-123');

      expect(workflows).toHaveLength(1);
      expect(fetchSpy.mock.calls[0][0]).toContain(
        '/v1/ciProducts/product-123/workflows',
      );
    });

    it('should get workflow by id', async () => {
      fetchSpy.mockResolvedValue(
        Response.json({
          data: {
            id: 'workflow-123',
            attributes: {
              name: 'CI',
              isEnabled: true,
              clean: false,
              isLockedForEditing: false,
              containerFilePath: '',
              lastModifiedDate: '2025-01-01',
            },
          },
        }),
      );

      const workflow = await client.workflows.getById('workflow-123');

      expect(workflow.id).toBe('workflow-123');
    });

    it('should create workflow with actions', async () => {
      fetchSpy.mockResolvedValue(
        Response.json({
          data: {
            id: 'workflow-999',
            attributes: {
              name: 'New Workflow',
              description: 'CI workflow',
              isEnabled: true,
              clean: false,
              isLockedForEditing: false,
              containerFilePath: 'App.xcodeproj',
              lastModifiedDate: '2025-01-02',
            },
          },
        }),
      );

      const workflow = await client.workflows.create('product-123', {
        name: 'New Workflow',
        description: 'CI workflow',
        containerFilePath: 'App.xcodeproj',
        repositoryId: 'repo-1',
        xcodeVersionId: 'xcode-16',
        macOsVersionId: 'macos-15',
        actions: [
          { name: 'Build', actionType: 'BUILD', platform: 'IOS' },
          { name: 'Test', actionType: 'TEST', platform: 'IOS' },
        ],
      });

      const request = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(request[0]).toContain('/v1/ciWorkflows');
      const body = JSON.parse(request[1].body as string);
      expect(body.data.relationships.product.data.id).toBe('product-123');
      expect(body.data.relationships.repository.data.id).toBe('repo-1');
      expect(body.data.relationships.xcodeVersion.data.id).toBe('xcode-16');
      expect(body.data.relationships.macOsVersion.data.id).toBe('macos-15');
      expect(body.data.attributes.isEnabled).toBe(true);
      expect(body.data.attributes.clean).toBe(false);
      expect(body.data.attributes.actions).toHaveLength(2);
      expect(workflow.id).toBe('workflow-999');
    });

    it('should update workflow with actions', async () => {
      fetchSpy.mockResolvedValue(
        Response.json({
          data: {
            id: 'workflow-abc',
            attributes: {
              name: 'Updated Workflow',
              isEnabled: true,
              clean: false,
              isLockedForEditing: false,
              containerFilePath: 'App.xcworkspace',
              lastModifiedDate: '2025-01-03',
            },
          },
        }),
      );

      await client.workflows.update('workflow-abc', {
        name: 'Updated Workflow',
        actions: [
          { name: 'Build', actionType: 'BUILD', platform: 'IOS' },
          { name: 'Test', actionType: 'TEST', platform: 'IOS' },
          { name: 'Analyze', actionType: 'ANALYZE', platform: 'IOS' },
        ],
      });

      const [url, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('/v1/ciWorkflows/workflow-abc');
      expect(options.method).toBe('PATCH');
      const body = JSON.parse(options.body as string);
      expect(body.data.id).toBe('workflow-abc');
      expect(body.data.attributes.name).toBe('Updated Workflow');
      expect(body.data.attributes.actions).toHaveLength(3);
    });

    it('should delete workflow', async () => {
      fetchSpy.mockResolvedValue(Response.json(null));

      await client.workflows.delete('workflow-123');

      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).toContain('/v1/ciWorkflows/workflow-123');
      const options = fetchSpy.mock.calls[0][1] as RequestInit;
      expect(options.method).toBe('DELETE');
    });
  });

  describe('builds', () => {
    it('should start a build', async () => {
      fetchSpy.mockResolvedValue(
        Response.json({
          data: {
            id: 'build-123',
            attributes: {
              number: 1,
              executionProgress: 'PENDING',
              createdDate: '2025-01-01',
              isPullRequestBuild: false,
            },
          },
        }),
      );

      const build = await client.builds.start('workflow-123');

      expect(build.id).toBe('build-123');
      const options = fetchSpy.mock.calls[0][1] as RequestInit;
      expect(options.method).toBe('POST');
    });

    it('should cancel a build', async () => {
      fetchSpy.mockResolvedValue(Response.json(null));

      await client.builds.cancel('build-123');

      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).toContain('/v1/ciBuildRuns/build-123');
      const options = fetchSpy.mock.calls[0][1] as RequestInit;
      expect(options.method).toBe('DELETE');
    });

    it('should get build by id', async () => {
      fetchSpy.mockResolvedValue(
        Response.json({
          data: {
            id: 'build-123',
            attributes: {
              number: 1,
              executionProgress: 'COMPLETE',
              createdDate: '2025-01-01',
              isPullRequestBuild: false,
            },
          },
        }),
      );

      const build = await client.builds.getById('build-123');

      expect(build.id).toBe('build-123');
    });

    it('should list builds for workflow', async () => {
      fetchSpy.mockResolvedValue(
        Response.json({
          data: [
            {
              id: 'build-1',
              attributes: {
                number: 1,
                executionProgress: 'COMPLETE',
                createdDate: '2025-01-01',
                isPullRequestBuild: false,
              },
            },
          ],
        }),
      );

      const builds = await client.builds.listForWorkflow('workflow-123');

      expect(builds).toHaveLength(1);
    });

    it('should get build actions', async () => {
      fetchSpy.mockResolvedValue(
        Response.json({
          data: [
            {
              id: 'action-1',
              attributes: {
                name: 'Build',
                actionType: 'BUILD',
                executionProgress: 'COMPLETE',
              },
            },
          ],
        }),
      );

      const actions = await client.builds.getActions('build-123');

      expect(actions).toHaveLength(1);
      expect(fetchSpy.mock.calls[0][0]).toContain(
        '/v1/ciBuildRuns/build-123/actions',
      );
    });
  });

  describe('artifacts', () => {
    it('should get artifacts for build run organized by type', async () => {
      fetchSpy.mockResolvedValue(
        Response.json({
          data: [
            { id: '1', attributes: { fileName: 'build.log', fileType: 'LOG' } },
            {
              id: '2',
              attributes: { fileName: 'app.xcarchive', fileType: 'ARCHIVE' },
            },
            {
              id: '3',
              attributes: {
                fileName: 'screenshot.png',
                fileType: 'SCREENSHOT',
              },
            },
          ],
        }),
      );

      const artifacts = await client.artifacts.getForBuildRun('build-123');

      expect(artifacts.logs).toHaveLength(1);
      expect(artifacts.archives).toHaveLength(1);
      expect(artifacts.screenshots).toHaveLength(1);
      expect(artifacts.videos).toHaveLength(0);
    });

    it('should download artifact binary', async () => {
      const mockArrayBuffer = new ArrayBuffer(8);
      fetchSpy.mockResolvedValue(
        new Response(mockArrayBuffer, { status: 200 }),
      );

      const result = await client.artifacts.download(
        'https://example.com/artifact.zip',
      );

      expect(result).toBeInstanceOf(ArrayBuffer);
    });
  });

  describe('error handling', () => {
    it('should throw error on API error response', async () => {
      fetchSpy.mockResolvedValue(
        new Response(
          JSON.stringify({
            errors: [
              {
                status: '401',
                code: 'UNAUTHORIZED',
                title: 'Unauthorized',
                detail: 'Invalid JWT token',
              },
            ],
          }),
          { status: 401 },
        ),
      );

      await expect(client.products.list()).rejects.toThrow(
        /API Error \(401\): Unauthorized: Invalid JWT token/,
      );
    });

    it('should handle network errors', async () => {
      fetchSpy.mockRejectedValue(new Error('Network error'));

      await expect(client.products.list()).rejects.toThrow('Network error');
    });
  });
});
