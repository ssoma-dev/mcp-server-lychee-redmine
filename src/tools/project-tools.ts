import { z } from 'zod';
import type { RedmineAPIClient } from '../redmine/api-client.js';
import type { Project, ProjectsResponse, Result } from '../redmine/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';

/**
 * MCPツールエラー型
 */
export interface ToolError {
  type: 'validation' | 'api' | 'internal';
  message: string;
  details?: unknown;
}

/**
 * MCPツール定義インターフェース
 */
export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * プロジェクト関連MCPツール
 */
export class ProjectTools {
  private readonly apiClient: RedmineAPIClient;

  /**
   * get_projectsパラメータスキーマ
   */
  readonly getProjectsParamsSchema = z.object({
    limit: z.number().int().min(1).max(100).optional(),
    offset: z.number().int().min(0).optional(),
  });

  /**
   * get_projectパラメータスキーマ
   */
  readonly getProjectParamsSchema = z.object({
    id: z.number().int().positive(),
  });

  constructor(apiClient: RedmineAPIClient) {
    this.apiClient = apiClient;
  }

  /**
   * プロジェクト一覧を取得
   */
  async getProjects(
    params: unknown
  ): Promise<Result<ProjectsResponse, ToolError>> {
    // パラメータのバリデーション
    const parseResult = this.getProjectsParamsSchema.safeParse(params);
    if (!parseResult.success) {
      return {
        ok: false,
        error: {
          type: 'validation',
          message: 'Invalid parameters',
          details: parseResult.error.errors,
        },
      };
    }

    // API呼び出し
    const result = await this.apiClient.getProjects(parseResult.data);

    if (!result.ok) {
      return {
        ok: false,
        error: {
          type: 'api',
          message: result.error.message,
          details: { code: result.error.code },
        },
      };
    }

    return {
      ok: true,
      value: result.value,
    };
  }

  /**
   * プロジェクト詳細を取得
   */
  async getProject(params: unknown): Promise<Result<Project, ToolError>> {
    // パラメータのバリデーション
    const parseResult = this.getProjectParamsSchema.safeParse(params);
    if (!parseResult.success) {
      return {
        ok: false,
        error: {
          type: 'validation',
          message: 'Invalid parameters',
          details: parseResult.error.errors,
        },
      };
    }

    // API呼び出し
    const result = await this.apiClient.getProject(parseResult.data.id);

    if (!result.ok) {
      return {
        ok: false,
        error: {
          type: 'api',
          message: result.error.message,
          details: { code: result.error.code },
        },
      };
    }

    return {
      ok: true,
      value: result.value,
    };
  }

  /**
   * MCPツール定義を取得
   */
  getToolDefinitions(): MCPToolDefinition[] {
    return [
      {
        name: 'get_projects',
        description:
          'Get list of accessible projects from Lychee Redmine. Supports pagination.',
        inputSchema: zodToJsonSchema(this.getProjectsParamsSchema) as {
          type: 'object';
          properties: Record<string, unknown>;
          required?: string[];
        },
      },
      {
        name: 'get_project',
        description:
          'Get project details by ID from Lychee Redmine. Returns project name, description, status, and members.',
        inputSchema: zodToJsonSchema(this.getProjectParamsSchema) as {
          type: 'object';
          properties: Record<string, unknown>;
          required?: string[];
        },
      },
    ];
  }
}
