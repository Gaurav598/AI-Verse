'use strict';

/**
 * Logger Service
 * AI Content Intelligence Platform
 *
 * Structured JSON logging with Winston.
 * Provides request tracing, error tracking, and performance logging.
 */

const winston = require('winston');
const path = require('path');

const { combine, timestamp, json, errors, printf, colorize, align } = winston.format;

// ----------------------------------------------------------------
// Log levels
// ----------------------------------------------------------------
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const LOG_COLORS = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(LOG_COLORS);

// ----------------------------------------------------------------
// Formatters
// ----------------------------------------------------------------

/** Development formatter — human-readable colored output */
const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'HH:mm:ss' }),
  align(),
  printf(({ timestamp, level, message, requestId, userId, ...meta }) => {
    const extras = Object.keys(meta).length
      ? `\n  ${JSON.stringify(meta, null, 2)}`
      : '';
    const trace = requestId ? ` [${requestId.slice(0, 8)}]` : '';
    const user = userId ? ` (uid:${userId})` : '';
    return `${timestamp}${trace}${user} ${level}: ${message}${extras}`;
  })
);

/** Production formatter — structured JSON */
const prodFormat = combine(
  errors({ stack: true }),
  timestamp(),
  json()
);

// ----------------------------------------------------------------
// Transports
// ----------------------------------------------------------------
function buildTransports() {
  const transports = [];
  const isProduction = process.env.NODE_ENV === 'production';

  // Console
  transports.push(
    new winston.transports.Console({
      format: isProduction ? prodFormat : devFormat,
    })
  );

  // File transport (production)
  if (isProduction) {
    const logDir = process.env.LOG_FILE_PATH
      ? path.dirname(process.env.LOG_FILE_PATH)
      : path.join(process.cwd(), 'logs');

    // Combined log
    transports.push(
      new winston.transports.File({
        filename: path.join(logDir, 'app.log'),
        format: prodFormat,
        maxsize: parseLogSize(process.env.LOG_MAX_SIZE || '20m'),
        maxFiles: 14,
        tailable: true,
      })
    );

    // Error-only log
    transports.push(
      new winston.transports.File({
        filename: path.join(logDir, 'error.log'),
        level: 'error',
        format: prodFormat,
        maxsize: parseLogSize('10m'),
        maxFiles: 30,
        tailable: true,
      })
    );
  }

  return transports;
}

function parseLogSize(size) {
  const match = size.match(/^(\d+)(k|m|g)?$/i);
  if (!match) return 20 * 1024 * 1024;
  const [, num, unit] = match;
  const multipliers = { k: 1024, m: 1024 * 1024, g: 1024 * 1024 * 1024 };
  return parseInt(num) * (multipliers[unit?.toLowerCase()] || 1);
}

// ----------------------------------------------------------------
// Logger factory
// ----------------------------------------------------------------
const logger = winston.createLogger({
  levels: LOG_LEVELS,
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  transports: buildTransports(),
  exitOnError: false,
});

// ----------------------------------------------------------------
// Contextual child logger
// ----------------------------------------------------------------
logger.child = (context) => logger.child(context);

/**
 * Create a child logger with request context
 * @param {string} requestId - X-Request-ID
 * @param {string} [userId] - Authenticated user ID
 * @returns {winston.Logger}
 */
logger.forRequest = (requestId, userId) => {
  return logger.child({ requestId, userId });
};

/**
 * Log an AI request (structured)
 */
logger.aiRequest = ({ requestId, type, model, tokens, latencyMs, success, userId }) => {
  logger.info('ai_request', {
    requestId,
    type,
    model,
    tokens,
    latency_ms: latencyMs,
    success,
    userId,
    category: 'ai',
  });
};

/**
 * Log a cache event
 */
logger.cacheEvent = ({ key, hit, ttl, latencyMs }) => {
  logger.debug('cache_event', {
    key,
    hit,
    ttl,
    latency_ms: latencyMs,
    category: 'cache',
  });
};

/**
 * Log a job event
 */
logger.jobEvent = ({ queue, jobId, event, error, latencyMs }) => {
  const level = error ? 'error' : 'info';
  logger[level]('job_event', {
    queue,
    jobId,
    event,
    error: error?.message,
    latency_ms: latencyMs,
    category: 'jobs',
  });
};

module.exports = logger;
