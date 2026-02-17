import type { MCPToolDefinition } from '../tools/project-tools.js';
import type { Result } from '../redmine/types.js';

/**
 * ツールが見つからないエラー
 */
export interface ToolNotFoundError {
  message: string;
  toolName: string;
}

/**
 * ToolRegistry - MCPツールの管理クラス
 * ツールの登録、一覧取得、ハンドラーマッピングを提供
 */
export class ToolRegistry {
  private readonly tools: Map<string, MCPToolDefinition> = new Map();

  /**
   * ツールを登録する（重複チェック付き）
   */
  registerTool(tool: MCPToolDefinition): void {
    if (this.tools.has(tool.name)) {
      throw new Error(
        `Tool "${tool.name}" is already registered. Duplicate tool names are not allowed.`
      );
    }
    this.tools.set(tool.name, tool);
  }

  /**
   * 複数のツールを一括登録する
   */
  registerTools(tools: MCPToolDefinition[]): void {
    for (const tool of tools) {
      this.registerTool(tool);
    }
  }

  /**
   * 登録済みツール一覧を返す
   */
  listTools(): MCPToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * ツール名からツール定義を取得する
   */
  getTool(name: string): Result<MCPToolDefinition, ToolNotFoundError> {
    const tool = this.tools.get(name);
    if (tool === undefined) {
      return {
        ok: false,
        error: {
          message: `Tool "${name}" not found in registry`,
          toolName: name,
        },
      };
    }
    return {
      ok: true,
      value: tool,
    };
  }
}
