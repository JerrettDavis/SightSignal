# Database Seeding Guide

This guide explains how to reset and seed your SignalFeed database.

## Prerequisites

1. PostgreSQL database running (via Docker or local installation)
2. Database connection string set in environment variables

```bash
# In your .env file
SignalFeed_DATABASE_URL=postgresql://SignalFeed:SignalFeed@localhost:5432/SignalFeed
```

## Quick Start

### Option 1: Full Database Refresh (Recommended)

Reset database and populate with seed data in one command:

```bash
npm run db:refresh
```

This will:

1. Drop all existing tables
2. Run all migrations to recreate schema
3. Insert seed data (taxonomy, users, geofences, sightings, signals)

### Option 2: Step-by-Step

```bash
# 1. Drop all tables and recreate from migrations
npm run db:reset

# 2. Populate with seed data
npm run db:seed
```

## Available Scripts

| Script               | Description                                      |
| -------------------- | ------------------------------------------------ |
| `npm run db:up`      | Start PostgreSQL container                       |
| `npm run db:down`    | Stop PostgreSQL container                        |
| `npm run db:wipe`    | Stop container and delete volume (complete wipe) |
| `npm run db:ps`      | Show container status                            |
| `npm run db:reset`   | Drop all tables and run migrations               |
| `npm run db:seed`    | Insert seed data                                 |
| `npm run db:refresh` | Reset + seed (complete refresh)                  |

## What Gets Seeded?

### Taxonomy Data (15 categories, 75+ subcategories, 145+ sighting types)

**Categories include:**

- Community Events (garage sales, festivals, neighborhood events)
- Public Safety (emergency response, fire, medical)
- Law Enforcement (traffic enforcement, police patrol)
- Lost & Found (pets, items)
- Curb Alerts (free furniture, bulk trash)
- Food & Drink (food trucks, restaurant deals)
- Wildlife (animals, birds)
- Weather (severe weather, precipitation)
- Infrastructure (road work, utilities, construction)
- Hazards (road hazards, environmental dangers)
- Transportation (traffic, accidents, parking)
- Market Activity (farmers markets, craft fairs)
- Urban Finds (street art, photo opportunities)
- Automotive (exotic cars, classic cars, car shows)
- Civic Engagement (protests, rallies, town halls)

### Users (6 accounts)

| Username       | Email                      | Role      | Status    |
| -------------- | -------------------------- | --------- | --------- |
| admin          | admin@SignalFeed.local     | admin     | active    |
| mod_sarah      | moderator@SignalFeed.local | moderator | active    |
| john_downtown  | john.doe@example.com       | user      | active    |
| jane_parks     | jane.smith@example.com     | user      | active    |
| bob_commuter   | bob.wilson@example.com     | user      | active    |
| suspended_user | suspended@example.com      | user      | suspended |

### Geofences (8 areas)

**Tulsa, OK areas:**

- Cherry Street District
- Gathering Place Park
- Arts District
- School zone - Edison High
- River Parks Trail
- Midtown corridor

**San Francisco areas (for testing):**

- Waterfront alerts
- Downtown commute

### Sightings (5 examples)

- Blue heron sighting near inlet
- Construction detour with lane closures
- Pop-up jazz quartet on pier
- Deep pothole warning
- Geocache update

### Subscriptions (3 examples)

Email subscriptions for:

- Nature alerts in waterfront area
- Safety alerts near Edison High School
- Traffic/hazard alerts for downtown

### Signals (8 configured alerts)

Active signals include:

- School Zone Safety Alerts (high-priority safety alerts near Edison High)
- Downtown Traffic Monitoring (traffic and road hazards)
- Wildlife in Gathering Place (wildlife sightings in park)
- Arts District Events (community events)
- Emergency Alerts - Citywide (global high-priority alerts)
- River Parks Trail Updates (trail conditions and wildlife)
- Cherry Street Food Scene (food trucks and deals)
- Inactive Test Signal (for testing inactive signal filtering)

## Development Workflow

### Daily Development

```bash
# Start database
npm run db:up

# Run app
npm run dev
```

### Clean Slate

```bash
# Complete reset with fresh seed data
npm run db:refresh
```

### Schema Changes

After creating a new migration:

```bash
# Apply migration
npm run db:reset

# Populate with seed data
npm run db:seed
```

### Testing with Clean Database

```bash
# Before E2E tests
npm run db:refresh

# Run tests
npm run e2e
```

## Customizing Seed Data

### Adding More Seed Data

Edit `src/data/seed.ts` to add:

```typescript
export const seedSightings: Sighting[] = [
  // Add your custom sightings here
  {
    id: "custom-001" as SightingId,
    typeId: "type-pothole" as SightingTypeId,
    categoryId: "cat-hazards" as CategoryId,
    location: { lat: 36.1539, lng: -95.9928 },
    description: "Large pothole on Main Street",
    // ... other required fields
  },
];
```

### Adding Custom Taxonomy

Edit `src/data/taxonomy-seed.ts` to add categories, subcategories, or sighting types.

Then update `scripts/seed-database.mjs` to include your new data in the seeding process.

## Troubleshooting

### "SignalFeed_DATABASE_URL not set"

Set the environment variable in your `.env` file:

```bash
SignalFeed_DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
```

### "Connection refused"

Ensure PostgreSQL is running:

```bash
npm run db:up
npm run db:ps
```

### "Table already exists"

The seed script uses `ON CONFLICT DO NOTHING`, so it won't error if data already exists. However, if you want a truly fresh database:

```bash
npm run db:refresh
```

### Migrations Fail

Check that all migration files in `db/migrations/` are valid SQL. Migrations run in alphabetical order.

## Production Considerations

**⚠️ Warning:** These scripts will delete all data!

For production:

1. Never run `db:reset` or `db:refresh` in production
2. Use proper database backups before any schema changes
3. Apply migrations individually with proper testing
4. Consider using a migration tool like Flyway or Liquibase for production
5. Seed data is for development only - production should use real data

## Architecture Notes

### Seed Data Location

- **Taxonomy**: `src/data/taxonomy-seed.ts` (15 categories, 75 subcategories, 145 types)
- **Application Data**: `src/data/seed.ts` (users, geofences, sightings, signals)
- **Seed Script**: `scripts/seed-database.mjs` (insertion logic)

### Insertion Order

The seed script inserts data in dependency order:

1. **Taxonomy** (categories → subcategories → sighting types)
2. **Users** (required for signals)
3. **Geofences** (required for subscriptions and signals)
4. **Sightings** (can reference taxonomy and users)
5. **Subscriptions** (references geofences and taxonomy)
6. **Signals** (references users, geofences, and taxonomy)

### ID Strategy

Seed data uses predictable IDs with `seed-` prefix:

- `seed-user-001`, `seed-user-admin`
- `seed-geofence-001`, `seed-geofence-008`
- `seed-signal-001`
- `seed-sighting-001`

This allows referential integrity and easy testing.
