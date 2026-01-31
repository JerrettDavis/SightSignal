# Provider shortlist (verify latest)

## Postgres

- Vercel Postgres: tight Next.js integration, free tier, serverless-friendly.
- Neon: modern serverless Postgres with branching, free tier.
- Supabase: Postgres + auth + storage; good free tier and dashboard.

## Edge-friendly SQL

- Turso (SQLite): fast edge queries, can sync to a primary region.

## Notes

- All of the above can be swapped behind the repository ports.
- Please verify pricing, rate limits, and feature status before committing.
- Local development currently uses the file-backed adapters under `.local/`.
- The Postgres adapter expects `SignalFeed_DATABASE_URL` and the tables in `db/schema.sql`.
