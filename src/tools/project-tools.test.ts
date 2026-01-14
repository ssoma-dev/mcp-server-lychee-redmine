import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProjectTools } from './project-tools.js';
import type { RedmineAPIClient } from '../redmine/api-client.js';
import type { Project, ProjectsResponse, ApiError } from '../redmine/types.js';

describe('ProjectTools', () => {
  let projectTools: ProjectTools;
  let mockApiClient: jest.Mocked<RedmineAPIClient>;

  const mockProject: Project = {
    id: 1,
    name: 'Test Project',
    identifier: 'test-project',
    description: 'A test project',
    status: 1,
    is_public: true,
    created_on: '2024-01-01T00:00:00Z',
    updated_on: '2024-01-02T00:00:00Z',
  };

  const mockProjectsResponse: ProjectsResponse = {
    data: [mockProject],
    total_count: 1,
    limit: 25,
    offset: 0,
  };

  beforeEach(() => {
    mockApiClient = {
      getProjects: vi.fn(),
      getProject: vi.fn(),
    } as unknown as jest.Mocked<RedmineAPIClient>;

    projectTools = new ProjectTools(mockApiClient);
  });

  describe('getProjectsParamsSchema', () => {
    it('スキーマが正しく定義されている', () => {
      const schema = projectTools.getProjectsParamsSchema;
      expect(schema).toBeDefined();

      // 有効なパラメータを検証
      const validResult = schema.safeParse({ limit: 25, offset: 0 });
      expect(validResult.success).toBe(true);

      // 空のパラメータも有効
      const emptyResult = schema.safeParse({});
      expect(emptyResult.success).toBe(true);
    });

    it('limitの範囲を検証する', () => {
      const schema = projectTools.getProjectsParamsSchema;

      // limit: 1-100の範囲外
      const tooSmall = schema.safeParse({ limit: 0 });
      expect(tooSmall.success).toBe(false);

      const tooLarge = schema.safeParse({ limit: 101 });
      expect(tooLarge.success).toBe(false);

      // 範囲内は有効
      const valid = schema.safeParse({ limit: 50 });
      expect(valid.success).toBe(true);
    });

    it('offsetは0以上を検証する', () => {
      const schema = projectTools.getProjectsParamsSchema;

      const negative = schema.safeParse({ offset: -1 });
      expect(negative.success).toBe(false);

      const zero = schema.safeParse({ offset: 0 });
      expect(zero.success).toBe(true);
    });
  });

  describe('getProjectParamsSchema', () => {
    it('スキーマが正しく定義されている', () => {
      const schema = projectTools.getProjectParamsSchema;
      expect(schema).toBeDefined();

      // 有効なパラメータを検証
      const validResult = schema.safeParse({ id: 1 });
      expect(validResult.success).toBe(true);
    });

    it('idは必須で正の整数', () => {
      const schema = projectTools.getProjectParamsSchema;

      // idがない場合は無効
      const missing = schema.safeParse({});
      expect(missing.success).toBe(false);

      // 0は無効
      const zero = schema.safeParse({ id: 0 });
      expect(zero.success).toBe(false);

      // 負の数は無効
      const negative = schema.safeParse({ id: -1 });
      expect(negative.success).toBe(false);

      // 小数は無効
      const decimal = schema.safeParse({ id: 1.5 });
      expect(decimal.success).toBe(false);
    });
  });

  describe('getProjects', () => {
    it('プロジェクト一覧を取得できる', async () => {
      mockApiClient.getProjects.mockResolvedValue({
        ok: true,
        value: mockProjectsResponse,
      });

      const result = await projectTools.getProjects({ limit: 25, offset: 0 });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toHaveLength(1);
        expect(result.value.data[0]?.name).toBe('Test Project');
        expect(result.value.total_count).toBe(1);
      }
      expect(mockApiClient.getProjects).toHaveBeenCalledWith({
        limit: 25,
        offset: 0,
      });
    });

    it('空のパラメータでも動作する', async () => {
      mockApiClient.getProjects.mockResolvedValue({
        ok: true,
        value: mockProjectsResponse,
      });

      const result = await projectTools.getProjects({});

      expect(result.ok).toBe(true);
      expect(mockApiClient.getProjects).toHaveBeenCalledWith({});
    });

    it('APIエラーを適切に処理する', async () => {
      const apiError: ApiError = {
        code: 403,
        message: 'Forbidden',
        endpoint: '/projects.json',
        timestamp: '2024-01-01T00:00:00Z',
      };

      mockApiClient.getProjects.mockResolvedValue({
        ok: false,
        error: apiError,
      });

      const result = await projectTools.getProjects({});

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('api');
        expect(result.error.message).toBe('Forbidden');
      }
    });

    it('バリデーションエラーを返す', async () => {
      const result = await projectTools.getProjects({
        limit: 999,
      } as unknown as Record<string, unknown>);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('validation');
      }
    });
  });

  describe('getProject', () => {
    it('プロジェクト詳細を取得できる', async () => {
      mockApiClient.getProject.mockResolvedValue({
        ok: true,
        value: mockProject,
      });

      const result = await projectTools.getProject({ id: 1 });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe(1);
        expect(result.value.name).toBe('Test Project');
        expect(result.value.identifier).toBe('test-project');
      }
      expect(mockApiClient.getProject).toHaveBeenCalledWith(1);
    });

    it('404エラーを適切に処理する', async () => {
      const apiError: ApiError = {
        code: 404,
        message: 'Project not found',
        endpoint: '/projects/999.json',
        timestamp: '2024-01-01T00:00:00Z',
      };

      mockApiClient.getProject.mockResolvedValue({
        ok: false,
        error: apiError,
      });

      const result = await projectTools.getProject({ id: 999 });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('api');
        expect(result.error.message).toBe('Project not found');
        expect(result.error.details).toEqual({ code: 404 });
      }
    });

    it('バリデーションエラーを返す', async () => {
      const result = await projectTools.getProject({ id: -1 });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('validation');
      }
    });
  });

  describe('getToolDefinitions', () => {
    it('ツール定義を返す', () => {
      const definitions = projectTools.getToolDefinitions();

      expect(definitions).toHaveLength(2);

      const getProjectsDef = definitions.find((d) => d.name === 'get_projects');
      expect(getProjectsDef).toBeDefined();
      expect(getProjectsDef?.description).toContain('project');

      const getProjectDef = definitions.find((d) => d.name === 'get_project');
      expect(getProjectDef).toBeDefined();
      expect(getProjectDef?.description).toContain('project');
    });

    it('JSON Schema形式のパラメータ定義を含む', () => {
      const definitions = projectTools.getToolDefinitions();

      const getProjectsDef = definitions.find((d) => d.name === 'get_projects');
      expect(getProjectsDef?.inputSchema).toBeDefined();
      expect(getProjectsDef?.inputSchema.type).toBe('object');
    });
  });
});
