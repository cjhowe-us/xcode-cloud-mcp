import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AppStoreConnectClient } from '../api/client.js';
import { parseWorkflowId, parseProductId } from '../utils/uri-parser.js';
import type { CiAction, CiBranchStartCondition } from '../api/types.js';

// Zod schemas for test destination configuration
const CiTestDestinationSchema = z.object({
  deviceTypeName: z.string().optional().describe('Device type name (e.g., "iPhone 16")'),
  deviceTypeIdentifier: z
    .string()
    .optional()
    .describe('Device type identifier (e.g., "com.apple.CoreSimulator.SimDeviceType.iPhone-16")'),
  runtimeName: z.string().optional().describe('Runtime name (e.g., "iOS 18.1")'),
  runtimeIdentifier: z
    .string()
    .optional()
    .describe('Runtime identifier (e.g., "com.apple.CoreSimulator.SimRuntime.iOS-18-1")'),
  kind: z.enum(['SIMULATOR', 'MAC']).optional().describe('Kind of test destination'),
});

// Zod schemas for workflow action configuration
const CiActionSchema = z.object({
  name: z.string().describe('Display name for the action'),
  actionType: z
    .enum(['BUILD', 'ANALYZE', 'TEST', 'ARCHIVE'])
    .describe('Type of action to perform'),
  destination: z
    .enum([
      'ANY_IOS_DEVICE',
      'ANY_IOS_SIMULATOR',
      'ANY_TVOS_DEVICE',
      'ANY_TVOS_SIMULATOR',
      'ANY_WATCHOS_DEVICE',
      'ANY_WATCHOS_SIMULATOR',
      'ANY_MAC',
      'ANY_MAC_CATALYST',
      'ANY_VISIONOS_DEVICE',
      'ANY_VISIONOS_SIMULATOR',
    ])
    .optional()
    .describe('Destination device type for the action'),
  platform: z
    .enum(['MACOS', 'IOS', 'TVOS', 'WATCHOS', 'VISIONOS'])
    .optional()
    .describe('Platform for the action'),
  scheme: z.string().optional().describe('Xcode scheme to use for the action'),
  isRequiredToPass: z
    .boolean()
    .optional()
    .describe('Whether this action must pass for the build to succeed'),
  testConfig: z
    .object({
      kind: z
        .enum(['USE_SCHEME_SETTINGS', 'SPECIFIC_TEST_PLANS'])
        .optional()
        .describe('Test configuration kind'),
      testPlanName: z.string().optional().describe('Name of the test plan to use'),
      testDestinations: z
        .array(CiTestDestinationSchema)
        .optional()
        .describe('Test destinations for running tests'),
    })
    .optional()
    .describe('Test configuration (required for TEST actions)'),
});

/**
 * Register workflow management tools
 */
