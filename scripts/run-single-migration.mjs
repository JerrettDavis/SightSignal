#!/usr/bin/env node

/**
 * Run Single Migration
 * Runs a specific migration file against production database
 */

import postgres from 'postgres';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.production.local
function loadEnv() {
  try {
    const envPath = join(__dirname, '../.env.production.local');
    const envContent = readFileSync(envPath, 'utf-8');

    envContent.split('\n').forEach(line => {
      line = line.trim();
      if (!line || line.startsWith('#')) return;

      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();

        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }

        process.env[key] = value;
      }
    });
  } catch (error) {
    console.error('⚠️  Could not load .env.production.local');
  }
}

loadEnv();

const databaseUrl = process.env.POSTGRES_URL || 
                    process.env.SIGNALFEED_DATABASE_URL || 
                    process.env.SIGHTSIGNAL_DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ No database URL found');
  process.exit(1);
}

const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('❌ Usage: node run-single-migration.mjs <migration-file>');
  console.error('   Example: node run-single-migration.mjs 008_fix_signal_subscriptions_schema.sql');
  process.exit(1);
}

console.log(`📊 Connecting to production database...`);
const sql = postgres(databaseUrl);

async function runMigration() {
  const migrationPath = join(__dirname, '../db/migrations', migrationFile);
  
  try {
    console.log(`📦 Running ${migrationFile}...\n`);
    const migrationSql = readFileSync(migrationPath, 'utf-8');
    
    await sql.unsafe(migrationSql);
    console.log(`✅ Migration completed successfully`);
  } catch (error) {
    console.error('\n❌ Error running migration:', error.message);
    throw error;
  }
}

async function main() {
  try {
    await runMigration();
    console.log('\n✨ Done!');
  } catch (error) {
    console.error('\n❌ Migration failed');
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
