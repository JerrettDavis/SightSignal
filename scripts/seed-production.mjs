#!/usr/bin/env node

/**
 * Production Database Seeder
 * Seeds the production database with initial data
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

console.log('📊 Connecting to production database...');
const sql = postgres(databaseUrl);

async function seedDatabase() {
  console.log('🌱 Seeding production database...\n');
  
  try {
    // Read and execute seed data SQL
    const seedPath = join(__dirname, '../db/seed-data.sql');
    const seedSql = readFileSync(seedPath, 'utf-8');
    
    console.log('📦 Inserting seed data...');
    await sql.unsafe(seedSql);
    
    console.log('✅ Seed data inserted successfully');
  } catch (error) {
    console.error('\n❌ Error seeding database:', error.message);
    throw error;
  }
}

async function main() {
  try {
    await seedDatabase();
    console.log('\n✨ Production database seeded!');
  } catch (error) {
    console.error('\n❌ Seeding failed');
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
