# Signals & Taxonomy Expansion Design

**Date:** 2026-01-26
**Status:** Approved
**Target Market:** Tulsa, OK (initial), expanding to top 500 US metros

## Overview

Transform SightSignal from a basic sighting tracker into a comprehensive community signal platform with:
- **Signals**: Discoverable, subscribable feeds (geofence + category filters)
- **Massive taxonomy expansion**: 15 core categories, 100+ types, subcategories, tags
- **Reputation system**: Reddit-style voting and quality control
- **Multi-channel notifications**: Email, push, webhooks, future SMS/app
- **City boundary seeding**: Auto-generate signals for 500 US metros
- **RSS feeds**: Flexible feed generation for any query
- **Community curation**: User-created signals with reputation-based visibility

---

## 1. Core Domain Model - Signals & Reputation

### Signal Entity

A Signal is a discoverable, subscribable feed configuration that combines a geographic area with content filters.

```typescript
type Signal = {
  id: SignalId;
  name: string;              // "Tulsa Police Activity"
  slug: string;              // "tulsa-police-activity" (URL-friendly)
  description: string;
  geofenceId: string;        // References existing geofence
  categoryIds: string[];     // Can be empty (all categories)
  subcategoryIds: string[];  // Optional filtering
  typeIds: string[];         // Optional filtering
  tags: string[];            // Additional filtering
  visibility: "public" | "private";
  creatorId: string;         // User who created it
  verified: boolean;         // Admin-vetted flag
  subscriberCount: number;   // Cached for performance
  viewCount: number;         // RSS/page views
  createdAt: string;
  updatedAt: string;
};
```

**Key Characteristics:**
- Signals are reusable: Multiple signals can share the same geofence
- Filters are additive: Empty arrays mean "all" (no filter)
- Visibility controls discovery, not access (public URLs work either way)
- Slug must be globally unique for RSS/URL routing

### Reputation System

**Reputation Sources:**

| Action | Reputation Change |
|--------|------------------|
| Create sighting | +1 |
| Create signal | +5 |
| Someone subscribes to your signal | +2 |
| Your sighting gets upvoted | +1 |
| Your sighting gets confirmed | +2 |
| Your sighting gets disputed | -1 |
| Admin verifies your signal | +50 + verified badge |
| Report upheld against you | -10 |

**Signal Visibility Tiers:**

| Tier | Creator Rep | Visibility |
|------|-------------|------------|
| Verified | N/A (admin-vetted) | Always visible, featured in discovery |
| Trusted | ≥ 50 | Visible by default |
| New | 10-49 | Visible with "New Creator" badge |
| Unverified | < 10 | Hidden unless user opts in "show all signals" |

**Business Rules:**
- Reputation never goes below 0
- Reputation events are immutable (audit log)
- Users can see their reputation history
- Signals inherit creator's reputation tier at creation time
- Admin verification overrides reputation tier

---

## 2. Expanded Taxonomy - 3-Level Hierarchy + Tags

### Structure

```typescript
type Category = {
  id: string;
  label: string;
  icon?: string;
  description: string;
};

type Subcategory = {
  id: string;
  label: string;
  categoryId: string;
  description?: string;
};

type SightingType = {
  id: string;
  label: string;
  categoryId: string;
  subcategoryId?: string;  // Optional grouping
  tags: string[];          // Additional metadata
  icon?: string;
};
```

### Initial 15 Core Categories

1. **Community Events**
   - Subcategories: Sales & Markets, Festivals, Block Parties, Pop-ups
   - Types: Garage sale, Estate sale, Food truck, Street fair, Block party, Vendor pop-up

2. **Public Safety**
   - Subcategories: Emergency Response, Safety Alerts, Hazardous Conditions
   - Types: Fire response, EMS scene, Safety alert, Gas leak, Chemical spill

3. **Law Enforcement**
   - Subcategories: Local Police, Sheriff, State Patrol, Federal Agents
   - Types: Police patrol, Sheriff deputy, Highway patrol, DUI checkpoint, Federal agents
   - Tags: routine, emergency, traffic, investigation

