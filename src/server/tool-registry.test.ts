import { describe, it, expect, beforeEach } from 'vitest';
import { ToolRegistry } from './tool-registry.js';
import type { MCPToolDefinition } from '../tools/project-tools.js';

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  const mockTool: MCPToolDefinition = {
    name: 'get_projects',
    description: 'Get list of projects',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number' },
      },
    },
  };

  const mockTool2: MCPToolDefinition = {
    name: 'get_project',
    description: 'Get project by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
      },
      required: ['id'],
    },
  };

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  describe('registerTool', () => {
    it('ツールを登録できる', () => {
      expect(() => registry.registerTool(mockTool)).not.toThrow();
    });

    it('複数のツールを登録できる', () => {
      expect(() => {
        registry.registerTool(mockTool);
        registry.registerTool(mockTool2);
      }).not.toThrow();
    });

    it('同一名のツールを重複登録するとエラーになる', () => {
      registry.registerTool(mockTool);
      expect(() => registry.registerTool(mockTool)).toThrow(
        /already registered/
      );
    });
  });

  describe('listTools', () => {
    it('登録済みツール一覧を返す', () => {
      registry.registerTool(mockTool);
      registry.registerTool(mockTool2);

      const tools = registry.listTools();
      expect(tools).toHaveLength(2);
      expect(tools.map((t) => t.name)).toContain('get_projects');
      expect(tools.map((t) => t.name)).toContain('get_project');
    });

    it('ツール未登録の場合は空配列を返す', () => {
      const tools = registry.listTools();
      expect(tools).toHaveLength(0);
    });
  });

  describe('getTool', () => {
    it('名前からツール定義を取得できる', () => {
      registry.registerTool(mockTool);

      const result = registry.getTool('get_projects');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.name).toBe('get_projects');
        expect(result.value.description).toBe('Get list of projects');
      }
    });

    it('存在しないツール名はエラーを返す', () => {
      const result = registry.getTool('nonexistent_tool');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toMatch(/not found/);
        expect(result.error.toolName).toBe('nonexistent_tool');
      }
    });
  });

  describe('registerTools (bulk)', () => {
    it('ツール定義の配列を一括登録できる', () => {
      registry.registerTools([mockTool, mockTool2]);

      const tools = registry.listTools();
      expect(tools).toHaveLength(2);
    });

    it('空の配列を渡してもエラーにならない', () => {
      expect(() => registry.registerTools([])).not.toThrow();
    });
  });
});
