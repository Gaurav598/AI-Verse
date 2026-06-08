'use strict';

/**
 * Environment Variable Validator
 * AI Content Intelligence Platform
 *
 * Validates all required environment variables at startup.
 * Fails fast with clear error messages rather than cryptic runtime errors.
 */

const REQUIRED_VARS = [
  // Core Strapi secrets
  { key: 'APP_KEYS', description: 'Strapi app encryption keys (comma-separated)' },
  { key: 'API_TOKEN_SALT', description: 'Strapi API token salt' },
  { key: 'ADMIN_JWT_SECRET', description: 'Strapi admin JWT secret' },
  { key: 'JWT_SECRET', description: 'User JWT secret' },
];

const RECOMMENDED_VARS = [
  { key: 'GEMINI_API_KEY', description: 'Google Gemini API key (required for AI features)' },
  { key: 'REDIS_PASSWORD', description: 'Redis password (required for caching and jobs)' },
  { key: 'DATABASE_PASSWORD', description: 'PostgreSQL password' },
];

const VALIDATORS = {
  DATABASE_CLIENT: (val) => {
    if (!['postgres', 'mysql', 'sqlite'].includes(val)) {
      return `Must be one of: postgres, mysql, sqlite`;
    }
  },
  DATABASE_PORT: (val) => {
    const port = parseInt(val, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      return `Must be a valid port number (1-65535)`;
    }
  },
  GEMINI_RATE_LIMIT_RPM: (val) => {
    const n = parseInt(val, 10);
    if (isNaN(n) || n < 1) return `Must be a positive integer`;
  },
};

/**
 * Validate environment configuration
 * @param {Object} env - The env object (strapi env function or process.env)
 * @param {boolean} strict - If true, throw on missing required vars
 */
function validateEnv(env = process.env, strict = true) {
  const errors = [];
  const warnings = [];

  // Check required variables
  for (const { key, description } of REQUIRED_VARS) {
    const value = env[key];
    if (!value || value.trim() === '') {
      errors.push(`  ✗ ${key}: ${description}`);
    } else if (value.includes('toBeModified') || value.includes('tobemodified')) {
      errors.push(`  ✗ ${key}: Still using placeholder value — generate a real secret`);
    }
  }

  // Check recommended variables
  for (const { key, description } of RECOMMENDED_VARS) {
    const value = env[key];
    if (!value || value.trim() === '') {
      warnings.push(`  ⚠ ${key}: ${description}`);
    }
  }

  // Run custom validators
  for (const [key, validator] of Object.entries(VALIDATORS)) {
    const value = env[key];
    if (value) {
      const error = validator(value);
      if (error) {
        errors.push(`  ✗ ${key}: ${error}`);
      }
    }
  }

  // Check PostgreSQL is configured in production
  const nodeEnv = env.NODE_ENV || 'development';
  if (nodeEnv === 'production') {
    const dbClient = env.DATABASE_CLIENT || 'sqlite';
    if (dbClient === 'sqlite') {
      errors.push('  ✗ DATABASE_CLIENT: SQLite is not allowed in production. Use postgres.');
    }
  }

  // Report
  if (warnings.length > 0) {
    console.warn('\n⚠️  Environment Warnings (some features may be disabled):');
    warnings.forEach(w => console.warn(w));
    console.warn('');
  }

  if (errors.length > 0) {
    const separator = '═'.repeat(60);
    const message = [
      '',
      separator,
      '  FATAL: Invalid Environment Configuration',
      separator,
      '',
      'The following required environment variables are missing or invalid:',
      '',
      ...errors,
      '',
      'Copy .env.example to .env and fill in all required values.',
      'See .env.example for descriptions and defaults.',
      '',
      separator,
      '',
    ].join('\n');

    if (strict) {
      throw new Error(message);
    } else {
      console.error(message);
      return false;
    }
  }

  return true;
}

module.exports = { validateEnv };
