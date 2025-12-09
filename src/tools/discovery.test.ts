import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { registerDiscoveryTools } from './discovery.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AppStoreConnectClient } from '../api/client.js';
import type {
  CiProduct,
  CiWorkflow,
  CiXcodeVersion,
  CiMacOsVersion,
} from '../api/types.js';

describe('create_workflow tool', () => {
  type ToolHandler = (args: Record<string, unknown>) => Promise<{
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  }>;

  const product: CiProduct = {
    id: 'prod-1',
    type: 'ciProducts',
    attributes: {
      name: 'Demo App',
      createdDate: '2025-01-01',
      productType: 'APP',
    },
    relationships: {
      primaryRepositories: {
        data: [{ type: 'scmRepositories', id: 'repo-1' }],
      },
    },
  };

  const existingWorkflow: CiWorkflow = {
    id: 'wf-existing',
    type: 'ciWorkflows',
    attributes: {
      name: 'Existing CI',
      isEnabled: true,
      isLockedForEditing: false,
      clean: false,
      containerFilePath: 'App.xcodeproj',
      lastModifiedDate: '2025-01-01',
    },
  };

  const xcodeVersion: CiXcodeVersion = {
    id: 'xcode-16',
    type: 'ciXcodeVersions',
    attributes: {
      name: 'Xcode 16',
      version: '16.0',
    },
  };

  const macOsVersion: CiMacOsVersion = {
    id: 'macos-15',
    type: 'ciMacOsVersions',
    attributes: {
      name: 'macOS 15',
      version: '15.0',
    },
  };

  let handler: ToolHandler;
  let clientMocks: {
    products: {
      list: ReturnType<typeof mock>;
      getById: ReturnType<typeof mock>;
    };
    workflows: {
      listForProduct: ReturnType<typeof mock>;
    };
    xcodeVersions: {
      list: ReturnType<typeof mock>;
    };
    macOsVersions: {
      list: ReturnType<typeof mock>;
    };
  };

  beforeEach(() => {
    const registerTool = mock<
      (name: string, config: unknown, cb: ToolHandler) => void
    >(() => {});
    const server = { registerTool } as unknown as McpServer;

    clientMocks = {
      products: {
        list: mock(async () => [product]),
        getById: mock(async () => product),
      },
      workflows: {
        listForProduct: mock(async () => [existingWorkflow]),
      },
      xcodeVersions: {
        list: mock(async () => [xcodeVersion]),
      },
      macOsVersions: {
        list: mock(async () => [macOsVersion]),
      },
    };

    registerDiscoveryTools(
      server,
      clientMocks as unknown as AppStoreConnectClient,
    );
    const createCall = registerTool.mock.calls.find(
      ([name]) => name === 'create_workflow',
    );

    if (!createCall) {
      throw new Error('create_workflow tool was not registered');
    }

    handler = createCall[2];
  });

  it('prompts for product selection when no productId is provided', async () => {
    const result = await handler({});

    const payload = JSON.parse(result.content[0].text);
    expect(payload.status).toBe('needs_product');
    expect(payload.availableProducts[0].id).toBe('prod-1');
  });

  it('returns ready status with all required info when productId is provided', async () => {
    const result = await handler({ productId: 'prod-1' });

    const payload = JSON.parse(result.content[0].text);
    expect(payload.status).toBe('ready');
    expect(payload.product.id).toBe('prod-1');
    expect(payload.repositoryId).toBe('repo-1');
    expect(payload.availableXcodeVersions).toHaveLength(1);
    expect(payload.availableMacOsVersions).toHaveLength(1);
    expect(payload.exampleUsage.tool).toBe('create_workflow_with_actions');
  });

  it('includes existing workflows in the response', async () => {
    const result = await handler({ productId: 'prod-1' });

    const payload = JSON.parse(result.content[0].text);
    expect(payload.existingWorkflows).toHaveLength(1);
    expect(payload.existingWorkflows[0].name).toBe('Existing CI');
  });
});
