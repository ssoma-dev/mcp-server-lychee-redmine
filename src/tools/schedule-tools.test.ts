import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScheduleTools } from './schedule-tools.js';
import type { RedmineAPIClient } from '../redmine/api-client.js';
import type { Schedule, ApiError } from '../redmine/types.js';

describe('ScheduleTools', () => {
  let scheduleTools: ScheduleTools;
  let mockApiClient: jest.Mocked<RedmineAPIClient>;

  const mockSchedule: Schedule = {
    project_id: 5,
    start_date: '2024-01-01',
    end_date: '2024-03-31',
    progress: 45,
    total_issues: 10,
    completed_issues: 4,
    milestones: [
      {
        id: 1,
        name: 'Milestone 1',
        start_date: '2024-01-01',
        due_date: '2024-01-31',
        status: 'closed',
      },
      {
        id: 2,
        name: 'Milestone 2',
        start_date: '2024-02-01',
        due_date: '2024-03-31',
        status: 'open',
      },
    ],
    dependencies: [],
  };

  beforeEach(() => {
    mockApiClient = {
      getSchedule: vi.fn(),
    } as unknown as jest.Mocked<RedmineAPIClient>;

    scheduleTools = new ScheduleTools(mockApiClient);
  });

  // ============================================================================
  // スキーマバリデーションテスト
  // ============================================================================

  describe('getScheduleParamsSchema', () => {
    it('スキーマが正しく定義されている', () => {
      const schema = scheduleTools.getScheduleParamsSchema;
      expect(schema).toBeDefined();
    });

    it('project_idは必須', () => {
      const schema = scheduleTools.getScheduleParamsSchema;

      const missing = schema.safeParse({});
      expect(missing.success).toBe(false);

      const valid = schema.safeParse({ project_id: 5 });
      expect(valid.success).toBe(true);
    });

    it('project_idは正の整数', () => {
      const schema = scheduleTools.getScheduleParamsSchema;

      const negative = schema.safeParse({ project_id: -1 });
      expect(negative.success).toBe(false);

      const zero = schema.safeParse({ project_id: 0 });
      expect(zero.success).toBe(false);

      const valid = schema.safeParse({ project_id: 1 });
      expect(valid.success).toBe(true);
    });

    it('include_critical_pathはオプションのboolean', () => {
      const schema = scheduleTools.getScheduleParamsSchema;

      const withTrue = schema.safeParse({
        project_id: 5,
        include_critical_path: true,
      });
      expect(withTrue.success).toBe(true);

      const withFalse = schema.safeParse({
        project_id: 5,
        include_critical_path: false,
      });
      expect(withFalse.success).toBe(true);

      const withoutFlag = schema.safeParse({ project_id: 5 });
      expect(withoutFlag.success).toBe(true);
    });
  });

  // ============================================================================
  // getScheduleメソッドのテスト
  // ============================================================================

  describe('getSchedule', () => {
    it('スケジュール情報を取得できる', async () => {
      mockApiClient.getSchedule.mockResolvedValue({
        ok: true,
        value: mockSchedule,
      });

      const result = await scheduleTools.getSchedule({ project_id: 5 });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.project_id).toBe(5);
        expect(result.value.start_date).toBe('2024-01-01');
        expect(result.value.end_date).toBe('2024-03-31');
        expect(result.value.progress).toBe(45);
        expect(result.value.total_issues).toBe(10);
        expect(result.value.completed_issues).toBe(4);
        expect(result.value.milestones).toHaveLength(2);
      }
      expect(mockApiClient.getSchedule).toHaveBeenCalledWith(5);
    });

    it('マイルストーン情報が正しく含まれる', async () => {
      mockApiClient.getSchedule.mockResolvedValue({
        ok: true,
        value: mockSchedule,
      });

      const result = await scheduleTools.getSchedule({ project_id: 5 });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const firstMilestone = result.value.milestones[0];
        expect(firstMilestone?.name).toBe('Milestone 1');
        expect(firstMilestone?.status).toBe('closed');
      }
    });

    it('クリティカルパスを含むスケジュールを取得できる', async () => {
      const scheduleWithCriticalPath: Schedule = {
        ...mockSchedule,
        critical_path: [1, 3, 5],
      };

      mockApiClient.getSchedule.mockResolvedValue({
        ok: true,
        value: scheduleWithCriticalPath,
      });

      const result = await scheduleTools.getSchedule({
        project_id: 5,
        include_critical_path: true,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.critical_path).toEqual([1, 3, 5]);
      }
      expect(mockApiClient.getSchedule).toHaveBeenCalledWith(5);
    });

    it('project_idがない場合はバリデーションエラー', async () => {
      const result = await scheduleTools.getSchedule({});

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('validation');
        expect(result.error.message).toBe('Invalid parameters');
      }
      expect(mockApiClient.getSchedule).not.toHaveBeenCalled();
    });

    it('負のproject_idはバリデーションエラー', async () => {
      const result = await scheduleTools.getSchedule({ project_id: -5 });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('validation');
      }
      expect(mockApiClient.getSchedule).not.toHaveBeenCalled();
    });

    it('404エラーを適切に処理する（プロジェクトが存在しない）', async () => {
      const apiError: ApiError = {
        code: 404,
        message: 'Project not found',
        endpoint: '/projects/999',
        timestamp: '2024-01-01T00:00:00Z',
      };

      mockApiClient.getSchedule.mockResolvedValue({
        ok: false,
        error: apiError,
      });

      const result = await scheduleTools.getSchedule({ project_id: 999 });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('api');
        expect(result.error.message).toBe('Project not found');
        expect(result.error.details).toEqual({ code: 404 });
      }
    });

    it('403エラーを適切に処理する（権限なし）', async () => {
      const apiError: ApiError = {
        code: 403,
        message: 'Forbidden',
        endpoint: '/projects/5',
        timestamp: '2024-01-01T00:00:00Z',
      };

      mockApiClient.getSchedule.mockResolvedValue({
        ok: false,
        error: apiError,
      });

      const result = await scheduleTools.getSchedule({ project_id: 5 });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('api');
        expect(result.error.details).toEqual({ code: 403 });
      }
    });

    it('依存関係情報が含まれる場合に正しく返却される', async () => {
      const scheduleWithDeps: Schedule = {
        ...mockSchedule,
        dependencies: [
          { issue_id: 2, depends_on: [1] },
          { issue_id: 3, depends_on: [1, 2] },
        ],
      };

      mockApiClient.getSchedule.mockResolvedValue({
        ok: true,
        value: scheduleWithDeps,
      });

      const result = await scheduleTools.getSchedule({ project_id: 5 });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.dependencies).toHaveLength(2);
        expect(result.value.dependencies[0]).toEqual({
          issue_id: 2,
          depends_on: [1],
        });
      }
    });

    it('イシューとマイルストーンがない場合のスケジュールを処理する', async () => {
      const emptySchedule: Schedule = {
        project_id: 5,
        progress: 0,
        total_issues: 0,
        completed_issues: 0,
        milestones: [],
        dependencies: [],
      };

      mockApiClient.getSchedule.mockResolvedValue({
        ok: true,
        value: emptySchedule,
      });

      const result = await scheduleTools.getSchedule({ project_id: 5 });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.total_issues).toBe(0);
        expect(result.value.milestones).toHaveLength(0);
        expect(result.value.start_date).toBeUndefined();
        expect(result.value.end_date).toBeUndefined();
      }
    });
  });

  // ============================================================================
  // getToolDefinitionsのテスト
  // ============================================================================

  describe('getToolDefinitions', () => {
    it('1つのツール定義を返す', () => {
      const definitions = scheduleTools.getToolDefinitions();

      expect(definitions).toHaveLength(1);

      const scheduleDef = definitions.find((d) => d.name === 'get_schedule');
      expect(scheduleDef).toBeDefined();
    });

    it('get_scheduleツールの説明とスキーマが正しい', () => {
      const definitions = scheduleTools.getToolDefinitions();
      const scheduleDef = definitions.find((d) => d.name === 'get_schedule');

      expect(scheduleDef).toBeDefined();
      expect(scheduleDef?.description).toBeTruthy();
      expect(scheduleDef?.inputSchema).toBeDefined();
      expect(scheduleDef?.inputSchema.type).toBe('object');
    });

    it('JSON Schema形式のパラメータ定義を含む', () => {
      const definitions = scheduleTools.getToolDefinitions();

      for (const def of definitions) {
        expect(def.inputSchema).toBeDefined();
        expect(def.inputSchema.type).toBe('object');
        expect(def.inputSchema.properties).toBeDefined();
      }
    });

    it('project_idが必須プロパティとして定義される', () => {
      const definitions = scheduleTools.getToolDefinitions();
      const scheduleDef = definitions.find((d) => d.name === 'get_schedule');

      expect(scheduleDef?.inputSchema.required).toBeDefined();
      expect(scheduleDef?.inputSchema.required).toContain('project_id');
    });
  });
});
