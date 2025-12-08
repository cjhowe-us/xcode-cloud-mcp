import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AppStoreConnectClient } from '../api/client.js';
import { parseBuildRunId } from '../utils/uri-parser.js';

/**
 * Register build results tools (logs and issues)
 */
export function registerResultsTools(
  server: McpServer,
  client: AppStoreConnectClient,
) {
  // Get build logs for a specific build run
  server.registerTool(
    'get_build_logs',
    {
      description:
        'Retrieve build logs and artifacts for a build run. Returns download URLs for log files, archives, and other artifacts.',
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
        const artifacts =
          await client.artifacts.getForBuildRun(parsedBuildRunId);

        const formatted = {
          logs: artifacts.logs.map((a) => ({
            id: a.id,
            fileName: a.attributes.fileName,
            fileSize: a.attributes.fileSize,
            downloadUrl: a.attributes.downloadUrl,
          })),
          archives: artifacts.archives.map((a) => ({
            id: a.id,
            fileName: a.attributes.fileName,
            fileSize: a.attributes.fileSize,
            downloadUrl: a.attributes.downloadUrl,
          })),
          other: artifacts.other.map((a) => ({
            id: a.id,
            fileName: a.attributes.fileName,
            fileType: a.attributes.fileType,
            fileSize: a.attributes.fileSize,
            downloadUrl: a.attributes.downloadUrl,
          })),
          total:
            artifacts.logs.length +
            artifacts.archives.length +
            artifacts.other.length,
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  message:
                    'Artifacts available. Use the downloadUrl to retrieve files.',
                  ...formatted,
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
              text: `Error getting build artifacts: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // Get build issues (warnings, errors) from issue counts
  server.registerTool(
    'get_build_issues',
    {
      description:
        'Get issue counts (warnings, errors, analyzer warnings, test failures) from a build run. Note: Detailed issue listings may not be available through the API, but issue counts are included in build run status.',
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

        const issueCounts = buildRun.attributes.issueCounts || {
          analyzerWarnings: 0,
          errors: 0,
          testFailures: 0,
          warnings: 0,
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  buildRunId,
                  buildNumber: buildRun.attributes.number,
                  issueCounts,
                  message:
                    'Issue counts from build run. For detailed logs, use get_build_logs to download log files.',
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
              text: `Error getting build issues: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
