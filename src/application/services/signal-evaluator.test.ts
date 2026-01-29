import { describe, it, expect } from "vitest";
import {
  evaluateSighting,
  evaluateSightingDetailed,
  shouldTrigger,
  matchesGeography,
  matchesSignalConditions,
  wouldMatch,
  evaluateSignalFeed,
  findScoreThresholdSignals,
  crossedScoreThreshold,
  preFilterSignals,
  calculateMatchScore,
  buildEvaluationContext,
  type SignalEvent,
  type EvaluationContext,
} from "./signal-evaluator";
import type { Signal, SignalTarget, SignalId } from "@/domain/signals/signal";
import type { Sighting, SightingId } from "@/domain/sightings/sighting";
import type { Geofence, GeofenceId } from "@/domain/geofences/geofence";
import type {
  SightingType,
  SightingTypeId,
  CategoryId,
} from "@/domain/taxonomy/taxonomy";

// Test data factories
const createTestSighting = (overrides?: Partial<Sighting>): Sighting => ({
  id: "sighting-1" as SightingId,
  typeId: "type-police-patrol" as SightingTypeId,
  categoryId: "cat-law-enforcement" as CategoryId,
  location: { lat: 36.1539, lng: -95.9925 }, // Tulsa, OK
  description: "Police patrol observed",
  importance: "normal",
  status: "active",
  observedAt: "2026-01-26T10:00:00Z",
  createdAt: "2026-01-26T10:00:00Z",
  fields: {},
  reporterId: "user-1",
  upvotes: 5,
  downvotes: 0,
  confirmations: 2,
  disputes: 0,
  spamReports: 0,
  score: 9,
  hotScore: 4.5,
  ...overrides,
});

const createTestSignal = (overrides?: Partial<Signal>): Signal => ({
  id: "signal-1" as SignalId,
  name: "Tulsa Police Activity",
  description: "Police activity in Tulsa",
  ownerId: "owner-1",
  target: { kind: "geofence", geofenceId: "geofence-tulsa" },
  triggers: ["new_sighting"],
  conditions: {
    categoryIds: ["cat-law-enforcement"],
  },
  isActive: true,
  createdAt: "2026-01-26T09:00:00Z",
  updatedAt: "2026-01-26T09:00:00Z",
  ...overrides,
});

const createTestGeofence = (id: string): Geofence => ({
  id: id as GeofenceId,
  name: "Tulsa",
  polygon: {
    points: [
      { lat: 36.2, lng: -96.1 },
      { lat: 36.2, lng: -95.8 },
      { lat: 36.0, lng: -95.8 },
      { lat: 36.0, lng: -96.1 },
    ],
  },
  visibility: "public",
  createdAt: "2026-01-26T08:00:00Z",
});

const createTestContext = (): EvaluationContext => {
  const geofence = createTestGeofence("geofence-tulsa");

  const sightingType: SightingType = {
    id: "type-police-patrol" as SightingTypeId,
    label: "Police Patrol",
    categoryId: "cat-law-enforcement" as CategoryId,
    tags: ["routine", "law-enforcement"],
    icon: "🚓",
  };

  return {
    geofences: new Map([[geofence.id, geofence]]),
    sightingTypes: new Map([[sightingType.id, sightingType]]),
    userReputation: new Map([
      ["user-1", { score: 25, isVerified: false }],
      ["user-2", { score: 5, isVerified: false }],
      ["user-3", { score: 75, isVerified: false }],
      ["user-verified", { score: 100, isVerified: true }],
    ]),
  };
};

