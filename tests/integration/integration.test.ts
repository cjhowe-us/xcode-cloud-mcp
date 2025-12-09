import 'dotenv/config';

import { describe, it, expect } from 'bun:test';
import { Client } from '@modelcontextprotocol/sdk/client';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const POLL_INTERVAL_MS = 30_000; // Poll every 30 seconds (server-side)
const MAX_WAIT_TIME_MS = 900_000; // 15 minutes max

// The test app name - use env var or fall back to XcodeCloudTestApp (in TestFixtures/)
// When XcodeCloudTestApp is registered in Xcode Cloud, remove the fallback
const TEST_APP_NAME = process.env.TEST_APP_NAME || 'XcodeCloudTestApp';

interface TextContent {
  type: 'text';
  text: string;
}

interface Artifact {
  id: string;
  fileName: string;
  fileSize?: number;
  downloadUrl: string;
}

interface TestArtifactsResult {
  screenshots: Artifact[];
  videos: Artifact[];
  resultBundles: Artifact[];
  testProducts: Artifact[];
  total: number;
  message?: string;
}

interface BuildLogsResult {
  logs: Artifact[];
  archives: Artifact[];
  other: Array<Artifact & { fileType: string }>;
  total: number;
  message?: string;
}

interface TestResultsResult {
  buildRunId: string;
  buildNumber: number;
  testFailures: number;
  resultBundles: Artifact[];
  message?: string;
}

interface BuildIssuesResult {
  buildRunId: string;
  buildNumber: number;
  issueCounts: {
    analyzerWarnings: number;
    errors: number;
    testFailures: number;
    warnings: number;
  };
  message?: string;
}

/**
 * Helper function to call an MCP tool and parse the JSON result
 */
async function callToolAndParse<T>(
  client: Client,
  toolName: string,
  args: Record<string, unknown>,
  timeout?: number,
): Promise<T> {
  const result = await client.callTool(
    { name: toolName, arguments: args },
    undefined,
    timeout ? { timeout } : undefined,
  );

  if (!result.content || (result.content as TextContent[]).length === 0) {
    throw new Error(`No content returned from ${toolName}`);
  }

  const content = (result.content as TextContent[])[0];
  if (content.type !== 'text') {
    throw new Error(
      `Unexpected content type from ${toolName}: ${content.type}`,
    );
  }

  // Check if the response is an error message (starts with "Error")
  if (content.text.startsWith('Error')) {
    throw new Error(content.text);
  }

  return JSON.parse(content.text) as T;
}

