import axios, { type AxiosInstance, type AxiosError } from 'axios';
import type { RetryHandler } from '../utils/retry-handler.js';
import { logger as defaultLogger } from '../utils/logger.js';
import {
  ProjectSchema,
  IssueSchema,
  UserSchema,
  MemberSchema,
  MilestonesResponseSchema,
  type Project,
  type Issue,
  type MilestonesResponse,
  type Schedule,
  type GetProjectsParams,
  type ProjectsResponse,
  type SearchIssuesParams,
  type IssuesResponse,
  type CreateIssueParams,
  type UpdateIssueParams,
  type GetUsersParams,
  type UsersResponse,
  type GetProjectMembersParams,
  type MembersResponse,
  type ApiError,
  type Result,
} from './types.js';

type LoggerType = typeof defaultLogger;

/**
 * Redmine API Client設定
 */
export interface RedmineAPIClientConfig {
  url: string;
  apiKey: string;
  timeout?: number; // default: 30000ms
}

/**
 * Redmine API Client
 * Lychee Redmine REST APIとの通信を管理します
 */
export class RedmineAPIClient {
  private readonly axios: AxiosInstance;
  private readonly retryHandler: RetryHandler;
  private readonly logger?: LoggerType;

  constructor(
    config: RedmineAPIClientConfig,
    retryHandler: RetryHandler,
    logger?: LoggerType
  ) {
    // HTTPS強制（要件2.4）
    if (!config.url.startsWith('https://')) {
      throw new Error(
        'Redmine URL must use HTTPS protocol for security (requirement 2.4)'
      );
    }

    this.retryHandler = retryHandler;
    this.logger = logger;

    // axiosインスタンスの作成
    this.axios = axios.create({
      baseURL: config.url,
      timeout: config.timeout ?? 30000,
      headers: {
        'X-Redmine-API-Key': config.apiKey,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    // リクエストインターセプター（ログ記録）
    this.axios.interceptors.request.use((request) => {
      if (this.logger !== undefined) {
        this.logger.debug('API Request', {
          method: request.method,
          url: request.url,
          // APIキーはログに出力しない（要件2.2）
        });
      }
      return request;
    });

    // レスポンスインターセプター（ログ記録とエラー変換）
    this.axios.interceptors.response.use(
      (response) => {
        if (this.logger !== undefined) {
          this.logger.debug('API Response', {
            status: response.status,
            url: response.config.url,
          });
        }
        return response;
      },
      (error: AxiosError) => {
        if (this.logger !== undefined) {
          this.logger.error('API Error', error as Error, {
            status: error.response?.status,
            url: error.config?.url,
          });
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * プロジェクト一覧を取得
   */
  async getProjects(
    params: GetProjectsParams
  ): Promise<Result<ProjectsResponse, ApiError>> {
    return this.withRetry(async () => {
      const response = await this.axios.get<{
        projects: unknown[];
        total_count: number;
        limit: number;
        offset: number;
      }>('/projects.json', {
        params: {
          limit: params.limit ?? 25,
          offset: params.offset ?? 0,
        },
      });

      // Zodバリデーション
      const projects = response.data.projects.map((p) =>
        ProjectSchema.parse(p)
      );

      return {
        ok: true,
        value: {
          data: projects,
          total_count: response.data.total_count,
          limit: response.data.limit,
          offset: response.data.offset,
        },
      };
    }, '/projects.json');
  }

  /**
   * 特定のプロジェクトを取得
   */
  async getProject(id: number): Promise<Result<Project, ApiError>> {
    return this.withRetry(async () => {
      const response = await this.axios.get<{ project: unknown }>(
        `/projects/${id}.json`
      );

      const project = ProjectSchema.parse(response.data.project);

      return {
        ok: true,
        value: project,
      };
    }, `/projects/${id}.json`);
  }

  /**
   * チケットを検索
   */
  async searchIssues(
    params: SearchIssuesParams
  ): Promise<Result<IssuesResponse, ApiError>> {
    return this.withRetry(async () => {
      const response = await this.axios.get<{
        issues: unknown[];
        total_count: number;
        limit: number;
        offset: number;
      }>('/issues.json', {
        params: {
          project_id: params.project_id,
          status_id: params.status_id,
          assigned_to_id: params.assigned_to_id,
          limit: params.limit ?? 25,
          offset: params.offset ?? 0,
        },
      });

      const issues = response.data.issues.map((i) => IssueSchema.parse(i));

      return {
        ok: true,
        value: {
          data: issues,
          total_count: response.data.total_count,
          limit: response.data.limit,
          offset: response.data.offset,
        },
      };
    }, '/issues.json');
  }

  /**
   * チケットを作成
   */
  async createIssue(
    params: CreateIssueParams
  ): Promise<Result<Issue, ApiError>> {
    return this.withRetry(async () => {
      const response = await this.axios.post<{ issue: unknown }>(
        '/issues.json',
        {
          issue: params,
        }
      );

      const issue = IssueSchema.parse(response.data.issue);

      return {
        ok: true,
        value: issue,
      };
    }, '/issues.json');
  }

  /**
   * チケットを更新
   */
  async updateIssue(
    id: number,
    params: UpdateIssueParams
  ): Promise<Result<Issue, ApiError>> {
    return this.withRetry(async () => {
      const response = await this.axios.put<{ issue: unknown }>(
        `/issues/${id}.json`,
        {
          issue: params,
        }
      );

      const issue = IssueSchema.parse(response.data.issue);

      return {
        ok: true,
        value: issue,
      };
    }, `/issues/${id}.json`);
  }

  /**
   * ユーザー一覧を取得
   */
  async getUsers(
    params: GetUsersParams
  ): Promise<Result<UsersResponse, ApiError>> {
    return this.withRetry(async () => {
      const response = await this.axios.get<{
        users: unknown[];
        total_count: number;
        limit: number;
        offset: number;
      }>('/users.json', {
        params: {
          status: params.status,
          limit: params.limit ?? 25,
          offset: params.offset ?? 0,
        },
      });

      const users = response.data.users.map((u) => UserSchema.parse(u));

      return {
        ok: true,
        value: {
          data: users,
          total_count: response.data.total_count,
          limit: response.data.limit,
          offset: response.data.offset,
        },
      };
    }, '/users.json');
  }

  /**
   * プロジェクトメンバーを取得
   */
  async getProjectMembers(
    params: GetProjectMembersParams
  ): Promise<Result<MembersResponse, ApiError>> {
    const { project_id, limit, offset } = params;
    return this.withRetry(async () => {
      const response = await this.axios.get<{
        memberships: unknown[];
        total_count: number;
        limit: number;
        offset: number;
      }>(`/projects/${project_id}/memberships.json`, {
        params: {
          limit: limit ?? 25,
          offset: offset ?? 0,
        },
      });

      const members = response.data.memberships.map((m) =>
        MemberSchema.parse(m)
      );

      return {
        ok: true,
        value: {
          data: members,
          total_count: response.data.total_count,
          limit: response.data.limit,
          offset: response.data.offset,
        },
      };
    }, `/projects/${project_id}/memberships.json`);
  }

  /**
   * マイルストーン一覧を取得（Lychee固有API）
   */
  async getMilestones(
    projectId: number
  ): Promise<Result<MilestonesResponse, ApiError>> {
    return this.withRetry(async () => {
      const response = await this.axios.get<unknown>(
        `/lychee/api/v1/projects/${projectId}/milestones.json`
      );

      const milestonesResponse = MilestonesResponseSchema.parse(response.data);

      return {
        ok: true,
        value: milestonesResponse,
      };
    }, `/lychee/api/v1/projects/${projectId}/milestones.json`);
  }

  /**
   * スケジュール情報を取得（IssuesとMilestonesを集約）
   */
  async getSchedule(projectId: number): Promise<Result<Schedule, ApiError>> {
    // Get all issues for the project
    const issuesResult = await this.searchIssues({
      project_id: projectId,
      limit: 100, // Get more issues for better schedule calculation
    });

    if (!issuesResult.ok) {
      return issuesResult;
    }

    // Get milestones for the project
    const milestonesResult = await this.getMilestones(projectId);

    if (!milestonesResult.ok) {
      return milestonesResult;
    }

    return this.withRetry(async () => {
      const issues = issuesResult.value.data;
      const milestones = milestonesResult.value.milestones;

      // Calculate schedule data
      let startDate: string | undefined;
      let endDate: string | undefined;

      // Find earliest start_date and latest due_date from issues
      for (const issue of issues) {
        if (
          issue.start_date !== undefined &&
          (startDate === undefined || issue.start_date < startDate)
        ) {
          startDate = issue.start_date;
        }
        if (
          issue.due_date !== undefined &&
          (endDate === undefined || issue.due_date > endDate)
        ) {
          endDate = issue.due_date;
        }
      }

      // Check milestones for earliest/latest dates
      for (const milestone of milestones) {
        if (startDate === undefined || milestone.start_date < startDate) {
          startDate = milestone.start_date;
        }
        if (endDate === undefined || milestone.due_date > endDate) {
          endDate = milestone.due_date;
        }
      }

      // Calculate progress (weighted average from issues)
      let progress = 0;
      if (issues.length > 0) {
        const totalProgress = issues.reduce(
          (sum, issue) => sum + issue.done_ratio,
          0
        );
        progress = Math.round(totalProgress / issues.length);
      }

      // Count completed issues (done_ratio === 100)
      const completedIssues = issues.filter(
        (issue) => issue.done_ratio === 100
      ).length;

      // Build milestone summary
      const milestoneSummary = milestones.map((m) => ({
        id: m.id,
        name: m.name,
        start_date: m.start_date,
        due_date: m.due_date,
        status: m.status,
      }));

      // Dependencies - not implemented in this phase (empty array)
      const dependencies: Array<{
        issue_id: number;
        depends_on: number[];
      }> = [];

      const schedule: Schedule = {
        project_id: projectId,
        start_date: startDate,
        end_date: endDate,
        progress,
        total_issues: issues.length,
        completed_issues: completedIssues,
        milestones: milestoneSummary,
        dependencies,
      };

      return {
        ok: true,
        value: schedule,
      };
    }, `/schedule/${projectId}`);
  }

  /**
   * リトライ付きでAPI呼び出しを実行
   */
  private async withRetry<T>(
    fn: () => Promise<Result<T, ApiError>>,
    endpoint: string
  ): Promise<Result<T, ApiError>> {
    const result = await this.retryHandler.withRetry(
      async () => {
        try {
          return await fn();
        } catch (error) {
          // AxiosErrorをApiErrorに変換してErrorとしてthrow
          const apiError = this.convertToApiError(error, endpoint);
          const err = new Error(apiError.message);
          Object.assign(err, apiError);
          throw err;
        }
      },
      {
        maxAttempts: 3,
        baseDelay: 1000,
        shouldRetry: (error) => {
          // ApiErrorの場合、5xxエラーのみリトライ
          if (this.isApiError(error)) {
            return error.code >= 500 && error.code < 600;
          }
          return false;
        },
      }
    );

    if (!result.ok) {
      // RetryExhaustedErrorをApiErrorに変換
      return {
        ok: false,
        error: this.isApiError(result.error.lastError)
          ? result.error.lastError
          : this.convertToApiError(result.error.lastError, endpoint),
      };
    }

    return result.value;
  }

  /**
   * エラーをApiErrorに変換
   */
  private convertToApiError(error: unknown, endpoint: string): ApiError {
    // Axios error
    if (axios.isAxiosError(error)) {
      return {
        code: error.response?.status ?? 500,
        message:
          (error.response?.data as { error?: string })?.error ?? error.message,
        endpoint,
        timestamp: new Date().toISOString(),
      };
    }

    // Check for error-like object with response property (mocked axios errors)
    if (
      error !== null &&
      error !== undefined &&
      typeof error === 'object' &&
      'response' in error &&
      error.response !== null &&
      error.response !== undefined &&
      typeof error.response === 'object' &&
      'status' in error.response
    ) {
      const response = error.response as {
        status: number;
        data?: { error?: string };
      };
      return {
        code: response.status,
        message: response.data?.error ?? 'Error',
        endpoint,
        timestamp: new Date().toISOString(),
      };
    }

    // Standard Error object
    if (error instanceof Error) {
      return {
        code: 500,
        message: error.message,
        endpoint,
        timestamp: new Date().toISOString(),
      };
    }

    // Unknown error
    return {
      code: 500,
      message: 'Unknown error',
      endpoint,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * ApiErrorかどうかを判定
   */
  private isApiError(error: unknown): error is ApiError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      'message' in error &&
      'endpoint' in error &&
      'timestamp' in error
    );
  }
}
