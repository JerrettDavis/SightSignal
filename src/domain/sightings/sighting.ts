import { validateLatLng, type LatLng } from "@/domain/geo/geo";
import { err, ok, type DomainError, type Result } from "@/shared/result";

export type SightingId = string & { readonly __brand: "SightingId" };
export type SightingTypeId = string & { readonly __brand: "SightingTypeId" };
export type CategoryId = string & { readonly __brand: "CategoryId" };

export type SightingImportance = "low" | "normal" | "high" | "critical";
export type SightingStatus = "active" | "resolved";

export type CustomFieldValue = string | number | boolean;
export type CustomFieldValues = Record<string, CustomFieldValue>;

export type NewSighting = {
  typeId: string;
  categoryId: string;
  location: LatLng;
  description: string;
  details?: string;
  importance?: SightingImportance;
  observedAt: string;
  fields?: CustomFieldValues;
  reporterId?: string;
};

export type UpdateSighting = Partial<{
  typeId: string;
  categoryId: string;
  location: LatLng;
  description: string;
  details: string;
  importance: SightingImportance;
  status: SightingStatus;
  observedAt: string;
  fields: CustomFieldValues;
  reporterId: string;
}>;

export type Sighting = {
  id: SightingId;
  typeId: SightingTypeId;
  categoryId: CategoryId;
  location: LatLng;
  description: string;
  details?: string;
  importance: SightingImportance;
  status: SightingStatus;
  observedAt: string;
  createdAt: string;
  fields: CustomFieldValues;
  reporterId?: string;
  upvotes: number;
  downvotes: number;
  confirmations: number;
  disputes: number;
  spamReports: number;
  score: number;
  hotScore: number;
};

const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_DETAILS_LENGTH = 2000;

const hasText = (value: string) => value.trim().length > 0;
const isIsoDate = (value: string) => Number.isFinite(Date.parse(value));

export const createSighting = (
  input: NewSighting,
  context: { id: SightingId; createdAt: string }
): Result<Sighting, DomainError> => {
  if (!hasText(input.description)) {
    return err({
      code: "sighting.description_required",
      message: "Description is required.",
      field: "description",
    });
  }

  if (input.description.length > MAX_DESCRIPTION_LENGTH) {
    return err({
      code: "sighting.description_too_long",
      message: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less.`,
      field: "description",
    });
  }

  if (input.details && input.details.length > MAX_DETAILS_LENGTH) {
    return err({
      code: "sighting.details_too_long",
      message: `Details must be ${MAX_DETAILS_LENGTH} characters or less.`,
      field: "details",
    });
  }

  if (!hasText(input.typeId)) {
    return err({
      code: "sighting.type_required",
      message: "Type is required.",
      field: "typeId",
    });
  }

  if (!hasText(input.categoryId)) {
    return err({
      code: "sighting.category_required",
      message: "Category is required.",
      field: "categoryId",
    });
  }

  if (!isIsoDate(input.observedAt)) {
    return err({
      code: "sighting.observed_at_invalid",
      message: "Observed time must be an ISO date string.",
      field: "observedAt",
    });
  }

  const locationResult = validateLatLng(input.location);
  if (!locationResult.ok) {
    return locationResult;
  }

  return ok({
    id: context.id,
    typeId: input.typeId as SightingTypeId,
    categoryId: input.categoryId as CategoryId,
    location: input.location,
    description: input.description,
    details: input.details,
    importance: input.importance ?? "normal",
    status: "active",
    observedAt: input.observedAt,
    createdAt: context.createdAt,
    fields: input.fields ?? {},
    reporterId: input.reporterId,
    upvotes: 0,
    downvotes: 0,
    confirmations: 0,
    disputes: 0,
    spamReports: 0,
    score: 0,
    hotScore: 0,
  });
};

export const updateSighting = (
  existing: Sighting,
  updates: UpdateSighting
): Result<Sighting, DomainError> => {
  const merged: NewSighting = {
    typeId: updates.typeId ?? existing.typeId,
    categoryId: updates.categoryId ?? existing.categoryId,
    location: updates.location ?? existing.location,
    description: updates.description ?? existing.description,
    details: updates.details !== undefined ? updates.details : existing.details,
    importance: updates.importance ?? existing.importance,
    observedAt: updates.observedAt ?? existing.observedAt,
    fields: updates.fields ?? existing.fields,
    reporterId:
      updates.reporterId !== undefined
        ? updates.reporterId
        : existing.reporterId,
  };

  const validationResult = createSighting(merged, {
    id: existing.id,
    createdAt: existing.createdAt,
  });

  if (!validationResult.ok) {
    return validationResult;
  }

  return ok({
    ...validationResult.value,
    status: updates.status ?? existing.status,
    upvotes: existing.upvotes,
    downvotes: existing.downvotes,
    confirmations: existing.confirmations,
    disputes: existing.disputes,
    spamReports: existing.spamReports,
    score: existing.score,
    hotScore: existing.hotScore,
  });
};
