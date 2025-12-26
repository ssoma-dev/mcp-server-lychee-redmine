/**
 * 設定管理ドメインの型定義
 */

/**
 * アプリケーション設定
 */
export interface AppConfig {
  lycheeRedmine: {
    url: string;
    apiKey: string;
  };
  server: {
    logLevel: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
    timeout: number; // ms, default: 30000
    retryMaxAttempts: number; // default: 3
  };
}

/**
 * 設定エラーの種類
 */
export type ConfigErrorType =
  | 'missing_required'
  | 'invalid_format'
  | 'file_parse_error';

/**
 * 設定エラー
 */
export interface ConfigError {
  type: ConfigErrorType;
  message: string;
  field?: string;
}

/**
 * Result型 - 成功または失敗を表す
 */
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
