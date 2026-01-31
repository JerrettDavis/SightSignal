# Signals Domain Implementation

## Overview

The Signals domain has been successfully implemented as a complete, production-ready domain model following the established patterns in the SignalFeed codebase. This document provides an overview of the implementation.

## Implementation Date

2026-01-26

## Files Created

### Core Domain Model

- `src/domain/signals/signal.ts` - Main domain model with types, validation, and business logic

### Tests

- `src/domain/signals/signal.test.ts` - Comprehensive test suite (51 tests, all passing)

### Documentation

- `src/domain/signals/README.md` - Complete domain documentation
- `src/domain/signals/examples.ts` - Real-world usage examples
- `docs/SIGNALS_IMPLEMENTATION.md` - This implementation summary

## Architecture Overview

The Signals domain follows the established patterns from other domains:

```
src/domain/signals/
├── signal.ts          # Domain model, types, validation, business logic
├── signal.test.ts     # Comprehensive test suite
├── README.md          # Domain documentation
└── examples.ts        # Usage examples
```

## Key Features

### 1. Signal Entity

A Signal is an automated alert rule that monitors sightings and triggers notifications when conditions are met.

**Core Properties:**

- `id` - Unique identifier (branded type `SignalId`)
- `name` - Human-readable name (max 100 chars)
- `description` - Optional description (max 500 chars)
- `ownerId` - User who owns the signal
- `target` - Geographic targeting (global, geofence, or custom polygon)
- `triggers` - Event types that activate the signal
- `conditions` - Filtering criteria for sightings
- `isActive` - Whether the signal is currently active
- `createdAt` - Creation timestamp
- `updatedAt` - Last update timestamp

### 2. Geographic Targeting

Three targeting modes:

```typescript
type SignalTarget =
  | { kind: "global" } // Monitor all sightings
  | { kind: "geofence"; geofenceId: string } // Monitor within geofence
  | { kind: "polygon"; polygon: Polygon }; // Monitor within custom polygon
```

### 3. Trigger Types

Four types of events that can activate a signal:

- `new_sighting` - New sighting created
- `sighting_confirmed` - Sighting receives confirmation
- `sighting_disputed` - Sighting is disputed
- `score_threshold` - Sighting score crosses threshold

### 4. Flexible Condition System

Supports multiple condition types with AND/OR logic:

- **Taxonomy Filters**: Categories, types, tags
- **Importance Levels**: low, normal, high, critical
- **Trust Levels**: unverified, new, trusted, verified
- **Score Ranges**: Min/max score thresholds
- **Logic Operators**: AND (all match) or OR (any match)

### 5. Validation Rules

Comprehensive validation following domain patterns:

- Name: Required, max 100 characters
- Description: Optional, max 500 characters
- Owner ID: Required
- Triggers: At least 1, max 10, no duplicates
- Conditions: Validated array sizes and score ranges
- Geographic targets: Validated via geo domain

### 6. Helper Functions

**Signal Management:**

- `createSignal()` - Create a new signal with validation
- `updateSignal()` - Update existing signal (preserves owner)
- `validateSignalId()` - Validate signal identifier

**Condition Evaluation:**

- `matchesConditions()` - Check if sighting matches conditions
- `shouldTrigger()` - Check if trigger should fire
- `describeConditions()` - Human-readable condition summary

## Test Coverage

### Test Statistics

- **Total Tests**: 51
- **Status**: All passing ✅
- **Test File**: `src/domain/signals/signal.test.ts`

### Test Categories

1. **Signal Creation** (13 tests)
   - Valid input acceptance
   - Name validation
   - Description validation
   - Owner validation
   - Trigger validation
   - Target validation (polygon, geofence)
   - Condition validation
   - Default values

2. **Signal Updates** (5 tests)
   - Property updates
   - Owner preservation
   - Validation on updates
   - Timestamp updates

3. **Condition Matching** (20 tests)
   - AND/OR logic
   - Category matching
   - Type matching
   - Tag matching
   - Importance matching
   - Trust level matching
   - Score range matching
   - Empty conditions

4. **Trigger Evaluation** (3 tests)
   - Active signal triggering
   - Inactive signal handling
   - Trigger type filtering

5. **Helper Functions** (7 tests)
   - Condition descriptions
   - Signal ID validation
   - Edge cases

6. **Validation** (3 tests)
   - Invalid inputs
   - Edge cases
   - Error messages

## Integration with Existing Domains

### Geo Domain (`@/domain/geo/geo`)

