import postgres from 'postgres';
import { readFileSync } from 'fs';

// Read .env.local manually
const env = readFileSync('.env.local', 'utf-8');
const dbUrl = env.split('\n').find(line => line.startsWith('SIGNALFEED_DATABASE_URL'))?.split('=')[1];

const sql = postgres(dbUrl);

async function checkSignals() {
  try {
    const signals = await sql`SELECT id, name, sighting_count, subscriber_count FROM signals`;
    console.log('Signals in database:', JSON.stringify(signals, null, 2));
    
    const signalSightings = await sql`
      SELECT signal_id, COUNT(*) as count 
      FROM signal_sightings 
      GROUP BY signal_id
    `;
    console.log('\nSignal sighting counts:', JSON.stringify(signalSightings, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.end();
  }
}

checkSignals();
