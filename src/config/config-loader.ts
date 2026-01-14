import * as fs from 'fs/promises';
import * as yaml from 'yaml';
import { EnvironmentValidator } from './environment-validator.js';
import type { AppConfig, ConfigError, Result } from './types.js';

/**
 * 設定ローダーのオプション
 */
export interface ConfigLoaderOptions {
  /**
   * 設定ファイルのパス（オプション）
   */
  configFilePath?: string;
}

/**
 * デフォルト設定ファイルパス（優先順位順）
 */
const DEFAULT_CONFIG_PATHS = [
  'config.json',
  'config.yaml',
  'config.yml',
  '.config.json',
  '.config.yaml',
  '.config.yml',
];

/**
 * 設定ローダー
 * 環境変数と設定ファイルから設定を読み込み、バリデーションを行います
 */
export class ConfigLoader {
  private readonly validator: EnvironmentValidator;
  private readonly configFilePath?: string;

  constructor(options?: ConfigLoaderOptions) {
    this.validator = new EnvironmentValidator();
    this.configFilePath = options?.configFilePath;
  }

  /**
   * 設定を読み込み、バリデーションします
   * @returns バリデーション済みの設定、または設定エラー
   */
  async load(): Promise<Result<AppConfig, ConfigError>> {
    try {
      // 1. 設定ファイルから読み込み（フォールバック）
      const fileConfig = await this.loadFromFile();

      // 2. 環境変数から読み込み（優先）
      const envConfig = this.loadFromEnv();

      // 3. 環境変数を設定ファイルより優先してマージ
      const mergedConfig = this.mergeConfigs(fileConfig, envConfig);

      // 4. バリデーション実行
      return this.validator.validate(mergedConfig);
    } catch (error) {
      return {
        ok: false,
        error: {
          type: 'file_parse_error',
          message:
            error instanceof Error
              ? error.message
              : 'Unknown error during config loading',
        },
      };
    }
  }

  /**
   * 環境変数から設定を読み込みます
   * @returns 環境変数から読み込んだ設定（部分的）
   */
  private loadFromEnv(): Partial<AppConfig> {
    const config: Partial<AppConfig> = {};

    // Lychee Redmine設定
    const redmineUrl = process.env['LYCHEE_REDMINE_URL'];
    const redmineApiKey = process.env['LYCHEE_REDMINE_API_KEY'];

    const lycheeConfig: Partial<AppConfig['lycheeRedmine']> = {};
    let hasLycheeConfig = false;

    if (redmineUrl !== undefined && redmineUrl !== '') {
      lycheeConfig.url = redmineUrl;
      hasLycheeConfig = true;
    }

    if (redmineApiKey !== undefined && redmineApiKey !== '') {
      lycheeConfig.apiKey = redmineApiKey;
      hasLycheeConfig = true;
    }

    if (hasLycheeConfig) {
      config.lycheeRedmine = lycheeConfig as AppConfig['lycheeRedmine'];
    }

    // Server設定
    const serverConfig: Partial<AppConfig['server']> = {};
    let hasServerConfig = false;

    const logLevel = process.env['LOG_LEVEL'];
    if (logLevel !== undefined && logLevel !== '') {
      serverConfig.logLevel = logLevel as 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
      hasServerConfig = true;
    }

    const timeoutStr = process.env['TIMEOUT'];
    if (timeoutStr !== undefined && timeoutStr !== '') {
      const timeout = parseInt(timeoutStr, 10);
      if (!isNaN(timeout)) {
        serverConfig.timeout = timeout;
        hasServerConfig = true;
      }
    }

    const retryMaxAttemptsStr = process.env['RETRY_MAX_ATTEMPTS'];
    if (retryMaxAttemptsStr !== undefined && retryMaxAttemptsStr !== '') {
      const retryMaxAttempts = parseInt(retryMaxAttemptsStr, 10);
      if (!isNaN(retryMaxAttempts)) {
        serverConfig.retryMaxAttempts = retryMaxAttempts;
        hasServerConfig = true;
      }
    }

    if (hasServerConfig) {
      config.server = serverConfig as AppConfig['server'];
    }

    return config;
  }

