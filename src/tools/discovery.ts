import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AppStoreConnectClient } from '../api/client.js';
import { parseProductId, parseWorkflowId } from '../utils/uri-parser.js';

/**
 * Register discovery tools for finding products and workflows
 */
export function registerDiscoveryTools(server: McpServer, client: AppStoreConnectClient) {
  // List all Xcode Cloud products (repositories)
  server.registerTool(
    'list_products',
    {
      description:
        'List all Xcode Cloud products (repositories) associated with your Apple Developer account. Each product represents a repository configured for Xcode Cloud.',
      inputSchema: {
        limit: z.number().optional().describe('Maximum number of products to return (default: 50)'),
      },
    },
    async ({ limit }: { limit?: number }) => {
      try {
        const products = await client.products.list({ limit });

        const formatted = products.map((product) => ({
          id: product.id,
          name: product.attributes.name,
          productType: product.attributes.productType,
          createdDate: product.attributes.createdDate,
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  products: formatted,
                  total: formatted.length,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error listing products: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // List workflows for a specific product
  server.registerTool(
    'list_workflows',
    {
      description:
        'List all Xcode Cloud workflows for a specific product. Workflows define the build, test, and deployment configuration.',
      inputSchema: {
        productId: z
          .string()
          .describe(
            'The product ID or resource URI (e.g., "xcode-cloud://product/abc123" or just "abc123")'
          ),
        limit: z
          .number()
          .optional()
          .describe('Maximum number of workflows to return (default: 50)'),
      },
    },
    async ({ productId, limit }: { productId: string; limit?: number }) => {
      try {
        const parsedProductId = parseProductId(productId);
        const workflows = await client.workflows.listForProduct(parsedProductId, { limit });

        const formatted = workflows.map((workflow) => ({
          id: workflow.id,
          name: workflow.attributes.name,
          description: workflow.attributes.description,
          isEnabled: workflow.attributes.isEnabled,
          clean: workflow.attributes.clean,
          lastModifiedDate: workflow.attributes.lastModifiedDate,
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  workflows: formatted,
                  total: formatted.length,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error listing workflows: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Create a workflow for a product (with interactive prompts)
  server.registerTool(
    'create_workflow',
    {
      description:
        'Create a new Xcode Cloud workflow for a product. If required details are missing, the tool will prompt for them so workflows can be added to projects that do not have any.',
      inputSchema: {
        productId: z
          .string()
          .optional()
          .describe(
            'The product ID or resource URI (e.g., "xcode-cloud://product/abc123"). If omitted, the tool will return available products to choose from.'
          ),
        name: z
          .string()
          .optional()
          .describe('Name for the workflow (e.g., "CI" or "Nightly Tests")'),
        description: z.string().optional().describe('Optional description for the workflow'),
        containerFilePath: z
          .string()
          .optional()
          .describe(
            'Path to the .xcodeproj or .xcworkspace in the repo (e.g., "App/App.xcodeproj")'
          ),
        repositoryId: z
          .string()
          .optional()
          .describe(
            'SCM repository ID to associate with the workflow. Defaults to the product primary repository when present.'
          ),
        gitReferenceId: z
          .string()
          .optional()
          .describe('Default git reference (branch or tag) ID for the workflow start condition'),
        isEnabled: z
          .boolean()
          .optional()
          .describe('Whether the workflow should start enabled (default: true)'),
        clean: z
          .boolean()
          .optional()
          .describe('Whether to run clean builds by default (default: false)'),
        forceCreate: z
          .boolean()
          .optional()
          .describe('Create even if workflows already exist for the product (default: false)'),
      },
    },
    async ({
      productId,
      name,
      description,
      containerFilePath,
      repositoryId,
      gitReferenceId,
      isEnabled,
      clean,
      forceCreate,
    }: {
      productId?: string;
      name?: string;
      description?: string;
      containerFilePath?: string;
      repositoryId?: string;
      gitReferenceId?: string;
      isEnabled?: boolean;
      clean?: boolean;
      forceCreate?: boolean;
    }) => {
      try {
        if (!productId) {
          const products = await client.products.list();

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    status: 'needs_product',
                    message: 'Select a product to create a workflow for.',
                    availableProducts: products.map((p) => ({
                      id: p.id,
                      name: p.attributes.name,
                      productType: p.attributes.productType,
                    })),
                    exampleArguments:
                      products.length > 0
                        ? { productId: products[0].id }
                        : { productId: 'your-product-id' },
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        const parsedProductId = parseProductId(productId);
        const product = await client.products.getById(parsedProductId);
        const workflows = await client.workflows.listForProduct(parsedProductId);

        if (workflows.length > 0 && !forceCreate) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    status: 'existing_workflows',
                    message:
                      'Workflows already exist for this product. Set forceCreate=true to create an additional workflow.',
                    workflows: workflows.map((workflow) => ({
                      id: workflow.id,
                      name: workflow.attributes.name,
                      isEnabled: workflow.attributes.isEnabled,
                    })),
                    exampleArguments: {
                      productId: parsedProductId,
                      forceCreate: true,
                      name: `${product.attributes.name} CI`,
                      containerFilePath: 'YourApp.xcodeproj',
                    },
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        const primaryRepositoryId = product.relationships?.primaryRepositories?.data?.[0]?.id;
        const resolvedRepositoryId = repositoryId ?? primaryRepositoryId;

        const missing: string[] = [];
        if (!name) {
          missing.push('Provide a workflow name (e.g., "CI" or "Nightly Tests").');
        }
        if (!containerFilePath) {
          missing.push(
            'Provide the containerFilePath to your .xcodeproj or .xcworkspace (e.g., "App/App.xcodeproj").'
          );
        }
        if (!resolvedRepositoryId) {
          missing.push(
            'Provide repositoryId (scmRepositories) to associate with the workflow because no primary repository was found on the product.'
          );
        }

        if (missing.length > 0) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    status: 'needs_input',
                    message: 'More information is required to create the workflow.',
                    missing,
                    defaults: {
                      isEnabled: isEnabled ?? true,
                      clean: clean ?? false,
                      repositoryId: primaryRepositoryId,
                    },
                    exampleArguments: {
                      productId: parsedProductId,
                      name: name ?? `${product.attributes.name} CI`,
                      containerFilePath: containerFilePath ?? 'App/App.xcodeproj',
                      repositoryId: resolvedRepositoryId ?? 'scm-repository-id',
                      description: description ?? 'CI workflow created via MCP',
                      isEnabled: isEnabled ?? true,
                      clean: clean ?? false,
                      forceCreate: forceCreate ?? true,
                    },
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        const workflowName = name as string;
        const workflowContainerFilePath = containerFilePath as string;

        const created = await client.workflows.create(parsedProductId, {
          name: workflowName,
          description,
          containerFilePath: workflowContainerFilePath,
          repositoryId: resolvedRepositoryId,
          gitReferenceId,
          isEnabled,
          clean,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  status: 'created',
                  message: 'Workflow created successfully.',
                  workflow: {
                    id: created.id,
                    name: created.attributes.name,
                    containerFilePath: created.attributes.containerFilePath,
                    isEnabled: created.attributes.isEnabled,
                    clean: created.attributes.clean,
                  },
                  product: {
                    id: product.id,
                    name: product.attributes.name,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error creating workflow: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Get details of a specific workflow
  server.registerTool(
    'get_workflow',
    {
      description:
        'Get detailed information about a specific Xcode Cloud workflow including its configuration and settings.',
      inputSchema: {
        workflowId: z
          .string()
          .describe(
            'The workflow ID or resource URI (e.g., "xcode-cloud://workflow/abc123" or just "abc123")'
          ),
      },
    },
    async ({ workflowId }: { workflowId: string }) => {
      try {
        const parsedWorkflowId = parseWorkflowId(workflowId);
        const workflow = await client.workflows.getById(parsedWorkflowId);

        const formatted = {
          id: workflow.id,
          name: workflow.attributes.name,
          description: workflow.attributes.description,
          isEnabled: workflow.attributes.isEnabled,
          isLockedForEditing: workflow.attributes.isLockedForEditing,
          clean: workflow.attributes.clean,
          containerFilePath: workflow.attributes.containerFilePath,
          lastModifiedDate: workflow.attributes.lastModifiedDate,
          relationships: workflow.relationships,
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(formatted, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting workflow: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
