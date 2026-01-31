import postgres from 'postgres';

const connectionString = 'postgresql://sightsignal:sightsignal@localhost:5432/sightsignal';
console.log('Testing connection:', connectionString);

const sql = postgres(connectionString, {
  max: 1,
  connect_timeout: 10
});

try {
  const result = await sql`SELECT current_user, current_database()`;
  console.log('✅ Connection successful');
  console.log('User:', result[0].current_user);
  console.log('DB:', result[0].current_database);
  await sql.end();
  process.exit(0);
} catch (err) {
  console.error('❌ Connection failed:', err.message);
  console.error('Full error:', err);
  process.exit(1);
}
