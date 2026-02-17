import { describe, it, expect } from 'vitest';
import {
  ProjectSchema,
  IssueSchema,
  UserSchema,
  MemberSchema,
  MilestoneSchema,
  ScheduleSchema,
  PaginatedResponseSchema,
  ApiErrorSchema,
} from './types.js';

describe('Redmine Type Schemas', () => {
  describe('ProjectSchema', () => {
    it('有効なProjectをバリデーション成功する', () => {
      const validProject = {
        id: 1,
        name: 'Test Project',
        identifier: 'test-project',
        description: 'A test project',
        status: 1,
        is_public: true,
        created_on: '2024-01-01T00:00:00Z',
        updated_on: '2024-01-02T00:00:00Z',
      };

      const result = ProjectSchema.safeParse(validProject);
      expect(result.success).toBe(true);
    });

    it('descriptionがオプショナルである', () => {
      const projectWithoutDescription = {
        id: 1,
        name: 'Test Project',
        identifier: 'test-project',
        status: 1,
        is_public: true,
        created_on: '2024-01-01T00:00:00Z',
        updated_on: '2024-01-02T00:00:00Z',
      };

      const result = ProjectSchema.safeParse(projectWithoutDescription);
      expect(result.success).toBe(true);
    });

    it('statusが不正な値の場合は失敗する', () => {
      const invalidProject = {
        id: 1,
        name: 'Test Project',
        identifier: 'test-project',
        status: 99, // 不正な値
        is_public: true,
        created_on: '2024-01-01T00:00:00Z',
        updated_on: '2024-01-02T00:00:00Z',
      };

      const result = ProjectSchema.safeParse(invalidProject);
      expect(result.success).toBe(false);
    });
  });

  describe('IssueSchema', () => {
    it('有効なIssueをバリデーション成功する', () => {
      const validIssue = {
        id: 100,
        project: { id: 1, name: 'Test Project' },
        tracker: { id: 1, name: 'Bug' },
        status: { id: 1, name: 'New' },
        priority: { id: 2, name: 'Normal' },
        author: { id: 5, name: 'John Doe' },
        subject: 'Test Issue',
        description: 'Issue description',
        done_ratio: 50,
        created_on: '2024-01-01T00:00:00Z',
        updated_on: '2024-01-02T00:00:00Z',
      };

      const result = IssueSchema.safeParse(validIssue);
      expect(result.success).toBe(true);
    });

    it('カスタムフィールドを含むIssueをバリデーション成功する', () => {
      const issueWithCustomFields = {
        id: 100,
        project: { id: 1, name: 'Test Project' },
        tracker: { id: 1, name: 'Bug' },
        status: { id: 1, name: 'New' },
        priority: { id: 2, name: 'Normal' },
        author: { id: 5, name: 'John Doe' },
        subject: 'Test Issue',
        done_ratio: 50,
        custom_fields: [
          { id: 1, name: 'Custom Field 1', value: 'text value' },
          { id: 2, name: 'Custom Field 2', value: 123 },
          { id: 3, name: 'Custom Field 3', value: true },
        ],
        created_on: '2024-01-01T00:00:00Z',
        updated_on: '2024-01-02T00:00:00Z',
      };

      const result = IssueSchema.safeParse(issueWithCustomFields);
      expect(result.success).toBe(true);
    });

    it('オプショナルフィールドが欠損していても成功する', () => {
      const minimalIssue = {
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
      };

      const result = IssueSchema.safeParse(minimalIssue);
      expect(result.success).toBe(true);
    });
  });

  describe('UserSchema', () => {
    it('有効なUserをバリデーション成功する', () => {
      const validUser = {
        id: 1,
        login: 'johndoe',
        firstname: 'John',
        lastname: 'Doe',
        mail: 'john.doe@example.com',
        created_on: '2024-01-01T00:00:00Z',
        status: 1,
      };

      const result = UserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
    });

    it('last_login_onがオプショナルである', () => {
      const userWithoutLastLogin = {
        id: 1,
        login: 'johndoe',
        firstname: 'John',
        lastname: 'Doe',
        mail: 'john.doe@example.com',
        created_on: '2024-01-01T00:00:00Z',
        status: 1,
      };

      const result = UserSchema.safeParse(userWithoutLastLogin);
      expect(result.success).toBe(true);
    });
  });

  describe('MemberSchema', () => {
    it('ユーザーメンバーをバリデーション成功する', () => {
      const validMember = {
        id: 1,
        project: { id: 1, name: 'Test Project' },
        user: { id: 5, name: 'John Doe' },
        roles: [
          { id: 1, name: 'Manager' },
          { id: 2, name: 'Developer' },
        ],
      };

      const result = MemberSchema.safeParse(validMember);
      expect(result.success).toBe(true);
    });

    it('グループメンバーをバリデーション成功する', () => {
      const groupMember = {
        id: 2,
        project: { id: 1, name: 'Test Project' },
        group: { id: 10, name: 'Developers Group' },
        roles: [{ id: 2, name: 'Developer' }],
      };

      const result = MemberSchema.safeParse(groupMember);
      expect(result.success).toBe(true);
    });
  });

  describe('MilestoneSchema', () => {
    it('有効なMilestoneをバリデーション成功する', () => {
      const validMilestone = {
        id: 1,
        name: 'Version 1.0',
        description: 'First release',
        start_date: '2024-01-01',
        due_date: '2024-12-31',
        status: 'open',
        completed_percent: 75,
        issues: [
          { id: 100, subject: 'Issue 1' },
          { id: 101, subject: 'Issue 2' },
        ],
      };

      const result = MilestoneSchema.safeParse(validMilestone);
      expect(result.success).toBe(true);
    });

    it('statusがopen/locked/closedのみを受け付ける', () => {
      const invalidMilestone = {
        id: 1,
        name: 'Version 1.0',
        start_date: '2024-01-01',
        due_date: '2024-12-31',
        status: 'invalid_status',
      };

      const result = MilestoneSchema.safeParse(invalidMilestone);
      expect(result.success).toBe(false);
    });
  });

  describe('ScheduleSchema', () => {
    it('有効なScheduleをバリデーション成功する', () => {
      const validSchedule = {
        project_id: 1,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        progress: 60,
        total_issues: 50,
        completed_issues: 30,
        milestones: [
          {
            id: 1,
            name: 'Version 1.0',
            start_date: '2024-01-01',
            due_date: '2024-06-30',
            status: 'open',
          },
        ],
        dependencies: [
          { issue_id: 100, depends_on: [101, 102] },
          { issue_id: 101, depends_on: [] },
        ],
        critical_path: [100, 101, 103],
      };

      const result = ScheduleSchema.safeParse(validSchedule);
      expect(result.success).toBe(true);
    });

    it('オプショナルフィールドが欠損していても成功する', () => {
      const minimalSchedule = {
        project_id: 1,
        progress: 0,
        total_issues: 0,
        completed_issues: 0,
        milestones: [],
        dependencies: [],
      };

      const result = ScheduleSchema.safeParse(minimalSchedule);
      expect(result.success).toBe(true);
    });
  });

  describe('PaginatedResponseSchema', () => {
    it('有効なPaginatedResponseをバリデーション成功する', () => {
      const validResponse = {
        data: [
          {
            id: 1,
            name: 'Project 1',
            identifier: 'project-1',
            status: 1,
            is_public: true,
            created_on: '2024-01-01T00:00:00Z',
            updated_on: '2024-01-02T00:00:00Z',
          },
          {
            id: 2,
            name: 'Project 2',
            identifier: 'project-2',
            status: 1,
            is_public: false,
            created_on: '2024-01-01T00:00:00Z',
            updated_on: '2024-01-02T00:00:00Z',
          },
        ],
        total_count: 100,
        limit: 25,
        offset: 0,
      };

      const ProjectsPaginatedSchema = PaginatedResponseSchema(ProjectSchema);
      const result = ProjectsPaginatedSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    it('limitとoffsetが正の整数でない場合は失敗する', () => {
      const invalidResponse = {
        data: [],
        total_count: 0,
        limit: -1,
        offset: -1,
      };

      const ProjectsPaginatedSchema = PaginatedResponseSchema(ProjectSchema);
      const result = ProjectsPaginatedSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });
  });

  describe('ApiErrorSchema', () => {
    it('有効なApiErrorをバリデーション成功する', () => {
      const validError = {
        code: 404,
        message: 'Not Found',
        endpoint: '/api/projects/999',
        timestamp: '2024-01-01T00:00:00Z',
        requestId: 'req-12345',
      };

      const result = ApiErrorSchema.safeParse(validError);
      expect(result.success).toBe(true);
    });

    it('requestIdがオプショナルである', () => {
      const errorWithoutRequestId = {
        code: 500,
        message: 'Internal Server Error',
        endpoint: '/api/issues',
        timestamp: '2024-01-01T00:00:00Z',
      };

      const result = ApiErrorSchema.safeParse(errorWithoutRequestId);
      expect(result.success).toBe(true);
    });
  });
});
