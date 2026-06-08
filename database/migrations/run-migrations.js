#!/usr/bin/env node
/**
 * Database Migration Runner
 * AI Content Intelligence Platform
 *
 * Runs SQL migrations in order, tracking which have been applied.
 * Safe to run multiple times — idempotent.
 *
 * Usage:
 *   node database/migrations/run-migrations.js
 *   DATABASE_URL=postgresql://... node database/migrations/run-migrations.js
 */

'use strict';

require('dotenv').config();

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MIGRATIONS_DIR = path.join(__dirname);
const MIGRATION_TABLE = 'schema_migrations';

/**
 * Get database connection config
 */
function getDbConfig() {
  if (process.env.DATABASE_URL) {
    return { connectionString: process.env.DATABASE_URL };
  }
  return {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    database: process.env.DATABASE_NAME || 'ai_cms',
    user: process.env.DATABASE_USERNAME || 'strapi',
    password: process.env.DATABASE_PASSWORD || 'strapi_secret',
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  };
}

/**
 * Ensure the migration tracking table exists
 */
async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
      id          SERIAL PRIMARY KEY,
      filename    VARCHAR(255) NOT NULL UNIQUE,
      checksum    VARCHAR(64) NOT NULL,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  console.log(`✓ Migration tracking table ready`);
}

/**
 * Get list of already-applied migrations
 */
async function getAppliedMigrations(client) {
  const result = await client.query(
    `SELECT filename, checksum FROM ${MIGRATION_TABLE} ORDER BY id`
  );
  return new Map(result.rows.map(row => [row.filename, row.checksum]));
}

/**
 * Get all migration files sorted
 */
function getMigrationFiles() {
  return fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql') && f.match(/^\d+_/))
    .sort();
}

/**
 * Compute SHA-256 checksum of file content
 */
function fileChecksum(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Run a single migration file
 */
async function runMigration(client, filename) {
  const filePath = path.join(MIGRATIONS_DIR, filename);
  const sql = fs.readFileSync(filePath, 'utf8');
  const checksum = fileChecksum(filePath);

  console.log(`\n→ Running: ${filename}`);
  const start = Date.now();

  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query(
      `INSERT INTO ${MIGRATION_TABLE} (filename, checksum) VALUES ($1, $2)`,
      [filename, checksum]
    );
    await client.query('COMMIT');
    const ms = Date.now() - start;
    console.log(`  ✓ Applied in ${ms}ms`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw new Error(`Migration ${filename} failed: ${err.message}`);
  }
}

/**
 * Main migration runner
 */
async function runMigrations() {
  console.log('='.repeat(60));
  console.log('AI CMS — Database Migration Runner');
  console.log('='.repeat(60));

  const client = new Client(getDbConfig());
  await client.connect();
  console.log(`✓ Connected to PostgreSQL: ${process.env.DATABASE_NAME || 'ai_cms'}`);

  try {
    await ensureMigrationsTable(client);

    const applied = await getAppliedMigrations(client);
    const files = getMigrationFiles();

    // Verify checksums of already-applied migrations
    for (const filename of files) {
      if (applied.has(filename)) {
        const filePath = path.join(MIGRATIONS_DIR, filename);
        const currentChecksum = fileChecksum(filePath);
        const storedChecksum = applied.get(filename);
        if (currentChecksum !== storedChecksum) {
          throw new Error(
            `Checksum mismatch for ${filename}. ` +
            `Migration was modified after being applied. ` +
            `This is dangerous — create a new migration instead.`
          );
        }
      }
    }

    const pending = files.filter(f => !applied.has(f));

    if (pending.length === 0) {
      console.log('\n✓ All migrations are up to date. Nothing to run.');
    } else {
      console.log(`\n${pending.length} pending migration(s):`);
      pending.forEach(f => console.log(`  - ${f}`));

      for (const filename of pending) {
        await runMigration(client, filename);
      }

      console.log(`\n✓ Successfully applied ${pending.length} migration(s)`);
    }
  } finally {
    await client.end();
    console.log('\n✓ Database connection closed');
    console.log('='.repeat(60));
  }
}

// Run
runMigrations().catch(err => {
  console.error('\n✗ Migration failed:', err.message);
  process.exit(1);
});
