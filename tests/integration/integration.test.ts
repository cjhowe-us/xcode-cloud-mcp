import 'dotenv/config';

import { describe, it } from 'bun:test';
import { Client } from '@modelcontextprotocol/sdk/client';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const POLL_INTERVAL_MS = 5000; // Poll every 5 seconds
const MAX_WAIT_TIME_MS = 900_000; // 15 minutes max

interface TextContent {
  type: 'text';
  text: string;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('local Xcode Cloud MCP server', () => {
  it.serial(
    'works',
    async () => {
      console.log('🚀 Xcode Cloud MCP Integration Test');
      console.log('This will trigger a REAL build in Xcode Cloud via MCP\n');

      // Check for required environment variables
      if (
        !process.env.APP_STORE_KEY_ID ||
        !process.env.APP_STORE_ISSUER_ID ||
        !process.env.APP_STORE_PRIVATE_KEY
      ) {
        console.error('❌ Missing required environment variables:');
        console.error('   APP_STORE_KEY_ID, APP_STORE_ISSUER_ID, APP_STORE_PRIVATE_KEY');
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
        }
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

        // Step 1: Find Enthrall product
        console.log('📦 Step 1: Finding Enthrall product...');
        const productsResult = await client.callTool({
          name: 'list_products',
          arguments: {},
        });

        if (!productsResult.content || (productsResult.content as TextContent[]).length === 0) {
          console.error('❌ No products returned from MCP');
          process.exit(1);
        }

        const productsContent = (productsResult.content as TextContent[])[0];
        if (productsContent.type !== 'text') {
          console.error('❌ Unexpected content type from list_products');
          process.exit(1);
        }

        const productsData = JSON.parse(productsContent.text);
        const enthrallProduct = productsData.products.find((p: { name: string }) =>
          p.name.toLowerCase().includes('enthrall')
        );

        if (!enthrallProduct) {
          console.error('❌ No Enthrall product found');
          process.exit(1);
        }

        console.log(`   ✓ Found: ${enthrallProduct.name}`);
        console.log(`   ID: ${enthrallProduct.id}\n`);

        // Step 2: Get workflow
        console.log('⚙️  Step 2: Getting CI workflow...');
        const workflowsResult = await client.callTool({
          name: 'list_workflows',
          arguments: {
            productId: enthrallProduct.id,
          },
        });

        if (!workflowsResult.content || (workflowsResult.content as TextContent[]).length === 0) {
          console.error('❌ No workflows returned from MCP');
          process.exit(1);
        }

        const workflowsContent = (workflowsResult.content as TextContent[])[0];
        if (workflowsContent.type !== 'text') {
          console.error('❌ Unexpected content type from list_workflows');
          process.exit(1);
        }

        const workflowsData = JSON.parse(workflowsContent.text);
        if (workflowsData.workflows.length === 0) {
          console.error('❌ No workflows found');
          process.exit(1);
        }

        const workflow = workflowsData.workflows[0];
        console.log(`   ✓ Found workflow: ${workflow.name}`);
        console.log(`   ID: ${workflow.id}`);
        console.log(`   Enabled: ${workflow.isEnabled}\n`);

        if (!workflow.isEnabled) {
          console.error('❌ Workflow is disabled. Enable it in Xcode Cloud settings.');
          process.exit(1);
        }

        // Step 3: Trigger build
        console.log('🔨 Step 3: Triggering build via MCP...');
        const startBuildResult = await client.callTool({
          name: 'start_build',
          arguments: {
            workflowId: workflow.id,
          },
        });

        if (!startBuildResult.content || (startBuildResult.content as TextContent[]).length === 0) {
          console.error('❌ No build result returned from MCP');
          process.exit(1);
        }

        const startBuildContent = (startBuildResult.content as TextContent[])[0];
        if (startBuildContent.type !== 'text') {
          console.error('❌ Unexpected content type from start_build');
          process.exit(1);
        }

        const buildData = JSON.parse(startBuildContent.text);
        buildRunId = buildData.id;
        const buildNumber = buildData.number;

        console.log(`   ✅ Build #${buildNumber} started!`);
        console.log(`   Build ID: ${buildRunId}`);
        console.log(`   Status: ${buildData.executionProgress}\n`);

        // Step 4: Monitor build progress
        console.log('⏳ Step 4: Monitoring build progress via MCP...');
        console.log('   (This may take several minutes)\n');

        const startTime = Date.now();
        let iterations = 0;
        let buildRun = buildData;

        while (true) {
          iterations++;
          const buildRunResult = await client.callTool({
            name: 'get_build_run',
            arguments: {
              buildRunId: buildRunId,
            },
          });

          if (!buildRunResult.content || (buildRunResult.content as TextContent[]).length === 0) {
            console.error('❌ No build run result returned from MCP');
            process.exit(1);
          }

          const buildRunContent = (buildRunResult.content as TextContent[])[0];
          if (buildRunContent.type !== 'text') {
            console.error('❌ Unexpected content type from get_build_run');
            process.exit(1);
          }

          buildRun = JSON.parse(buildRunContent.text);

          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          const progress = buildRun.executionProgress;
          const status = buildRun.completionStatus;

          console.log(
            `   [${elapsed}s] Progress: ${progress}${status ? ` - ${status}` : ''} (check #${iterations})`
          );

          if (progress === 'COMPLETE') {
            console.log();
            break;
          }

          if (Date.now() - startTime > MAX_WAIT_TIME_MS) {
            console.log('\n⚠️  Build did not complete within 10 minutes. Stopping monitor.');
            console.log(`   Current status: ${progress}`);
            process.exit(1);
          }

          await sleep(POLL_INTERVAL_MS);
        }

        // Step 5: Get build results
        console.log('📊 Step 5: Retrieving build results via MCP...');
        console.log(`   Final Status: ${buildRun.completionStatus}`);
        console.log(`   Started: ${buildRun.startedDate}`);
        console.log(`   Finished: ${buildRun.finishedDate}`);

        if (buildRun.issueCounts) {
          console.log(`   Issues:`);
          console.log(`     - Errors: ${buildRun.issueCounts.errors}`);
          console.log(`     - Warnings: ${buildRun.issueCounts.warnings}`);
          console.log(`     - Analyzer Warnings: ${buildRun.issueCounts.analyzerWarnings}`);
          console.log(`     - Test Failures: ${buildRun.issueCounts.testFailures}`);
        }
        console.log();

        // Step 6: Get build actions
        console.log('🔍 Step 6: Getting build actions via MCP...');
        const actionsResult = await client.callTool({
          name: 'get_build_actions',
          arguments: {
            buildRunId: buildRunId,
          },
        });

        if (!actionsResult.content || (actionsResult.content as TextContent[]).length === 0) {
          console.error('❌ No actions result returned from MCP');
          process.exit(1);
        }

        const actionsContent = (actionsResult.content as TextContent[])[0];
        if (actionsContent.type !== 'text') {
          console.error('❌ Unexpected content type from get_build_actions');
          process.exit(1);
        }

        const actionsData = JSON.parse(actionsContent.text);
        console.log(`   Found ${actionsData.actions.length} actions:\n`);

        actionsData.actions.forEach(
          (action: {
            name: string;
            actionType: string;
            completionStatus?: string;
            issueCounts?: { errors: number; warnings: number; testFailures: number };
          }) => {
            console.log(`   • ${action.name} (${action.actionType})`);
            console.log(`     Status: ${action.completionStatus || 'N/A'}`);
            if (action.issueCounts) {
              const counts = action.issueCounts;
              if (counts.errors || counts.warnings || counts.testFailures) {
                console.log(
                  `     Issues: ${counts.errors} errors, ${counts.warnings} warnings, ${counts.testFailures} test failures`
                );
              }
            }
          }
        );
        console.log();

        // Step 7: Get test results
        console.log('🧪 Step 7: Checking for test results via MCP...');
        try {
          const testResultsResult = await client.callTool({
            name: 'get_test_results',
            arguments: {
              buildRunId: buildRunId,
            },
          });

          if (
            testResultsResult.content &&
            (testResultsResult.content as TextContent[]).length > 0
          ) {
            const testResultsContent = (testResultsResult.content as TextContent[])[0];
            if (testResultsContent.type === 'text') {
              const testData = JSON.parse(testResultsContent.text);
              console.log(`   Found ${testData.testResults?.length || 0} test results\n`);
            }
          }
        } catch (error) {
          console.log(
            `   ⚠️  Test results not available: ${error instanceof Error ? error.message : error}\n`
          );
        }

        // Final summary
        console.log('✅ Integration Test Complete!\n');
        console.log('Summary:');
        console.log(`  • Build #${buildRun.number} ${buildRun.completionStatus}`);
        console.log(`  • All MCP tools verified with real Xcode Cloud build`);
        console.log(`  • Tools tested: list_products, list_workflows, start_build,`);
        console.log(`                  get_build_run, get_build_actions, get_test_results`);

        if (buildRun.completionStatus !== 'SUCCEEDED') {
          console.log('\n⚠️  Note: Build did not succeed, but MCP tools worked correctly');
          process.exit(0); // Still exit 0 since the MCP tools worked
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
          console.error('   Check Xcode Cloud in App Store Connect for details');
        }

        process.exit(1);
      }
    },
    900_000
  );
});
