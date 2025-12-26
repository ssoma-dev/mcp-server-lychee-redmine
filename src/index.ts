#!/usr/bin/env node

/**
 * MCP Server for Lychee Redmine
 * Entry point for the Model Context Protocol server
 */

async function main(): Promise<void> {
  console.log('MCP Server for Lychee Redmine - Starting...');
  // Server initialization will be implemented in subsequent tasks
}

main().catch((error: Error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
