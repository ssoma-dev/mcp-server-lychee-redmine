import { z } from 'zod';

/**
 * Redmine/Lychee Redmine APIの型定義とバリデーションスキーマ
 */

// ============================================================================
// Common Types
// ============================================================================

/**
 * Result型 - 成功または失敗を表す
 */
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

/**
 * ページネーションパラメータ
 */
export interface PaginationParams {
  limit?: number; // default: 25
  offset?: number; // default: 0
}

export const PaginationParamsSchema = z.object({
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

/**
 * ページネーションレスポンス
 */
export interface PaginatedResponse<T> {
  data: T[];
  total_count: number;
  limit: number;
  offset: number;
}

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(
  itemSchema: T
): z.ZodObject<{
  data: z.ZodArray<T>;
  total_count: z.ZodNumber;
  limit: z.ZodNumber;
  offset: z.ZodNumber;
}> =>
  z.object({
    data: z.array(itemSchema),
    total_count: z.number().int().min(0),
    limit: z.number().int().min(1),
    offset: z.number().int().min(0),
  });

/**
 * APIエラー
 */
export interface ApiError {
  code: number;
  message: string;
  endpoint: string;
  timestamp: string;
  requestId?: string;
}

export const ApiErrorSchema = z.object({
  code: z.number().int(),
  message: z.string(),
  endpoint: z.string(),
  timestamp: z.string(),
  requestId: z.string().optional(),
});

// ============================================================================
// Redmine Entities
// ============================================================================

/**
 * プロジェクト
 */
export interface Project {
  id: number;
  name: string;
  identifier: string; // unique project key
  description?: string;
  status: 1 | 5 | 9; // 1: active, 5: closed, 9: archived
  is_public: boolean;
  created_on: string; // ISO 8601
  updated_on: string; // ISO 8601
}

export const ProjectSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  identifier: z.string().min(1),
  description: z.string().optional(),
  status: z.union([z.literal(1), z.literal(5), z.literal(9)]),
  is_public: z.boolean(),
  created_on: z.string(),
  updated_on: z.string(),
});

/**
 * チケット
 */
export interface Issue {
  id: number;
  project: { id: number; name: string };
  tracker: { id: number; name: string };
  status: { id: number; name: string };
  priority: { id: number; name: string };
  author: { id: number; name: string };
  assigned_to?: { id: number; name: string };
  subject: string;
  description?: string;
  start_date?: string; // YYYY-MM-DD
  due_date?: string; // YYYY-MM-DD
  done_ratio: number; // 0-100
  estimated_hours?: number;
  custom_fields?: Array<{
    id: number;
    name: string;
    value: string | number | boolean;
  }>;
  created_on: string; // ISO 8601
  updated_on: string; // ISO 8601
}

const NamedEntitySchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
});

const CustomFieldSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  value: z.union([z.string(), z.number(), z.boolean()]),
});

export const IssueSchema = z.object({
  id: z.number().int().positive(),
  project: NamedEntitySchema,
  tracker: NamedEntitySchema,
  status: NamedEntitySchema,
  priority: NamedEntitySchema,
  author: NamedEntitySchema,
  assigned_to: NamedEntitySchema.optional(),
  subject: z.string().min(1),
  description: z.string().optional(),
  start_date: z.string().optional(),
  due_date: z.string().optional(),
  done_ratio: z.number().int().min(0).max(100),
  estimated_hours: z.number().optional(),
  custom_fields: z.array(CustomFieldSchema).optional(),
  created_on: z.string(),
  updated_on: z.string(),
});

/**
 * ユーザー
 */
export interface User {
  id: number;
  login: string;
  firstname: string;
  lastname: string;
  mail: string;
  created_on: string; // ISO 8601
  last_login_on?: string; // ISO 8601
  status: 1 | 2 | 3; // 1: active, 2: registered, 3: locked
}

export const UserSchema = z.object({
  id: z.number().int().positive(),
  login: z.string().min(1),
  firstname: z.string(),
  lastname: z.string(),
  mail: z.string().email(),
  created_on: z.string(),
  last_login_on: z.string().optional(),
  status: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});

/**
 * プロジェクトメンバー
 */
export interface Member {
  id: number;
  project: { id: number; name: string };
  user?: { id: number; name: string };
  group?: { id: number; name: string };
  roles: Array<{ id: number; name: string }>;
}

export const MemberSchema = z.object({
  id: z.number().int().positive(),
  project: NamedEntitySchema,
  user: NamedEntitySchema.optional(),
  group: NamedEntitySchema.optional(),
  roles: z.array(NamedEntitySchema),
});

// ============================================================================
// Lychee-specific Entities
// ============================================================================

