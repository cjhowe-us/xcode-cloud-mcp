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

  // Start a build and wait for completion
  server.registerTool(
    'start_build_and_wait',
    {
      description:
        'Start an Xcode Cloud build and wait for it to complete. The server polls the build status internally, eliminating the need for repeated client tool calls. Returns the final build status when complete.',
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
        pollIntervalMs: z
          .number()
          .optional()
          .describe(
            'Polling interval in milliseconds (default: 30000 = 30 seconds)',
          ),
        timeoutMs: z
          .number()
          .optional()
          .describe(
            'Maximum time to wait in milliseconds (default: 3600000 = 1 hour)',
          ),
      },
    },
    async ({
      workflowId,
      gitReferenceId,
      pollIntervalMs = 30000,
      timeoutMs = 3600000,
    }: {
      workflowId: string;
      gitReferenceId?: string;
      pollIntervalMs?: number;
      timeoutMs?: number;
    }) => {
      const sleep = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));

      try {
        // Start the build
        const parsedWorkflowId = parseWorkflowId(workflowId);
        const buildRun = await client.builds.start(
          parsedWorkflowId,
          gitReferenceId,
        );

        const buildRunId = buildRun.id;
        const startTime = Date.now();
        let pollCount = 0;
        let currentBuild = buildRun;
        let consecutiveErrors = 0;
        const maxConsecutiveErrors = 3;

        // Poll until complete or timeout
        while (currentBuild.attributes.executionProgress !== 'COMPLETE') {
          // Check timeout
          if (Date.now() - startTime > timeoutMs) {
            const formatted = {
              id: currentBuild.id,
              number: currentBuild.attributes.number,
              executionProgress: currentBuild.attributes.executionProgress,
              completionStatus: currentBuild.attributes.completionStatus,
              createdDate: currentBuild.attributes.createdDate,
              startedDate: currentBuild.attributes.startedDate,
              finishedDate: currentBuild.attributes.finishedDate,
              sourceCommit: currentBuild.attributes.sourceCommit,
              issueCounts: currentBuild.attributes.issueCounts,
              timeoutExceeded: true,
              totalDurationMs: Date.now() - startTime,
              pollCount,
            };

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(formatted, null, 2),
                },
              ],
              isError: true,
            };
          }

          // Wait before polling
          await sleep(pollIntervalMs);
          pollCount++;

          // Poll build status with retry on error
          try {
            currentBuild = await client.builds.getById(buildRunId);
            consecutiveErrors = 0;
          } catch (pollError) {
            consecutiveErrors++;
            if (consecutiveErrors >= maxConsecutiveErrors) {
              throw new Error(
                `Failed to poll build status after ${maxConsecutiveErrors} consecutive errors: ${pollError instanceof Error ? pollError.message : String(pollError)}`,
              );
            }
            // Continue to retry on next poll interval
          }
        }

        // Build complete - return final status
        const formatted = {
          id: currentBuild.id,
          number: currentBuild.attributes.number,
          executionProgress: currentBuild.attributes.executionProgress,
          completionStatus: currentBuild.attributes.completionStatus,
          createdDate: currentBuild.attributes.createdDate,
          startedDate: currentBuild.attributes.startedDate,
          finishedDate: currentBuild.attributes.finishedDate,
          sourceCommit: currentBuild.attributes.sourceCommit,
          destinationCommit: currentBuild.attributes.destinationCommit,
          isPullRequestBuild: currentBuild.attributes.isPullRequestBuild,
          issueCounts: currentBuild.attributes.issueCounts,
          startReason: currentBuild.attributes.startReason,
          totalDurationMs: Date.now() - startTime,
          pollCount,
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
              text: `Error in start_build_and_wait: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
