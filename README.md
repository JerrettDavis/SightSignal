# SightSignal

[![CI/CD Pipeline](https://github.com/JerrettDavis/SightSignal/actions/workflows/ci.yml/badge.svg)](https://github.com/JerrettDavis/SightSignal/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/JerrettDavis/SightSignal/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.x-black.svg)](https://nextjs.org/)

> A map-first application for reporting and subscribing to local sightings (hazards, events, community notes) with strong UX focus, trust signals, and extensible integrations.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS for styling
- Clean architecture: domain, application, ports, adapters

## Structure

- `src/domain`: entities and invariants
- `src/application`: use cases
- `src/ports`: provider interfaces
- `src/contracts`: runtime validation schemas
- `docs`: vision, MVP, architecture, SDLC

## Getting started

```bash
npm install
npm run dev
```

## Dev stack

```bash
npm run dev:stack
```

This starts Postgres via Docker Compose, applies `db/schema.sql`, and boots Next.js with Postgres enabled.
If port 5432 is already in use, stop the other Postgres instance before running this.

## Docker dev stack

```bash
npm run dev:compose
```

This runs both Postgres and the Next.js dev server inside Docker.
To stop it:

```bash
npm run dev:compose:down
```

To reset (removes the Postgres volume):

```bash
npm run dev:compose:reset
```

## Scripts

- `npm run dev`: start dev server
- `npm run build`: production build
- `npm run start`: start production server
- `npm run lint`: run ESLint
- `npm run test`: run unit tests
- `npm run typecheck`: run TypeScript checks
- `npm run dev:stack`: start Postgres via Docker Compose and run the dev server
- `npm run dev:compose`: start Postgres + Next.js dev server via Docker Compose
- `npm run dev:compose:down`: stop Docker Compose dev stack
- `npm run dev:compose:reset`: stop and remove Docker Compose dev stack volumes
- `npm run db:up`: start Postgres only
- `npm run db:down`: stop Postgres
- `npm run db:reset`: stop Postgres and remove volumes

## Environment

- `NEXT_PUBLIC_MAP_STYLE_URL`: MapLibre style URL (defaults to `/map-style.json`).
- `SIGHTSIGNAL_DATA_STORE`: `file` (default in dev), `memory`, or `postgres`.
- `SIGHTSIGNAL_DATA_DIR`: directory for local JSON storage (defaults to `.local`).
  - Delete the folder to reset local data.
- `SIGHTSIGNAL_DATABASE_URL`: Postgres connection string (used when `SIGHTSIGNAL_DATA_STORE=postgres`).

## API

- `GET /api/sightings`: list sightings
- `POST /api/sightings`: create sighting
- `GET /api/sightings/:id`: fetch sighting
- `GET /api/geofences`: list geofences
- `POST /api/geofences`: create geofence
- `GET /api/geofences/:id`: fetch geofence
- `GET /api/subscriptions`: list subscriptions
- `POST /api/subscriptions`: create subscription

## E2E tests

```bash
npm run e2e
```

Playwright will prompt to install browsers on first run.

## Features

### Core Capabilities

- **Map-First Interface**: Interactive map using MapLibre GL for reporting and viewing sightings
- **Sighting Management**: Create, view, and manage local sightings (hazards, events, community notes)
- **Geofence Subscriptions**: Subscribe to specific geographic areas to receive notifications
- **Trust Signals**: User reputation and sighting verification system
- **Real-time Updates**: Live updates for sightings in your subscribed areas

### Architecture

- **Clean Architecture**: Domain-driven design with clear separation of concerns
- **Multiple Storage Options**: File-based, in-memory, or PostgreSQL data persistence
- **Type-Safe**: Full TypeScript with runtime validation using Zod
- **Extensible**: Plugin-ready architecture for custom integrations
- **Modern Stack**: Next.js 16 App Router, React 19, Tailwind CSS 4

### Developer Experience

- **Docker Support**: Complete containerized development environment
- **Testing**: Comprehensive unit tests with Vitest and E2E tests with Playwright
- **Type Safety**: TypeScript with strict mode and ESLint configuration
- **Hot Reload**: Fast development with Next.js hot module replacement

## Docs

- `docs/vision.md`
- `docs/mvp.md`
- `docs/architecture.md`
- `docs/sdlc.md`
- `docs/openapi.yaml`
- `docs/providers.md`
- `db/schema.sql`

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on:

- Development setup
- Coding standards
- Commit guidelines
- Pull request process

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
