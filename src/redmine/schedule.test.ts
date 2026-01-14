import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RedmineAPIClient } from './api-client.js';
import { RetryHandler } from '../utils/retry-handler.js';
import type { AxiosInstance } from 'axios';
import axios from 'axios';

vi.mock('axios');

describe('RedmineAPIClient - getSchedule', () => {
  let client: RedmineAPIClient;
  let mockAxiosInstance: AxiosInstance;
  let retryHandler: RetryHandler;

  beforeEach(() => {
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

  describe('getSchedule', () => {
    it('IssuesとMilestonesを集約してSchedule型を構築できる', async () => {
      // Mock Issues response
      const mockIssuesResponse = {
        data: {
          issues: [
            {
              id: 1,
              project: { id: 10, name: 'Test Project' },
              tracker: { id: 1, name: 'Bug' },
              status: { id: 1, name: 'New' },
              priority: { id: 2, name: 'Normal' },
              author: { id: 5, name: 'John Doe' },
              subject: 'Issue 1',
              start_date: '2024-01-01',
              due_date: '2024-01-10',
              done_ratio: 50,
              created_on: '2024-01-01T00:00:00Z',
              updated_on: '2024-01-02T00:00:00Z',
            },
            {
              id: 2,
              project: { id: 10, name: 'Test Project' },
              tracker: { id: 1, name: 'Feature' },
              status: { id: 3, name: 'Closed' },
              priority: { id: 2, name: 'Normal' },
              author: { id: 5, name: 'John Doe' },
              subject: 'Issue 2',
              start_date: '2024-01-05',
              due_date: '2024-01-15',
              done_ratio: 100,
              created_on: '2024-01-01T00:00:00Z',
              updated_on: '2024-01-02T00:00:00Z',
            },
          ],
          total_count: 2,
          limit: 25,
          offset: 0,
        },
      };

      // Mock Milestones response
      const mockMilestonesResponse = {
        data: {
          milestones: [
            {
              id: 1,
              name: 'Version 1.0',
              start_date: '2024-01-01',
              due_date: '2024-01-20',
              status: 'open',
              completed_percent: 60,
            },
          ],
          total_count: 1,
        },
      };

      vi.mocked(mockAxiosInstance.get)
        .mockResolvedValueOnce(mockIssuesResponse)
        .mockResolvedValueOnce(mockMilestonesResponse);

      const result = await client.getSchedule(10);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.project_id).toBe(10);
        expect(result.value.start_date).toBe('2024-01-01');
        expect(result.value.end_date).toBe('2024-01-20');
        expect(result.value.total_issues).toBe(2);
        expect(result.value.completed_issues).toBe(1);
        expect(result.value.milestones).toHaveLength(1);
        expect(result.value.milestones[0]?.name).toBe('Version 1.0');
      }
    });

    it('進捗率を加重平均で計算できる', async () => {
      const mockIssuesResponse = {
        data: {
          issues: [
            {
              id: 1,
              project: { id: 10, name: 'Test Project' },
              tracker: { id: 1, name: 'Bug' },
              status: { id: 1, name: 'New' },
              priority: { id: 2, name: 'Normal' },
              author: { id: 5, name: 'John Doe' },
              subject: 'Issue 1',
              done_ratio: 50,
              created_on: '2024-01-01T00:00:00Z',
              updated_on: '2024-01-02T00:00:00Z',
            },
            {
              id: 2,
              project: { id: 10, name: 'Test Project' },
              tracker: { id: 1, name: 'Feature' },
              status: { id: 3, name: 'Closed' },
              priority: { id: 2, name: 'Normal' },
              author: { id: 5, name: 'John Doe' },
              subject: 'Issue 2',
              done_ratio: 100,
              created_on: '2024-01-01T00:00:00Z',
              updated_on: '2024-01-02T00:00:00Z',
            },
          ],
          total_count: 2,
          limit: 25,
          offset: 0,
        },
      };

      const mockMilestonesResponse = {
        data: {
          milestones: [],
          total_count: 0,
        },
      };

      vi.mocked(mockAxiosInstance.get)
        .mockResolvedValueOnce(mockIssuesResponse)
        .mockResolvedValueOnce(mockMilestonesResponse);

      const result = await client.getSchedule(10);

      expect(result.ok).toBe(true);
      if (result.ok) {
        // (50 + 100) / 2 = 75
        expect(result.value.progress).toBe(75);
      }
    });

    it('Issuesが存在しない場合でもScheduleを構築できる', async () => {
      const mockIssuesResponse = {
        data: {
          issues: [],
          total_count: 0,
          limit: 25,
          offset: 0,
        },
      };

      const mockMilestonesResponse = {
        data: {
          milestones: [
            {
              id: 1,
              name: 'Version 1.0',
              start_date: '2024-01-01',
              due_date: '2024-01-20',
              status: 'open',
              completed_percent: 0,
            },
          ],
          total_count: 1,
        },
      };

      vi.mocked(mockAxiosInstance.get)
        .mockResolvedValueOnce(mockIssuesResponse)
        .mockResolvedValueOnce(mockMilestonesResponse);

      const result = await client.getSchedule(10);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.project_id).toBe(10);
        expect(result.value.total_issues).toBe(0);
        expect(result.value.completed_issues).toBe(0);
        expect(result.value.progress).toBe(0);
        expect(result.value.milestones).toHaveLength(1);
      }
    });

    it('API呼び出しエラーを適切に処理する', async () => {
      vi.mocked(mockAxiosInstance.get).mockRejectedValue({
        response: {
          status: 404,
          data: { error: 'Project not found' },
        },
      });

      const result = await client.getSchedule(999);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe(404);
        expect(result.error.message).toBe('Project not found');
      }
    });

    it('完了したチケット数を正しくカウントできる', async () => {
      const mockIssuesResponse = {
        data: {
          issues: [
            {
              id: 1,
              project: { id: 10, name: 'Test Project' },
              tracker: { id: 1, name: 'Bug' },
              status: { id: 5, name: 'Closed' },
              priority: { id: 2, name: 'Normal' },
              author: { id: 5, name: 'John Doe' },
              subject: 'Issue 1',
              done_ratio: 100,
              created_on: '2024-01-01T00:00:00Z',
              updated_on: '2024-01-02T00:00:00Z',
            },
            {
              id: 2,
              project: { id: 10, name: 'Test Project' },
              tracker: { id: 1, name: 'Feature' },
              status: { id: 1, name: 'New' },
              priority: { id: 2, name: 'Normal' },
              author: { id: 5, name: 'John Doe' },
              subject: 'Issue 2',
              done_ratio: 30,
              created_on: '2024-01-01T00:00:00Z',
              updated_on: '2024-01-02T00:00:00Z',
            },
            {
              id: 3,
              project: { id: 10, name: 'Test Project' },
              tracker: { id: 1, name: 'Task' },
              status: { id: 5, name: 'Closed' },
              priority: { id: 2, name: 'Normal' },
              author: { id: 5, name: 'John Doe' },
              subject: 'Issue 3',
              done_ratio: 100,
              created_on: '2024-01-01T00:00:00Z',
              updated_on: '2024-01-02T00:00:00Z',
            },
          ],
          total_count: 3,
          limit: 25,
          offset: 0,
        },
      };

      const mockMilestonesResponse = {
        data: {
          milestones: [],
          total_count: 0,
        },
      };

      vi.mocked(mockAxiosInstance.get)
        .mockResolvedValueOnce(mockIssuesResponse)
        .mockResolvedValueOnce(mockMilestonesResponse);

      const result = await client.getSchedule(10);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.total_issues).toBe(3);
        expect(result.value.completed_issues).toBe(2); // done_ratio === 100
      }
    });

    it('依存関係情報を空配列で初期化する', async () => {
      const mockIssuesResponse = {
        data: {
          issues: [],
          total_count: 0,
          limit: 25,
          offset: 0,
        },
      };

      const mockMilestonesResponse = {
        data: {
          milestones: [],
          total_count: 0,
        },
      };

      vi.mocked(mockAxiosInstance.get)
        .mockResolvedValueOnce(mockIssuesResponse)
        .mockResolvedValueOnce(mockMilestonesResponse);

      const result = await client.getSchedule(10);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.dependencies).toEqual([]);
      }
    });
  });
});
