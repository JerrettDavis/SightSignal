import { validatePolygon, type Polygon } from "@/domain/geo/geo";
import { err, ok, type DomainError, type Result } from "@/shared/result";

export type SubscriptionId = string & { readonly __brand: "SubscriptionId" };
export type SubscriptionTrustLevel = "raw" | "vetted" | "all";

export type SubscriptionTarget =
  | { kind: "geofence"; geofenceId: string }
  | { kind: "polygon"; polygon: Polygon };

export type NewSubscription = {
  email: string;
  target: SubscriptionTarget;
  categoryIds?: string[];
  typeIds?: string[];
  trustLevel?: SubscriptionTrustLevel;
};

export type UpdateSubscription = Partial<{
  email: string;
  target: SubscriptionTarget;
  categoryIds: string[];
  typeIds: string[];
  trustLevel: SubscriptionTrustLevel;
}>;

export type Subscription = {
  id: SubscriptionId;
  email: string;
  target: SubscriptionTarget;
  categoryIds: string[];
  typeIds: string[];
  trustLevel: SubscriptionTrustLevel;
  createdAt: string;
};

const isEmail = (value: string) => /.+@.+\..+/.test(value);

export const createSubscription = (
  input: NewSubscription,
  context: { id: SubscriptionId; createdAt: string }
): Result<Subscription, DomainError> => {
  if (!isEmail(input.email)) {
    return err({
      code: "subscription.email_invalid",
      message: "Email is invalid.",
      field: "email",
    });
  }

  if (input.target.kind === "polygon") {
    const polygonResult = validatePolygon(input.target.polygon);
    if (!polygonResult.ok) {
      return polygonResult;
    }
  }

  if (input.target.kind === "geofence" && !input.target.geofenceId.trim()) {
    return err({
      code: "subscription.geofence_required",
      message: "Geofence id is required.",
      field: "geofenceId",
    });
  }

  return ok({
    id: context.id,
    email: input.email,
    target: input.target,
    categoryIds: input.categoryIds ?? [],
    typeIds: input.typeIds ?? [],
    trustLevel: input.trustLevel ?? "all",
    createdAt: context.createdAt,
  });
};

export const updateSubscription = (
  existing: Subscription,
  updates: UpdateSubscription
): Result<Subscription, DomainError> => {
  const merged: NewSubscription = {
    email: updates.email ?? existing.email,
    target: updates.target ?? existing.target,
    categoryIds: updates.categoryIds ?? existing.categoryIds,
    typeIds: updates.typeIds ?? existing.typeIds,
    trustLevel: updates.trustLevel ?? existing.trustLevel,
  };

  const validationResult = createSubscription(merged, {
    id: existing.id,
    createdAt: existing.createdAt,
  });

  if (!validationResult.ok) {
    return validationResult;
  }

  return ok(validationResult.value);
};
