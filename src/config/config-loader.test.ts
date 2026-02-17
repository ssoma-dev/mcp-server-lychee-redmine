import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConfigLoader } from './config-loader.js';
import * as fs from 'fs/promises';

// fs/promisesモジュールをモック化
vi.mock('fs/promises');

describe('ConfigLoader', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // 環境変数を保存
    originalEnv = { ...process.env };
    // 環境変数をクリア
    process.env = {};
  });

  afterEach(() => {
    // 環境変数を復元
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe('環境変数からの設定読み込み', () => {
    it('環境変数が設定されている場合、正しく読み込む', async () => {
      process.env.LYCHEE_REDMINE_URL = 'https://redmine.example.com';
      process.env.LYCHEE_REDMINE_API_KEY = 'test-api-key-123';

      const loader = new ConfigLoader();
      const result = await loader.load();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.lycheeRedmine.url).toBe(
          'https://redmine.example.com'
        );
        expect(result.value.lycheeRedmine.apiKey).toBe('test-api-key-123');
        expect(result.value.server.logLevel).toBe('INFO');
        expect(result.value.server.timeout).toBe(30000);
        expect(result.value.server.retryMaxAttempts).toBe(3);
      }
    });

    it('オプション設定項目も環境変数から読み込む', async () => {
      process.env.LYCHEE_REDMINE_URL = 'https://redmine.example.com';
      process.env.LYCHEE_REDMINE_API_KEY = 'test-api-key';
      process.env.LOG_LEVEL = 'DEBUG';
      process.env.TIMEOUT = '60000';
      process.env.RETRY_MAX_ATTEMPTS = '5';

      const loader = new ConfigLoader();
      const result = await loader.load();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.server.logLevel).toBe('DEBUG');
        expect(result.value.server.timeout).toBe(60000);
        expect(result.value.server.retryMaxAttempts).toBe(5);
      }
    });

    it('必須環境変数が欠損している場合はエラーを返す', async () => {
      process.env.LYCHEE_REDMINE_URL = 'https://redmine.example.com';
      // API_KEYが欠損

      const loader = new ConfigLoader();
      const result = await loader.load();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('missing_required');
      }
    });
  });

  describe('設定ファイルからの読み込み', () => {
    it('環境変数がない場合、設定ファイル（JSON）から読み込む', async () => {
      const configFileContent = JSON.stringify({
        lycheeRedmine: {
          url: 'https://config-file.example.com',
          apiKey: 'config-file-api-key',
        },
        server: {
          logLevel: 'WARN',
          timeout: 45000,
          retryMaxAttempts: 4,
        },
      });

      vi.mocked(fs.readFile).mockResolvedValue(configFileContent);

      const loader = new ConfigLoader({ configFilePath: 'config.json' });
      const result = await loader.load();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.lycheeRedmine.url).toBe(
          'https://config-file.example.com'
        );
        expect(result.value.lycheeRedmine.apiKey).toBe('config-file-api-key');
        expect(result.value.server.logLevel).toBe('WARN');
        expect(result.value.server.timeout).toBe(45000);
        expect(result.value.server.retryMaxAttempts).toBe(4);
      }
    });

    it('設定ファイル（YAML）から読み込む', async () => {
      const configFileContent = `
lycheeRedmine:
  url: https://yaml-config.example.com
  apiKey: yaml-api-key
server:
  logLevel: ERROR
  timeout: 50000
  retryMaxAttempts: 2
`;

      vi.mocked(fs.readFile).mockResolvedValue(configFileContent);

      const loader = new ConfigLoader({ configFilePath: 'config.yaml' });
      const result = await loader.load();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.lycheeRedmine.url).toBe(
          'https://yaml-config.example.com'
        );
        expect(result.value.lycheeRedmine.apiKey).toBe('yaml-api-key');
        expect(result.value.server.logLevel).toBe('ERROR');
      }
    });

    it('設定ファイルが不正なJSONの場合はエラーを返す', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('{ invalid json }');

      const loader = new ConfigLoader({ configFilePath: 'config.json' });
      const result = await loader.load();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('file_parse_error');
      }
    });

    it('設定ファイルが存在しない場合はエラーを返す', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(
        new Error('ENOENT: no such file')
      );

      const loader = new ConfigLoader({ configFilePath: 'missing.json' });
      const result = await loader.load();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('file_parse_error');
      }
    });
  });

  describe('環境変数と設定ファイルの優先順位', () => {
    it('環境変数が設定ファイルより優先される', async () => {
      process.env.LYCHEE_REDMINE_URL = 'https://env-override.example.com';
      process.env.LYCHEE_REDMINE_API_KEY = 'env-api-key';
      process.env.LOG_LEVEL = 'DEBUG';

      const configFileContent = JSON.stringify({
        lycheeRedmine: {
          url: 'https://config-file.example.com',
          apiKey: 'config-file-api-key',
        },
        server: {
          logLevel: 'WARN',
          timeout: 45000,
          retryMaxAttempts: 4,
        },
      });

      vi.mocked(fs.readFile).mockResolvedValue(configFileContent);

      const loader = new ConfigLoader({ configFilePath: 'config.json' });
      const result = await loader.load();

      expect(result.ok).toBe(true);
      if (result.ok) {
        // 環境変数の値が優先
        expect(result.value.lycheeRedmine.url).toBe(
          'https://env-override.example.com'
        );
        expect(result.value.lycheeRedmine.apiKey).toBe('env-api-key');
        expect(result.value.server.logLevel).toBe('DEBUG');
        // 環境変数で指定されていない項目は設定ファイルから
        expect(result.value.server.timeout).toBe(45000);
        expect(result.value.server.retryMaxAttempts).toBe(4);
      }
    });

    it('一部の環境変数のみ設定されている場合、残りは設定ファイルから読み込む', async () => {
      process.env.LYCHEE_REDMINE_URL = 'https://env-url.example.com';
      // API_KEYは環境変数なし

      const configFileContent = JSON.stringify({
        lycheeRedmine: {
          url: 'https://config-url.example.com',
          apiKey: 'config-api-key',
        },
      });

      vi.mocked(fs.readFile).mockResolvedValue(configFileContent);

      const loader = new ConfigLoader({ configFilePath: 'config.json' });
      const result = await loader.load();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.lycheeRedmine.url).toBe(
          'https://env-url.example.com'
        );
        expect(result.value.lycheeRedmine.apiKey).toBe('config-api-key');
      }
    });
  });

  describe('デフォルト値の提供', () => {
    it('server設定が全く指定されていない場合、デフォルト値を使用する', async () => {
      process.env.LYCHEE_REDMINE_URL = 'https://redmine.example.com';
      process.env.LYCHEE_REDMINE_API_KEY = 'api-key';

      const loader = new ConfigLoader();
      const result = await loader.load();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.server.logLevel).toBe('INFO');
        expect(result.value.server.timeout).toBe(30000);
        expect(result.value.server.retryMaxAttempts).toBe(3);
      }
    });
  });

  describe('バリデーション統合', () => {
    it('Environment Validatorでバリデーションエラーが発生した場合、エラーを返す', async () => {
      process.env.LYCHEE_REDMINE_URL = 'http://insecure.example.com'; // HTTPは不可
      process.env.LYCHEE_REDMINE_API_KEY = 'api-key';

      const loader = new ConfigLoader();
      const result = await loader.load();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid_format');
        expect(result.error.message).toContain('HTTPS');
      }
    });

    it('不正なLOG_LEVELの場合はエラーを返す', async () => {
      process.env.LYCHEE_REDMINE_URL = 'https://redmine.example.com';
      process.env.LYCHEE_REDMINE_API_KEY = 'api-key';
      process.env.LOG_LEVEL = 'INVALID_LEVEL';

      const loader = new ConfigLoader();
      const result = await loader.load();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid_format');
      }
    });
  });

  describe('デフォルト設定ファイルパスの検索', () => {
    it('設定ファイルパスが指定されていない場合、デフォルトパスを試行する', async () => {
      process.env.LYCHEE_REDMINE_URL = 'https://redmine.example.com';
      process.env.LYCHEE_REDMINE_API_KEY = 'api-key';

      // デフォルトパスのファイルが存在しない場合
      vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT'));

      const loader = new ConfigLoader();
      const result = await loader.load();

      // 環境変数のみで成功
      expect(result.ok).toBe(true);
    });
  });
});