4. **Lost & Found**
   - Subcategories: Lost Pets, Found Pets, Lost Items, Found Items
   - Types: Lost dog, Lost cat, Found pet, Lost wallet, Lost keys, Found item

5. **Curb Alerts**
   - Subcategories: Free Furniture, Bulk Trash, Treasure Finds
   - Types: Free furniture, Free appliances, Curb treasure, Bulk trash pickup

6. **Food & Drink**
   - Subcategories: Food Trucks, Pop-ups, Deals, New Openings
   - Types: Food truck, Pop-up restaurant, Daily special, Happy hour, Grand opening

7. **Wildlife**
   - Subcategories: Wild Animals, Domestic Animals, Birds
   - Types: Bear, Coyote, Snake, Deer, Stray dog, Stray cat, Rare bird, Raptor
   - Tags: dangerous, alert, nocturnal, daytime, protected-species

8. **Weather**
   - Subcategories: Severe Weather, Conditions, Seasonal
   - Types: Tornado warning, Severe thunderstorm, Flooding, Ice storm, Heat advisory, Beautiful sunset

9. **Infrastructure**
   - Subcategories: Road Work, Utilities, Closures
   - Types: Road construction, Lane closure, Water main break, Power outage, Gas work

10. **Hazards**
    - Subcategories: Road Hazards, Environmental, Property
    - Types: Pothole, Debris in road, Downed tree, Broken glass, Oil spill

11. **Transportation**
    - Subcategories: Traffic, Accidents, Parking, Transit
    - Types: Heavy traffic, Accident, Road closure, Detour, Free parking, Bus delay

12. **Market Activity**
    - Subcategories: Farmers Markets, Craft Fairs, Vendor Events
    - Types: Farmers market, Craft fair, Flea market, Art walk, Vendor fair

13. **Urban Finds**
    - Subcategories: Cool Spots, Street Art, Photo Ops, Hidden Gems
    - Types: Street art, Mural, Photo spot, Sculpture, Hidden gem, Scenic overlook

14. **Automotive**
    - Subcategories: Car Spotting, Meetups, Shows, For Sale
    - Types: Exotic car, Classic car, Car meet, Car show, Modified vehicle

15. **Civic Engagement**
    - Subcategories: Protests, Rallies, Town Halls, Petitions
    - Types: Protest, Rally, Town hall meeting, Public hearing, Petition drive, Community meeting

**Tag Examples:**
- `["urgent", "safety", "alert"]`
- `["family-friendly", "free", "outdoor"]`
- `["rare", "photo-worthy", "limited-time"]`

---

## 3. Sighting Voting & Ranking System

### Reactions

```typescript
type SightingReaction = {
  sightingId: string;
  userId: string;
  type: "upvote" | "downvote" | "confirmed" | "disputed" | "spam";
  createdAt: string;
};

type SightingWithScore = Sighting & {
  upvotes: number;
  downvotes: number;
  confirmations: number;    // "I saw this too"
  disputes: number;         // "This isn't accurate"
  spamReports: number;
  score: number;            // Calculated score
  hotScore: number;         // Time-decay ranking
};
```

### Scoring Algorithm

**Base Score:**
```
baseScore = upvotes
          - downvotes
          + (confirmations * 2)
          - (disputes * 2)
          - (spamReports * 5)
```

**Hot Score (Reddit-style):**
```
hotScore = baseScore / (age_in_hours + 2)^1.5
```

This creates time-decay ranking where:
- New quality content rises quickly
- Old content naturally decays
- High-quality old content stays visible longer than low-quality new content

### Visibility Rules

| Score Range | Visibility |
|-------------|-----------|
| ≥ 0 | Visible to all users |
| -5 to -1 | Hidden by default, "Show low-quality posts" reveals |
| ≤ -5 | Hidden, only visible to creator and admins |
| spamReports ≥ 3 | Auto-hidden pending admin review |

