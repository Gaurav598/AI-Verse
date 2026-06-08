'use strict';

/**
 * Job System Index
 * AI Content Intelligence Platform
 *
 * Initializes all BullMQ queues, workers, and scheduled jobs.
 * Called from src/index.js during Strapi bootstrap.
 */

const { Queue, Worker, QueueScheduler, QueueEvents } = require('bullmq');
const logger = require('../services/logger.service');
const cacheService = require('../services/cache.service');

// ----------------------------------------------------------------
// Queue Registry
// ----------------------------------------------------------------
const queues = {};
const workers = {};

// ----------------------------------------------------------------
// Redis connection (shared)
// ----------------------------------------------------------------
function getRedisConnection() {
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false,
  };
}

// ----------------------------------------------------------------
// Queue Definitions
// ----------------------------------------------------------------
const QUEUE_CONFIGS = {
  'ai-generation': {
    defaultJobOptions: {
      attempts: parseInt(process.env.JOB_MAX_RETRIES_AI || '3', 10),
      backoff: { type: 'exponential', delay: parseInt(process.env.JOB_RETRY_DELAY_AI || '1000', 10) },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 500 },
    },
  },
  'embedding': {
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'fixed', delay: 5000 },
      removeOnComplete: { count: 500 },
      removeOnFail: { count: 200 },
    },
  },
  'analytics': {
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    },
  },
  'email': {
    defaultJobOptions: {
      attempts: parseInt(process.env.JOB_MAX_RETRIES_EMAIL || '5', 10),
      backoff: { type: 'fixed', delay: parseInt(process.env.JOB_RETRY_DELAY_EMAIL || '30000', 10) },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 500 },
    },
  },
  'notification': {
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { count: 500 },
      removeOnFail: { count: 200 },
    },
  },
  'dead-letter': {
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: false, // Keep failed jobs for inspection
      removeOnFail: false,
    },
  },
};

/**
 * Initialize all queues
 */
function initQueues() {
  const connection = getRedisConnection();

  for (const [name, config] of Object.entries(QUEUE_CONFIGS)) {
    queues[name] = new Queue(name, {
      connection,
      ...config,
    });

    queues[name].on('error', (err) => {
      logger.error(`Queue error [${name}]`, { error: err.message });
    });

    logger.info(`Queue initialized: ${name}`);
  }

  return queues;
}

/**
 * Initialize all workers
 */
