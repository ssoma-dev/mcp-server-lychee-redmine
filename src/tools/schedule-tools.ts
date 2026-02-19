import { z } from 'zod';
import type { RedmineAPIClient } from '../redmine/api-client.js';
import type { Schedule, Result } from '../redmine/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { ToolError, MCPToolDefinition } from './project-tools.js';

/**
 * スケジュール情報MCPツール（get_schedule）
 */
export class ScheduleTools {
  private readonly apiClient: RedmineAPIClient;

  /**
   * get_scheduleパラメータスキーマ
   */
  readonly getScheduleParamsSchema = z.object({
    project_id: z.number().int().positive(),
    include_critical_path: z.boolean().optional(),
  });

  constructor(apiClient: RedmineAPIClient) {
    this.apiClient = apiClient;
  }

  /**
   * プロジェクトのスケジュール情報を取得
   */
  async getSchedule(params: unknown): Promise<Result<Schedule, ToolError>> {
    const parseResult = this.getScheduleParamsSchema.safeParse(params);
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

    const result = await this.apiClient.getSchedule(
      parseResult.data.project_id
    );

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
        name: 'get_schedule',
        description:
          'Get schedule information for a project in Lychee Redmine. Returns start/end dates, progress, milestones, dependencies, and optional critical path analysis.',
        inputSchema: zodToJsonSchema(this.getScheduleParamsSchema) as {
          type: 'object';
          properties: Record<string, unknown>;
          required?: string[];
        },
        handler: (args) => this.getSchedule(args),
      },
    ];
  }
}
