import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { registerDiscoveryTools } from './discovery.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AppStoreConnectClient } from '../api/client.js';
import type { CiProduct, CiWorkflow } from '../api/types.js';

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

  const createdWorkflow: CiWorkflow = {
    id: 'wf-1',
    type: 'ciWorkflows',
    attributes: {
      name: 'Demo CI',
      description: 'CI workflow created via MCP',
      isEnabled: true,
      isLockedForEditing: false,
      clean: false,
      containerFilePath: 'App.xcodeproj',
      lastModifiedDate: '2025-01-02',
    },
    relationships: {
      product: {
        data: { type: 'ciProducts', id: 'prod-1' },
      },
      repository: {
        data: { type: 'scmRepositories', id: 'repo-1' },
      },
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
      create: ReturnType<typeof mock>;
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
        listForProduct: mock(async () => []),
        create: mock(async () => createdWorkflow),
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

  it('prompts for missing workflow details', async () => {
    const result = await handler({ productId: 'prod-1' });

    const payload = JSON.parse(result.content[0].text);
    expect(payload.status).toBe('needs_input');
    expect(payload.missing.length).toBeGreaterThan(0);
    expect(clientMocks.workflows.create).not.toHaveBeenCalled();
  });

  it('creates workflow when all required fields are provided', async () => {
    const result = await handler({
      productId: 'prod-1',
      name: 'Demo CI',
      containerFilePath: 'App.xcodeproj',
    });

    const payload = JSON.parse(result.content[0].text);

    expect(payload.status).toBe('created');
    expect(payload.workflow.id).toBe('wf-1');
    expect(clientMocks.workflows.create).toHaveBeenCalledWith(
      'prod-1',
      expect.objectContaining({
        name: 'Demo CI',
        containerFilePath: 'App.xcodeproj',
      }),
    );
  });
});