export function registerWorkflowManagementTools(
  server: McpServer,
  client: AppStoreConnectClient,
) {
  // List available Xcode versions
  server.registerTool(
    'list_xcode_versions',
    {
      description:
        'List all available Xcode versions for Xcode Cloud workflows. Use these IDs when creating or updating workflows.',
      inputSchema: {
        limit: z
          .number()
          .optional()
          .describe('Maximum number of versions to return (default: 50)'),
      },
    },
    async ({ limit }: { limit?: number }) => {
      try {
        const versions = await client.xcodeVersions.list({ limit });

        const formatted = versions.map((v) => ({
          id: v.id,
          version: v.attributes.version,
          name: v.attributes.name,
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  xcodeVersions: formatted,
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
              text: `Error listing Xcode versions: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // List available macOS versions
  server.registerTool(
    'list_macos_versions',
    {
      description:
        'List all available macOS versions for Xcode Cloud workflows. Use these IDs when creating or updating workflows.',
      inputSchema: {
        limit: z
          .number()
          .optional()
          .describe('Maximum number of versions to return (default: 50)'),
      },
    },
    async ({ limit }: { limit?: number }) => {
      try {
        const versions = await client.macOsVersions.list({ limit });

        const formatted = versions.map((v) => ({
          id: v.id,
          version: v.attributes.version,
          name: v.attributes.name,
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  macOsVersions: formatted,
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
              text: `Error listing macOS versions: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // Get compatible macOS versions for an Xcode version
  server.registerTool(
    'list_compatible_macos_versions',
    {
      description:
        'List macOS versions compatible with a specific Xcode version.',
      inputSchema: {
        xcodeVersionId: z
          .string()
          .describe('The Xcode version ID to get compatible macOS versions for'),
      },
    },
    async ({ xcodeVersionId }: { xcodeVersionId: string }) => {
      try {
        const versions = await client.xcodeVersions.listMacOsVersions(
          xcodeVersionId,
        );

        const formatted = versions.map((v) => ({
          id: v.id,
          version: v.attributes.version,
          name: v.attributes.name,
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  xcodeVersionId,
                  compatibleMacOsVersions: formatted,
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
              text: `Error listing compatible macOS versions: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // Get test destinations for an Xcode version
  server.registerTool(
    'get_test_destinations',
    {
      description:
        'Get available test destinations (simulators/devices) for a specific Xcode version. Use these when configuring TEST actions in workflows.',
      inputSchema: {
        xcodeVersionId: z
          .string()
          .describe('The Xcode version ID to get test destinations for'),
      },
    },
    async ({ xcodeVersionId }: { xcodeVersionId: string }) => {
      try {
        const xcodeVersion =
          await client.xcodeVersions.getWithTestDestinations(xcodeVersionId);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  xcodeVersionId,
                  xcodeVersion: xcodeVersion.attributes.name,
                  testDestinations: xcodeVersion.attributes.testDestinations || [],
                  total: xcodeVersion.attributes.testDestinations?.length || 0,
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
              text: `Error getting test destinations: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // Get repository for a product
  server.registerTool(
    'get_repository',
    {
      description:
        'Get the SCM repository information for a product. Returns the repository ID needed for creating workflows.',
      inputSchema: {
        productId: z
          .string()
          .describe(
            'The product ID or resource URI to get repository info for',
          ),
      },
    },
    async ({ productId }: { productId: string }) => {
      try {
        const parsedProductId = parseProductId(productId);
        const repository =
          await client.repositories.getForProduct(parsedProductId);

        if (!repository) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    error: 'No repository found for this product',
                    productId: parsedProductId,
                  },
                  null,
                  2,
                ),
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  repository: {
                    id: repository.id,
                    ownerName: repository.attributes.ownerName,
                    repositoryName: repository.attributes.repositoryName,
                    httpCloneUrl: repository.attributes.httpCloneUrl,
                    sshCloneUrl: repository.attributes.sshCloneUrl,
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
              text: `Error getting repository: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // Update an existing workflow
  server.registerTool(
    'update_workflow',
    {
      description:
        'Update an existing Xcode Cloud workflow. You can update the name, description, enabled state, actions, and start conditions.',
      inputSchema: {
        workflowId: z
          .string()
          .describe('The workflow ID or resource URI to update'),
        name: z.string().optional().describe('New name for the workflow'),
        description: z
          .string()
          .optional()
          .describe('New description for the workflow'),
        isEnabled: z
          .boolean()
          .optional()
          .describe('Whether the workflow should be enabled'),
        clean: z
          .boolean()
          .optional()
          .describe('Whether to run clean builds'),
        actions: z
          .array(CiActionSchema)
          .optional()
          .describe(
            'Array of actions (BUILD, TEST, ANALYZE, ARCHIVE) to configure for this workflow',
          ),
      },
    },
    async ({
      workflowId,
      name,
      description,
      isEnabled,
      clean,
      actions,
    }: {
      workflowId: string;
      name?: string;
      description?: string;
      isEnabled?: boolean;
      clean?: boolean;
      actions?: CiAction[];
    }) => {
      try {
        const parsedWorkflowId = parseWorkflowId(workflowId);

        const updated = await client.workflows.update(parsedWorkflowId, {
          name,
          description,
          isEnabled,
          clean,
          actions,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  status: 'updated',
                  message: 'Workflow updated successfully.',
                  workflow: {
                    id: updated.id,
                    name: updated.attributes.name,
                    description: updated.attributes.description,
                    isEnabled: updated.attributes.isEnabled,
                    clean: updated.attributes.clean,
                    containerFilePath: updated.attributes.containerFilePath,
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
              text: `Error updating workflow: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // Delete a workflow
  server.registerTool(
    'delete_workflow',
    {
      description:
        'Delete an Xcode Cloud workflow. This action cannot be undone.',
      inputSchema: {
        workflowId: z
          .string()
          .describe('The workflow ID or resource URI to delete'),
      },
    },
    async ({ workflowId }: { workflowId: string }) => {
      try {
        const parsedWorkflowId = parseWorkflowId(workflowId);
        await client.workflows.delete(parsedWorkflowId);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  status: 'deleted',
                  message: 'Workflow deleted successfully.',
                  workflowId: parsedWorkflowId,
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
              text: `Error deleting workflow: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // Create a complete workflow with actions
  server.registerTool(
    'create_workflow_with_actions',
    {
      description:
        'Create a new Xcode Cloud workflow with full configuration including actions (BUILD, TEST, ANALYZE, ARCHIVE). Requires product ID, repository ID, Xcode version ID, and macOS version ID.',
      inputSchema: {
        productId: z
          .string()
          .describe('The product ID to create the workflow for'),
        repositoryId: z
          .string()
          .describe('The SCM repository ID (use get_repository to find this)'),
        xcodeVersionId: z
          .string()
          .describe(
            'The Xcode version ID (use list_xcode_versions to find this)',
          ),
        macOsVersionId: z
          .string()
          .describe(
            'The macOS version ID (use list_macos_versions or list_compatible_macos_versions to find this)',
          ),
        name: z.string().describe('Name for the workflow'),
        description: z.string().describe('Description for the workflow'),
        containerFilePath: z
          .string()
          .describe(
            'Path to the .xcodeproj or .xcworkspace in the repo (e.g., "App/App.xcodeproj")',
          ),
        actions: z
          .array(CiActionSchema)
          .describe(
            'Array of actions (BUILD, TEST, ANALYZE, ARCHIVE) to configure for this workflow',
          ),
        isEnabled: z
          .boolean()
          .optional()
          .describe('Whether the workflow should be enabled (default: true)'),
        clean: z
          .boolean()
          .optional()
          .describe('Whether to run clean builds (default: false)'),
        branchStartCondition: z
          .object({
            source: z
              .object({
                isAllMatch: z.boolean().optional(),
                patterns: z
                  .array(
                    z.object({
                      pattern: z.string(),
                      isPrefix: z.boolean().optional(),
                    }),
                  )
                  .optional(),
              })
              .optional(),
            autoCancel: z.boolean().optional(),
          })
          .optional()
          .describe(
            'Branch start condition for automatic builds on branch changes',
          ),
      },
    },
    async ({
      productId,
      repositoryId,
      xcodeVersionId,
      macOsVersionId,
      name,
      description,
      containerFilePath,
      actions,
      isEnabled,
      clean,
      branchStartCondition,
    }: {
      productId: string;
      repositoryId: string;
      xcodeVersionId: string;
      macOsVersionId: string;
      name: string;
      description: string;
      containerFilePath: string;
      actions: CiAction[];
      isEnabled?: boolean;
      clean?: boolean;
      branchStartCondition?: CiBranchStartCondition;
    }) => {
      try {
        const parsedProductId = parseProductId(productId);

        const created = await client.workflows.create(parsedProductId, {
          name,
          description,
          containerFilePath,
          repositoryId,
          xcodeVersionId,
          macOsVersionId,
          actions,
          isEnabled,
          clean,
          branchStartCondition,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  status: 'created',
                  message: 'Workflow created successfully with actions.',
                  workflow: {
                    id: created.id,
                    name: created.attributes.name,
                    description: created.attributes.description,
                    isEnabled: created.attributes.isEnabled,
                    clean: created.attributes.clean,
                    containerFilePath: created.attributes.containerFilePath,
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
              text: `Error creating workflow: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