describe("signal-evaluator", () => {
  describe("shouldTrigger", () => {
    it("should return true when trigger type is in signal triggers", () => {
      const signal = createTestSignal({
        triggers: ["new_sighting", "sighting_confirmed"],
      });

      expect(shouldTrigger(signal, "new_sighting")).toBe(true);
      expect(shouldTrigger(signal, "sighting_confirmed")).toBe(true);
    });

    it("should return false when trigger type is not in signal triggers", () => {
      const signal = createTestSignal({
        triggers: ["new_sighting"],
      });

      expect(shouldTrigger(signal, "score_threshold")).toBe(false);
      expect(shouldTrigger(signal, "sighting_disputed")).toBe(false);
    });
  });

  describe("matchesGeography", () => {
    it("should match global targets", () => {
      const signal = createTestSignal({
        target: { kind: "global" },
      });
      const sighting = createTestSighting();
      const context = createTestContext();

      expect(matchesGeography(sighting, signal, context)).toBe(true);
    });

    it("should match when point is inside geofence", () => {
      const signal = createTestSignal({
        target: { kind: "geofence", geofenceId: "geofence-tulsa" },
      });
      const sighting = createTestSighting({
        location: { lat: 36.1, lng: -95.9 }, // Inside Tulsa bounds
      });
      const context = createTestContext();

      expect(matchesGeography(sighting, signal, context)).toBe(true);
    });

    it("should not match when point is outside geofence", () => {
      const signal = createTestSignal({
        target: { kind: "geofence", geofenceId: "geofence-tulsa" },
      });
      const sighting = createTestSighting({
        location: { lat: 40.0, lng: -100.0 }, // Far outside Tulsa
      });
      const context = createTestContext();

      expect(matchesGeography(sighting, signal, context)).toBe(false);
    });

    it("should match when point is inside custom polygon", () => {
      const signal = createTestSignal({
        target: {
          kind: "polygon",
          polygon: {
            points: [
              { lat: 36.2, lng: -96.1 },
              { lat: 36.2, lng: -95.8 },
              { lat: 36.0, lng: -95.8 },
              { lat: 36.0, lng: -96.1 },
            ],
          },
        },
      });
      const sighting = createTestSighting({
        location: { lat: 36.1, lng: -95.9 },
      });
      const context = createTestContext();

      expect(matchesGeography(sighting, signal, context)).toBe(true);
    });

    it("should not match when geofence does not exist", () => {
      const signal = createTestSignal({
        target: { kind: "geofence", geofenceId: "nonexistent" },
      });
      const sighting = createTestSighting();
      const context = createTestContext();

      expect(matchesGeography(sighting, signal, context)).toBe(false);
    });
  });

  describe("matchesSignalConditions", () => {
    it("should match when category matches", () => {
      const signal = createTestSignal({
        conditions: {
          categoryIds: ["cat-law-enforcement"],
        },
      });
      const sighting = createTestSighting({
        categoryId: "cat-law-enforcement" as CategoryId,
      });
      const context = createTestContext();

      expect(matchesSignalConditions(sighting, signal, context)).toBe(true);
    });

    it("should not match when category does not match", () => {
      const signal = createTestSignal({
        conditions: {
          categoryIds: ["cat-wildlife"],
        },
      });
      const sighting = createTestSighting({
        categoryId: "cat-law-enforcement" as CategoryId,
      });
      const context = createTestContext();

      expect(matchesSignalConditions(sighting, signal, context)).toBe(false);
    });

    it("should match when type matches", () => {
      const signal = createTestSignal({
        conditions: {
          typeIds: ["type-police-patrol"],
        },
      });
      const sighting = createTestSighting({
        typeId: "type-police-patrol" as SightingTypeId,
      });
      const context = createTestContext();

      expect(matchesSignalConditions(sighting, signal, context)).toBe(true);
    });

    it("should match when importance matches", () => {
      const signal = createTestSignal({
        conditions: {
          importance: ["high", "critical"],
        },
      });
      const sighting = createTestSighting({
        importance: "high",
      });
      const context = createTestContext();

      expect(matchesSignalConditions(sighting, signal, context)).toBe(true);
    });

    it("should match when score is within range", () => {
      const signal = createTestSignal({
        conditions: {
          minScore: 5,
          maxScore: 20,
        },
      });
      const sighting = createTestSighting({
        score: 10,
      });
      const context = createTestContext();

      expect(matchesSignalConditions(sighting, signal, context)).toBe(true);
    });

    it("should not match when score is below minimum", () => {
      const signal = createTestSignal({
        conditions: {
          minScore: 15,
        },
      });
      const sighting = createTestSighting({
        score: 10,
      });
      const context = createTestContext();

      expect(matchesSignalConditions(sighting, signal, context)).toBe(false);
    });

    it("should match when trust level meets minimum", () => {
      const signal = createTestSignal({
        conditions: {
          minTrustLevel: "new",
        },
      });
      const sighting = createTestSighting({
        reporterId: "user-1", // Has score 25 = "new" tier
      });
      const context = createTestContext();

      expect(matchesSignalConditions(sighting, signal, context)).toBe(true);
    });

    it("should not match when trust level is below minimum", () => {
      const signal = createTestSignal({
        conditions: {
          minTrustLevel: "trusted",
        },
      });
      const sighting = createTestSighting({
        reporterId: "user-2", // Has score 5 = "unverified" tier
      });
      const context = createTestContext();

      expect(matchesSignalConditions(sighting, signal, context)).toBe(false);
    });

    it("should match when tag matches", () => {
      const signal = createTestSignal({
        conditions: {
          tags: ["routine", "emergency"],
        },
      });
      const sighting = createTestSighting({
        typeId: "type-police-patrol" as SightingTypeId, // Has tags: ["routine", "law-enforcement"]
      });
      const context = createTestContext();

      expect(matchesSignalConditions(sighting, signal, context)).toBe(true);
    });

    it("should match all conditions with AND operator", () => {
      const signal = createTestSignal({
        conditions: {
          categoryIds: ["cat-law-enforcement"],
          importance: ["normal", "high"],
          minScore: 5,
          operator: "AND",
        },
      });
      const sighting = createTestSighting({
        categoryId: "cat-law-enforcement" as CategoryId,
        importance: "normal",
        score: 9,
      });
      const context = createTestContext();

      expect(matchesSignalConditions(sighting, signal, context)).toBe(true);
    });

    it("should match any condition with OR operator", () => {
      const signal = createTestSignal({
        conditions: {
          categoryIds: ["cat-wildlife"], // Does not match
          importance: ["high"], // Does not match
          minScore: 5, // Matches!
          operator: "OR",
        },
      });
      const sighting = createTestSighting({
        categoryId: "cat-law-enforcement" as CategoryId,
        importance: "normal",
        score: 9,
      });
      const context = createTestContext();

      expect(matchesSignalConditions(sighting, signal, context)).toBe(true);
    });
  });

  describe("evaluateSighting", () => {
    it("should return matching signals", () => {
      const signal1 = createTestSignal({
        id: "signal-1" as SignalId,
        conditions: { categoryIds: ["cat-law-enforcement"] },
      });
      const signal2 = createTestSignal({
        id: "signal-2" as SignalId,
        conditions: { categoryIds: ["cat-wildlife"] },
      });

      const sighting = createTestSighting({
        categoryId: "cat-law-enforcement" as CategoryId,
      });
      const event: SignalEvent = { type: "new_sighting", sighting };
      const context = createTestContext();

      const results = evaluateSighting(
        sighting,
        [signal1, signal2],
        event,
        context
      );

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("signal-1");
    });

    it("should skip inactive signals", () => {
      const signal = createTestSignal({
        isActive: false,
      });
      const sighting = createTestSighting();
      const event: SignalEvent = { type: "new_sighting", sighting };
      const context = createTestContext();

      const results = evaluateSighting(sighting, [signal], event, context);

      expect(results).toHaveLength(0);
    });

    it("should skip signals that do not trigger on event type", () => {
      const signal = createTestSignal({
        triggers: ["score_threshold"],
      });
      const sighting = createTestSighting();
      const event: SignalEvent = { type: "new_sighting", sighting };
      const context = createTestContext();

      const results = evaluateSighting(sighting, [signal], event, context);

      expect(results).toHaveLength(0);
    });

    it("should skip signals with non-matching geography", () => {
      const signal = createTestSignal({
        target: { kind: "geofence", geofenceId: "geofence-tulsa" },
      });
      const sighting = createTestSighting({
        location: { lat: 40.0, lng: -100.0 }, // Outside Tulsa
      });
      const event: SignalEvent = { type: "new_sighting", sighting };
      const context = createTestContext();

      const results = evaluateSighting(sighting, [signal], event, context);

      expect(results).toHaveLength(0);
    });
  });

  describe("evaluateSightingDetailed", () => {
    it("should provide detailed evaluation results", () => {
      const signal = createTestSignal({
        isActive: false,
      });
      const sighting = createTestSighting();
      const event: SignalEvent = { type: "new_sighting", sighting };
      const context = createTestContext();

      const results = evaluateSightingDetailed(
        sighting,
        [signal],
        event,
        context
      );

      expect(results).toHaveLength(1);
      expect(results[0].matched).toBe(false);
      expect(results[0].reason).toBe("Signal is not active");
    });

    it("should explain trigger type mismatch", () => {
      const signal = createTestSignal({
        triggers: ["score_threshold"],
      });
      const sighting = createTestSighting();
      const event: SignalEvent = { type: "new_sighting", sighting };
      const context = createTestContext();

      const results = evaluateSightingDetailed(
        sighting,
        [signal],
        event,
        context
      );

      expect(results[0].matched).toBe(false);
      expect(results[0].reason).toContain("does not trigger on new_sighting");
    });

    it("should explain successful match", () => {
      const signal = createTestSignal();
      const sighting = createTestSighting();
      const event: SignalEvent = { type: "new_sighting", sighting };
      const context = createTestContext();

      const results = evaluateSightingDetailed(
        sighting,
        [signal],
        event,
        context
      );

      expect(results[0].matched).toBe(true);
      expect(results[0].reason).toBe("All criteria matched");
    });
  });

  describe("wouldMatch", () => {
    it("should check if sighting would match signal regardless of trigger", () => {
      const signal = createTestSignal({
        triggers: ["score_threshold"], // Not "new_sighting"
        conditions: { categoryIds: ["cat-law-enforcement"] },
      });
      const sighting = createTestSighting({
        categoryId: "cat-law-enforcement" as CategoryId,
      });
      const context = createTestContext();

      // Even though trigger doesn't match "new_sighting", wouldMatch ignores that
      expect(wouldMatch(sighting, signal, context)).toBe(true);
    });
  });

  describe("evaluateSignalFeed", () => {
    it("should return all matching sightings for a signal", () => {
      const signal = createTestSignal({
        conditions: { categoryIds: ["cat-law-enforcement"] },
      });

      const sighting1 = createTestSighting({
        id: "sighting-1" as SightingId,
        categoryId: "cat-law-enforcement" as CategoryId,
      });
      const sighting2 = createTestSighting({
        id: "sighting-2" as SightingId,
        categoryId: "cat-wildlife" as CategoryId,
      });
      const sighting3 = createTestSighting({
        id: "sighting-3" as SightingId,
        categoryId: "cat-law-enforcement" as CategoryId,
      });

      const context = createTestContext();

      const results = evaluateSignalFeed(
        [sighting1, sighting2, sighting3],
        signal,
        context
      );

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe("sighting-1");
      expect(results[1].id).toBe("sighting-3");
    });

    it("should return empty array for inactive signals", () => {
      const signal = createTestSignal({
        isActive: false,
      });
      const sighting = createTestSighting();
      const context = createTestContext();

      const results = evaluateSignalFeed([sighting], signal, context);

      expect(results).toHaveLength(0);
    });
  });

  describe("findScoreThresholdSignals", () => {
    it("should return signals with score_threshold trigger", () => {
      const signal1 = createTestSignal({
        id: "signal-1" as SignalId,
        triggers: ["new_sighting", "score_threshold"],
      });
      const signal2 = createTestSignal({
        id: "signal-2" as SignalId,
        triggers: ["new_sighting"],
      });
      const signal3 = createTestSignal({
        id: "signal-3" as SignalId,
        triggers: ["score_threshold"],
      });

      const results = findScoreThresholdSignals([signal1, signal2, signal3]);

      expect(results).toHaveLength(2);
      expect(results.map((s) => s.id)).toContain("signal-1");
      expect(results.map((s) => s.id)).toContain("signal-3");
    });

    it("should only return active signals", () => {
      const signal = createTestSignal({
        triggers: ["score_threshold"],
        isActive: false,
      });

      const results = findScoreThresholdSignals([signal]);

      expect(results).toHaveLength(0);
    });
  });

  describe("crossedScoreThreshold", () => {
    it("should return true when crossing from below to above threshold", () => {
      expect(crossedScoreThreshold(10, 5, 8)).toBe(true);
    });

    it("should return true when crossing exactly to threshold", () => {
      expect(crossedScoreThreshold(10, 5, 10)).toBe(true);
    });

    it("should return false when already above threshold", () => {
      expect(crossedScoreThreshold(15, 12, 10)).toBe(false);
    });

    it("should return false when still below threshold", () => {
      expect(crossedScoreThreshold(5, 3, 10)).toBe(false);
    });

    it("should return false when crossing from above to below", () => {
      expect(crossedScoreThreshold(5, 15, 10)).toBe(false);
    });
  });

  describe("preFilterSignals", () => {
    it("should filter out inactive signals", () => {
      const signal = createTestSignal({
        isActive: false,
      });
      const sighting = createTestSighting();
      const event: SignalEvent = { type: "new_sighting", sighting };

      const results = preFilterSignals(sighting, [signal], event);

      expect(results).toHaveLength(0);
    });

    it("should filter out signals with wrong trigger type", () => {
      const signal = createTestSignal({
        triggers: ["score_threshold"],
      });
      const sighting = createTestSighting();
      const event: SignalEvent = { type: "new_sighting", sighting };

      const results = preFilterSignals(sighting, [signal], event);

      expect(results).toHaveLength(0);
    });

    it("should keep global signals", () => {
      const signal = createTestSignal({
        target: { kind: "global" },
      });
      const sighting = createTestSighting();
      const event: SignalEvent = { type: "new_sighting", sighting };

      const results = preFilterSignals(sighting, [signal], event);

      expect(results).toHaveLength(1);
    });

    it("should filter out signals with non-matching category (AND operator)", () => {
      const signal = createTestSignal({
        conditions: {
          categoryIds: ["cat-wildlife"],
          operator: "AND",
        },
      });
      const sighting = createTestSighting({
        categoryId: "cat-law-enforcement" as CategoryId,
      });
      const event: SignalEvent = { type: "new_sighting", sighting };

      const results = preFilterSignals(sighting, [signal], event);

      expect(results).toHaveLength(0);
    });

    it("should keep signals with non-matching category (OR operator)", () => {
      const signal = createTestSignal({
        conditions: {
          categoryIds: ["cat-wildlife"],
          operator: "OR",
        },
      });
      const sighting = createTestSighting({
        categoryId: "cat-law-enforcement" as CategoryId,
      });
      const event: SignalEvent = { type: "new_sighting", sighting };

      const results = preFilterSignals(sighting, [signal], event);

      expect(results).toHaveLength(1); // Kept for full evaluation
    });
  });

  describe("calculateMatchScore", () => {
    it("should give base score for any match", () => {
      const signal = createTestSignal({
        conditions: {},
      });
      const sighting = createTestSighting();

      const score = calculateMatchScore(signal, sighting);

      expect(score).toBeGreaterThanOrEqual(10);
    });

    it("should give higher score for category match", () => {
      const signal1 = createTestSignal({
        conditions: {},
      });
      const signal2 = createTestSignal({
        conditions: { categoryIds: ["cat-law-enforcement"] },
      });
      const sighting = createTestSighting({
        categoryId: "cat-law-enforcement" as CategoryId,
      });

      const score1 = calculateMatchScore(signal1, sighting);
      const score2 = calculateMatchScore(signal2, sighting);

      expect(score2).toBeGreaterThan(score1);
    });

    it("should give highest score for type match", () => {
      const signal1 = createTestSignal({
        conditions: { categoryIds: ["cat-law-enforcement"] },
      });
      const signal2 = createTestSignal({
        conditions: { typeIds: ["type-police-patrol"] },
      });
      const sighting = createTestSighting({
        categoryId: "cat-law-enforcement" as CategoryId,
        typeId: "type-police-patrol" as SightingTypeId,
      });

      const score1 = calculateMatchScore(signal1, sighting);
      const score2 = calculateMatchScore(signal2, sighting);

      expect(score2).toBeGreaterThan(score1);
    });

    it("should cap score at 100", () => {
      const signal = createTestSignal({
        conditions: {
          categoryIds: ["cat-law-enforcement"],
          typeIds: ["type-police-patrol"],
          importance: ["normal"],
          minScore: 5,
          maxScore: 20,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        target: { kind: "polygon", polygon: { points: [] } } as any,
      });
      const sighting = createTestSighting({
        categoryId: "cat-law-enforcement" as CategoryId,
        typeId: "type-police-patrol" as SightingTypeId,
        importance: "normal",
        score: 10,
      });

      const score = calculateMatchScore(signal, sighting);

      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe("buildEvaluationContext", () => {
    it("should build context from repository data", () => {
      const geofence = createTestGeofence("geofence-1");
      const sightingType: SightingType = {
        id: "type-1" as SightingTypeId,
        label: "Test Type",
        categoryId: "cat-1" as CategoryId,
        tags: ["test"],
      };

      const context = buildEvaluationContext({
        geofences: [geofence],
        sightingTypes: [sightingType],
        userReputation: [{ userId: "user-1", score: 50 }],
      });

      expect(context.geofences.get("geofence-1")).toBe(geofence);
      expect(context.sightingTypes.get("type-1")).toBe(sightingType);
      expect(context.userReputation.get("user-1")?.score).toBe(50);
    });
  });
});
