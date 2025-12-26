import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { logger, LogLevel } from './logger.js';

describe('Logger', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  const originalEnv = process.env.LOG_LEVEL;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    process.env.LOG_LEVEL = originalEnv;
  });

  describe('Log Levels', () => {
    it('should support DEBUG level logging', () => {
      process.env.LOG_LEVEL = 'DEBUG';
      logger.debug('Debug message', { detail: 'test' });

      expect(consoleLogSpy).toHaveBeenCalled();
      const logOutput = JSON.parse(consoleLogSpy.mock.calls[0]?.[0] as string);
      expect(logOutput.level).toBe('DEBUG');
      expect(logOutput.message).toBe('Debug message');
      expect(logOutput.meta).toEqual({ detail: 'test' });
    });

    it('should support INFO level logging', () => {
      process.env.LOG_LEVEL = 'INFO';
      logger.info('Info message');

      expect(consoleLogSpy).toHaveBeenCalled();
      const logOutput = JSON.parse(consoleLogSpy.mock.calls[0]?.[0] as string);
      expect(logOutput.level).toBe('INFO');
      expect(logOutput.message).toBe('Info message');
    });

    it('should support WARN level logging', () => {
      process.env.LOG_LEVEL = 'WARN';
      logger.warn('Warning message');

      expect(consoleLogSpy).toHaveBeenCalled();
      const logOutput = JSON.parse(consoleLogSpy.mock.calls[0]?.[0] as string);
      expect(logOutput.level).toBe('WARN');
      expect(logOutput.message).toBe('Warning message');
    });

    it('should support ERROR level logging', () => {
      process.env.LOG_LEVEL = 'ERROR';
      const error = new Error('Test error');
      logger.error('Error occurred', error);

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = JSON.parse(
        consoleErrorSpy.mock.calls[0]?.[0] as string
      );
      expect(logOutput.level).toBe('ERROR');
      expect(logOutput.message).toBe('Error occurred');
      expect(logOutput.error?.name).toBe('Error');
      expect(logOutput.error?.message).toBe('Test error');
      expect(logOutput.error?.stack).toBeDefined();
    });
  });

  describe('Log Level Filtering', () => {
    it('should not log DEBUG when LOG_LEVEL is INFO', () => {
      process.env.LOG_LEVEL = 'INFO';
      logger.debug('Should not appear');

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should not log INFO when LOG_LEVEL is WARN', () => {
      process.env.LOG_LEVEL = 'WARN';
      logger.info('Should not appear');

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should not log WARN when LOG_LEVEL is ERROR', () => {
      process.env.LOG_LEVEL = 'ERROR';
      logger.warn('Should not appear');

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should default to INFO level when LOG_LEVEL is not set', () => {
      delete process.env.LOG_LEVEL;
      logger.debug('Should not appear');
      logger.info('Should appear');

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Sensitive Data Masking', () => {
    it('should mask apiKey in metadata', () => {
      process.env.LOG_LEVEL = 'INFO';
      logger.info('API call', { apiKey: 'secret-key-123', url: '/api/test' });

      const logOutput = JSON.parse(consoleLogSpy.mock.calls[0]?.[0] as string);
      expect(logOutput.meta?.apiKey).toBe('***MASKED***');
      expect(logOutput.meta?.url).toBe('/api/test');
    });

    it('should mask password in metadata', () => {
      process.env.LOG_LEVEL = 'INFO';
      logger.info('Login', { password: 'secret-pass', username: 'user1' });

      const logOutput = JSON.parse(consoleLogSpy.mock.calls[0]?.[0] as string);
      expect(logOutput.meta?.password).toBe('***MASKED***');
      expect(logOutput.meta?.username).toBe('user1');
    });

    it('should mask api_key (snake_case) in metadata', () => {
      process.env.LOG_LEVEL = 'INFO';
      logger.info('Config', { api_key: 'secret', other: 'data' });

      const logOutput = JSON.parse(consoleLogSpy.mock.calls[0]?.[0] as string);
      expect(logOutput.meta?.api_key).toBe('***MASKED***');
      expect(logOutput.meta?.other).toBe('data');
    });
  });

  describe('Structured Logging', () => {
    it('should include timestamp in ISO 8601 format', () => {
      process.env.LOG_LEVEL = 'INFO';
      logger.info('Test message');

      const logOutput = JSON.parse(consoleLogSpy.mock.calls[0]?.[0] as string);
      expect(logOutput.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
    });

    it('should output valid JSON format', () => {
      process.env.LOG_LEVEL = 'INFO';
      logger.info('Test', { key: 'value' });

      expect(() => {
        JSON.parse(consoleLogSpy.mock.calls[0]?.[0] as string);
      }).not.toThrow();
    });
  });

  describe('Performance Measurement', () => {
    it('should measure execution time of async function', async () => {
      process.env.LOG_LEVEL = 'INFO';

      const result = await logger.measureTime('test-operation', async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return 'success';
      });

      expect(result).toBe('success');
      expect(consoleLogSpy).toHaveBeenCalled();

      const logOutput = JSON.parse(consoleLogSpy.mock.calls[0]?.[0] as string);
      expect(logOutput.message).toContain('test-operation');
      expect(logOutput.duration).toBeGreaterThanOrEqual(100);
      expect(logOutput.duration).toBeLessThan(200);
    });

    it('should propagate errors from measured function', async () => {
      process.env.LOG_LEVEL = 'INFO';
      const testError = new Error('Test error');

      await expect(
        logger.measureTime('failing-operation', async () => {
          throw testError;
        })
      ).rejects.toThrow('Test error');
    });
  });
});
