import { validatePolygon, type Polygon } from "@/domain/geo/geo";
import { type GeofenceId } from "@/domain/geofences/geofence";
import { type ReputationTier } from "@/domain/reputation/reputation";
import { type SightingImportance } from "@/domain/sightings/sighting";
import { err, ok, type DomainError, type Result } from "@/shared/result";

export type SignalId = string & { readonly __brand: "SignalId" };
export type TriggerId = string & { readonly __brand: "TriggerId" };

// Trigger types - events that can activate a signal
export type TriggerType =
  | "new_sighting"
  | "sighting_confirmed"
  | "sighting_disputed"
  | "score_threshold";

// Geographic targeting options
export type SignalTarget =
  | { kind: "geofence"; geofenceId: GeofenceId }
  | { kind: "polygon"; polygon: Polygon }
  | { kind: "global" }; // No geographic restriction

// Condition types for filtering sightings
export type SignalConditions = {
  // Taxonomy filters
  categoryIds?: string[];
  typeIds?: string[];
  tags?: string[];

  // Importance filter
  importance?: SightingImportance[];

  // Trust level filter (minimum reputation tier)
  minTrustLevel?: ReputationTier;

  // Score filters
  minScore?: number;
  maxScore?: number;

  // Logic operator for combining conditions
  operator?: "AND" | "OR";
};

export type NewSignal = {
  name: string;
  description?: string;
  ownerId: string;
  target: SignalTarget;
  triggers: TriggerType[];
  conditions?: SignalConditions;
  isActive?: boolean;
};

export type UpdateSignal = Partial<{
  name: string;
  description: string;
  target: SignalTarget;
  triggers: TriggerType[];
  conditions: SignalConditions;
  isActive: boolean;
}>;

