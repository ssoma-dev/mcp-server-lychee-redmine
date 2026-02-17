import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { AppConfig } from '../config/types.js';

// vi.hoisted()でモック変数をホイスティング（vi.mock ファクトリより先に評価）
const mocks = vi.hoisted(() => ({
  setRequestHandler: vi.fn(),
  connect: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: vi.fn().mockImplementation(() => ({
    setRequestHandler: mocks.setRequestHandler,
    connect: mocks.connect,
    close: mocks.close,
    onerror: undefined,
  })),
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('../utils/retry-handler.js', () => ({
  RetryHandler: vi.fn().mockImplementation(() => ({
    withRetry: vi.fn(),
  })),
}));

// テスト対象をimport
import { LycheeRedmineMCPServer } from './mcp-server.js';

describe('LycheeRedmineMCPServer', () => {
  const validConfig: AppConfig = {
    lycheeRedmine: {
      url: 'https://redmine.example.com',
      apiKey: 'test-api-key-12345',
    },
    server: {
      logLevel: 'INFO',
      timeout: 30000,
      retryMaxAttempts: 3,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // clearAllMocks後にモック実装を再設定
    mocks.setRequestHandler.mockImplementation(() => undefined);
    mocks.connect.mockResolvedValue(undefined);
    mocks.close.mockResolvedValue(undefined);
  });

  describe('constructor', () => {
    it('有効な設定でインスタンスを生成できる', () => {
      expect(() => new LycheeRedmineMCPServer(validConfig)).not.toThrow();
    });
  });

  describe('getToolRegistry', () => {
    it('ToolRegistryインスタンスを返す', () => {
      const server = new LycheeRedmineMCPServer(validConfig);
      const registry = server.getToolRegistry();
      expect(registry).toBeDefined();
    });

    it('8つのツールが登録されている', () => {
      const server = new LycheeRedmineMCPServer(validConfig);
      const registry = server.getToolRegistry();
      const tools = registry.listTools();

      expect(tools).toHaveLength(8);

      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain('get_projects');
      expect(toolNames).toContain('get_project');
      expect(toolNames).toContain('search_issues');
      expect(toolNames).toContain('create_issue');
      expect(toolNames).toContain('update_issue');
      expect(toolNames).toContain('get_users');
      expect(toolNames).toContain('get_project_members');
      expect(toolNames).toContain('get_schedule');
    });
  });

  describe('start', () => {
    it('正常に起動できる', async () => {
      const server = new LycheeRedmineMCPServer(validConfig);
      await expect(server.start()).resolves.not.toThrow();

      // tools/listとtools/callのハンドラーが登録されること（コンストラクタで登録）
      expect(mocks.setRequestHandler).toHaveBeenCalledTimes(2);
      // connectが呼ばれること
      expect(mocks.connect).toHaveBeenCalledTimes(1);
    });
  });

  describe('shutdown', () => {
    it('正常にシャットダウンできる', async () => {
      const server = new LycheeRedmineMCPServer(validConfig);
      await server.start();
      await expect(server.shutdown()).resolves.not.toThrow();

      expect(mocks.close).toHaveBeenCalledTimes(1);
    });

    it('start前にshutdownを呼んでもエラーにならない', async () => {
      const server = new LycheeRedmineMCPServer(validConfig);
      await expect(server.shutdown()).resolves.not.toThrow();
    });
  });

  describe('tool call handling', () => {
    type Handler = (req: unknown) => Promise<unknown>;

    const captureHandlers = (): {
      getListHandler: () => Handler | undefined;
      getCallHandler: () => Handler | undefined;
    } => {
      let listToolsHandler: Handler | undefined;
      let callToolHandler: Handler | undefined;

      mocks.setRequestHandler.mockImplementation(
        (_schema: unknown, handler: Handler) => {
          if (listToolsHandler === undefined) {
            listToolsHandler = handler;
          } else {
            callToolHandler = handler;
          }
        }
      );

      return {
        getListHandler: () => listToolsHandler,
        getCallHandler: () => callToolHandler,
      };
    };

    it('tools/listハンドラーが正しいツール一覧を返す', async () => {
      const { getListHandler } = captureHandlers();

      const server = new LycheeRedmineMCPServer(validConfig);
      await server.start();

      const listToolsHandler = getListHandler();
      expect(listToolsHandler).toBeDefined();
      if (listToolsHandler !== undefined) {
        const response = await listToolsHandler({ method: 'tools/list' });
        const typedResponse = response as {
          tools: Array<{
            name: string;
            description: string;
            inputSchema: unknown;
          }>;
        };
        expect(typedResponse.tools).toHaveLength(8);
        expect(typedResponse.tools[0]).toHaveProperty('name');
        expect(typedResponse.tools[0]).toHaveProperty('description');
        expect(typedResponse.tools[0]).toHaveProperty('inputSchema');
      }
    });

    it('tools/callハンドラーが存在しないツール名でエラーレスポンスを返す', async () => {
      const { getCallHandler } = captureHandlers();

      const server = new LycheeRedmineMCPServer(validConfig);
      await server.start();

      const callToolHandler = getCallHandler();
      expect(callToolHandler).toBeDefined();
      if (callToolHandler !== undefined) {
        const response = await callToolHandler({
          method: 'tools/call',
          params: { name: 'non_existent_tool', arguments: {} },
        });
        const typedResponse = response as {
          content: Array<{ type: string; text: string }>;
          isError: boolean;
        };
        expect(typedResponse.isError).toBe(true);
        expect(typedResponse.content).toHaveLength(1);
        expect(typedResponse.content[0].type).toBe('text');
        const parsed = JSON.parse(typedResponse.content[0].text) as {
          error: string;
          available_tools: string[];
        };
        expect(parsed.error).toContain('non_existent_tool');
        expect(parsed.available_tools).toHaveLength(8);
      }
    });

    it('tools/callハンドラーがhandlerを持つツールを正常実行する', async () => {
      const { getCallHandler } = captureHandlers();

      // ツールレジストリにhandler付きツールを追加するため、
      // LycheeRedmineMCPServerのtoolRegistryに直接アクセスして検証
      const server = new LycheeRedmineMCPServer(validConfig);
      const registry = server.getToolRegistry();

      // モックのhandlerを持つカスタムツールを登録
      const mockHandler = vi.fn().mockResolvedValue({ result: 'success' });
      registry.registerTool({
        name: 'test_tool_with_handler',
        description: 'テスト用ツール',
        inputSchema: { type: 'object' as const, properties: {} },
        handler: mockHandler,
      });

      await server.start();

      const callToolHandler = getCallHandler();
      expect(callToolHandler).toBeDefined();
      if (callToolHandler !== undefined) {
        const response = await callToolHandler({
          method: 'tools/call',
          params: {
            name: 'test_tool_with_handler',
            arguments: { key: 'value' },
          },
        });
        const typedResponse = response as {
          content: Array<{ type: string; text: string }>;
          isError?: boolean;
        };
        expect(typedResponse.isError).toBeUndefined();
        expect(typedResponse.content).toHaveLength(1);
        expect(typedResponse.content[0].type).toBe('text');
        const parsed = JSON.parse(typedResponse.content[0].text) as {
          result: string;
        };
        expect(parsed.result).toBe('success');
        expect(mockHandler).toHaveBeenCalledWith({ key: 'value' });
      }
    });

    it('tools/callハンドラーがhandlerなしのツールでエラーレスポンスを返す', async () => {
      const { getCallHandler } = captureHandlers();

      const server = new LycheeRedmineMCPServer(validConfig);
      const registry = server.getToolRegistry();

      // handlerなしのカスタムツールを登録
      registry.registerTool({
        name: 'test_tool_no_handler',
        description: 'handlerなしのテスト用ツール',
        inputSchema: { type: 'object' as const, properties: {} },
      });

      await server.start();

      const callToolHandler = getCallHandler();
      expect(callToolHandler).toBeDefined();
      if (callToolHandler !== undefined) {
        const response = await callToolHandler({
          method: 'tools/call',
          params: { name: 'test_tool_no_handler', arguments: {} },
        });
        const typedResponse = response as {
          content: Array<{ type: string; text: string }>;
          isError: boolean;
        };
        expect(typedResponse.isError).toBe(true);
        const parsed = JSON.parse(typedResponse.content[0].text) as {
          error: string;
        };
        expect(parsed.error).toContain('test_tool_no_handler');
        expect(parsed.error).toContain('no handler');
      }
    });
  });
});