- Uses `LatLng` and `Polygon` types
- Uses `validatePolygon()` for polygon validation
- Consistent geographic validation

### Reputation Domain (`@/domain/reputation/reputation`)

- Uses `ReputationTier` type
- Hierarchical trust level comparison
- Consistent with reputation system

### Sighting Domain (`@/domain/sightings/sighting`)

- Uses `SightingImportance` type
- Compatible with sighting properties
- Evaluates sighting conditions

### Result Pattern (`@/shared/result`)

- Uses `Result<T, E>` for validation
- Consistent error handling
- Type-safe error codes

## Design Patterns Applied

### 1. Branded Types

```typescript
export type SignalId = string & { readonly __brand: "SignalId" };
export type TriggerId = string & { readonly __brand: "TriggerId" };
```

### 2. Result Pattern

```typescript
export const createSignal = (
  input: NewSignal,
  context: { id: SignalId; createdAt: string }
): Result<Signal, DomainError> => {
  // Validation logic...
  return ok(signal) || err(error);
};
```

### 3. Context Pattern

```typescript
const context = {
  id: signalId,
  createdAt: timestamp,
};
createSignal(input, context);
```

### 4. Immutable Updates

```typescript
export const updateSignal = (
  existing: Signal,
  updates: UpdateSignal,
  context: { updatedAt: string }
): Result<Signal, DomainError> => {
  // Returns new signal, doesn't mutate existing
};
```

## Usage Examples

### Basic Signal Creation

```typescript
import {
  createSignal,
  type NewSignal,
  type SignalId,
} from "@/domain/signals/signal";

const input: NewSignal = {
  name: "Wildlife Alerts",
  description: "Critical wildlife sightings",
  ownerId: "user-123",
  target: { kind: "geofence", geofenceId: "park-456" },
  triggers: ["new_sighting", "sighting_confirmed"],
  conditions: {
    categoryIds: ["wildlife"],
    importance: ["critical", "high"],
    minTrustLevel: "trusted",
    operator: "AND",
  },
  isActive: true,
};

const result = createSignal(input, {
  id: "signal-789" as SignalId,
  createdAt: new Date().toISOString(),
});

if (result.ok) {
  const signal = result.value;
  // Use signal...
} else {
  console.error(result.error);
}
```

### Evaluating Sightings

```typescript
import {
  matchesConditions,
  shouldTrigger,
  type SightingMatchData,
} from "@/domain/signals/signal";

// Check if signal should process this event
if (shouldTrigger(signal, "new_sighting")) {
  // Build sighting data
  const sightingData: SightingMatchData = {
    categoryId: "wildlife",
    typeId: "bear",
    tags: ["mammal", "dangerous"],
    importance: "critical",
    score: 85,
    reporterTrustLevel: "trusted",
  };

  // Check if conditions match
  if (matchesConditions(signal.conditions, sightingData)) {
    // Trigger notification!
  }
}
```

## Error Handling

All validation errors follow the pattern `signal.<error_type>`:

```typescript
{
  code: "signal.name_required",
  message: "Signal name is required.",
  field: "name"
}
```

### Complete Error Code List

- `signal.name_required`
- `signal.name_too_long`
- `signal.description_too_long`
- `signal.owner_required`
- `signal.geofence_required`
- `signal.triggers_required`
- `signal.too_many_triggers`
- `signal.duplicate_triggers`
- `signal.too_many_categories`
- `signal.too_many_types`
- `signal.too_many_tags`
- `signal.invalid_score_range`
- `signal.invalid_id`

Plus geographic errors from the geo domain:

- `geo.invalid_polygon`
- `geo.invalid_lat`
- `geo.invalid_lng`

## Business Logic Highlights

### 1. Hierarchical Trust Levels

Trust levels are ordered: `unverified < new < trusted < verified`

When `minTrustLevel: "new"` is specified, sightings from "new", "trusted", and "verified" users match, but "unverified" users don't.

```typescript
const TIER_ORDER: Record<ReputationTier, number> = {
  unverified: 0,
  new: 1,
  trusted: 2,
  verified: 3,
};
```

### 2. Tag Matching

Tags use "any match" logic - if any signal tag matches any sighting tag, the condition passes.

```typescript
// Signal tags: ["urgent", "public-safety"]
// Sighting tags: ["public-safety", "infrastructure"]
// Result: MATCH (public-safety appears in both)
```

### 3. AND vs OR Logic

**AND (default)**: All conditions must pass

```typescript
conditions: {
  categoryIds: ["wildlife"],
  importance: ["critical"],
  operator: "AND"
}
// Matches only: wildlife AND critical
```

