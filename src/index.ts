#!/usr/bin/env node

import 'dotenv/config';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createAuthFromEnv } from './api/auth.js';
import { AppStoreConnectClient } from './api/client.js';
import { registerDiscoveryTools } from './tools/discovery.js';
import { registerBuildTools } from './tools/builds.js';
import { registerStatusTools } from './tools/status.js';
import { registerResultsTools } from './tools/results.js';
import { registerTestTools } from './tools/tests.js';
import { registerWorkflowManagementTools } from './tools/workflow-management.js';

const server = new McpServer({
  name: 'Xcode Cloud MCP',
  version: '1.0.0',
});

async function main() {
  try {
    // Initialize authentication and API client
    const auth = createAuthFromEnv();
    const client = new AppStoreConnectClient(auth);

    // Register all tool categories
    registerDiscoveryTools(server, client);
    registerBuildTools(server, client);
    registerStatusTools(server, client);
    registerResultsTools(server, client);
    registerTestTools(server, client);
    registerWorkflowManagementTools(server, client);

    // Connect to stdio transport
    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error('Xcode Cloud MCP server started successfully');
  } catch (error) {
    console.error('Failed to start server:', error);
    throw error;
  }
}

main().catch((error) => {
  console.error('Fatal error in main:', error);
  process.exit(1);
});