export type Signal = {
  id: SignalId;
  name: string;
  description?: string;
  ownerId: string;
  target: SignalTarget;
  triggers: TriggerType[];
  conditions: SignalConditions;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

// Constants
const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_TRIGGERS = 10;
const MAX_CATEGORY_IDS = 20;
const MAX_TYPE_IDS = 50;
const MAX_TAGS = 30;

// Helper functions
const hasText = (value: string) => value.trim().length > 0;

// Validate signal name
const validateSignalName = (name: string): Result<string, DomainError> => {
  if (!hasText(name)) {
    return err({
      code: "signal.name_required",
      message: "Signal name is required.",
      field: "name",
    });
  }

  if (name.length > MAX_NAME_LENGTH) {
    return err({
      code: "signal.name_too_long",
      message: `Signal name must be ${MAX_NAME_LENGTH} characters or less.`,
      field: "name",
    });
  }

  return ok(name);
};

// Validate signal description
const validateSignalDescription = (
  description: string | undefined
): Result<string | undefined, DomainError> => {
  if (!description) {
    return ok(undefined);
  }

  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return err({
      code: "signal.description_too_long",
      message: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less.`,
      field: "description",
    });
  }

  return ok(description);
};

// Validate owner ID
const validateOwnerId = (ownerId: string): Result<string, DomainError> => {
  if (!hasText(ownerId)) {
    return err({
      code: "signal.owner_required",
      message: "Signal owner is required.",
      field: "ownerId",
    });
  }

  return ok(ownerId);
};

// Validate signal target
const validateSignalTarget = (
  target: SignalTarget
): Result<SignalTarget, DomainError> => {
  if (target.kind === "polygon") {
    const polygonResult = validatePolygon(target.polygon);
    if (!polygonResult.ok) {
      return polygonResult;
    }
  }

  if (target.kind === "geofence" && !hasText(target.geofenceId)) {
    return err({
      code: "signal.geofence_required",
      message: "Geofence ID is required when target kind is geofence.",
      field: "geofenceId",
    });
  }

  return ok(target);
};

// Validate triggers
const validateTriggers = (
  triggers: TriggerType[]
): Result<TriggerType[], DomainError> => {
  if (!triggers || triggers.length === 0) {
    return err({
      code: "signal.triggers_required",
      message: "At least one trigger is required.",
      field: "triggers",
    });
  }

  if (triggers.length > MAX_TRIGGERS) {
    return err({
      code: "signal.too_many_triggers",
      message: `Maximum ${MAX_TRIGGERS} triggers allowed.`,
      field: "triggers",
    });
  }

  // Check for duplicates
  const uniqueTriggers = new Set(triggers);
  if (uniqueTriggers.size !== triggers.length) {
    return err({
      code: "signal.duplicate_triggers",
      message: "Duplicate triggers are not allowed.",
      field: "triggers",
    });
  }

  return ok(triggers);
};

// Validate conditions
const validateConditions = (
  conditions: SignalConditions | undefined
): Result<SignalConditions, DomainError> => {
  const validatedConditions: SignalConditions = conditions || {};

  // Validate array sizes
  if (
    validatedConditions.categoryIds &&
    validatedConditions.categoryIds.length > MAX_CATEGORY_IDS
  ) {
    return err({
      code: "signal.too_many_categories",
      message: `Maximum ${MAX_CATEGORY_IDS} categories allowed.`,
      field: "categoryIds",
    });
  }

  if (
    validatedConditions.typeIds &&
    validatedConditions.typeIds.length > MAX_TYPE_IDS
  ) {
    return err({
      code: "signal.too_many_types",
      message: `Maximum ${MAX_TYPE_IDS} types allowed.`,
      field: "typeIds",
    });
  }

  if (validatedConditions.tags && validatedConditions.tags.length > MAX_TAGS) {
    return err({
      code: "signal.too_many_tags",
      message: `Maximum ${MAX_TAGS} tags allowed.`,
      field: "tags",
    });
  }

  // Validate score range
  if (
    validatedConditions.minScore !== undefined &&
    validatedConditions.maxScore !== undefined
  ) {
    if (validatedConditions.minScore > validatedConditions.maxScore) {
      return err({
        code: "signal.invalid_score_range",
        message: "Minimum score cannot be greater than maximum score.",
        field: "minScore",
      });
    }
  }

  return ok(validatedConditions);
};

// Create a new signal
export const createSignal = (
  input: NewSignal,
  context: { id: SignalId; createdAt: string }
): Result<Signal, DomainError> => {
  // Validate name
  const nameResult = validateSignalName(input.name);
  if (!nameResult.ok) {
    return nameResult;
  }

  // Validate description
  const descriptionResult = validateSignalDescription(input.description);
  if (!descriptionResult.ok) {
    return descriptionResult;
  }

  // Validate owner ID
  const ownerResult = validateOwnerId(input.ownerId);
  if (!ownerResult.ok) {
    return ownerResult;
  }

  // Validate target
  const targetResult = validateSignalTarget(input.target);
  if (!targetResult.ok) {
    return targetResult;
  }

  // Validate triggers
  const triggersResult = validateTriggers(input.triggers);
  if (!triggersResult.ok) {
    return triggersResult;
  }

  // Validate conditions
  const conditionsResult = validateConditions(input.conditions);
  if (!conditionsResult.ok) {
    return conditionsResult;
  }

  return ok({
    id: context.id,
    name: input.name,
    description: input.description,
    ownerId: input.ownerId,
    target: input.target,
    triggers: input.triggers,
    conditions: conditionsResult.value,
    isActive: input.isActive ?? true,
    createdAt: context.createdAt,
    updatedAt: context.createdAt,
  });
};

// Update an existing signal
export const updateSignal = (
  existing: Signal,
  updates: UpdateSignal,
  context: { updatedAt: string }
): Result<Signal, DomainError> => {
  const merged: NewSignal = {
    name: updates.name ?? existing.name,
    description:
      updates.description !== undefined
        ? updates.description
        : existing.description,
    ownerId: existing.ownerId, // Owner cannot be changed
    target: updates.target ?? existing.target,
    triggers: updates.triggers ?? existing.triggers,
    conditions: updates.conditions ?? existing.conditions,
    isActive: updates.isActive ?? existing.isActive,
  };

  const validationResult = createSignal(merged, {
    id: existing.id,
    createdAt: existing.createdAt,
  });

  if (!validationResult.ok) {
    return validationResult;
  }

  return ok({
    ...validationResult.value,
    updatedAt: context.updatedAt,
  });
};

// Helper function: Check if a sighting matches signal conditions
export type SightingMatchData = {
  categoryId: string;
  typeId: string;
  tags: string[];
  importance: SightingImportance;
  score: number;
  reporterTrustLevel: ReputationTier;
};

// Reputation tier ordering for comparison
const TIER_ORDER: Record<ReputationTier, number> = {
  unverified: 0,
  new: 1,
  trusted: 2,
  verified: 3,
};

const meetsMinTrustLevel = (
  actual: ReputationTier,
  required: ReputationTier
): boolean => {
  return TIER_ORDER[actual] >= TIER_ORDER[required];
};

export const matchesConditions = (
  conditions: SignalConditions,
  sighting: SightingMatchData
): boolean => {
  const operator = conditions.operator ?? "AND";
  const checks: boolean[] = [];

  // Category check
  if (conditions.categoryIds && conditions.categoryIds.length > 0) {
    checks.push(conditions.categoryIds.includes(sighting.categoryId));
  }

  // Type check
  if (conditions.typeIds && conditions.typeIds.length > 0) {
    checks.push(conditions.typeIds.includes(sighting.typeId));
  }

  // Tags check (any tag matches)
  if (conditions.tags && conditions.tags.length > 0) {
    const hasMatchingTag = conditions.tags.some((tag) =>
      sighting.tags.includes(tag)
    );
    checks.push(hasMatchingTag);
  }

  // Importance check
  if (conditions.importance && conditions.importance.length > 0) {
    checks.push(conditions.importance.includes(sighting.importance));
  }

  // Trust level check
  if (conditions.minTrustLevel) {
    checks.push(
      meetsMinTrustLevel(sighting.reporterTrustLevel, conditions.minTrustLevel)
    );
  }

  // Score range checks
  if (conditions.minScore !== undefined) {
    checks.push(sighting.score >= conditions.minScore);
  }

  if (conditions.maxScore !== undefined) {
    checks.push(sighting.score <= conditions.maxScore);
  }

  // If no conditions specified, match everything
  if (checks.length === 0) {
    return true;
  }

  // Apply operator
  if (operator === "OR") {
    return checks.some((check) => check);
  } else {
    // AND
    return checks.every((check) => check);
  }
};

// Helper function: Check if a trigger should fire for a given event
export const shouldTrigger = (
  signal: Signal,
  triggerType: TriggerType
): boolean => {
  return signal.isActive && signal.triggers.includes(triggerType);
};

// Helper function: Get a human-readable description of conditions
export const describeConditions = (conditions: SignalConditions): string => {
  const parts: string[] = [];

  if (conditions.categoryIds && conditions.categoryIds.length > 0) {
    parts.push(`Categories: ${conditions.categoryIds.join(", ")}`);
  }

  if (conditions.typeIds && conditions.typeIds.length > 0) {
    parts.push(`Types: ${conditions.typeIds.join(", ")}`);
  }

  if (conditions.tags && conditions.tags.length > 0) {
    parts.push(`Tags: ${conditions.tags.join(", ")}`);
  }

  if (conditions.importance && conditions.importance.length > 0) {
    parts.push(`Importance: ${conditions.importance.join(", ")}`);
  }

  if (conditions.minTrustLevel) {
    parts.push(`Min trust: ${conditions.minTrustLevel}`);
  }

  if (conditions.minScore !== undefined || conditions.maxScore !== undefined) {
    const min = conditions.minScore ?? "-∞";
    const max = conditions.maxScore ?? "∞";
    parts.push(`Score: ${min} to ${max}`);
  }

  if (parts.length === 0) {
    return "All sightings";
  }

  const operator = conditions.operator ?? "AND";
  return parts.join(` ${operator} `);
};

// Helper function: Validate signal ID
export const validateSignalId = (id: string): Result<SignalId, DomainError> => {
  if (!hasText(id)) {
    return err({
      code: "signal.invalid_id",
      message: "Signal ID is required.",
      field: "id",
    });
  }

  return ok(id as SignalId);
};
