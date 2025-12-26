import { z } from 'zod';
import type { AppConfig, ConfigError, Result } from './types.js';

/**
 * デフォルト設定値
 */
const DEFAULT_CONFIG = {
  logLevel: 'INFO' as const,
  timeout: 30000,
  retryMaxAttempts: 3,
} as const;

/**
 * 環境変数バリデーター
 * 設定値の検証とデフォルト値の適用を行います
 */
export class EnvironmentValidator {
  /**
   * 設定スキーマ定義
   */
  private readonly configSchema = z.object({
    lycheeRedmine: z.object({
      url: z
        .string()
        .min(1, 'LYCHEE_REDMINE_URL must not be empty')
        .url('Invalid URL format')
        .refine(
          (url) => url.startsWith('https://'),
          'LYCHEE_REDMINE_URL must use HTTPS protocol'
        ),
      apiKey: z
        .string()
        .min(1, 'LYCHEE_REDMINE_API_KEY must not be empty')
        .trim()
        .refine(
          (key) => key.length > 0,
          'LYCHEE_REDMINE_API_KEY must not be whitespace only'
        ),
    }),
    server: z.object({
      logLevel: z
        .enum(['DEBUG', 'INFO', 'WARN', 'ERROR'])
        .default(DEFAULT_CONFIG.logLevel),
      timeout: z
        .number()
        .int()
        .min(0, 'timeout must be non-negative')
        .default(DEFAULT_CONFIG.timeout),
      retryMaxAttempts: z
        .number()
        .int()
        .min(0, 'retryMaxAttempts must be non-negative')
        .default(DEFAULT_CONFIG.retryMaxAttempts),
    }),
  });

  /**
   * 設定をバリデーションし、デフォルト値を適用します
   * @param config - バリデーション対象の設定（部分的でも可）
   * @returns バリデーション済みの完全な設定、または設定エラー
   */
  validate(config: Partial<AppConfig>): Result<AppConfig, ConfigError> {
    try {
      // デフォルト値を適用した設定を準備
      const configWithDefaults = {
        lycheeRedmine: config.lycheeRedmine,
        server: {
          logLevel: config.server?.logLevel ?? DEFAULT_CONFIG.logLevel,
          timeout: config.server?.timeout ?? DEFAULT_CONFIG.timeout,
          retryMaxAttempts:
            config.server?.retryMaxAttempts ?? DEFAULT_CONFIG.retryMaxAttempts,
        },
      };

      // Zodスキーマでバリデーション実行
      const validated = this.configSchema.parse(configWithDefaults);

      return {
        ok: true,
        value: validated as AppConfig,
      };
    } catch (error) {
      // ZodバリデーションエラーをConfigErrorに変換
      if (error instanceof z.ZodError) {
        return this.convertZodError(error);
      }

      // 予期しないエラー
      return {
        ok: false,
        error: {
          type: 'invalid_format',
          message:
            error instanceof Error ? error.message : 'Unknown validation error',
        },
      };
    }
  }

  /**
   * ZodErrorをConfigErrorに変換します
   * @param zodError - Zodバリデーションエラー
   * @returns 変換されたConfigError
   */
  private convertZodError(
    zodError: z.ZodError
  ): Result<AppConfig, ConfigError> {
    const firstIssue = zodError.issues[0];

    if (!firstIssue) {
      return {
        ok: false,
        error: {
          type: 'invalid_format',
          message: 'Validation failed',
        },
      };
    }

    const field = firstIssue.path.join('.');
    const message = firstIssue.message;

    // エラーの種類を判定
    let errorType: 'missing_required' | 'invalid_format' = 'invalid_format';

    if (
      firstIssue.code === z.ZodIssueCode.invalid_type &&
      firstIssue.received === 'undefined'
    ) {
      errorType = 'missing_required';
    } else if (
      message.includes('must not be empty') ||
      message.includes('must not be whitespace only')
    ) {
      errorType = 'missing_required';
    }

    return {
      ok: false,
      error: {
        type: errorType,
        message,
        field,
      },
    };
  }
}
