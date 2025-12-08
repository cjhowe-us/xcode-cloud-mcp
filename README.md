# Xcode Cloud MCP Server

This Model Context Protocol (MCP) server lets AI agents interact with Xcode
Cloud via the App Store Connect API. It can discover workflows, trigger builds,
monitor progress, and pull logs, warnings, errors, and UI test artifacts.

## Overview

- Discover products and workflows
- Bootstrap workflows for projects that are missing them
- Trigger builds with optional git references
- Monitor build status and actions
- Retrieve build issues and logs
- Fetch test results and UI test artifacts

## Requirements

- Apple Developer Account with Xcode Cloud access
- App Store Connect API key with appropriate permissions
- bun installed

## Quickstart

### Get API credentials

1. Sign in to [App Store Connect](https://appstoreconnect.apple.com).
2. Open **Users and Access** → **Integrations** → **App Store Connect API**.
3. Request access if needed, then generate an API key.
4. Choose a name and role (recommended: **App Manager** or **Developer**).
5. Download the `.p8` private key file (only available once).
6. Note the **Key ID** and **Issuer ID**.

### Add MCP Config

#### Copilot

Add this to `.vscode/.mcp.json` in your workspace or home directory:

```json
{
  "servers": {
    "XcodeCloud": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "xcode-cloud-mcp"],
      "env": {
        "APP_STORE_KEY_ID": "your-key-id",
        "APP_STORE_ISSUER_ID": "your-issuer-id",
        "APP_STORE_PRIVATE_KEY": "-----BEGIN PRIVATE KEY-----\n...your private key content...\n-----END PRIVATE KEY-----"
      }
    }
  }
}
```

You can also store the environment variables in a `.env` file in your workspace
folder.

#### Copilot Cloud Agent

Add this to your MCP configuration under Copilot -> Coding Agent in your GitHub
repository's settings:

```json
{
  "mcpServers": {
    "XcodeCloud": {
      "type": "local",
      "command": "npx",
      "args": ["-y", "xcode-cloud-mcp"],
      "env": {
        "APP_STORE_KEY_ID": "COPILOT_MCP_APP_STORE_KEY_ID",
        "APP_STORE_ISSUER_ID": "COPILOT_MCP_APP_STORE_ISSUER_ID",
        "APP_STORE_PRIVATE_KEY": "COPILOT_MCP_APP_STORE_PRIVATE_KEY"
      },
      "tools": ["*"]
    }
  }
}
```

Then, add `COPILOT_MCP_APP_STORE_KEY_ID`, `COPILOT_MCP_APP_STORE_ISSUER_ID`, and
`COPILOT_MCP_APP_STORE_PRIVATE_KEY` Github Actions secrets to your `copilot`
environment under Environments in your repository settings. If this does not
exist, try starting a copilot agent in your repository to create it.

Now you can build apps for the Apple platform in a Linux Copilot Cloud Agent!

#### Claude Desktop setup

Add this to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "XcodeCloud": {
      "command": "npx",
      "args": ["-y", "xcode-cloud-mcp"],
      "env": {
        "APP_STORE_KEY_ID": "your-key-id",
        "APP_STORE_ISSUER_ID": "your-issuer-id",
        "APP_STORE_PRIVATE_KEY": "-----BEGIN PRIVATE KEY-----\n...your private key content...\n-----END PRIVATE KEY-----"
      }
    }
  }
}
```

This can be useful to manage your workflows directly, without involving a coding
agent.

### First commands to try

- `list_products` — see available products
- `list_workflows` — list workflows for a product
- `start_build` — kick off a build for a workflow
- `get_build_run` — check build status
- `get_test_failures` — surface failed tests

### Common prompts

```text
"Start a build for workflow abc-123, then monitor it and
show me any warnings or errors when it completes"
```

```text
"Get the test failures from build xyz-789 and show me
the screenshots from any failed UI tests"
```

```text
"Show me the last 5 builds for workflow abc-123 and
summarize their status"
```

## Available tools

### Discovery

- `list_products` (optional `limit`)
- `list_workflows` (`productId`, optional `limit`)
- `create_workflow` (`productId`, `name`, `containerFilePath`, `repositoryId`,
  `gitReferenceId`, `description`, `isEnabled`, `clean`, `forceCreate`)
- `get_workflow` (`workflowId`)

### Build triggers

- `start_build` (`workflowId`, optional `gitReferenceId`)
- `cancel_build` (`buildRunId`)

### Build status

- `get_build_run` (`buildRunId`)
- `list_build_runs` (`workflowId`, optional `limit`)
- `get_build_actions` (`buildRunId`)

### Build results

- `get_build_logs` (`buildActionId`)
- `get_build_issues` (`buildRunId`, optional `issueType`)

### Test results

- `get_test_results` (`buildRunId`, optional `status`)
- `get_test_failures` (`buildRunId`)
- `get_test_artifacts` (`testResultId`)

## Typical workflow

- Discover: `list_products`, `list_workflows`
- Start: `start_build`
- Monitor: `get_build_run`, `get_build_actions`
- Inspect: `get_build_issues`, `get_test_failures`
- Artifacts: `get_test_artifacts`, `get_build_logs`

## Architecture

- `src/api/auth.ts` — JWT token generation and caching
- `src/api/client.ts` — App Store Connect API client with authentication
- `src/api/types.ts` — API response types
- `src/tools/discovery.ts` — product and workflow discovery tools
- `src/tools/builds.ts` — build trigger tools
- `src/tools/status.ts` — build status tools
- `src/tools/results.ts` — build logs and issues tools
- `src/tools/tests.ts` — test results and artifacts tools

## Authentication

- Tokens are generated from your `.p8` private key at startup.
- Tokens are cached for 20 minutes with automatic renewal.
- All requests use Bearer authentication.

## Troubleshooting

- Missing env vars: ensure `APP_STORE_KEY_ID`, `APP_STORE_ISSUER_ID`, and
  `APP_STORE_PRIVATE_KEY`/`APP_STORE_PRIVATE_KEY_PATH` are set.
- Private key errors: check the path and permissions
  (`chmod 600 /path/to/AuthKey_*.p8`).
- 401 Unauthorized: confirm Key ID, Issuer ID, and private key all match and the
  key is not revoked.
- 403 Forbidden: ensure the API key role has sufficient permissions (typically
  **App Manager** or **Admin**).

## Security notes

- Store the `.p8` private key securely with restricted permissions.
- Never commit private keys; prefer environment variables or secure storage.
- Rotate keys periodically and use the minimum required role.
- GitHub Actions secrets are encrypted during workflow execution.

## CI/CD with GitHub Actions

- Linting with ESLint
- Formatting checks with Prettier
- Unit and integration tests

Required secrets: `APP_STORE_KEY_ID`, `APP_STORE_ISSUER_ID`,
`APP_STORE_PRIVATE_KEY` (full `.p8` contents including BEGIN/END lines).

Local checks:

```bash
# Run all CI checks locally
bun run ci

# Or run individually
bun run lint          # Check code quality
bun run format        # Check formatting
bun test              # Run unit tests
```

## Support

- Review error messages first—they usually indicate the problem.
- Verify API credentials and workflow configuration in App Store Connect.
- See `src/` for implementation details.

## License

UNLICENSED - Private project
