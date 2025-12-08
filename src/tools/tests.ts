import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AppStoreConnectClient } from '../api/client.js';
import { parseBuildRunId } from '../utils/uri-parser.js';

/**
 * Register test results tools
 */
export function registerTestTools(
  server: McpServer,
  client: AppStoreConnectClient,
) {
  // Get test results summary
  server.registerTool(
    'get_test_results',
    {
      description:
        'Get test failure count from a build run. For detailed test logs, use get_build_logs to download the result bundle.',
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
        const artifacts =
          await client.artifacts.getForBuildRun(parsedBuildRunId);

        const issueCounts = buildRun.attributes.issueCounts;
        const testFailures = issueCounts?.testFailures || 0;

        const resultBundles = artifacts.resultBundles.map((a) => ({
          id: a.id,
          fileName: a.attributes.fileName,
          downloadUrl: a.attributes.downloadUrl,
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  buildRunId,
                  buildNumber: buildRun.attributes.number,
                  testFailures,
                  resultBundles,
                  message:
                    testFailures > 0
                      ? `Found ${testFailures} test failure(s). Download result bundles for detailed test information.`
                      : 'No test failures detected.',
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
              text: `Error getting test results: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // Get test artifacts (screenshots, videos) from build run
  server.registerTool(
    'get_test_artifacts',
    {
      description:
        'Get test-related artifacts (screenshots, videos, result bundles) from a build run. These are especially useful for diagnosing failed UI tests.',
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
          screenshots: artifacts.screenshots.map((a) => ({
            id: a.id,
            fileName: a.attributes.fileName,
            fileSize: a.attributes.fileSize,
            downloadUrl: a.attributes.downloadUrl,
          })),
          videos: artifacts.videos.map((a) => ({
            id: a.id,
            fileName: a.attributes.fileName,
            fileSize: a.attributes.fileSize,
            downloadUrl: a.attributes.downloadUrl,
          })),
          resultBundles: artifacts.resultBundles.map((a) => ({
            id: a.id,
            fileName: a.attributes.fileName,
            fileSize: a.attributes.fileSize,
            downloadUrl: a.attributes.downloadUrl,
          })),
          testProducts: artifacts.testProducts.map((a) => ({
            id: a.id,
            fileName: a.attributes.fileName,
            fileSize: a.attributes.fileSize,
            downloadUrl: a.attributes.downloadUrl,
          })),
        };

        const total =
          formatted.screenshots.length +
          formatted.videos.length +
          formatted.resultBundles.length +
          formatted.testProducts.length;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  ...formatted,
                  total,
                  message:
                    total > 0
                      ? 'Use the downloadUrl to retrieve test artifacts.'
                      : 'No test artifacts found for this build run.',
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
              text: `Error getting test artifacts: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
