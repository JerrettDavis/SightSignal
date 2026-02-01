#!/usr/bin/env node

/**
 * Production Migration Runner
 * 
 * Runs migrations against production database
 * Requires POSTGRES_URL to be set in environment
 */

import postgres from 'postgres';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.production.local if exists
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

        // Remove quotes
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

// Get database URL (Vercel uses POSTGRES_URL)
const databaseUrl = process.env.POSTGRES_URL || 
                    process.env.SIGNALFEED_DATABASE_URL || 
                    process.env.SIGHTSIGNAL_DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ No database URL found');
  console.error('   Expected POSTGRES_URL, SIGNALFEED_DATABASE_URL, or SIGHTSIGNAL_DATABASE_URL');
  process.exit(1);
}

console.log('📊 Connecting to production database...');
const sql = postgres(databaseUrl);

async function runMigrations() {
  console.log('📦 Running migrations...\n');
  
  const migrationsDir = join(__dirname, '../db/migrations');
  
  try {
    // Get all migration files in order
    const files = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    console.log(`Found ${files.length} migration files:\n`);
    
    for (const file of files) {
      console.log(`  Running ${file}...`);
      const migrationPath = join(migrationsDir, file);
      const migrationSql = readFileSync(migrationPath, 'utf-8');
      
      // Execute migration
      await sql.unsafe(migrationSql);
      console.log(`  ✅ ${file} completed`);
    }
    
    console.log('\n✅ All migrations completed successfully');
  } catch (error) {
    console.error('\n❌ Error running migrations:', error.message);
    console.error('   Details:', error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting production database migration...\n');
  
  try {
    await runMigrations();
    console.log('\n✨ Migration complete!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
