#!/usr/bin/env node

/**
 * Reset Database Script
 *
 * Drops all tables and recreates them from migrations.
 * Use with caution - this will delete all data!
 *
 * Usage: node scripts/reset-database.mjs
 */

import postgres from 'postgres';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file
function loadEnv() {
  try {
    const envPath = join(__dirname, '../.env');
    const envContent = readFileSync(envPath, 'utf-8');

    envContent.split('\n').forEach(line => {
      line = line.trim();
      if (!line || line.startsWith('#')) return;

      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();

        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }

        // Unescape dollar signs
        value = value.replace(/\\\$/g, '$');

        process.env[key] = value;
      }
    });
  } catch (error) {
    // .env file not found, continue with existing env vars
  }
}

loadEnv();

// Get database URL from environment
const databaseUrl = 
  process.env.SIGNALFEED_DATABASE_URL ??
  process.env.SIGHTSIGNAL_DATABASE_URL ??
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL;

if (!databaseUrl) {
  console.error('❌ No database URL found');
  console.error('   Please set SIGNALFEED_DATABASE_URL, DATABASE_URL, or POSTGRES_URL');
  process.exit(1);
}

const sql = postgres(databaseUrl);

async function dropAllTables() {
  console.log('🗑️  Dropping all existing tables...');
  
  try {
    // Drop tables in reverse dependency order
    await sql`DROP TABLE IF EXISTS signal_subscriptions CASCADE`;
    await sql`DROP TABLE IF EXISTS signals CASCADE`;
    await sql`DROP TABLE IF EXISTS sighting_reactions CASCADE`;
    await sql`DROP TABLE IF EXISTS reputation_events CASCADE`;
    await sql`DROP TABLE IF EXISTS user_reputation CASCADE`;
    await sql`DROP TABLE IF EXISTS subscriptions CASCADE`;
    await sql`DROP TABLE IF EXISTS geofences CASCADE`;
    await sql`DROP TABLE IF EXISTS sightings CASCADE`;
    await sql`DROP TABLE IF EXISTS sighting_types CASCADE`;
    await sql`DROP TABLE IF EXISTS subcategories CASCADE`;
    await sql`DROP TABLE IF EXISTS categories CASCADE`;
    await sql`DROP TABLE IF EXISTS users CASCADE`;
    
    console.log('✅ All tables dropped successfully');
  } catch (error) {
    console.error('❌ Error dropping tables:', error.message);
    throw error;
  }
}

async function runMigrations() {
  console.log('📦 Running migrations...');
  
  const migrationsDir = join(__dirname, '../db/migrations');
  
  try {
    // Get all migration files in order
    const files = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    for (const file of files) {
      console.log(`  Running ${file}...`);
      const migrationPath = join(migrationsDir, file);
      const migrationSql = readFileSync(migrationPath, 'utf-8');
      
      // Execute migration
      await sql.unsafe(migrationSql);
      console.log(`  ✅ ${file} completed`);
    }
    
    console.log('✅ All migrations completed successfully');
  } catch (error) {
    console.error('❌ Error running migrations:', error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting database reset...\n');
  
  try {
    await dropAllTables();
    console.log('');
    await runMigrations();
    
    console.log('\n✨ Database reset complete!');
    console.log('   Run "node scripts/seed-database.mjs" to populate with seed data');
  } catch (error) {
    console.error('\n❌ Database reset failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