### Feed Sorting Options

- **Hot** (default): `hotScore` ranking - balances recency and quality
- **New**: Newest first (`createdAt DESC`)
- **Top**: Highest score in time window (today/week/month/all)
- **Nearby**: Distance from user location

### User Constraints

- One reaction per user per sighting per type
- Can change reaction (upvote → downvote)
- Cannot react to own sightings
- Reactions are public (visible who reacted)

---

## 4. Notification Delivery System

### Architecture: Queue-Based Plugin System

```typescript
// Core abstraction
interface NotificationChannel {
  name: string;  // "email", "push", "webhook", "sms"
  send(notification: Notification, subscriber: Subscriber): Promise<Result<void>>;
  validateConfig(config: unknown): Result<ChannelConfig>;
}

type Notification = {
  id: string;
  signalId: string;
  sightingId: string;
  type: "new_sighting" | "signal_update";
  priority: "normal" | "high" | "urgent";
  payload: {
    signal: Signal;
    sighting: Sighting;
    message: string;
  };
};

type Subscriber = {
  id: string;
  signalId: string;
  userId?: string;  // For authenticated subscribers
  channels: ChannelSubscription[];
};

type ChannelSubscription = {
  channel: "email" | "push" | "webhook" | "sms";
  config: unknown;  // Channel-specific config
  enabled: boolean;
};
```

### Queue Flow

1. **Sighting Created** → Match against all active signals
2. **For each matching signal** → Queue notification job (with deduplication)
3. **Worker picks up job** → Fetch all subscribers for signal
4. **For each subscriber** → For each enabled channel → Send via plugin
5. **Track delivery** → Log success/failure, retry on failure (3 attempts max)
6. **Dead letter queue** → Failed notifications after 3 retries

### Initial Channel Plugins

**EmailNotifier**
- Uses existing email infrastructure
- Config: `{ email: string }`
- Batching: Group multiple sightings if < 5 min apart
- Rate limit: 100/hour per subscriber

**WebhookNotifier**
- POST to user-provided URL
- Config: `{ url: string, secret?: string }`
- Payload: JSON with signature header
- Retry with exponential backoff
- Timeout: 10 seconds

**PushNotifier**
- Browser Push API via service worker
- Config: `{ subscription: PushSubscription }`
- Requires HTTPS
- Handles expired subscriptions gracefully

**Future Plugins:**
- SMSNotifier (Twilio)
- AppNotifier (mobile app push)
- DiscordNotifier (webhook)
- SlackNotifier (webhook)

### Queue Infrastructure

- **Technology**: BullMQ (Redis-based job queue)
- **Separate queues by priority**:
  - `notifications:urgent` (processed immediately)
  - `notifications:high` (< 1 min delay)
  - `notifications:normal` (< 5 min delay)
- **Rate limiting**: Per-channel, per-subscriber
- **Monitoring**: Queue depth, processing time, failure rate
- **Dead letter queue**: Manual review of failed deliveries

---

## 5. RSS Feed Implementation

### Endpoints (Dynamic Query Feeds)

```
GET /api/rss/signal/{signalId}
GET /api/rss/signal/{slug}
GET /api/rss/category/{categoryId}
GET /api/rss/subcategory/{subcategoryId}
GET /api/rss/type/{typeId}
GET /api/rss/geofence/{geofenceId}
GET /api/rss/query?category=X&type=Y&geofence=Z&tags=A,B
```

### Feed Format (Geo-RSS)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:geo="http://www.w3.org/2003/01/geo/wgs84_pos#">
  <channel>
    <title>Tulsa Police Activity - SightSignal</title>
    <link>https://sightsignal.com/signal/tulsa-police-activity</link>
    <description>Police sightings and activity in Tulsa, OK</description>
    <language>en-us</language>
    <lastBuildDate>Mon, 27 Jan 2026 14:30:00 GMT</lastBuildDate>

    <item>
      <title>Police checkpoint on 71st & Memorial</title>
      <link>https://sightsignal.com/sighting/{id}</link>
      <description>DUI checkpoint set up, expect delays</description>
      <pubDate>Mon, 27 Jan 2026 14:30:00 GMT</pubDate>
      <geo:lat>36.0395</geo:lat>
      <geo:long>-95.8923</geo:long>
      <category>Law Enforcement</category>
      <category>Traffic</category>
    </item>
  </channel>
