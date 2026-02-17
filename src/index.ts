#!/usr/bin/env node

import { ConfigLoader } from './config/config-loader.js';
import { LycheeRedmineMCPServer } from './server/mcp-server.js';

/**
 * MCP Server for Lychee Redmine
 * Entry point for the Model Context Protocol server
 */
async function main(): Promise<void> {
  // 設定読み込みとバリデーション（要件1.5: 設定エラー時はプロセス終了）
  const configLoader = new ConfigLoader();
  const configResult = await configLoader.load();
  if (!configResult.ok) {
    process.stderr.write(
      `[Fatal] Configuration error: ${configResult.error.message}\n`
    );
    process.exit(1);
  }

  const config = configResult.value;

  // MCPサーバーの起動
  const server = new LycheeRedmineMCPServer(config);

  // シャットダウンシグナルのハンドリング
  const shutdown = async (): Promise<void> => {
    await server.shutdown();
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown();
  });
  process.on('SIGTERM', () => {
    void shutdown();
  });

  await server.start();
}

main().catch((error: Error) => {
  process.stderr.write(`[Fatal] ${error.message}\n`);
  process.exit(1);
});
