import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import type { AxiosInstance } from 'axios';
import { RedmineAPIClient } from './api-client.js';
import { RetryHandler } from '../utils/retry-handler.js';

// axiosをモック化
vi.mock('axios');

describe('RedmineAPIClient', () => {
  let client: RedmineAPIClient;
  let mockAxiosInstance: AxiosInstance;
  let retryHandler: RetryHandler;

  beforeEach(() => {
    // モックaxiosインスタンスを作成
    mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    } as unknown as AxiosInstance;

    vi.mocked(axios.create).mockReturnValue(mockAxiosInstance);

    retryHandler = new RetryHandler();
    client = new RedmineAPIClient(
      {
        url: 'https://redmine.example.com',
        apiKey: 'test-api-key',
      },
      retryHandler
    );
  });

  describe('初期化', () => {
    it('axiosインスタンスが正しく設定される', () => {
      expect(axios.create).toHaveBeenCalledWith({
        baseURL: 'https://redmine.example.com',
        timeout: 30000,
        headers: {
          'X-Redmine-API-Key': 'test-api-key',
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });
    });

    it('HTTPSでない場合はエラーを投げる', () => {
      expect(() => {
        new RedmineAPIClient(
          {
            url: 'http://redmine.example.com',
            apiKey: 'test-api-key',
          },
          retryHandler
        );
      }).toThrow('HTTPS');
    });
  });

  describe('getProjects', () => {
    it('プロジェクト一覧を取得できる', async () => {
      const mockResponse = {
        data: {
          projects: [
            {
              id: 1,
              name: 'Project 1',
              identifier: 'project-1',
              status: 1,
              is_public: true,
              created_on: '2024-01-01T00:00:00Z',
              updated_on: '2024-01-02T00:00:00Z',
            },
          ],
          total_count: 1,
          limit: 25,
          offset: 0,
        },
      };

      vi.mocked(mockAxiosInstance.get).mockResolvedValue(mockResponse);

      const result = await client.getProjects({});

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toHaveLength(1);
        expect(result.value.data[0]?.name).toBe('Project 1');
        expect(result.value.total_count).toBe(1);
      }
    });

    it('ページネーションパラメータを渡せる', async () => {
      const mockResponse = {
        data: {
          projects: [],
          total_count: 100,
          limit: 50,
          offset: 25,
        },
      };

      vi.mocked(mockAxiosInstance.get).mockResolvedValue(mockResponse);

      await client.getProjects({ limit: 50, offset: 25 });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/projects.json', {
        params: { limit: 50, offset: 25 },
      });
    });
  });

  describe('getProject', () => {
    it('特定のプロジェクトを取得できる', async () => {
      const mockResponse = {
        data: {
          project: {
            id: 1,
            name: 'Test Project',
            identifier: 'test-project',
            status: 1,
            is_public: true,
            created_on: '2024-01-01T00:00:00Z',
            updated_on: '2024-01-02T00:00:00Z',
          },
        },
      };

      vi.mocked(mockAxiosInstance.get).mockResolvedValue(mockResponse);

      const result = await client.getProject(1);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.name).toBe('Test Project');
      }
    });

    it('存在しないプロジェクトの場合は404エラーを返す', async () => {
      vi.mocked(mockAxiosInstance.get).mockRejectedValue({
        response: {
          status: 404,
          data: { error: 'Not Found' },
        },
      });

      const result = await client.getProject(999);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe(404);
      }
    });
  });

  describe('searchIssues', () => {
    it('チケットを検索できる', async () => {
      const mockResponse = {
        data: {
          issues: [
            {
              id: 100,
              project: { id: 1, name: 'Test Project' },
              tracker: { id: 1, name: 'Bug' },
              status: { id: 1, name: 'New' },
              priority: { id: 2, name: 'Normal' },
              author: { id: 5, name: 'John Doe' },
              subject: 'Test Issue',
              done_ratio: 0,
              created_on: '2024-01-01T00:00:00Z',
              updated_on: '2024-01-02T00:00:00Z',
            },
          ],
          total_count: 1,
          limit: 25,
          offset: 0,
        },
      };

      vi.mocked(mockAxiosInstance.get).mockResolvedValue(mockResponse);

      const result = await client.searchIssues({ project_id: 1 });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toHaveLength(1);
      }
    });
  });

  describe('createIssue', () => {
    it('チケットを作成できる', async () => {
      const mockResponse = {
        data: {
          issue: {
            id: 100,
            project: { id: 1, name: 'Test Project' },
            tracker: { id: 1, name: 'Bug' },
            status: { id: 1, name: 'New' },
            priority: { id: 2, name: 'Normal' },
            author: { id: 5, name: 'John Doe' },
            subject: 'New Issue',
            description: 'Issue description',
            done_ratio: 0,
            created_on: '2024-01-01T00:00:00Z',
            updated_on: '2024-01-02T00:00:00Z',
          },
        },
      };

      vi.mocked(mockAxiosInstance.post).mockResolvedValue(mockResponse);

      const result = await client.createIssue({
        project_id: 1,
        subject: 'New Issue',
        description: 'Issue description',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.subject).toBe('New Issue');
      }
    });
  });

  describe('updateIssue', () => {
    it('チケットを更新できる', async () => {
      const mockResponse = {
        data: {
          issue: {
            id: 100,
            project: { id: 1, name: 'Test Project' },
            tracker: { id: 1, name: 'Bug' },
            status: { id: 2, name: 'In Progress' },
            priority: { id: 2, name: 'Normal' },
            author: { id: 5, name: 'John Doe' },
            subject: 'Updated Issue',
            done_ratio: 50,
            created_on: '2024-01-01T00:00:00Z',
            updated_on: '2024-01-03T00:00:00Z',
          },
        },
      };

      vi.mocked(mockAxiosInstance.put).mockResolvedValue(mockResponse);

      const result = await client.updateIssue(100, {
        subject: 'Updated Issue',
        status_id: 2,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.subject).toBe('Updated Issue');
      }
    });
  });

  describe('getUsers', () => {
    it('ユーザー一覧を取得できる', async () => {
      const mockResponse = {
        data: {
          users: [
            {
              id: 1,
              login: 'johndoe',
              firstname: 'John',
              lastname: 'Doe',
              mail: 'john@example.com',
              created_on: '2024-01-01T00:00:00Z',
              status: 1,
            },
          ],
          total_count: 1,
          limit: 25,
          offset: 0,
        },
      };

      vi.mocked(mockAxiosInstance.get).mockResolvedValue(mockResponse);

      const result = await client.getUsers({});

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toHaveLength(1);
      }
    });
  });

  describe('getProjectMembers', () => {
    it('プロジェクトメンバーを取得できる', async () => {
      const mockResponse = {
        data: {
          memberships: [
            {
              id: 1,
              project: { id: 1, name: 'Test Project' },
              user: { id: 5, name: 'John Doe' },
              roles: [{ id: 1, name: 'Manager' }],
            },
          ],
          total_count: 1,
          limit: 25,
          offset: 0,
        },
      };

      vi.mocked(mockAxiosInstance.get).mockResolvedValue(mockResponse);

      const result = await client.getProjectMembers(1);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toHaveLength(1);
      }
    });
  });

  describe('getMilestones', () => {
    it('マイルストーン一覧を取得できる（Lychee固有）', async () => {
      const mockResponse = {
        data: {
          milestones: [
            {
              id: 1,
              name: 'Version 1.0',
              start_date: '2024-01-01',
              due_date: '2024-12-31',
              status: 'open',
            },
          ],
          total_count: 1,
        },
      };

      vi.mocked(mockAxiosInstance.get).mockResolvedValue(mockResponse);

      const result = await client.getMilestones(1);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.milestones).toHaveLength(1);
      }
    });
  });

  describe('エラーハンドリング', () => {
    it('ネットワークエラーをApiErrorに変換する', async () => {
      vi.mocked(mockAxiosInstance.get).mockRejectedValue(
        new Error('Network Error')
      );

      const result = await client.getProjects({});

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('Network Error');
      }
    });

    it('認証エラー（401）を正しく処理する', async () => {
      vi.mocked(mockAxiosInstance.get).mockRejectedValue({
        response: {
          status: 401,
          data: { error: 'Unauthorized' },
        },
      });

      const result = await client.getProjects({});

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe(401);
      }
    });
  });
});