  /**
   * 設定ファイルから設定を読み込みます
   * @returns 設定ファイルから読み込んだ設定（部分的）
   */
  private async loadFromFile(): Promise<Partial<AppConfig>> {
    const filePath = await this.findConfigFile();

    if (filePath === undefined || filePath === '') {
      // 設定ファイルが見つからない場合は空の設定を返す
      return {};
    }

    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      return this.parseConfigFile(fileContent, filePath);
    } catch (error) {
      // ファイルが存在しない、または読み込めない場合
      if (this.configFilePath !== undefined && this.configFilePath !== '') {
        // 明示的に指定されたファイルが読めない場合はエラー
        throw new Error(
          `Failed to read config file: ${this.configFilePath} - ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
      // デフォルトパスの場合は無視
      return {};
    }
  }

  /**
   * 設定ファイルを検索します
   * @returns 見つかった設定ファイルのパス、または undefined
   */
  private async findConfigFile(): Promise<string | undefined> {
    // 明示的に指定されたパスがある場合
    if (this.configFilePath !== undefined && this.configFilePath !== '') {
      return this.configFilePath;
    }

    // デフォルトパスを順に試行
    for (const path of DEFAULT_CONFIG_PATHS) {
      try {
        await fs.access(path);
        return path;
      } catch {
        // ファイルが存在しない場合は次へ
        continue;
      }
    }

    return undefined;
  }

  /**
   * 設定ファイルの内容をパースします
   * @param content - ファイル内容
   * @param filePath - ファイルパス（拡張子判定用）
   * @returns パースされた設定
   */
  private parseConfigFile(
    content: string,
    filePath: string
  ): Partial<AppConfig> {
    try {
      const ext = filePath.toLowerCase();

      if (ext.endsWith('.json')) {
        return JSON.parse(content) as Partial<AppConfig>;
      } else if (ext.endsWith('.yaml') || ext.endsWith('.yml')) {
        return yaml.parse(content) as Partial<AppConfig>;
      } else {
        // 不明な拡張子の場合はJSONとして試行
        return JSON.parse(content) as Partial<AppConfig>;
      }
    } catch (error) {
      throw new Error(
        `Failed to parse config file: ${filePath} - ${error instanceof Error ? error.message : 'Invalid format'}`
      );
    }
  }

  /**
   * 2つの設定をマージします（環境変数が優先）
   * @param fileConfig - ファイルから読み込んだ設定
   * @param envConfig - 環境変数から読み込んだ設定
   * @returns マージされた設定
   */
  private mergeConfigs(
    fileConfig: Partial<AppConfig>,
    envConfig: Partial<AppConfig>
  ): Partial<AppConfig> {
    // lycheeRedmine設定のマージ
    const mergedLychee: Partial<AppConfig['lycheeRedmine']> = {};

    // URLのマージ（環境変数 > ファイル > 空文字列）
    mergedLychee.url =
      envConfig.lycheeRedmine?.url ?? fileConfig.lycheeRedmine?.url ?? '';

    // APIキーのマージ（環境変数 > ファイル > 空文字列）
    mergedLychee.apiKey =
      envConfig.lycheeRedmine?.apiKey ?? fileConfig.lycheeRedmine?.apiKey ?? '';

    return {
      lycheeRedmine: mergedLychee as AppConfig['lycheeRedmine'],
      server: {
        logLevel:
          envConfig.server?.logLevel ??
          fileConfig.server?.logLevel ??
          ('INFO' as const),
        timeout:
          envConfig.server?.timeout ?? fileConfig.server?.timeout ?? 30000,
        retryMaxAttempts:
          envConfig.server?.retryMaxAttempts ??
          fileConfig.server?.retryMaxAttempts ??
          3,
      },
    };
  }
}
