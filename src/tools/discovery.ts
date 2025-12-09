import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AppStoreConnectClient } from '../api/client.js';
import { parseProductId, parseWorkflowId } from '../utils/uri-parser.js';

/**
 * Register discovery tools for finding products and workflows
 */
export function registerDiscoveryTools(
  server: McpServer,
  client: AppStoreConnectClient,
) {
  // List all Xcode Cloud products (repositories)
  server.registerTool(
    'list_products',
    {
      description:
        'List all Xcode Cloud products (repositories) associated with your Apple Developer account. Each product represents a repository configured for Xcode Cloud.',
      inputSchema: {
        limit: z
          .number()
          .optional()
          .describe('Maximum number of products to return (default: 50)'),
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
                2,
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
    },
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
            'The product ID or resource URI (e.g., "xcode-cloud://product/abc123" or just "abc123")',
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
        const workflows = await client.workflows.listForProduct(
          parsedProductId,
          { limit },
        );

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
                2,
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
    },
  );

  // Gather workflow creation requirements for a product
  server.registerTool(
    'create_workflow',
    {
      description:
        'Gather all required information to create an Xcode Cloud workflow. This tool helps you collect the product, repository, Xcode version, macOS version, and other details needed. Use create_workflow_with_actions to actually create the workflow once you have all required IDs.',
      inputSchema: {
        productId: z
          .string()
          .optional()
          .describe(
            'The product ID or resource URI. If omitted, returns available products.',
          ),
      },
    },
    async ({ productId }: { productId?: string }) => {
      try {
        // If no product, list available products
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
                    nextStep: 'Call create_workflow with productId parameter',
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        const parsedProductId = parseProductId(productId);
        const product = await client.products.getById(parsedProductId);
        const workflows =
          await client.workflows.listForProduct(parsedProductId);

        // Get repository info
        const primaryRepositoryId =
          product.relationships?.primaryRepositories?.data?.[0]?.id;

        // Get available Xcode and macOS versions
        const xcodeVersions = await client.xcodeVersions.list({ limit: 10 });
        const macOsVersions = await client.macOsVersions.list({ limit: 10 });

        // Build the response with all the info needed for create_workflow_with_actions
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  status: 'ready',
                  message:
                    'Use create_workflow_with_actions with the following IDs to create a workflow.',
                  product: {
                    id: product.id,
                    name: product.attributes.name,
                  },
                  existingWorkflows: workflows.map((w) => ({
                    id: w.id,
                    name: w.attributes.name,
                    isEnabled: w.attributes.isEnabled,
                  })),
                  repositoryId:
                    primaryRepositoryId ?? 'Use get_repository to find this',
                  availableXcodeVersions: xcodeVersions.map((v) => ({
                    id: v.id,
                    name: v.attributes.name,
                    version: v.attributes.version,
                  })),
                  availableMacOsVersions: macOsVersions.map((v) => ({
                    id: v.id,
                    name: v.attributes.name,
                    version: v.attributes.version,
                  })),
                  exampleUsage: {
                    tool: 'create_workflow_with_actions',
                    arguments: {
                      productId: parsedProductId,
                      repositoryId: primaryRepositoryId ?? 'YOUR_REPOSITORY_ID',
                      xcodeVersionId:
                        xcodeVersions.length > 0
                          ? xcodeVersions[0].id
                          : 'YOUR_XCODE_VERSION_ID',
                      macOsVersionId:
                        macOsVersions.length > 0
                          ? macOsVersions[0].id
                          : 'YOUR_MACOS_VERSION_ID',
                      name: `${product.attributes.name} CI`,
                      description: 'CI workflow with tests',
                      containerFilePath: 'YourApp.xcodeproj',
                      actions: [
                        {
                          name: 'Build - iOS',
                          actionType: 'BUILD',
                          platform: 'IOS',
                          scheme: 'YourScheme',
                          destination: 'ANY_IOS_SIMULATOR',
                        },
                        {
                          name: 'Test - iOS',
                          actionType: 'TEST',
                          platform: 'IOS',
                          scheme: 'YourScheme',
                          destination: 'ANY_IOS_SIMULATOR',
                        },
                      ],
                    },
                  },
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error gathering workflow info: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
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
            'The workflow ID or resource URI (e.g., "xcode-cloud://workflow/abc123" or just "abc123")',
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
    },
  );
}
