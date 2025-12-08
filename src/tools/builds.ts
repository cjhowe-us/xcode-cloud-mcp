import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AppStoreConnectClient } from '../api/client.js';
import { parseWorkflowId, parseBuildRunId } from '../utils/uri-parser.js';

/**
 * Register build trigger tools
 */
export function registerBuildTools(
  server: McpServer,
  client: AppStoreConnectClient,
) {
  // Start a new build
  server.registerTool(
    'start_build',
    {
      description:
        'Trigger a new Xcode Cloud build for a specific workflow. Optionally specify a git reference (branch or tag) to build.',
      inputSchema: {
        workflowId: z
          .string()
          .describe(
            'The workflow ID or resource URI (e.g., "xcode-cloud://workflow/abc123" or just "abc123")',
          ),
        gitReferenceId: z
          .string()
          .optional()
          .describe(
            "Optional: The ID of the git reference (branch/tag) to build. If not specified, uses the workflow's default branch.",
          ),
      },
    },
    async ({
      workflowId,
      gitReferenceId,
    }: {
      workflowId: string;
      gitReferenceId?: string;
    }) => {
      try {
        const parsedWorkflowId = parseWorkflowId(workflowId);
        const buildRun = await client.builds.start(
          parsedWorkflowId,
          gitReferenceId,
        );

        const formatted = {
          id: buildRun.id,
          number: buildRun.attributes.number,
          executionProgress: buildRun.attributes.executionProgress,
          startReason: buildRun.attributes.startReason,
          createdDate: buildRun.attributes.createdDate,
          sourceCommit: buildRun.attributes.sourceCommit,
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
              text: `Error starting build: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // Cancel a running build
  server.registerTool(
    'cancel_build',
    {
      description:
        'Cancel a running Xcode Cloud build. Only builds in PENDING or RUNNING state can be canceled.',
      inputSchema: {
        buildRunId: z
          .string()
          .describe(
            'The build run ID or resource URI (e.g., "xcode-cloud://build-run/abc123" or just "abc123")',
          ),
      },
    },
    async ({ buildRunId }: { buildRunId: string }) => {
      try {
        const parsedBuildRunId = parseBuildRunId(buildRunId);
        await client.builds.cancel(parsedBuildRunId);

        return {
          content: [
            {
              type: 'text',
              text: `Build ${buildRunId} has been canceled.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error canceling build: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