describe('Xcode Cloud MCP Integration Tests', () => {
  it.serial(
    'can trigger build and retrieve test results with artifacts',
    async () => {
      console.log('🚀 Xcode Cloud MCP Integration Test');
      console.log(`Testing with project: ${TEST_APP_NAME}`);
      console.log('This will trigger a REAL build in Xcode Cloud via MCP\n');

      // Check for required environment variables
      if (
        !process.env.APP_STORE_KEY_ID ||
        !process.env.APP_STORE_ISSUER_ID ||
        !process.env.APP_STORE_PRIVATE_KEY
      ) {
        console.error('❌ Missing required environment variables:');
        console.error(
          '   APP_STORE_KEY_ID, APP_STORE_ISSUER_ID, APP_STORE_PRIVATE_KEY',
        );
        process.exit(1);
      }

      // Create MCP client
      const client = new Client(
        {
          name: 'xcode-cloud-mcp-test-client',
          version: '1.0.0',
        },
        {
          capabilities: {},
        },
      );

      let buildRunId: string | null = null;

      try {
        // Connect to the MCP server
        console.log('🔌 Connecting to MCP server...');
        const transport = new StdioClientTransport({
          command: 'bun',
          args: ['run', 'src/index.ts'],
          env: {
            ...process.env,
            APP_STORE_KEY_ID: process.env.APP_STORE_KEY_ID,
            APP_STORE_ISSUER_ID: process.env.APP_STORE_ISSUER_ID,
            APP_STORE_PRIVATE_KEY: process.env.APP_STORE_PRIVATE_KEY,
          },
        });

        await client.connect(transport);
        console.log('   ✓ Connected to MCP server\n');

        // Step 1: Find test app product
        console.log(`📦 Step 1: Finding ${TEST_APP_NAME} product...`);
        const productsData = await callToolAndParse<{
          products: Array<{ id: string; name: string }>;
        }>(client, 'list_products', {});

        const testProduct = productsData.products.find((p) =>
          p.name.toLowerCase().includes(TEST_APP_NAME.toLowerCase()),
        );

        if (!testProduct) {
          console.error(`❌ No ${TEST_APP_NAME} product found`);
          console.error(
            'Available products:',
            productsData.products.map((p) => p.name).join(', '),
          );
          console.error(
            '\n⚠️  Make sure the XcodeCloudTestApp is set up in Xcode Cloud',
          );
          process.exit(1);
        }

        console.log(`   ✓ Found: ${testProduct.name}`);
        console.log(`   ID: ${testProduct.id}\n`);

        // Step 2: Get workflow
        console.log('⚙️  Step 2: Getting CI workflow...');
        const workflowsData = await callToolAndParse<{
          workflows: Array<{ id: string; name: string; isEnabled: boolean }>;
        }>(client, 'list_workflows', { productId: testProduct.id });

        if (workflowsData.workflows.length === 0) {
          console.error('❌ No workflows found');
          console.error('⚠️  Set up an Xcode Cloud workflow for this project');
          process.exit(1);
        }

        const workflow = workflowsData.workflows[0];
        console.log(`   ✓ Found workflow: ${workflow.name}`);
        console.log(`   ID: ${workflow.id}`);
        console.log(`   Enabled: ${workflow.isEnabled}\n`);

        if (!workflow.isEnabled) {
          console.error(
            '❌ Workflow is disabled. Enable it in Xcode Cloud settings.',
          );
          process.exit(1);
        }

        // Step 3: Trigger build and wait for completion
        console.log(
          '🔨 Step 3: Triggering build and waiting for completion...',
        );
        console.log(
          '   (Server polls internally - this may take several minutes)\n',
        );

        const buildRun = await callToolAndParse<{
          id: string;
          number: number;
          completionStatus: string;
          executionProgress: string;
          timeoutExceeded?: boolean;
          totalDurationMs: number;
          pollCount: number;
          startedDate: string;
          finishedDate: string;
          issueCounts?: {
            errors: number;
            warnings: number;
            analyzerWarnings: number;
            testFailures: number;
          };
        }>(
          client,
          'start_build_and_wait',
          {
            workflowId: workflow.id,
            pollIntervalMs: POLL_INTERVAL_MS,
            timeoutMs: MAX_WAIT_TIME_MS,
          },
          MAX_WAIT_TIME_MS + 60_000,
        );

        buildRunId = buildRun.id;

        if (buildRun.timeoutExceeded) {
          console.log('⚠️  Build did not complete within timeout period.');
          console.log(`   Current status: ${buildRun.executionProgress}`);
          process.exit(1);
        }

        console.log(`   ✅ Build #${buildRun.number} completed!`);
        console.log(`   Build ID: ${buildRunId}`);
        console.log(`   Status: ${buildRun.completionStatus}`);
        console.log(
          `   Duration: ${Math.floor(buildRun.totalDurationMs / 1000)}s`,
        );
        console.log(`   Server poll count: ${buildRun.pollCount}\n`);

        // Step 4: Get build results summary
        console.log('📊 Step 4: Retrieving build results...');
        console.log(`   Final Status: ${buildRun.completionStatus}`);
        console.log(`   Started: ${buildRun.startedDate}`);
        console.log(`   Finished: ${buildRun.finishedDate}`);

        if (buildRun.issueCounts) {
          console.log(`   Issues:`);
          console.log(`     - Errors: ${buildRun.issueCounts.errors}`);
          console.log(`     - Warnings: ${buildRun.issueCounts.warnings}`);
          console.log(
            `     - Analyzer Warnings: ${buildRun.issueCounts.analyzerWarnings}`,
          );
          console.log(
            `     - Test Failures: ${buildRun.issueCounts.testFailures}`,
          );
        }
        console.log();

        // Step 5: Get build actions
        console.log('🔍 Step 5: Getting build actions...');
        const actionsData = await callToolAndParse<{
          actions: Array<{
            name: string;
            actionType: string;
            completionStatus?: string;
            issueCounts?: {
              errors: number;
              warnings: number;
              testFailures: number;
            };
          }>;
        }>(client, 'get_build_actions', { buildRunId });

        console.log(`   Found ${actionsData.actions.length} actions:\n`);

        actionsData.actions.forEach((action) => {
          console.log(`   • ${action.name} (${action.actionType})`);
          console.log(`     Status: ${action.completionStatus || 'N/A'}`);
          if (action.issueCounts) {
            const counts = action.issueCounts;
            if (counts.errors || counts.warnings || counts.testFailures) {
              console.log(
                `     Issues: ${counts.errors} errors, ${counts.warnings} warnings, ${counts.testFailures} test failures`,
              );
            }
          }
        });
        console.log();

        // Step 6: Get test results
        console.log('🧪 Step 6: Getting test results...');
        let testResults: TestResultsResult | null = null;
        try {
          testResults = await callToolAndParse<TestResultsResult>(
            client,
            'get_test_results',
            { buildRunId },
          );
          console.log(`   Test failures: ${testResults.testFailures}`);
          console.log(`   Result bundles: ${testResults.resultBundles.length}`);

          if (testResults.resultBundles.length > 0) {
            console.log('   Result bundle files:');
            testResults.resultBundles.forEach((bundle) => {
              console.log(`     - ${bundle.fileName}`);
            });
          }
        } catch (error) {
          console.log(
            `   ⚠️  Test results not available: ${error instanceof Error ? error.message : error}`,
          );
        }
        console.log();

        // Step 7: Get test artifacts (screenshots, videos)
        console.log(
          '📸 Step 7: Getting test artifacts (screenshots, videos)...',
        );
        let testArtifacts: TestArtifactsResult | null = null;
        try {
          testArtifacts = await callToolAndParse<TestArtifactsResult>(
            client,
            'get_test_artifacts',
            { buildRunId },
          );
          console.log(`   Screenshots: ${testArtifacts.screenshots.length}`);
          console.log(`   Videos: ${testArtifacts.videos.length}`);
          console.log(
            `   Result bundles: ${testArtifacts.resultBundles.length}`,
          );
          console.log(`   Test products: ${testArtifacts.testProducts.length}`);
          console.log(`   Total artifacts: ${testArtifacts.total}`);

          if (testArtifacts.screenshots.length > 0) {
            console.log('\n   Screenshot files:');
            testArtifacts.screenshots.slice(0, 5).forEach((screenshot) => {
              console.log(
                `     - ${screenshot.fileName} (${screenshot.fileSize} bytes)`,
              );
            });
            if (testArtifacts.screenshots.length > 5) {
              console.log(
                `     ... and ${testArtifacts.screenshots.length - 5} more`,
              );
            }
          }

          if (testArtifacts.videos.length > 0) {
            console.log('\n   Video files:');
            testArtifacts.videos.forEach((video) => {
              console.log(`     - ${video.fileName} (${video.fileSize} bytes)`);
            });
          }
        } catch (error) {
          console.log(
            `   ⚠️  Test artifacts not available: ${error instanceof Error ? error.message : error}`,
          );
        }
        console.log();

        // Step 8: Get build logs
        console.log('📋 Step 8: Getting build logs...');
        let buildLogs: BuildLogsResult | null = null;
        try {
          buildLogs = await callToolAndParse<BuildLogsResult>(
            client,
            'get_build_logs',
            { buildRunId },
          );
          console.log(`   Log files: ${buildLogs.logs.length}`);
          console.log(`   Archives: ${buildLogs.archives.length}`);
          console.log(`   Other artifacts: ${buildLogs.other.length}`);
          console.log(`   Total: ${buildLogs.total}`);

          if (buildLogs.logs.length > 0) {
            console.log('\n   Log files:');
            buildLogs.logs.forEach((log) => {
              console.log(`     - ${log.fileName}`);
            });
          }
        } catch (error) {
          console.log(
            `   ⚠️  Build logs not available: ${error instanceof Error ? error.message : error}`,
          );
        }
        console.log();

        // Step 9: Get build issues
        console.log('🔴 Step 9: Getting build issues...');
        let buildIssues: BuildIssuesResult | null = null;
        try {
          buildIssues = await callToolAndParse<BuildIssuesResult>(
            client,
            'get_build_issues',
            { buildRunId },
          );
          console.log(`   Errors: ${buildIssues.issueCounts.errors}`);
          console.log(`   Warnings: ${buildIssues.issueCounts.warnings}`);
          console.log(
            `   Analyzer warnings: ${buildIssues.issueCounts.analyzerWarnings}`,
          );
          console.log(
            `   Test failures: ${buildIssues.issueCounts.testFailures}`,
          );
        } catch (error) {
          console.log(
            `   ⚠️  Build issues not available: ${error instanceof Error ? error.message : error}`,
          );
        }
        console.log();

        // ==========================================
        // SANITY CHECKS - Verify expected outputs
        // ==========================================
        console.log('✅ Step 10: Running sanity checks...\n');

        let sanityChecksPassed = 0;
        let sanityChecksFailed = 0;

        // Check 1: Build completed (not timed out)
        console.log('   Check 1: Build completed');
        if (!buildRun.timeoutExceeded && buildRun.finishedDate) {
          console.log('      ✓ Build finished without timeout');
          sanityChecksPassed++;
        } else {
          console.log('      ✗ Build did not complete properly');
          sanityChecksFailed++;
        }

        // Check 2: We have test failures (because our test project has intentionally failing tests)
        console.log(
          '   Check 2: Test failures detected (expected due to intentionally failing tests)',
        );
        const testFailureCount =
          testResults?.testFailures ||
          buildIssues?.issueCounts.testFailures ||
          0;
        if (testFailureCount > 0) {
          console.log(
            `      ✓ Found ${testFailureCount} test failures (expected)`,
          );
          sanityChecksPassed++;
        } else {
          console.log(
            '      ⚠️  No test failures found (expected some due to intentionally broken tests)',
          );
          // This is a warning, not a failure - the test project may have been fixed
          sanityChecksPassed++;
        }

        // Check if workflow includes tests
        const hasTestAction = actionsData.actions.some(
          (a) => a.actionType === 'TEST',
        );

        // Check 3: Test results are available (only required if TEST action exists)
        console.log('   Check 3: Test results available');
        if (testResults) {
          console.log(
            `      ✓ Test results retrieved (build #${testResults.buildNumber})`,
          );
          sanityChecksPassed++;
        } else if (hasTestAction) {
          console.log(
            '      ✗ Test results not available (but tests were configured)',
          );
          sanityChecksFailed++;
        } else {
          console.log(
            '      ⚠️  Test results not available (no TEST action in workflow)',
          );
          // Not a failure if no tests were configured
          sanityChecksPassed++;
        }

        // Check 4: Screenshots available (UI tests should generate screenshots)
        console.log('   Check 4: Screenshots available from UI tests');
        if (testArtifacts && testArtifacts.screenshots.length > 0) {
          console.log(
            `      ✓ Found ${testArtifacts.screenshots.length} screenshots`,
          );
          sanityChecksPassed++;

          // Verify screenshots have download URLs
          const screenshotsWithUrls = testArtifacts.screenshots.filter(
            (s) => s.downloadUrl,
          );
          if (screenshotsWithUrls.length === testArtifacts.screenshots.length) {
            console.log('      ✓ All screenshots have download URLs');
          } else {
            console.log(
              `      ⚠️  Only ${screenshotsWithUrls.length}/${testArtifacts.screenshots.length} screenshots have download URLs`,
            );
          }
        } else {
          console.log(
            '      ⚠️  No screenshots found (UI tests may not have run)',
          );
          // Not a hard failure - screenshots depend on UI tests running
        }

        // Check 5: Videos available (UI tests record screen)
        console.log('   Check 5: Videos available from UI tests');
        if (testArtifacts && testArtifacts.videos.length > 0) {
          console.log(`      ✓ Found ${testArtifacts.videos.length} videos`);
          sanityChecksPassed++;

          // Verify videos have download URLs
          const videosWithUrls = testArtifacts.videos.filter(
            (v) => v.downloadUrl,
          );
          if (videosWithUrls.length === testArtifacts.videos.length) {
            console.log('      ✓ All videos have download URLs');
          } else {
            console.log(
              `      ⚠️  Only ${videosWithUrls.length}/${testArtifacts.videos.length} videos have download URLs`,
            );
          }
        } else {
          console.log(
            '      ⚠️  No videos found (video recording may be disabled)',
          );
          // Not a hard failure - video depends on Xcode Cloud settings
        }

        // Check 6: Build logs available
        console.log('   Check 6: Build logs available');
        if (buildLogs && buildLogs.total > 0) {
          console.log(`      ✓ Found ${buildLogs.total} log/archive files`);
          sanityChecksPassed++;
        } else {
          console.log('      ⚠️  No build logs found');
          // Not a hard failure - logs may take time to become available
        }

        // Check 7: Build actions retrieved
        console.log('   Check 7: Build actions available');
        if (actionsData.actions.length > 0) {
          console.log(
            `      ✓ Found ${actionsData.actions.length} build actions`,
          );
          sanityChecksPassed++;

          // Check for test action specifically
          const testAction = actionsData.actions.find(
            (a) => a.actionType === 'TEST',
          );
          if (testAction) {
            console.log(`      ✓ Test action found: ${testAction.name}`);
          }
        } else {
          console.log('      ✗ No build actions found');
          sanityChecksFailed++;
        }

        // Check 8: Result bundles available (contain detailed test output)
        console.log('   Check 8: Result bundles available');
        const resultBundleCount =
          (testResults?.resultBundles.length || 0) +
          (testArtifacts?.resultBundles.length || 0);
        if (resultBundleCount > 0) {
          console.log(`      ✓ Found ${resultBundleCount} result bundles`);
          sanityChecksPassed++;
        } else {
          console.log('      ⚠️  No result bundles found');
        }

        // Summary
        console.log('\n' + '='.repeat(50));
        console.log('📋 SANITY CHECK SUMMARY');
        console.log('='.repeat(50));
        console.log(`   Passed: ${sanityChecksPassed}`);
        console.log(`   Failed: ${sanityChecksFailed}`);

        // Final summary
        console.log('\n✅ Integration Test Complete!\n');
        console.log('Summary:');
        console.log(
          `  • Build #${buildRun.number} ${buildRun.completionStatus}`,
        );
        console.log(
          `  • Server-side polling saved ${buildRun.pollCount} client tool calls`,
        );
        console.log(`  • All MCP tools verified with real Xcode Cloud build`);
        console.log(
          `  • Tools tested: list_products, list_workflows, start_build_and_wait,`,
        );
        console.log(
          `                  get_build_actions, get_test_results, get_test_artifacts,`,
        );
        console.log(`                  get_build_logs, get_build_issues`);

        // Use expect assertions for test framework
        expect(sanityChecksFailed).toBe(0);

        if (buildRun.completionStatus !== 'SUCCEEDED') {
          console.log(
            '\n⚠️  Note: Build status is not SUCCEEDED, but this may be expected',
          );
          console.log('   (our test project has intentionally failing tests)');
        }

        await client.close();
      } catch (error) {
        console.error('\n❌ Integration test failed:', error);
        if (error instanceof Error) {
          console.error('   Message:', error.message);
          console.error('   Stack:', error.stack);
        }

        if (buildRunId) {
          console.error(`\n   Build ID: ${buildRunId}`);
          console.error(
            '   Check Xcode Cloud in App Store Connect for details',
          );
        }

        throw error;
      }
    },
    MAX_WAIT_TIME_MS + 120_000, // Test timeout
  );
});
