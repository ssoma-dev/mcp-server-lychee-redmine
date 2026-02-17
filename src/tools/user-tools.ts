import { z } from 'zod';
import type { RedmineAPIClient } from '../redmine/api-client.js';
import type {
  UsersResponse,
  MembersResponse,
  Result,
} from '../redmine/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { ToolError, MCPToolDefinition } from './project-tools.js';

/**
 * リソース管理MCPツール（get_users、get_project_members）
 */
export class UserTools {
  private readonly apiClient: RedmineAPIClient;

  /**
   * get_usersパラメータスキーマ
   */
  readonly getUsersParamsSchema = z.object({
    status: z.enum(['active', 'locked', 'all']).optional(),
    limit: z.number().int().min(1).max(100).optional(),
    offset: z.number().int().min(0).optional(),
  });

  /**
   * get_project_membersパラメータスキーマ
   */
  readonly getProjectMembersParamsSchema = z.object({
    project_id: z.number().int().positive(),
    limit: z.number().int().min(1).max(100).optional(),
    offset: z.number().int().min(0).optional(),
  });

  constructor(apiClient: RedmineAPIClient) {
    this.apiClient = apiClient;
  }

  /**
   * ユーザー一覧を取得
   */
  async getUsers(params: unknown): Promise<Result<UsersResponse, ToolError>> {
    const parseResult = this.getUsersParamsSchema.safeParse(params);
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

    const result = await this.apiClient.getUsers(parseResult.data);

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
   * プロジェクトメンバー一覧を取得
   */
  async getProjectMembers(
    params: unknown
  ): Promise<Result<MembersResponse, ToolError>> {
    const parseResult = this.getProjectMembersParamsSchema.safeParse(params);
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

    const result = await this.apiClient.getProjectMembers(parseResult.data);

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
        name: 'get_users',
        description:
          'Get list of users from Lychee Redmine. Filter by status (active, locked, all). Supports pagination.',
        inputSchema: zodToJsonSchema(this.getUsersParamsSchema) as {
          type: 'object';
          properties: Record<string, unknown>;
          required?: string[];
        },
      },
      {
        name: 'get_project_members',
        description:
          'Get members and their roles for a specific project in Lychee Redmine. Includes user and group memberships. Supports pagination.',
        inputSchema: zodToJsonSchema(this.getProjectMembersParamsSchema) as {
          type: 'object';
          properties: Record<string, unknown>;
          required?: string[];
        },
      },
    ];
  }
}