**OR**: At least one condition must pass

```typescript
conditions: {
  categoryIds: ["wildlife", "weather"],
  operator: "OR"
}
// Matches: wildlife OR weather (or both)
```

### 4. Owner Immutability

Signal ownership cannot be transferred - the `ownerId` is preserved during updates:

```typescript
export const updateSignal = (existing: Signal, updates: UpdateSignal) => {
  const merged: NewSignal = {
    ...updates,
    ownerId: existing.ownerId, // Always preserved
  };
};
```

## Constants and Limits

```typescript
const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_TRIGGERS = 10;
const MAX_CATEGORY_IDS = 20;
const MAX_TYPE_IDS = 50;
const MAX_TAGS = 30;
```

## Next Steps for Implementation

To integrate signals into the application, the following steps are recommended:

### 1. Database Layer

Create repository/adapter for signal persistence:

- `src/adapters/repositories/signal-repository.ts`
- Database schema/migrations
- CRUD operations

### 2. Application Layer

Create use cases for signal management:

- `src/application/signals/create-signal.ts`
- `src/application/signals/update-signal.ts`
- `src/application/signals/delete-signal.ts`
- `src/application/signals/list-user-signals.ts`
- `src/application/signals/evaluate-sighting.ts`

### 3. API Layer

Create REST endpoints:

- `POST /api/signals` - Create signal
- `GET /api/signals` - List user's signals
- `GET /api/signals/:id` - Get signal details
- `PATCH /api/signals/:id` - Update signal
- `DELETE /api/signals/:id` - Delete signal

### 4. Event Processing

Implement signal evaluation pipeline:

- Hook into sighting creation events
- Hook into sighting reaction events (confirm/dispute)
- Hook into score update events
- Batch process matching signals
- Queue notifications

### 5. Notification System

Implement notification delivery:

- Email notifications
- In-app notifications
- Push notifications (future)
- Notification preferences
- Notification history

### 6. UI Components

Create user interface:

- Signal creation form
- Signal list view
- Signal detail view
- Signal edit form
- Condition builder
- Geographic targeting UI

## Performance Considerations

### For Signal Evaluation

When a sighting is created/updated, the system needs to evaluate it against potentially many signals:

1. **Geographic Pre-filtering**: Filter signals by geographic target before condition matching
2. **Trigger Type Pre-filtering**: Only evaluate signals with matching trigger types
3. **Active Status Check**: Skip inactive signals immediately
4. **Condition Short-circuiting**: Use AND/OR logic efficiently
5. **Batch Processing**: Group notifications to avoid excessive database queries

### Suggested Evaluation Pipeline

```typescript
async function evaluateSighting(
  sighting: Sighting,
  triggerType: TriggerType
): Promise<Signal[]> {
  // 1. Get active signals with matching trigger type
  const signals = await getActiveSignalsWithTrigger(triggerType);

  // 2. Filter by geography
  const geoMatches = signals.filter((signal) =>
    matchesGeography(sighting.location, signal.target)
  );

  // 3. Build sighting match data once
  const sightingData = await buildSightingMatchData(sighting);

  // 4. Filter by conditions
  const matches = geoMatches.filter((signal) =>
    matchesConditions(signal.conditions, sightingData)
  );

  return matches;
}
```

## Testing

Run tests:

```bash
npm test -- src/domain/signals
```

Run all domain tests:

```bash
npm test -- src/domain
```

## Documentation

See the following files for more details:

- `src/domain/signals/README.md` - Complete domain documentation
- `src/domain/signals/examples.ts` - Real-world usage examples
- `src/domain/signals/signal.test.ts` - Test suite (examples of usage)

## Conclusion

The Signals domain is fully implemented, tested, and ready for integration. It follows all established patterns in the codebase and provides a robust foundation for building the automated alert system.

### Key Strengths

✅ Type-safe with branded types
✅ Comprehensive validation
✅ Flexible condition system
✅ Well-tested (51 passing tests)
✅ Consistent with existing patterns
✅ Clear error messages
✅ Documented with examples
✅ Production-ready

### Integration Checklist

- [ ] Create database schema
- [ ] Implement repository layer
- [ ] Create application use cases
- [ ] Build API endpoints
- [ ] Implement event pipeline
- [ ] Build notification system
- [ ] Create UI components
- [ ] Add end-to-end tests
- [ ] Deploy to production

---

**Implementation by**: Claude Sonnet 4.5
**Date**: 2026-01-26
**Status**: ✅ Complete
