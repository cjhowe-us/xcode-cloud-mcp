import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AppStoreConnectClient } from '../api/client.js';
import { parseWorkflowId, parseBuildRunId } from '../utils/uri-parser.js';

/**
 * Register build status monitoring tools
 */
export function registerStatusTools(
  server: McpServer,
  client: AppStoreConnectClient,
) {
  // Get build run status
  server.registerTool(
    'get_build_run',
    {
      description:
        'Get the current status and details of a specific build run, including execution progress, completion status, and issue counts.',
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
        const buildRun = await client.builds.getById(parsedBuildRunId);

        const formatted = {
          id: buildRun.id,
          number: buildRun.attributes.number,
          executionProgress: buildRun.attributes.executionProgress,
          completionStatus: buildRun.attributes.completionStatus,
          createdDate: buildRun.attributes.createdDate,
          startedDate: buildRun.attributes.startedDate,
          finishedDate: buildRun.attributes.finishedDate,
          sourceCommit: buildRun.attributes.sourceCommit,
          destinationCommit: buildRun.attributes.destinationCommit,
          isPullRequestBuild: buildRun.attributes.isPullRequestBuild,
          issueCounts: buildRun.attributes.issueCounts,
          startReason: buildRun.attributes.startReason,
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
              text: `Error getting build run: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // List recent build runs for a workflow
  server.registerTool(
    'list_build_runs',
    {
      description:
        'List recent build runs for a specific workflow, ordered by creation date (newest first).',
      inputSchema: {
        workflowId: z
          .string()
          .describe(
            'The workflow ID or resource URI (e.g., "xcode-cloud://workflow/abc123" or just "abc123")',
          ),
        limit: z
          .number()
          .optional()
          .describe('Maximum number of build runs to return (default: 20)'),
      },
    },
    async ({ workflowId, limit }: { workflowId: string; limit?: number }) => {
      try {
        const parsedWorkflowId = parseWorkflowId(workflowId);
        const buildRuns = await client.builds.listForWorkflow(
          parsedWorkflowId,
          { limit },
        );

        const formatted = buildRuns.map((run) => ({
          id: run.id,
          number: run.attributes.number,
          executionProgress: run.attributes.executionProgress,
          completionStatus: run.attributes.completionStatus,
          createdDate: run.attributes.createdDate,
          finishedDate: run.attributes.finishedDate,
          issueCounts: run.attributes.issueCounts,
          sourceCommit: run.attributes.sourceCommit,
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  buildRuns: formatted,
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
              text: `Error listing build runs: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // Get build actions (compile, test, archive) for a build run
  server.registerTool(
    'get_build_actions',
    {
      description:
        'Get all build actions (compile, test, analyze, archive) for a specific build run, including their status and issue counts.',
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
        const actions = await client.builds.getActions(parsedBuildRunId);

        const formatted = actions.map((action) => ({
          id: action.id,
          name: action.attributes.name,
          actionType: action.attributes.actionType,
          executionProgress: action.attributes.executionProgress,
          completionStatus: action.attributes.completionStatus,
          startedDate: action.attributes.startedDate,
          finishedDate: action.attributes.finishedDate,
          issueCounts: action.attributes.issueCounts,
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ actions: formatted }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting build actions: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
