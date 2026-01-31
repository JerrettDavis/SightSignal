import postgres from "postgres";

type SqlClient = ReturnType<typeof postgres>;

const getConnectionString = () =>
  process.env.SIGNALFEED_DATABASE_URL ??
  process.env.SIGHTSIGNAL_DATABASE_URL ??
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  process.env.POSTGRES_PRISMA_URL;

export const getSql = (): SqlClient => {
  const globalAny = globalThis as { __signalfeed_sql?: SqlClient };
  if (globalAny.__signalfeed_sql) {
    console.log("[PostgreSQL Client] Reusing existing connection");
    return globalAny.__signalfeed_sql;
  }

  const connectionString = getConnectionString();
  if (!connectionString) {
    throw new Error("Missing database connection string.");
  }

  console.log(
    "[PostgreSQL Client] Creating new connection to:",
    connectionString.replace(/:[^:@]+@/, ":****@")
  );
  const sql = postgres(connectionString, { max: 2 });
  globalAny.__signalfeed_sql = sql;
  return sql;
};
