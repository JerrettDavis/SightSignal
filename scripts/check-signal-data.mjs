#!/usr/bin/env node

/**
 * Check Signal Data in Production
 * Examines signals, sightings, and their relationships
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

console.log('📊 Connecting to production database...\n');
const sql = postgres(databaseUrl);

async function checkData() {
  try {
    console.log('🔍 SIGNALS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const signals = await sql`
      SELECT id, name, target, status, created_at 
      FROM signals 
      ORDER BY created_at DESC
    `;
    signals.forEach(s => {
      console.log(`  ${s.id.substring(0, 8)}... | ${s.name} | ${s.target.kind} | ${s.status}`);
      if (s.target.kind === 'geofence') {
        console.log(`    → Geofence ID: ${s.target.geofenceId}`);
      }
    });
    console.log(`  Total: ${signals.length} signals\n`);

    console.log('🎯 SIGHTINGS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const sightings = await sql`
      SELECT id, type_id, status, created_at 
      FROM sightings 
      ORDER BY created_at DESC
      LIMIT 10
    `;
    sightings.forEach(s => {
      console.log(`  ${s.id.substring(0, 8)}... | Type: ${s.type_id} | ${s.status}`);
    });
    console.log(`  Showing 10 most recent\n`);

    console.log('🔗 SIGNAL-SIGHTING ASSOCIATIONS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const associations = await sql`
      SELECT signal_id, sighting_id, created_at 
      FROM signal_sightings 
      ORDER BY created_at DESC
    `;
    console.log(`  Total: ${associations.length} associations`);
    if (associations.length > 0) {
      console.log('  Sample associations:');
      associations.slice(0, 5).forEach(a => {
        console.log(`    Signal ${a.signal_id.substring(0, 8)}... → Sighting ${a.sighting_id.substring(0, 8)}...`);
      });
    }
    console.log();

    console.log('📊 GEOFENCES:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const geofences = await sql`
      SELECT id, name, visibility 
      FROM geofences 
      ORDER BY created_at DESC
    `;
    geofences.forEach(g => {
      console.log(`  ${g.id.substring(0, 8)}... | ${g.name} | ${g.visibility}`);
    });
    console.log(`  Total: ${geofences.length} geofences\n`);

    // Check if signals reference existing geofences
    console.log('✅ GEOFENCE VALIDATION:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const geofenceIds = new Set(geofences.map(g => g.id));
    let invalidCount = 0;
    for (const signal of signals) {
      if (signal.target.kind === 'geofence') {
        const exists = geofenceIds.has(signal.target.geofenceId);
        if (!exists) {
          console.log(`  ❌ Signal "${signal.name}" references missing geofence: ${signal.target.geofenceId}`);
          invalidCount++;
        }
      }
    }
    if (invalidCount === 0) {
      console.log('  ✅ All signals reference valid geofences!');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  }
}

async function main() {
  try {
    await checkData();
    console.log('\n✨ Check complete!');
  } catch (error) {
    console.error('\n❌ Check failed');
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