</rss>
```

### Query Parameters

- `page=1&limit=50` - Pagination (default 50 items)
- `since=2026-01-20` - Only sightings after timestamp
- `min_score=5` - Hide low-quality posts below threshold
- `sort=hot|new|top` - Override default sort

### Performance Features

- **Caching**: Cache all feeds for 5 minutes (reduce DB load)
- **ETag support**: Client-side caching via conditional GET
- **Compression**: gzip/brotli for large feeds
- **Max items**: Cap at 500 items per feed (pagination required beyond)

### Tracking

- Signal-specific feeds (`/api/rss/signal/{id}`) increment signal `viewCount`
- Query feeds (`/api/rss/query`) don't track (ephemeral)
- View counts help surface popular signals in discovery

---

## 6. City Boundary Seeding & Procedural Signal Generation

### Geographic Data Strategy

**Phase 1: Top 500 US Metro Areas**
- **Source**: US Census Bureau TIGER/Line Shapefiles
- **Coverage**: ~80% of US population
- **Tulsa included**: Metro population ~1 million
- **Format**: Shapefile → GeoJSON → Simplified polygon

**Data Pipeline:**

1. **Download TIGER/Line data**
   - Cities (incorporated places)
   - Counties (as fallback for unincorporated areas)
   - Major neighborhoods (census tracts)

2. **Process GeoJSON**
   ```javascript
   import * as turf from '@turf/turf';

   // Simplify polygon to reduce points
   const simplified = turf.simplify(polygon, {
     tolerance: 0.001,  // ~100m precision
     highQuality: true
   });

   // Validate polygon
   const valid = turf.booleanValid(simplified);
   ```

3. **Seed Geofences**
   - Create Geofence record for each city
   - Store simplified GeoJSON
   - Add metadata: name, state, population, timezone

4. **Generate Standard Signals**
   - 12 signals per city (see templates below)
   - All marked as `verified: true`
   - Created by system admin user

### Standard Signal Templates

For each city (e.g., "Tulsa"), auto-generate:

| Signal Name | Filters | Description Template |
|------------|---------|---------------------|
| `{city}-community-events` | All Community Events | Community events, festivals, and gatherings in {city} |
| `{city}-police-activity` | All Law Enforcement | Police and law enforcement activity in {city} |
| `{city}-lost-pets` | Lost & Found → Pets | Lost and found pets in {city} |
| `{city}-curb-alerts` | All Curb Alerts | Free stuff and curb finds in {city} |
| `{city}-food-trucks` | Food & Drink → Mobile | Food trucks and mobile vendors in {city} |
| `{city}-wildlife` | All Wildlife | Wildlife sightings in {city} |
| `{city}-weather-alerts` | Weather → Severe only | Severe weather and conditions in {city} |
| `{city}-road-hazards` | Hazards + Infrastructure | Road hazards and infrastructure issues in {city} |
| `{city}-garage-sales` | Community Events → Sales | Garage and estate sales in {city} |
| `{city}-market-activity` | All Market Activity | Farmers markets, craft fairs, and vendor events in {city} |
| `{city}-civic-engagement` | All Civic Engagement | Protests, town halls, and civic events in {city} |
| `{city}-everything` | All categories | All sightings and activity in {city} |

**Generated Signal Metadata:**
```typescript
{
  creatorId: "system",
  verified: true,
  visibility: "public",
  slug: `${citySlug}-${templateSlug}`,
  geofenceId: cityGeofenceId
}
```

### Expansion Strategy

- **Phase 2**: All US cities (20,000+)
- **Phase 3**: Global cities via OpenStreetMap
- **Admin Tool**: "Add Custom Region" for strategic hand-rolled geofences
  - Example: "Route 66 Corridor", "Tulsa Metro North", etc.

### Script Location

```
scripts/seed-cities.ts     // Main seeding script
scripts/data/tiger-line/   // Downloaded shapefiles
scripts/data/geojson/      // Processed GeoJSON
```

---

## 7. Signal Editor & Discovery UI

### Signal Editor Page

**Two Access Levels:**

1. **Admin Signal Manager** (`/admin/signals`)
   - Full CRUD on all signals
   - Verify/unverify signals
   - View reports, moderate spam
   - Batch operations (bulk verify, bulk delete)

2. **Public Signal Creator** (`/signals/create`, `/signals/{id}/edit`)
   - Any logged-in user can create signals
   - Can only edit own signals
   - Subject to reputation-based visibility

### Signal Editor Form

**Core Fields:**
- **Name**: Text input, 200 char max, required
- **Slug**: Auto-generated from name, editable, must be unique
- **Description**: Rich text, 500 char max, optional
- **Geofence**: Searchable dropdown of existing geofences
  - Includes "Or draw custom geofence" option (opens map)
- **Visibility**: Toggle (public/private)

**Filtering (all optional):**
- **Categories**: Multi-select chip component
- **Subcategories**: Multi-select, filtered by selected categories
- **Types**: Multi-select, filtered by selected subcategories
- **Tags**: Free-form tag input with autocomplete from existing tags

**Preview Section:**
- Live count: "This signal will match X sightings in the last 30 days"
- Sample sightings grid (5 most recent matches)
- Updates in real-time as filters change

**Validation:**
- At least one of: category, subcategory, type, or tag must be selected
- Or use empty filters to mean "all content in geofence"

### Public Signal Discovery

**Discovery Page** (`/signals` or `/discover`)

**Tab Navigation:**
- **Trending**: Sorted by subscriber growth rate (last 7 days)
- **Verified**: Admin-vetted signals only
- **Near You**: Signals for geofences containing user's location
- **All**: Paginated list, filterable

**Filters:**
- Search: Full-text on name/description
- By category: Dropdown filter
- By location: City/state selector
- Reputation tier: Show all / Trusted+ / Verified only

**Signal Card:**
```
[Icon] Signal Name                    [Verified Badge]
Description text...
📍 Geofence Name | 👥 X subscribers | 📊 Y sightings/week
[Subscribe Button]
```

### Signal Detail Page

**URL**: `/signals/{slug}`

**Sections:**

1. **Header**
   - Signal name + description
   - Creator badge (verified/trusted/new)
   - Subscribe button → Modal with channel selection
   - Share buttons (Twitter, copy RSS link)
   - Report button (if not yours)

2. **Metadata Bar**
   - 👥 X subscribers
   - 📊 Y sightings in last 30 days
   - 📍 Geofence preview (small map)
   - 🏷️ Filters applied (category chips)

3. **Recent Sightings Feed**
   - Paginated list of matching sightings
   - Default sort: Hot
   - Filters: Today/Week/Month/All

4. **Subscription Options**
   - Email: Enter address
   - Push: Enable browser notifications
   - Webhook: Enter URL + secret
   - RSS: Copy feed link

**Subscribe Flow:**
```
1. Click "Subscribe"
2. Modal: "How would you like to receive notifications?"
3. Toggle on/off: [ ] Email  [ ] Push  [ ] Webhook
4. Enter config for each enabled channel
5. Click "Subscribe" → Success toast
```

---

## 8. API Endpoints & Data Model

### New API Endpoints

**Signals:**
```
POST   /api/signals                      // Create signal
GET    /api/signals                      // List/search signals
GET    /api/signals/{id}                 // Get signal details
PATCH  /api/signals/{id}                 // Update signal
DELETE /api/signals/{id}                 // Delete signal
POST   /api/signals/{id}/subscribe       // Subscribe to signal
DELETE /api/signals/{id}/subscribe       // Unsubscribe
POST   /api/signals/{id}/report          // Report spam
GET    /api/signals/{id}/sightings       // Get matching sightings
```

**Admin Signal Management:**
```
GET    /api/admin/signals                    // All signals with moderation info
PATCH  /api/admin/signals/{id}/verify        // Mark verified
POST   /api/admin/signals/seed-cities        // Trigger city seeding
GET    /api/admin/signals/reports            // Reported signals queue
```

**Sighting Reactions:**
```
POST   /api/sightings/{id}/react             // Add reaction
DELETE /api/sightings/{id}/react             // Remove reaction
GET    /api/sightings/{id}/reactions         // Get reaction counts
```

**User Reputation:**
```
GET    /api/users/{id}/reputation            // Get user rep & history
GET    /api/users/me/reputation              // Current user's reputation
```

**RSS Feeds:**
```
GET    /api/rss/signal/{id}
GET    /api/rss/signal/{slug}
GET    /api/rss/category/{categoryId}
GET    /api/rss/subcategory/{subcategoryId}
GET    /api/rss/type/{typeId}
GET    /api/rss/geofence/{geofenceId}
GET    /api/rss/query?params...
```

**Taxonomy Browsing:**
```
GET    /api/taxonomy/categories             // All categories
GET    /api/taxonomy/subcategories          // Filtered by category
GET    /api/taxonomy/types                  // Filtered by category/subcategory
GET    /api/taxonomy/tags                   // All unique tags
```

### Database Schema

**New Tables:**

```sql
-- Signals
CREATE TABLE signals (
  id VARCHAR PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(200) UNIQUE NOT NULL,
  description TEXT,
  geofence_id VARCHAR REFERENCES geofences(id) ON DELETE CASCADE,
  category_ids TEXT[],
  subcategory_ids TEXT[],
  type_ids TEXT[],
  tags TEXT[],
  visibility VARCHAR(20) DEFAULT 'public',
  creator_id VARCHAR NOT NULL,
  verified BOOLEAN DEFAULT false,
  subscriber_count INT DEFAULT 0,
  view_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_signals_slug ON signals(slug);
CREATE INDEX idx_signals_geofence ON signals(geofence_id);
CREATE INDEX idx_signals_creator ON signals(creator_id);
CREATE INDEX idx_signals_visibility ON signals(visibility) WHERE visibility = 'public';

-- Signal subscriptions
CREATE TABLE signal_subscriptions (
  id VARCHAR PRIMARY KEY,
  signal_id VARCHAR REFERENCES signals(id) ON DELETE CASCADE,
  user_id VARCHAR,
  channels JSONB NOT NULL,  -- [{channel: "email", config: {...}, enabled: true}]
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_signal_subscriptions_signal ON signal_subscriptions(signal_id);
CREATE INDEX idx_signal_subscriptions_user ON signal_subscriptions(user_id);

-- Sighting reactions
CREATE TABLE sighting_reactions (
  sighting_id VARCHAR REFERENCES sightings(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL,
  type VARCHAR(20) NOT NULL,  -- upvote, downvote, confirmed, disputed, spam
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (sighting_id, user_id, type)
);

CREATE INDEX idx_sighting_reactions_sighting ON sighting_reactions(sighting_id);
CREATE INDEX idx_sighting_reactions_user ON sighting_reactions(user_id);

-- User reputation
CREATE TABLE user_reputation (
  user_id VARCHAR PRIMARY KEY,
  score INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Reputation events (audit log)
CREATE TABLE reputation_events (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  amount INT NOT NULL,
  reason VARCHAR(50) NOT NULL,  -- 'signal_created', 'sighting_upvoted', etc
  reference_id VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reputation_events_user ON reputation_events(user_id);

-- Subcategories
CREATE TABLE subcategories (
  id VARCHAR PRIMARY KEY,
  label VARCHAR(100) NOT NULL,
  category_id VARCHAR NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_subcategories_category ON subcategories(category_id);

-- Categories (update existing)
ALTER TABLE categories
  ADD COLUMN icon VARCHAR(50),
  ADD COLUMN description TEXT;

-- Sighting types (update existing)
ALTER TABLE sighting_types
  ADD COLUMN subcategory_id VARCHAR REFERENCES subcategories(id),
  ADD COLUMN tags TEXT[],
  ADD COLUMN icon VARCHAR(50);

-- Sightings (update for scoring)
ALTER TABLE sightings
  ADD COLUMN upvotes INT DEFAULT 0,
  ADD COLUMN downvotes INT DEFAULT 0,
  ADD COLUMN confirmations INT DEFAULT 0,
  ADD COLUMN disputes INT DEFAULT 0,
  ADD COLUMN spam_reports INT DEFAULT 0,
  ADD COLUMN score INT DEFAULT 0,
  ADD COLUMN hot_score FLOAT DEFAULT 0;

CREATE INDEX idx_sightings_hot_score ON sightings(hot_score DESC);
CREATE INDEX idx_sightings_score ON sightings(score DESC);
CREATE INDEX idx_sightings_created_at ON sightings(created_at DESC);

-- Notification queue (BullMQ handles this, but audit log)
CREATE TABLE notification_deliveries (
  id VARCHAR PRIMARY KEY,
  signal_id VARCHAR REFERENCES signals(id),
  sighting_id VARCHAR REFERENCES sightings(id),
  subscriber_id VARCHAR REFERENCES signal_subscriptions(id),
  channel VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,  -- pending, sent, failed
  attempts INT DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  sent_at TIMESTAMP
);

CREATE INDEX idx_notification_deliveries_status ON notification_deliveries(status);
CREATE INDEX idx_notification_deliveries_signal ON notification_deliveries(signal_id);
```

---

## 9. Implementation Phases

### Phase 1: Core Infrastructure (Foundation)
**Goal**: Reputation system and expanded taxonomy

- [ ] Add user reputation tables (users, events, scoring)
- [ ] Expand taxonomy tables (15 categories, subcategories, types with tags)
- [ ] Add sighting reactions table and API endpoints
- [ ] Implement sighting scoring algorithm (base + hot score)
- [ ] Add sighting reaction UI components
- [ ] Seed initial 15 categories with types and subcategories
- [ ] Update admin panel to show reputation scores

**Deliverable**: Users can upvote/confirm sightings, reputation tracking works

---

### Phase 2: Signals Domain (Core Feature)
**Goal**: Signal creation and subscription system

- [ ] Signal domain model and validation
- [ ] Signal repository implementations (PostgreSQL, in-memory, file)
- [ ] Signal CRUD use cases (create, update, delete, list)
- [ ] Signal matching engine (which sightings belong to which signals)
- [ ] Signal subscription model (multi-channel configs)
- [ ] Admin API endpoints for signal management
- [ ] Public API endpoints for signal CRUD and subscription

**Deliverable**: Signals can be created and subscribed to (foundation for UI)

---

### Phase 3: Notification Queue System
**Goal**: Reliable multi-channel notification delivery

- [ ] Set up Redis + BullMQ infrastructure
- [ ] NotificationService abstraction and port interfaces
- [ ] Channel plugin architecture
- [ ] EmailNotifier plugin (reuse existing email)
- [ ] WebhookNotifier plugin
- [ ] PushNotifier plugin (browser push API)
- [ ] Queue workers with retry logic
- [ ] Delivery tracking and monitoring
- [ ] Admin dashboard for notification health

**Deliverable**: Notifications sent reliably when sightings match signals

---

### Phase 4: RSS Feeds
**Goal**: Generate RSS feeds for any query

- [ ] RSS generation utilities (XML formatting, Geo-RSS)
- [ ] Signal-specific RSS endpoints (`/api/rss/signal/{id}`)
- [ ] Dynamic query RSS endpoint (`/api/rss/query`)
- [ ] Category/type/geofence RSS endpoints
- [ ] RSS caching layer (5min cache)
- [ ] ETag support for client-side caching
- [ ] View count tracking for signal RSS

**Deliverable**: Any signal or query has an RSS feed URL

---

### Phase 5: City Boundary Seeding
**Goal**: Auto-generate 500 US metro signals

- [ ] Download TIGER/Line shapefiles for top 500 metros (including Tulsa)
- [ ] GeoJSON conversion and polygon simplification scripts
- [ ] Geofence seeding script (create records from GeoJSON)
- [ ] Procedural signal generation (12 templates per city)
- [ ] Run seeding script to populate database
- [ ] Verify Tulsa signals exist and work correctly
- [ ] Document seeding process for future expansion

**Deliverable**: 6,000+ verified city signals ready for discovery

---

### Phase 6: Signal UI
**Goal**: User-facing signal creation and discovery

- [ ] Signal discovery page (`/signals`) with trending/verified/near you tabs
- [ ] Signal detail page (`/signals/{slug}`) with subscription flow
- [ ] Signal creation page (`/signals/create`) with live preview
- [ ] Signal edit page (`/signals/{id}/edit`)
- [ ] Admin signal manager (`/admin/signals`) with verify/moderate tools
- [ ] Signal subscription modal (choose channels)
- [ ] Signal reporting flow (spam/inappropriate)
- [ ] Reputation tier badges (verified/trusted/new)

**Deliverable**: Users can discover, create, subscribe to signals

---

### Phase 7: Polish & Launch
**Goal**: Production-ready for Tulsa soft launch

- [ ] Reporting/moderation tools for admins
- [ ] Performance optimization (query tuning, caching strategy)
- [ ] Analytics dashboard (signal popularity, sighting trends)
- [ ] User onboarding flow (explain signals, suggest Tulsa signals)
- [ ] Documentation (API docs, user guides)
- [ ] Load testing (notification queue, RSS feed generation)
- [ ] Monitoring/alerting setup
- [ ] Tulsa soft launch 🎉

**Deliverable**: Production deployment ready for real users

---

## Success Metrics

**Phase 1-3 (Foundation):**
- Reputation system functional (users earning points)
- Signals being created and subscribed to
- Notifications delivering reliably (>99% success rate)

**Phase 4-6 (Features):**
- 6,000+ city signals seeded
- RSS feeds generating correctly
- Signal discovery UI functional

**Phase 7 (Launch):**
- 100+ Tulsa users signed up
- 1,000+ sightings created
- 500+ signal subscriptions
- <2 second page load times
- <5 minute notification delivery

---

## Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Redis queue infrastructure cost | Medium | Use Redis Cloud free tier initially, scale as needed |
| TIGER/Line data size and processing | Low | Process incrementally, cache GeoJSON, simplify polygons |
| Spam signals from low-rep users | High | Hide unverified signals by default, strong reporting flow |
| Notification delivery failures | High | Retry logic, dead letter queue, admin monitoring dashboard |
| RSS feed performance with complex queries | Medium | Aggressive caching (5min), pagination, query optimization |
| User confusion about signals vs subscriptions | Medium | Clear onboarding, tooltips, example signals prominently displayed |

---

## Future Enhancements (Post-Launch)

- **Phase 2 Cities**: Expand to all 20,000 US cities
- **Global Expansion**: OpenStreetMap boundaries for international cities
- **SMS Notifications**: Twilio integration for critical alerts
- **Mobile App**: Native iOS/Android with push notifications
- **Signal Analytics**: View counts, trending topics, heat maps
- **Hierarchical Geofences**: Neighborhoods inherit from cities
- **Signal Templates**: One-click signal creation from templates
- **Community Moderation**: Trusted users can help moderate
- **Signal Recommendations**: "You might also like..." based on subscriptions
- **Premium Features**: SMS notifications, higher API limits, advanced analytics
