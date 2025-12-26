import { describe, it, expect } from 'vitest';
import { fromHttpError, fromError, ApiError } from './error-handler.js';
import { AxiosError } from 'axios';

describe('Error Handler', () => {
  describe('fromHttpError', () => {
    it('should convert 400 Bad Request to ApiError', () => {
      const axiosError = {
        response: {
          status: 400,
          statusText: 'Bad Request',
          data: { error: 'Invalid parameters' },
        },
        config: { url: '/api/test' },
      } as AxiosError;

      const result = fromHttpError(axiosError, '/api/test');

      expect(result.code).toBe(400);
      expect(result.message).toContain('Bad Request');
      expect(result.endpoint).toBe('/api/test');
      expect(result.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
    });

    it('should convert 401 Unauthorized to ApiError', () => {
      const axiosError = {
        response: {
          status: 401,
          statusText: 'Unauthorized',
          data: {},
        },
        config: { url: '/api/projects' },
      } as AxiosError;

      const result = fromHttpError(axiosError, '/api/projects');

      expect(result.code).toBe(401);
      expect(result.message).toContain('Unauthorized');
      expect(result.endpoint).toBe('/api/projects');
    });

    it('should convert 403 Forbidden to ApiError', () => {
      const axiosError = {
        response: {
          status: 403,
          statusText: 'Forbidden',
          data: {},
        },
        config: { url: '/api/issues' },
      } as AxiosError;

      const result = fromHttpError(axiosError, '/api/issues');

      expect(result.code).toBe(403);
      expect(result.message).toContain('Forbidden');
    });

    it('should convert 404 Not Found to ApiError', () => {
      const axiosError = {
        response: {
          status: 404,
          statusText: 'Not Found',
          data: {},
        },
        config: { url: '/api/projects/999' },
      } as AxiosError;

      const result = fromHttpError(axiosError, '/api/projects/999');

      expect(result.code).toBe(404);
      expect(result.message).toContain('Not Found');
    });

    it('should convert 409 Conflict to ApiError', () => {
      const axiosError = {
        response: {
          status: 409,
          statusText: 'Conflict',
          data: { error: 'Version conflict' },
        },
        config: { url: '/api/issues/123' },
      } as AxiosError;

      const result = fromHttpError(axiosError, '/api/issues/123');

      expect(result.code).toBe(409);
      expect(result.message).toContain('Conflict');
    });

    it('should convert 422 Unprocessable Entity to ApiError', () => {
      const axiosError = {
        response: {
          status: 422,
          statusText: 'Unprocessable Entity',
          data: { errors: ['Project ID is required'] },
        },
        config: { url: '/api/issues' },
      } as AxiosError;

      const result = fromHttpError(axiosError, '/api/issues');

      expect(result.code).toBe(422);
      expect(result.message).toContain('Unprocessable Entity');
    });

    it('should convert 500 Internal Server Error to ApiError', () => {
      const axiosError = {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: {},
        },
        config: { url: '/api/projects' },
      } as AxiosError;

      const result = fromHttpError(axiosError, '/api/projects');

      expect(result.code).toBe(500);
      expect(result.message).toContain('Internal Server Error');
    });

    it('should convert 502 Bad Gateway to ApiError', () => {
      const axiosError = {
        response: {
          status: 502,
          statusText: 'Bad Gateway',
          data: {},
        },
        config: { url: '/api/test' },
      } as AxiosError;

      const result = fromHttpError(axiosError, '/api/test');

      expect(result.code).toBe(502);
      expect(result.message).toContain('Bad Gateway');
    });

    it('should convert 503 Service Unavailable to ApiError', () => {
      const axiosError = {
        response: {
          status: 503,
          statusText: 'Service Unavailable',
          data: {},
        },
        config: { url: '/api/test' },
      } as AxiosError;

      const result = fromHttpError(axiosError, '/api/test');

      expect(result.code).toBe(503);
      expect(result.message).toContain('Service Unavailable');
    });

    it('should convert 504 Gateway Timeout to ApiError', () => {
      const axiosError = {
        response: {
          status: 504,
          statusText: 'Gateway Timeout',
          data: {},
        },
        config: { url: '/api/test' },
      } as AxiosError;

      const result = fromHttpError(axiosError, '/api/test');

      expect(result.code).toBe(504);
      expect(result.message).toContain('Gateway Timeout');
    });

    it('should handle axios error without response (network error)', () => {
      const axiosError = {
        message: 'Network Error',
        config: { url: '/api/test' },
      } as AxiosError;

      const result = fromHttpError(axiosError, '/api/test');

      expect(result.code).toBe(0);
      expect(result.message).toContain('Network Error');
      expect(result.endpoint).toBe('/api/test');
    });

    it('should include request ID if provided in response headers', () => {
      const axiosError = {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: {},
          headers: {
            'x-request-id': 'req-12345',
          },
        },
        config: { url: '/api/test' },
      } as AxiosError;

      const result = fromHttpError(axiosError, '/api/test');

      expect(result.requestId).toBe('req-12345');
    });
  });

  describe('fromError', () => {
    it('should convert generic Error to ApiError', () => {
      const error = new Error('Something went wrong');
      const result = fromError(error, '/api/test');

      expect(result.code).toBe(500);
      expect(result.message).toContain('Something went wrong');
      expect(result.endpoint).toBe('/api/test');
      expect(result.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
    });

    it('should convert TypeError to ApiError', () => {
      const error = new TypeError('Invalid type');
      const result = fromError(error, '/api/validation');

      expect(result.code).toBe(500);
      expect(result.message).toContain('Invalid type');
      expect(result.endpoint).toBe('/api/validation');
    });

    it('should handle errors with empty message', () => {
      const error = new Error('');
      const result = fromError(error, '/api/test');

      expect(result.code).toBe(500);
      expect(result.message).toBeTruthy();
      expect(result.endpoint).toBe('/api/test');
    });
  });

  describe('ApiError structure', () => {
    it('should always include timestamp in ISO 8601 format', () => {
      const error = new Error('Test');
      const result = fromError(error, '/api/test');

      expect(result.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });

    it('should always include endpoint information', () => {
      const error = new Error('Test');
      const result = fromError(error, '/api/custom/endpoint');

      expect(result.endpoint).toBe('/api/custom/endpoint');
    });

    it('should categorize errors correctly', () => {
      const validationError = {
        response: { status: 400, statusText: 'Bad Request', data: {} },
        config: { url: '/api/test' },
      } as AxiosError;

      const authError = {
        response: { status: 401, statusText: 'Unauthorized', data: {} },
        config: { url: '/api/test' },
      } as AxiosError;

      const notFoundError = {
        response: { status: 404, statusText: 'Not Found', data: {} },
        config: { url: '/api/test' },
      } as AxiosError;

      const serverError = {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: {},
        },
        config: { url: '/api/test' },
      } as AxiosError;

      expect(fromHttpError(validationError, '/api/test').code).toBe(400);
      expect(fromHttpError(authError, '/api/test').code).toBe(401);
      expect(fromHttpError(notFoundError, '/api/test').code).toBe(404);
      expect(fromHttpError(serverError, '/api/test').code).toBe(500);
    });
  });
});