/**
 * マイルストーン（Lychee固有機能）
 */
export interface Milestone {
  id: number;
  name: string;
  description?: string;
  start_date: string; // YYYY-MM-DD
  due_date: string; // YYYY-MM-DD
  status: 'open' | 'locked' | 'closed';
  completed_percent?: number; // 0-100
  issues?: Array<{ id: number; subject: string }>;
}

export const MilestoneSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  description: z.string().optional(),
  start_date: z.string(),
  due_date: z.string(),
  status: z.enum(['open', 'locked', 'closed']),
  completed_percent: z.number().int().min(0).max(100).optional(),
  issues: z
    .array(
      z.object({
        id: z.number().int().positive(),
        subject: z.string(),
      })
    )
    .optional(),
});

/**
 * マイルストーンレスポンス
 */
export interface MilestonesResponse {
  milestones: Milestone[];
  total_count: number;
}

export const MilestonesResponseSchema = z.object({
  milestones: z.array(MilestoneSchema),
  total_count: z.number().int().min(0),
});

/**
 * スケジュール（IssuesとMilestonesから集約）
 */
export interface Schedule {
  project_id: number;
  start_date?: string; // earliest issue/milestone start_date
  end_date?: string; // latest issue/milestone due_date
  progress: number; // weighted average from issues and milestones
  total_issues: number;
  completed_issues: number;
  milestones: Array<{
    id: number;
    name: string;
    start_date: string;
    due_date: string;
    status: 'open' | 'locked' | 'closed';
  }>;
  dependencies: Array<{
    issue_id: number;
    depends_on: number[];
  }>;
  critical_path?: number[]; // issue IDs on critical path
}

export const ScheduleSchema = z.object({
  project_id: z.number().int().positive(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  progress: z.number().min(0).max(100),
  total_issues: z.number().int().min(0),
  completed_issues: z.number().int().min(0),
  milestones: z.array(
    z.object({
      id: z.number().int().positive(),
      name: z.string(),
      start_date: z.string(),
      due_date: z.string(),
      status: z.enum(['open', 'locked', 'closed']),
    })
  ),
  dependencies: z.array(
    z.object({
      issue_id: z.number().int().positive(),
      depends_on: z.array(z.number().int().positive()),
    })
  ),
  critical_path: z.array(z.number().int().positive()).optional(),
});

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * プロジェクト一覧取得パラメータ
 */
export type GetProjectsParams = PaginationParams;

/**
 * プロジェクト一覧レスポンス
 */
export type ProjectsResponse = PaginatedResponse<Project>;

/**
 * チケット検索パラメータ
 */
export interface SearchIssuesParams extends PaginationParams {
  project_id?: number;
  status_id?: 'open' | 'closed' | number;
  assigned_to_id?: number;
  query?: string;
}

export const SearchIssuesParamsSchema = PaginationParamsSchema.extend({
  project_id: z.number().int().positive().optional(),
  status_id: z
    .union([z.literal('open'), z.literal('closed'), z.number().int()])
    .optional(),
  assigned_to_id: z.number().int().positive().optional(),
  query: z.string().optional(),
});

/**
 * チケット一覧レスポンス
 */
export type IssuesResponse = PaginatedResponse<Issue>;

/**
 * チケット作成パラメータ
 */
export interface CreateIssueParams {
  project_id: number;
  subject: string;
  description?: string;
  priority_id?: number;
  assigned_to_id?: number;
  due_date?: string; // YYYY-MM-DD
}

export const CreateIssueParamsSchema = z.object({
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
 * チケット更新パラメータ
 */
export interface UpdateIssueParams {
  subject?: string;
  description?: string;
  status_id?: number;
  priority_id?: number;
  assigned_to_id?: number;
  due_date?: string; // YYYY-MM-DD
}

export const UpdateIssueParamsSchema = z.object({
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

/**
 * ユーザー一覧取得パラメータ
 */
export interface GetUsersParams extends PaginationParams {
  status?: 'active' | 'locked' | 'all';
}

export const GetUsersParamsSchema = PaginationParamsSchema.extend({
  status: z.enum(['active', 'locked', 'all']).optional(),
});

/**
 * ユーザー一覧レスポンス
 */
export type UsersResponse = PaginatedResponse<User>;

/**
 * プロジェクトメンバー一覧取得パラメータ
 */
export interface GetProjectMembersParams extends PaginationParams {
  project_id: number;
}

export const GetProjectMembersParamsSchema = PaginationParamsSchema.extend({
  project_id: z.number().int().positive(),
});

/**
 * プロジェクトメンバー一覧レスポンス
 */
export type MembersResponse = PaginatedResponse<Member>;
