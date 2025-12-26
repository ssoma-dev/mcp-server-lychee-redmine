/**
 * Error Handler Service
 * Provides standardized error conversion and handling
 */

import { AxiosError } from 'axios';

export interface ApiError {
  code: number;
  message: string;
  endpoint: string;
  timestamp: string;
  requestId?: string;
}

/**
 * Converts Axios HTTP error to standardized ApiError
 */
export function fromHttpError(error: AxiosError, endpoint: string): ApiError {
  const timestamp = new Date().toISOString();

  // Handle network errors (no response)
  if (!error.response) {
    return {
      code: 0,
      message: error.message || 'Network error',
      endpoint,
      timestamp,
    };
  }

  const { status, statusText, headers } = error.response;

  // Extract request ID from response headers if available
  const requestId = headers?.['x-request-id'] as string | undefined;

  return {
    code: status,
    message: statusText || `HTTP ${status} error`,
    endpoint,
    timestamp,
    requestId,
  };
}

/**
 * Converts generic Error to standardized ApiError
 */
export function fromError(error: Error, endpoint: string): ApiError {
  const timestamp = new Date().toISOString();

  return {
    code: 500,
    message: error.message || 'Internal error',
    endpoint,
    timestamp,
  };
}
