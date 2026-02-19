import { z } from 'zod';
import type { RedmineAPIClient } from '../redmine/api-client.js';
import type { Issue, IssuesResponse, Result } from '../redmine/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { ToolError, MCPToolDefinition } from './project-tools.js';

/**
 * チケット関連MCPツール
 */
export class IssueTools {
  private readonly apiClient: RedmineAPIClient;

  /**
   * search_issuesパラメータスキーマ
   */
  readonly searchIssuesParamsSchema = z.object({
    project_id: z.number().int().positive().optional(),
    status_id: z
      .union([z.literal('open'), z.literal('closed'), z.number().int()])
      .optional(),
    assigned_to_id: z.number().int().positive().optional(),
    query: z.string().optional(),
    limit: z.number().int().min(1).max(100).optional(),
    offset: z.number().int().min(0).optional(),
  });

  /**
   * create_issueパラメータスキーマ
   */
  readonly createIssueParamsSchema = z.object({
    project_id: z.number().int().positive(),
    subject: z.string().min(1).max(255),
    description: z.string().optional(),
    priority_id: z.number().int().positive().optional(),
    assigned_to_id: z.number().int().positive().optional(),
    due_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  });

  /**
   * update_issueパラメータスキーマ
   */
  readonly updateIssueParamsSchema = z.object({
    id: z.number().int().positive(),
    subject: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    status_id: z.number().int().positive().optional(),
    priority_id: z.number().int().positive().optional(),
    assigned_to_id: z.number().int().positive().optional(),
    due_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  });

  constructor(apiClient: RedmineAPIClient) {
    this.apiClient = apiClient;
  }

  /**
   * チケットを検索
   */
  async searchIssues(
    params: unknown
  ): Promise<Result<IssuesResponse, ToolError>> {
    // パラメータのバリデーション
    const parseResult = this.searchIssuesParamsSchema.safeParse(params);
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
    const result = await this.apiClient.searchIssues(parseResult.data);

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
   * チケットを作成
   */
  async createIssue(params: unknown): Promise<Result<Issue, ToolError>> {
    // パラメータのバリデーション
    const parseResult = this.createIssueParamsSchema.safeParse(params);
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
    const result = await this.apiClient.createIssue(parseResult.data);

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
   * チケットを更新
   */
  async updateIssue(params: unknown): Promise<Result<Issue, ToolError>> {
    // パラメータのバリデーション
    const parseResult = this.updateIssueParamsSchema.safeParse(params);
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

    const { id, ...updateParams } = parseResult.data;

    // API呼び出し
    const result = await this.apiClient.updateIssue(id, updateParams);

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
        name: 'search_issues',
        description:
          'Search issues in Lychee Redmine. Filter by project, status, assignee, or keyword. Supports pagination.',
        inputSchema: zodToJsonSchema(this.searchIssuesParamsSchema) as {
          type: 'object';
          properties: Record<string, unknown>;
          required?: string[];
        },
        handler: (args) => this.searchIssues(args),
      },
      {
        name: 'create_issue',
        description:
          'Create a new issue in Lychee Redmine. Requires project_id and subject. Optional: description, priority, assignee, due date.',
        inputSchema: zodToJsonSchema(this.createIssueParamsSchema) as {
          type: 'object';
          properties: Record<string, unknown>;
          required?: string[];
        },
        handler: (args) => this.createIssue(args),
      },
      {
        name: 'update_issue',
        description:
          'Update an existing issue in Lychee Redmine. Partial updates supported - only specify fields to change.',
        inputSchema: zodToJsonSchema(this.updateIssueParamsSchema) as {
          type: 'object';
          properties: Record<string, unknown>;
          required?: string[];
        },
        handler: (args) => this.updateIssue(args),
      },
    ];
  }
}
