import { describe, it, expect } from 'vitest';
import { EnvironmentValidator } from './environment-validator.js';
import type { AppConfig } from './types.js';

describe('EnvironmentValidator', () => {
  const validator = new EnvironmentValidator();

  describe('必須設定項目の検証', () => {
    it('LYCHEE_REDMINE_URLが存在しない場合はエラーを返す', () => {
      const config: Partial<AppConfig> = {
        lycheeRedmine: {
          url: '',
          apiKey: 'valid-api-key',
        },
        server: {
          logLevel: 'INFO',
          timeout: 30000,
          retryMaxAttempts: 3,
        },
      };

      const result = validator.validate(config);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('missing_required');
        expect(result.error.field).toBe('lycheeRedmine.url');
      }
    });

    it('LYCHEE_REDMINE_API_KEYが存在しない場合はエラーを返す', () => {
      const config: Partial<AppConfig> = {
        lycheeRedmine: {
          url: 'https://example.com',
          apiKey: '',
        },
        server: {
          logLevel: 'INFO',
          timeout: 30000,
          retryMaxAttempts: 3,
        },
      };

      const result = validator.validate(config);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('missing_required');
        expect(result.error.field).toBe('lycheeRedmine.apiKey');
      }
    });

    it('lycheeRedmineセクション全体が存在しない場合はエラーを返す', () => {
      const config: Partial<AppConfig> = {
        server: {
          logLevel: 'INFO',
          timeout: 30000,
          retryMaxAttempts: 3,
        },
      };

      const result = validator.validate(config);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('missing_required');
      }
    });
  });

  describe('URLフォーマットの検証', () => {
    it('HTTPSでないURLの場合はエラーを返す', () => {
      const config: Partial<AppConfig> = {
        lycheeRedmine: {
          url: 'http://example.com',
          apiKey: 'valid-api-key',
        },
        server: {
          logLevel: 'INFO',
          timeout: 30000,
          retryMaxAttempts: 3,
        },
      };

      const result = validator.validate(config);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid_format');
        expect(result.error.field).toBe('lycheeRedmine.url');
        expect(result.error.message).toContain('HTTPS');
      }
    });

    it('不正なURL形式の場合はエラーを返す', () => {
      const config: Partial<AppConfig> = {
        lycheeRedmine: {
          url: 'not-a-valid-url',
          apiKey: 'valid-api-key',
        },
        server: {
          logLevel: 'INFO',
          timeout: 30000,
          retryMaxAttempts: 3,
        },
      };

      const result = validator.validate(config);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid_format');
        expect(result.error.field).toBe('lycheeRedmine.url');
      }
    });

    it('HTTPSのURLの場合は成功する', () => {
      const config: Partial<AppConfig> = {
        lycheeRedmine: {
          url: 'https://example.com',
          apiKey: 'valid-api-key',
        },
        server: {
          logLevel: 'INFO',
          timeout: 30000,
          retryMaxAttempts: 3,
        },
      };

      const result = validator.validate(config);

      expect(result.ok).toBe(true);
    });

    it('HTTPSのURLで末尾スラッシュがある場合も成功する', () => {
      const config: Partial<AppConfig> = {
        lycheeRedmine: {
          url: 'https://example.com/',
          apiKey: 'valid-api-key',
        },
        server: {
          logLevel: 'INFO',
          timeout: 30000,
          retryMaxAttempts: 3,
        },
      };

      const result = validator.validate(config);

      expect(result.ok).toBe(true);
    });
  });

  describe('APIキーの検証', () => {
    it('APIキーが空文字列の場合はエラーを返す', () => {
      const config: Partial<AppConfig> = {
        lycheeRedmine: {
          url: 'https://example.com',
          apiKey: '',
        },
        server: {
          logLevel: 'INFO',
          timeout: 30000,
          retryMaxAttempts: 3,
        },
      };

      const result = validator.validate(config);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('missing_required');
        expect(result.error.field).toBe('lycheeRedmine.apiKey');
      }
    });

    it('APIキーが空白のみの場合はエラーを返す', () => {
      const config: Partial<AppConfig> = {
        lycheeRedmine: {
          url: 'https://example.com',
          apiKey: '   ',
        },
        server: {
          logLevel: 'INFO',
          timeout: 30000,
          retryMaxAttempts: 3,
        },
      };

      const result = validator.validate(config);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('missing_required');
        expect(result.error.field).toBe('lycheeRedmine.apiKey');
      }
    });

    it('APIキーが有効な文字列の場合は成功する', () => {
      const config: Partial<AppConfig> = {
        lycheeRedmine: {
          url: 'https://example.com',
          apiKey: 'a1b2c3d4e5f6',
        },
        server: {
          logLevel: 'INFO',
          timeout: 30000,
          retryMaxAttempts: 3,
        },
      };

      const result = validator.validate(config);

      expect(result.ok).toBe(true);
    });
  });

  describe('オプション設定項目の検証', () => {
    it('serverセクションが存在しない場合でも、必須項目が揃っていれば成功する', () => {
      const config: Partial<AppConfig> = {
        lycheeRedmine: {
          url: 'https://example.com',
          apiKey: 'valid-api-key',
        },
      };

      const result = validator.validate(config);

      expect(result.ok).toBe(true);
      if (result.ok) {
        // デフォルト値が適用されることを確認
        expect(result.value.server.logLevel).toBe('INFO');
        expect(result.value.server.timeout).toBe(30000);
        expect(result.value.server.retryMaxAttempts).toBe(3);
      }
    });

    it('部分的なserver設定でも、デフォルト値で補完される', () => {
      const config: Partial<AppConfig> = {
        lycheeRedmine: {
          url: 'https://example.com',
          apiKey: 'valid-api-key',
        },
        server: {
          logLevel: 'DEBUG',
          timeout: undefined as unknown as number,
          retryMaxAttempts: undefined as unknown as number,
        },
      };

      const result = validator.validate(config);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.server.logLevel).toBe('DEBUG');
        expect(result.value.server.timeout).toBe(30000);
        expect(result.value.server.retryMaxAttempts).toBe(3);
      }
    });

    it('不正なlogLevelの場合はエラーを返す', () => {
      const config: Partial<AppConfig> = {
        lycheeRedmine: {
          url: 'https://example.com',
          apiKey: 'valid-api-key',
        },
        server: {
          logLevel: 'INVALID' as 'INFO',
          timeout: 30000,
          retryMaxAttempts: 3,
        },
      };

      const result = validator.validate(config);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid_format');
        expect(result.error.field).toBe('server.logLevel');
      }
    });

    it('timeoutが負の値の場合はエラーを返す', () => {
      const config: Partial<AppConfig> = {
        lycheeRedmine: {
          url: 'https://example.com',
          apiKey: 'valid-api-key',
        },
        server: {
          logLevel: 'INFO',
          timeout: -1000,
          retryMaxAttempts: 3,
        },
      };

      const result = validator.validate(config);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid_format');
        expect(result.error.field).toBe('server.timeout');
      }
    });

    it('retryMaxAttemptsが負の値の場合はエラーを返す', () => {
      const config: Partial<AppConfig> = {
        lycheeRedmine: {
          url: 'https://example.com',
          apiKey: 'valid-api-key',
        },
        server: {
          logLevel: 'INFO',
          timeout: 30000,
          retryMaxAttempts: -1,
        },
      };

      const result = validator.validate(config);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid_format');
        expect(result.error.field).toBe('server.retryMaxAttempts');
      }
    });
  });

  describe('完全な設定の検証', () => {
    it('すべての設定が正しい場合は、完全なAppConfigを返す', () => {
      const config: Partial<AppConfig> = {
        lycheeRedmine: {
          url: 'https://redmine.example.com',
          apiKey: 'my-secret-api-key-123',
        },
        server: {
          logLevel: 'WARN',
          timeout: 60000,
          retryMaxAttempts: 5,
        },
      };

      const result = validator.validate(config);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual({
          lycheeRedmine: {
            url: 'https://redmine.example.com',
            apiKey: 'my-secret-api-key-123',
          },
          server: {
            logLevel: 'WARN',
            timeout: 60000,
            retryMaxAttempts: 5,
          },
        });
      }
    });
  });
});
