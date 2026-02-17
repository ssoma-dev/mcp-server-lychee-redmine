import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserTools } from './user-tools.js';
import type { RedmineAPIClient } from '../redmine/api-client.js';
import type {
  User,
  Member,
  UsersResponse,
  MembersResponse,
  ApiError,
} from '../redmine/types.js';

describe('UserTools', () => {
  let userTools: UserTools;
  let mockApiClient: jest.Mocked<RedmineAPIClient>;

  const mockUser: User = {
    id: 1,
    login: 'jdoe',
    firstname: 'John',
    lastname: 'Doe',
    mail: 'john.doe@example.com',
    created_on: '2024-01-01T00:00:00Z',
    status: 1,
  };

  const mockUsersResponse: UsersResponse = {
    data: [mockUser],
    total_count: 1,
    limit: 25,
    offset: 0,
  };

  const mockMember: Member = {
    id: 10,
    project: { id: 5, name: 'Test Project' },
    user: { id: 1, name: 'John Doe' },
    roles: [{ id: 3, name: 'Developer' }],
  };

  const mockMembersResponse: MembersResponse = {
    data: [mockMember],
    total_count: 1,
    limit: 25,
    offset: 0,
  };

  beforeEach(() => {
    mockApiClient = {
      getUsers: vi.fn(),
      getProjectMembers: vi.fn(),
    } as unknown as jest.Mocked<RedmineAPIClient>;

    userTools = new UserTools(mockApiClient);
  });

  // ============================================================================
  // スキーマバリデーションテスト
  // ============================================================================

  describe('getUsersParamsSchema', () => {
    it('スキーマが正しく定義されている', () => {
      const schema = userTools.getUsersParamsSchema;
      expect(schema).toBeDefined();

      // 空のパラメータも有効
      const emptyResult = schema.safeParse({});
      expect(emptyResult.success).toBe(true);
    });

    it('statusはactive/locked/allのいずれか', () => {
      const schema = userTools.getUsersParamsSchema;

      const active = schema.safeParse({ status: 'active' });
      expect(active.success).toBe(true);

      const locked = schema.safeParse({ status: 'locked' });
      expect(locked.success).toBe(true);

      const all = schema.safeParse({ status: 'all' });
      expect(all.success).toBe(true);

      const invalid = schema.safeParse({ status: 'invalid' });
      expect(invalid.success).toBe(false);
    });

    it('ページネーションパラメータを受け付ける', () => {
      const schema = userTools.getUsersParamsSchema;

      const withPagination = schema.safeParse({ limit: 50, offset: 10 });
      expect(withPagination.success).toBe(true);

      // limitは1〜100の範囲
      const limitTooLow = schema.safeParse({ limit: 0 });
      expect(limitTooLow.success).toBe(false);

      const limitTooHigh = schema.safeParse({ limit: 101 });
      expect(limitTooHigh.success).toBe(false);
    });

    it('すべてのパラメータを組み合わせて使用できる', () => {
      const schema = userTools.getUsersParamsSchema;

      const combined = schema.safeParse({
        status: 'active',
        limit: 25,
        offset: 0,
      });
      expect(combined.success).toBe(true);
    });
  });

  describe('getProjectMembersParamsSchema', () => {
    it('project_idは必須', () => {
      const schema = userTools.getProjectMembersParamsSchema;

      // project_idがない場合はエラー
      const missing = schema.safeParse({});
      expect(missing.success).toBe(false);

      // project_idがある場合は有効
      const valid = schema.safeParse({ project_id: 5 });
      expect(valid.success).toBe(true);
    });

    it('project_idは正の整数', () => {
      const schema = userTools.getProjectMembersParamsSchema;

      const negative = schema.safeParse({ project_id: -1 });
      expect(negative.success).toBe(false);

      const zero = schema.safeParse({ project_id: 0 });
      expect(zero.success).toBe(false);

      const valid = schema.safeParse({ project_id: 1 });
      expect(valid.success).toBe(true);
    });

    it('ページネーションパラメータを受け付ける', () => {
      const schema = userTools.getProjectMembersParamsSchema;

      const withPagination = schema.safeParse({
        project_id: 5,
        limit: 25,
        offset: 0,
      });
      expect(withPagination.success).toBe(true);
    });
  });

  // ============================================================================
  // getUsersメソッドのテスト
  // ============================================================================

  describe('getUsers', () => {
    it('ユーザー一覧を取得できる', async () => {
      mockApiClient.getUsers.mockResolvedValue({
        ok: true,
        value: mockUsersResponse,
      });

      const result = await userTools.getUsers({});

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toHaveLength(1);
        expect(result.value.data[0]?.login).toBe('jdoe');
        expect(result.value.total_count).toBe(1);
      }
      expect(mockApiClient.getUsers).toHaveBeenCalledWith({});
    });

    it('statusフィルターを使用してユーザーを取得できる', async () => {
      mockApiClient.getUsers.mockResolvedValue({
        ok: true,
        value: mockUsersResponse,
      });

      const result = await userTools.getUsers({ status: 'active' });

      expect(result.ok).toBe(true);
      expect(mockApiClient.getUsers).toHaveBeenCalledWith({ status: 'active' });
    });

    it('ページネーションパラメータを渡せる', async () => {
      mockApiClient.getUsers.mockResolvedValue({
        ok: true,
        value: { ...mockUsersResponse, limit: 50, offset: 10 },
      });

      const result = await userTools.getUsers({ limit: 50, offset: 10 });

      expect(result.ok).toBe(true);
      expect(mockApiClient.getUsers).toHaveBeenCalledWith({
        limit: 50,
        offset: 10,
      });
    });

    it('無効なパラメータはバリデーションエラーを返す', async () => {
      const result = await userTools.getUsers({ status: 'invalid_status' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('validation');
        expect(result.error.message).toBe('Invalid parameters');
      }
      // APIは呼ばれない
      expect(mockApiClient.getUsers).not.toHaveBeenCalled();
    });

    it('APIエラーを適切に処理する', async () => {
      const apiError: ApiError = {
        code: 403,
        message: 'Forbidden: insufficient permissions',
        endpoint: '/users.json',
        timestamp: '2024-01-01T00:00:00Z',
      };

      mockApiClient.getUsers.mockResolvedValue({
        ok: false,
        error: apiError,
      });

      const result = await userTools.getUsers({});

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('api');
        expect(result.error.message).toBe(
          'Forbidden: insufficient permissions'
        );
        expect(result.error.details).toEqual({ code: 403 });
      }
    });

    it('401 Unauthorizedエラーを適切に処理する', async () => {
      const apiError: ApiError = {
        code: 401,
        message: 'Unauthorized',
        endpoint: '/users.json',
        timestamp: '2024-01-01T00:00:00Z',
      };

      mockApiClient.getUsers.mockResolvedValue({
        ok: false,
        error: apiError,
      });

      const result = await userTools.getUsers({});

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('api');
        expect(result.error.details).toEqual({ code: 401 });
      }
    });
  });

  // ============================================================================
  // getProjectMembersメソッドのテスト
  // ============================================================================

  describe('getProjectMembers', () => {
    it('プロジェクトメンバー一覧を取得できる', async () => {
      mockApiClient.getProjectMembers.mockResolvedValue({
        ok: true,
        value: mockMembersResponse,
      });

      const result = await userTools.getProjectMembers({ project_id: 5 });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toHaveLength(1);
        expect(result.value.data[0]?.user?.name).toBe('John Doe');
        expect(result.value.data[0]?.roles).toHaveLength(1);
        expect(result.value.data[0]?.roles[0]?.name).toBe('Developer');
      }
      expect(mockApiClient.getProjectMembers).toHaveBeenCalledWith({
        project_id: 5,
      });
    });

    it('ページネーションパラメータを渡せる', async () => {
      mockApiClient.getProjectMembers.mockResolvedValue({
        ok: true,
        value: mockMembersResponse,
      });

      const result = await userTools.getProjectMembers({
        project_id: 5,
        limit: 50,
        offset: 0,
      });

      expect(result.ok).toBe(true);
      expect(mockApiClient.getProjectMembers).toHaveBeenCalledWith({
        project_id: 5,
        limit: 50,
        offset: 0,
      });
    });

    it('project_idがない場合はバリデーションエラー', async () => {
      const result = await userTools.getProjectMembers({});

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('validation');
        expect(result.error.message).toBe('Invalid parameters');
      }
      // APIは呼ばれない
      expect(mockApiClient.getProjectMembers).not.toHaveBeenCalled();
    });

    it('404エラーを適切に処理する（プロジェクトが存在しない）', async () => {
      const apiError: ApiError = {
        code: 404,
        message: 'Project not found',
        endpoint: '/projects/999/memberships.json',
        timestamp: '2024-01-01T00:00:00Z',
      };

      mockApiClient.getProjectMembers.mockResolvedValue({
        ok: false,
        error: apiError,
      });

      const result = await userTools.getProjectMembers({ project_id: 999 });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('api');
        expect(result.error.message).toBe('Project not found');
        expect(result.error.details).toEqual({ code: 404 });
      }
    });

    it('グループメンバーシップも取得できる', async () => {
      const groupMember: Member = {
        id: 20,
        project: { id: 5, name: 'Test Project' },
        group: { id: 10, name: 'Dev Team' },
        roles: [{ id: 3, name: 'Developer' }],
      };

      mockApiClient.getProjectMembers.mockResolvedValue({
        ok: true,
        value: {
          data: [groupMember],
          total_count: 1,
          limit: 25,
          offset: 0,
        },
      });

      const result = await userTools.getProjectMembers({ project_id: 5 });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data[0]?.group?.name).toBe('Dev Team');
        expect(result.value.data[0]?.user).toBeUndefined();
      }
    });
  });

  // ============================================================================
  // getToolDefinitionsのテスト
  // ============================================================================

  describe('getToolDefinitions', () => {
    it('2つのツール定義を返す', () => {
      const definitions = userTools.getToolDefinitions();

      expect(definitions).toHaveLength(2);

      const getUsersDef = definitions.find((d) => d.name === 'get_users');
      expect(getUsersDef).toBeDefined();

      const getMembersDef = definitions.find(
        (d) => d.name === 'get_project_members'
      );
      expect(getMembersDef).toBeDefined();
    });

    it('get_usersツールの説明とスキーマが正しい', () => {
      const definitions = userTools.getToolDefinitions();
      const getUsersDef = definitions.find((d) => d.name === 'get_users');

      expect(getUsersDef).toBeDefined();
      expect(getUsersDef?.description).toBeTruthy();
      expect(getUsersDef?.inputSchema).toBeDefined();
      expect(getUsersDef?.inputSchema.type).toBe('object');
    });

    it('get_project_membersツールの説明とスキーマが正しい', () => {
      const definitions = userTools.getToolDefinitions();
      const getMembersDef = definitions.find(
        (d) => d.name === 'get_project_members'
      );

      expect(getMembersDef).toBeDefined();
      expect(getMembersDef?.description).toBeTruthy();
      expect(getMembersDef?.inputSchema).toBeDefined();
      expect(getMembersDef?.inputSchema.type).toBe('object');
    });

    it('JSON Schema形式のパラメータ定義を含む', () => {
      const definitions = userTools.getToolDefinitions();

      for (const def of definitions) {
        expect(def.inputSchema).toBeDefined();
        expect(def.inputSchema.type).toBe('object');
        expect(def.inputSchema.properties).toBeDefined();
      }
    });
  });
});
