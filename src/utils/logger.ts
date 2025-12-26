/**
 * Logger Service
 * Provides structured logging with sensitive data masking
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  meta?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  duration?: number;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const SENSITIVE_FIELDS = ['apiKey', 'api_key', 'password', 'token', 'secret'];

/**
 * Masks sensitive data in metadata
 */
function maskSensitiveData(
  meta: Record<string, unknown>
): Record<string, unknown> {
  const masked: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(meta)) {
    if (SENSITIVE_FIELDS.includes(key)) {
      masked[key] = '***MASKED***';
    } else {
      masked[key] = value;
    }
  }

  return masked;
}

/**
 * Gets current log level from environment or defaults to INFO
 */
function getCurrentLogLevel(): LogLevel {
  const envLevel = process.env['LOG_LEVEL']?.toUpperCase();
  if (
    envLevel === 'DEBUG' ||
    envLevel === 'INFO' ||
    envLevel === 'WARN' ||
    envLevel === 'ERROR'
  ) {
    return envLevel;
  }
  return 'INFO';
}

/**
 * Checks if a log level should be output based on current configuration
 */
function shouldLog(level: LogLevel): boolean {
  const currentLevel = getCurrentLogLevel();
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

/**
 * Outputs a log entry to console
 */
function outputLog(entry: LogEntry): void {
  const output = JSON.stringify(entry);

  if (entry.level === 'ERROR') {
    console.error(output);
  } else {
    console.log(output);
  }
}

/**
 * Creates a log entry with timestamp
 */
function createLogEntry(
  level: LogLevel,
  message: string,
  meta?: Record<string, unknown>
): LogEntry {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };

  if (meta) {
    entry.meta = maskSensitiveData(meta);
  }

  return entry;
}

export const logger = {
  debug(message: string, meta?: Record<string, unknown>): void {
    if (!shouldLog('DEBUG')) return;
    const entry = createLogEntry('DEBUG', message, meta);
    outputLog(entry);
  },

  info(message: string, meta?: Record<string, unknown>): void {
    if (!shouldLog('INFO')) return;
    const entry = createLogEntry('INFO', message, meta);
    outputLog(entry);
  },

  warn(message: string, meta?: Record<string, unknown>): void {
    if (!shouldLog('WARN')) return;
    const entry = createLogEntry('WARN', message, meta);
    outputLog(entry);
  },

  error(message: string, error: Error, meta?: Record<string, unknown>): void {
    if (!shouldLog('ERROR')) return;
    const entry = createLogEntry('ERROR', message, meta);
    entry.error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
    outputLog(entry);
  },

  async measureTime<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;

      if (shouldLog('INFO')) {
        const entry = createLogEntry('INFO', `${label} completed`);
        entry.duration = duration;
        outputLog(entry);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - start;

      if (shouldLog('ERROR') && error instanceof Error) {
        const entry = createLogEntry('ERROR', `${label} failed`);
        entry.duration = duration;
        entry.error = {
          name: error.name,
          message: error.message,
          stack: error.stack,
        };
        outputLog(entry);
      }

      throw error;
    }
  },
};