function initWorkers() {
  const connection = getRedisConnection();

  // Embedding Worker
  workers['embedding'] = new Worker(
    'embedding',
    async (job) => {
      const embeddingService = require('../plugins/search/server/services/embedding.service');
      const { articleId, article } = job.data;

      logger.info(`Processing embedding job`, { jobId: job.id, articleId });
      return embeddingService.generateAndStore(articleId, article);
    },
    {
      connection,
      concurrency: parseInt(process.env.JOB_CONCURRENCY_EMBEDDING || '2', 10),
    }
  );

  // AI Generation Worker
  workers['ai-generation'] = new Worker(
    'ai-generation',
    async (job) => {
      const { type, payload } = job.data;
      const aiContentService = require('../plugins/ai-content/server/services/ai-content.service');

      logger.info(`Processing AI generation job`, { jobId: job.id, type });

      switch (type) {
        case 'generate-article': return aiContentService.generateArticle(payload);
        case 'generate-summary': return aiContentService.generateSummary(payload);
        case 'generate-seo': return aiContentService.generateSeo(payload);
        case 'generate-tags': return aiContentService.generateTags(payload);
        case 'improve-content': return aiContentService.improveContent(payload);
        case 'analyze-quality': return aiContentService.analyzeQuality(payload);
        default: throw new Error(`Unknown AI job type: ${type}`);
      }
    },
    {
      connection,
      concurrency: parseInt(process.env.JOB_CONCURRENCY_AI || '3', 10),
    }
  );

  // Analytics Worker
  workers['analytics'] = new Worker(
    'analytics',
    async (job) => {
      const analyticsService = require('../plugins/analytics/server/services/analytics.service');
      const { type } = job.data;

      switch (type) {
        case 'daily-rollup': return analyticsService.dailyRollup();
        case 'trending-update': return analyticsService.recalculateTrendingScores();
        default: throw new Error(`Unknown analytics job type: ${type}`);
      }
    },
    {
      connection,
      concurrency: parseInt(process.env.JOB_CONCURRENCY_ANALYTICS || '1', 10),
    }
  );

  // Email Worker
  workers['email'] = new Worker(
    'email',
    async (job) => {
      const emailService = require('../plugins/notifications/server/services/email.service');
      const { to, subject, html, text } = job.data;

      logger.info(`Sending email`, { jobId: job.id, to, subject });
      return emailService.send({ to, subject, html, text });
    },
    {
      connection,
      concurrency: parseInt(process.env.JOB_CONCURRENCY_EMAIL || '5', 10),
    }
  );

  // Set up event listeners for all workers
  for (const [name, worker] of Object.entries(workers)) {
    worker.on('completed', (job, result) => {
      logger.jobEvent({ queue: name, jobId: job.id, event: 'completed' });
    });

    worker.on('failed', (job, err) => {
      logger.jobEvent({ queue: name, jobId: job?.id, event: 'failed', error: err });

      // Move to dead-letter queue after max retries
      if (job && job.attemptsMade >= job.opts.attempts) {
        queues['dead-letter']?.add('failed-job', {
          originalQueue: name,
          jobId: job.id,
          jobName: job.name,
          data: job.data,
          error: err.message,
          failedAt: new Date().toISOString(),
        }).catch(() => {});
      }
    });

    worker.on('error', (err) => {
      logger.error(`Worker error [${name}]`, { error: err.message });
    });
  }

  return workers;
}

/**
 * Initialize scheduled jobs (cron)
 */
async function initScheduler() {
  // Daily analytics rollup at 02:00
  await queues['analytics']?.add(
    'daily-rollup',
    { type: 'daily-rollup' },
    {
      repeat: { pattern: process.env.ANALYTICS_CRON_ROLLUP || '0 2 * * *' },
      jobId: 'daily-analytics-rollup',
    }
  );

  // Trending score update every 10 minutes
  await queues['analytics']?.add(
    'trending-update',
    { type: 'trending-update' },
    {
      repeat: { pattern: process.env.ANALYTICS_CRON_TRENDING || '*/10 * * * *' },
      jobId: 'trending-score-update',
    }
  );

  logger.info('Scheduled jobs initialized');
}

/**
 * Add an embedding job for an article
 */
function addEmbeddingJob(articleId, article) {
  return queues['embedding']?.add('generate-embeddings', { articleId, article }, {
    jobId: `embedding-${articleId}`,
    priority: 1,
  });
}

/**
 * Add an email job
 */
function addEmailJob(to, subject, html, text) {
  return queues['email']?.add('send-email', { to, subject, html, text });
}

/**
 * Get queue health status
 */
async function getQueueHealth() {
  const health = {};
  for (const [name, queue] of Object.entries(queues)) {
    try {
      const counts = await queue.getJobCounts('active', 'waiting', 'failed', 'delayed');
      health[name] = { status: 'up', ...counts };
    } catch {
      health[name] = { status: 'down' };
    }
  }
  return health;
}

/**
 * Graceful shutdown
 */
async function shutdown() {
  logger.info('Shutting down job system...');
  await Promise.all(Object.values(workers).map(w => w.close()));
  await Promise.all(Object.values(queues).map(q => q.close()));
  logger.info('Job system shut down');
}

module.exports = {
  queues,
  workers,
  initQueues,
  initWorkers,
  initScheduler,
  addEmbeddingJob,
  addEmailJob,
  getQueueHealth,
  shutdown,
};
