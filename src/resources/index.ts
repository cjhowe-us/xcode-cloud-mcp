import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  type Resource,
} from '@modelcontextprotocol/sdk/types.js';
import { AppStoreConnectClient } from '../api/client.js';

/**
 * Register dynamic MCP resources for browsing Xcode Cloud entities.
 *
 * Uses the underlying Server#setRequestHandler with the official list/read
 * schemas so the resources list is generated on each request (not only at
 * startup), keeping it in sync with App Store Connect.
 */
export function registerResources(
  server: McpServer,
  client: AppStoreConnectClient,
) {
  // Handle resources/list dynamically
  (
    server.server as unknown as {
      setRequestHandler: typeof server.server.setRequestHandler;
    }
  ).setRequestHandler(ListResourcesRequestSchema, async () => {
    try {
      const products = await client.products.list();
      const resources: Resource[] = [];

      for (const product of products) {
        resources.push({
          uri: `xcode-cloud://product/${product.id}`,
          name: `Product: ${product.attributes.name}`,
          description: `Xcode Cloud product (${product.attributes.productType})`,
          mimeType: 'application/json',
        });

        try {
          const workflows = await client.workflows.listForProduct(product.id);
          for (const workflow of workflows) {
            resources.push({
              uri: `xcode-cloud://workflow/${workflow.id}`,
              name: `Workflow: ${workflow.attributes.name}`,
              description: `${product.attributes.name} - ${workflow.attributes.name} (${workflow.attributes.isEnabled ? 'enabled' : 'disabled'})`,
              mimeType: 'application/json',
            });
          }
        } catch (error) {
          console.error(
            `Failed to get workflows for product ${product.id}:`,
            error,
          );
        }
      }

      return { resources };
    } catch (error) {
      console.error('Failed to list resources:', error);
      return { resources: [] };
    }
  });

  // Handle resources/read dynamically
  (
    server.server as unknown as {
      setRequestHandler: typeof server.server.setRequestHandler;
    }
  ).setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;

    try {
      const url = new URL(uri);
      if (url.protocol !== 'xcode-cloud:') {
        throw new Error(`Unsupported protocol: ${url.protocol}`);
      }

      const [type, id] = url.pathname.slice(2).split('/');

      if (type === 'product') {
        const product = await client.products.getById(id);
        const formatted = {
          id: product.id,
          name: product.attributes.name,
          productType: product.attributes.productType,
          createdDate: product.attributes.createdDate,
        };

        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(formatted, null, 2),
            },
          ],
        };
      }

      if (type === 'workflow') {
        const workflow = await client.workflows.getById(id);
        const formatted = {
          id: workflow.id,
          name: workflow.attributes.name,
          description: workflow.attributes.description,
          isEnabled: workflow.attributes.isEnabled,
          isLockedForEditing: workflow.attributes.isLockedForEditing,
          clean: workflow.attributes.clean,
          containerFilePath: workflow.attributes.containerFilePath,
          lastModifiedDate: workflow.attributes.lastModifiedDate,
        };

        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(formatted, null, 2),
            },
          ],
        };
      }

      throw new Error(`Unknown resource type: ${type}`);
    } catch (error) {
      throw new Error(
        `Failed to read resource ${uri}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  });
}
