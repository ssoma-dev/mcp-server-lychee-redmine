import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IssueTools } from './issue-tools.js';
import type { RedmineAPIClient } from '../redmine/api-client.js';
import type { Issue, IssuesResponse, ApiError } from '../redmine/types.js';

describe('IssueTools', () => {
  let issueTools: IssueTools;
  let mockApiClient: jest.Mocked<RedmineAPIClient>;

  const mockIssue: Issue = {
    id: 1,
    project: { id: 10, name: 'Test Project' },
    tracker: { id: 1, name: 'Bug' },
    status: { id: 1, name: 'New' },
    priority: { id: 2, name: 'Normal' },
    author: { id: 5, name: 'John Doe' },
    subject: 'Test Issue',
    description: 'Test description',
    done_ratio: 0,
    created_on: '2024-01-01T00:00:00Z',
    updated_on: '2024-01-02T00:00:00Z',
  };

  const mockIssuesResponse: IssuesResponse = {
    data: [mockIssue],
    total_count: 1,
    limit: 25,
    offset: 0,
  };

  beforeEach(() => {
    mockApiClient = {
      searchIssues: vi.fn(),
      createIssue: vi.fn(),
      updateIssue: vi.fn(),
    } as unknown as jest.Mocked<RedmineAPIClient>;

    issueTools = new IssueTools(mockApiClient);
  });

  describe('searchIssuesParamsSchema', () => {
    it('スキーマが正しく定義されている', () => {
      const schema = issueTools.searchIssuesParamsSchema;
      expect(schema).toBeDefined();

      // 有効なパラメータを検証
      const validResult = schema.safeParse({
        project_id: 1,
        status_id: 'open',
        limit: 25,
        offset: 0,
      });
      expect(validResult.success).toBe(true);

      // 空のパラメータも有効
      const emptyResult = schema.safeParse({});
      expect(emptyResult.success).toBe(true);
    });

    it('status_idはopenまたはclosedまたは数値', () => {
      const schema = issueTools.searchIssuesParamsSchema;

      const open = schema.safeParse({ status_id: 'open' });
      expect(open.success).toBe(true);

      const closed = schema.safeParse({ status_id: 'closed' });
      expect(closed.success).toBe(true);

      const numeric = schema.safeParse({ status_id: 1 });
      expect(numeric.success).toBe(true);

      const invalid = schema.safeParse({ status_id: 'invalid' });
      expect(invalid.success).toBe(false);
    });

    it('queryはオプションの文字列', () => {
      const schema = issueTools.searchIssuesParamsSchema;

      const withQuery = schema.safeParse({ query: 'search text' });
      expect(withQuery.success).toBe(true);
    });
  });

  describe('createIssueParamsSchema', () => {
    it('必須パラメータを検証する', () => {
      const schema = issueTools.createIssueParamsSchema;

      // project_idとsubjectは必須
      const missing = schema.safeParse({});
      expect(missing.success).toBe(false);

      const onlyProjectId = schema.safeParse({ project_id: 1 });
      expect(onlyProjectId.success).toBe(false);

      const valid = schema.safeParse({ project_id: 1, subject: 'Test' });
      expect(valid.success).toBe(true);
    });

    it('subjectの長さを検証する', () => {
      const schema = issueTools.createIssueParamsSchema;

      // 空文字は無効
      const empty = schema.safeParse({ project_id: 1, subject: '' });
      expect(empty.success).toBe(false);

      // 255文字を超える場合は無効
      const tooLong = schema.safeParse({
        project_id: 1,
        subject: 'a'.repeat(256),
      });
      expect(tooLong.success).toBe(false);

      // 255文字以内は有効
      const maxLength = schema.safeParse({
        project_id: 1,
        subject: 'a'.repeat(255),
      });
      expect(maxLength.success).toBe(true);
    });

    it('due_dateはYYYY-MM-DD形式', () => {
      const schema = issueTools.createIssueParamsSchema;

      const validDate = schema.safeParse({
        project_id: 1,
        subject: 'Test',
        due_date: '2024-12-31',
      });
      expect(validDate.success).toBe(true);

      const invalidDate = schema.safeParse({
        project_id: 1,
        subject: 'Test',
        due_date: '12/31/2024',
      });
      expect(invalidDate.success).toBe(false);
    });

    it('オプショナルパラメータを検証する', () => {
      const schema = issueTools.createIssueParamsSchema;

      const withOptions = schema.safeParse({
        project_id: 1,
        subject: 'Test Issue',
        description: 'A detailed description',
        priority_id: 3,
        assigned_to_id: 5,
        due_date: '2024-12-31',
      });
      expect(withOptions.success).toBe(true);
    });
  });

  describe('updateIssueParamsSchema', () => {
    it('idは必須', () => {
      const schema = issueTools.updateIssueParamsSchema;

      const missing = schema.safeParse({});
      expect(missing.success).toBe(false);

      const valid = schema.safeParse({ id: 1 });
      expect(valid.success).toBe(true);
    });

    it('部分更新をサポートする', () => {
      const schema = issueTools.updateIssueParamsSchema;

      // subjectのみ更新
      const subjectOnly = schema.safeParse({
        id: 1,
        subject: 'Updated subject',
      });
      expect(subjectOnly.success).toBe(true);

      // status_idのみ更新
      const statusOnly = schema.safeParse({
        id: 1,
        status_id: 5,
      });
      expect(statusOnly.success).toBe(true);

      // 複数フィールド更新
      const multiple = schema.safeParse({
        id: 1,
        subject: 'Updated',
        status_id: 5,
        priority_id: 3,
      });
      expect(multiple.success).toBe(true);
    });
  });

  describe('searchIssues', () => {
    it('チケット一覧を検索できる', async () => {
      mockApiClient.searchIssues.mockResolvedValue({
        ok: true,
        value: mockIssuesResponse,
      });

      const result = await issueTools.searchIssues({
        project_id: 10,
        status_id: 'open',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toHaveLength(1);
        expect(result.value.data[0]?.subject).toBe('Test Issue');
      }
      expect(mockApiClient.searchIssues).toHaveBeenCalledWith({
        project_id: 10,
        status_id: 'open',
      });
    });

    it('空のパラメータで全チケットを検索できる', async () => {
      mockApiClient.searchIssues.mockResolvedValue({
        ok: true,
        value: mockIssuesResponse,
      });

      const result = await issueTools.searchIssues({});

      expect(result.ok).toBe(true);
      expect(mockApiClient.searchIssues).toHaveBeenCalledWith({});
    });

    it('APIエラーを適切に処理する', async () => {
      const apiError: ApiError = {
        code: 403,
        message: 'Forbidden',
        endpoint: '/issues.json',
        timestamp: '2024-01-01T00:00:00Z',
      };

      mockApiClient.searchIssues.mockResolvedValue({
        ok: false,
        error: apiError,
      });

      const result = await issueTools.searchIssues({});

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('api');
        expect(result.error.message).toBe('Forbidden');
      }
    });
  });

  describe('createIssue', () => {
    it('チケットを作成できる', async () => {
      mockApiClient.createIssue.mockResolvedValue({
        ok: true,
        value: mockIssue,
      });

      const result = await issueTools.createIssue({
        project_id: 10,
        subject: 'New Issue',
        description: 'Description',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe(1);
        expect(result.value.subject).toBe('Test Issue');
      }
      expect(mockApiClient.createIssue).toHaveBeenCalledWith({
        project_id: 10,
        subject: 'New Issue',
        description: 'Description',
      });
    });

    it('必須パラメータがない場合はバリデーションエラー', async () => {
      const result = await issueTools.createIssue({ project_id: 10 });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('validation');
      }
    });

    it('422エラーを適切に処理する', async () => {
      const apiError: ApiError = {
        code: 422,
        message: 'Validation failed',
        endpoint: '/issues.json',
        timestamp: '2024-01-01T00:00:00Z',
      };

      mockApiClient.createIssue.mockResolvedValue({
        ok: false,
        error: apiError,
      });

      const result = await issueTools.createIssue({
        project_id: 10,
        subject: 'Test',
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('api');
        expect(result.error.details).toEqual({ code: 422 });
      }
    });
  });

  describe('updateIssue', () => {
    it('チケットを更新できる', async () => {
      const updatedIssue = { ...mockIssue, subject: 'Updated Issue' };
      mockApiClient.updateIssue.mockResolvedValue({
        ok: true,
        value: updatedIssue,
      });

      const result = await issueTools.updateIssue({
        id: 1,
        subject: 'Updated Issue',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.subject).toBe('Updated Issue');
      }
      expect(mockApiClient.updateIssue).toHaveBeenCalledWith(1, {
        subject: 'Updated Issue',
      });
    });

    it('404エラーを適切に処理する', async () => {
      const apiError: ApiError = {
        code: 404,
        message: 'Issue not found',
        endpoint: '/issues/999.json',
        timestamp: '2024-01-01T00:00:00Z',
      };

      mockApiClient.updateIssue.mockResolvedValue({
        ok: false,
        error: apiError,
      });

      const result = await issueTools.updateIssue({
        id: 999,
        subject: 'Updated',
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('api');
        expect(result.error.message).toBe('Issue not found');
      }
    });

    it('409 Conflictエラーを適切に処理する', async () => {
      const apiError: ApiError = {
        code: 409,
        message: 'Conflict detected',
        endpoint: '/issues/1.json',
        timestamp: '2024-01-01T00:00:00Z',
      };

      mockApiClient.updateIssue.mockResolvedValue({
        ok: false,
        error: apiError,
      });

      const result = await issueTools.updateIssue({
        id: 1,
        status_id: 5,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('api');
        expect(result.error.details).toEqual({ code: 409 });
      }
    });
  });

  describe('getToolDefinitions', () => {
    it('3つのツール定義を返す', () => {
      const definitions = issueTools.getToolDefinitions();

      expect(definitions).toHaveLength(3);

      const searchDef = definitions.find((d) => d.name === 'search_issues');
      expect(searchDef).toBeDefined();

      const createDef = definitions.find((d) => d.name === 'create_issue');
      expect(createDef).toBeDefined();

      const updateDef = definitions.find((d) => d.name === 'update_issue');
      expect(updateDef).toBeDefined();
    });

    it('JSON Schema形式のパラメータ定義を含む', () => {
      const definitions = issueTools.getToolDefinitions();

      for (const def of definitions) {
        expect(def.inputSchema).toBeDefined();
        expect(def.inputSchema.type).toBe('object');
      }
    });
  });
});
