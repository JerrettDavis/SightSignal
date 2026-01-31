# Architecture

## Structure

- Domain: pure types and invariants (no I/O).
- Application: use cases orchestrating domain + ports.
- Ports: interfaces for persistence, auth, notifications.
- Adapters: provider implementations (Supabase, email, web push).

## Bounded contexts

- Sightings: creation, reactions, resolution.
- Geofences: drawing, privacy, discovery.
- Subscriptions: notification preferences and delivery.
- Reputation: vetting, trust, and abuse mitigation.
- Integrations: API keys and webhooks.

## Contract-first

- OpenAPI for HTTP endpoints.
- Event contracts for internal messaging.
- Schemas for request/response validation.

See `docs/openapi.yaml` for the current API contract.

## Provider boundaries

- Database: Postgres + PostGIS (default adapter).
- Auth: magic link or OAuth (adapter).
- Storage: photo uploads (adapter).
- Notifications: web push + email (adapter).

Current implementation uses file-backed adapters for local dev and in-memory as a fallback.

Environment switches:

- `SIGNALFEED_DATA_STORE` selects `file` or `memory`.
- `SIGNALFEED_DATA_DIR` sets the local storage path.
- `SIGNALFEED_DATA_STORE=postgres` uses the Postgres adapter with `SIGNALFEED_DATABASE_URL`.

## Security baseline

- Rate limiting on write endpoints.
- Input validation at API boundaries.
- Audit logs for moderation and reputation changes.
