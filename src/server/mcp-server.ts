import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { AppConfig } from '../config/types.js';
import { RetryHandler } from '../utils/retry-handler.js';
import { RedmineAPIClient } from '../redmine/api-client.js';
import { ProjectTools } from '../tools/project-tools.js';
import { IssueTools } from '../tools/issue-tools.js';
import { UserTools } from '../tools/user-tools.js';
import { ScheduleTools } from '../tools/schedule-tools.js';
import { ToolRegistry } from './tool-registry.js';

/**
 * Lychee Redmine MCP Server
 * MCPプロトコル実装とツール登録を管理
 */
export class LycheeRedmineMCPServer {
  private server: Server;
  private transport: StdioServerTransport | undefined;
  private readonly toolRegistry: ToolRegistry;

  constructor(config: AppConfig) {
    // MCP Serverインスタンスの作成
    this.server = new Server(
      {
        name: 'mcp-server-lychee-redmine',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // エラーハンドラーの設定
    this.server.onerror = (error: Error): void => {
      process.stderr.write(`[MCP Server Error] ${error.message}\n`);
    };

    // ツールの初期化と登録
    this.toolRegistry = this.initializeTools(config);

    // リクエストハンドラーの登録
    this.registerRequestHandlers();
  }

  /**
   * ToolRegistryインスタンスを返す（テスト用）
   */
  getToolRegistry(): ToolRegistry {
    return this.toolRegistry;
  }

  /**
   * ツールを初期化してレジストリに登録
   */
  private initializeTools(config: AppConfig): ToolRegistry {
    const retryHandler = new RetryHandler();
    const apiClient = new RedmineAPIClient(
      {
        url: config.lycheeRedmine.url,
        apiKey: config.lycheeRedmine.apiKey,
        timeout: config.server.timeout,
      },
      retryHandler
    );

    const projectTools = new ProjectTools(apiClient);
    const issueTools = new IssueTools(apiClient);
    const userTools = new UserTools(apiClient);
    const scheduleTools = new ScheduleTools(apiClient);

    const registry = new ToolRegistry();

    // 8つのMCPツールを登録
    registry.registerTools(projectTools.getToolDefinitions());
    registry.registerTools(issueTools.getToolDefinitions());
    registry.registerTools(userTools.getToolDefinitions());
    registry.registerTools(scheduleTools.getToolDefinitions());

    return registry;
  }

  /**
   * MCP SDKのリクエストハンドラーを登録
   */
  private registerRequestHandlers(): void {
    // tools/list: 利用可能なツール一覧を返す
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = this.toolRegistry.listTools();
      return {
        tools: tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
      };
    });

    // tools/call: ツールを実行する
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const toolResult = this.toolRegistry.getTool(name);

      if (!toolResult.ok) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                error: `Tool "${name}" not found`,
                available_tools: this.toolRegistry
                  .listTools()
                  .map((t) => t.name),
              }),
            },
          ],
          isError: true,
        };
      }

      // ツール定義にhandlerプロパティがある場合は実行
      const toolDef = toolResult.value;
      if ('handler' in toolDef && typeof toolDef.handler === 'function') {
        const result = await (
          toolDef.handler as (args: unknown) => Promise<unknown>
        )(args);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              error: `Tool "${name}" has no handler registered`,
            }),
          },
        ],
        isError: true,
      };
    });
  }

  /**
   * サーバーを起動してstdio通信を開始
   */
  async start(): Promise<void> {
    this.transport = new StdioServerTransport();
    await this.server.connect(this.transport);
  }

  /**
   * サーバーを正常終了
   */
  async shutdown(): Promise<void> {
    await this.server.close();
  }
}
