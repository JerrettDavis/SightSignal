import { validatePolygon, type Polygon } from "@/domain/geo/geo";
import { err, ok, type DomainError, type Result } from "@/shared/result";

export type GeofenceId = string & { readonly __brand: "GeofenceId" };
export type GeofenceVisibility = "public" | "private";

export type NewGeofence = {
  name: string;
  polygon: Polygon;
  visibility: GeofenceVisibility;
  ownerId?: string;
};

export type UpdateGeofence = Partial<{
  name: string;
  polygon: Polygon;
  visibility: GeofenceVisibility;
  ownerId: string;
}>;

export type Geofence = {
  id: GeofenceId;
  name: string;
  polygon: Polygon;
  visibility: GeofenceVisibility;
  createdAt: string;
  ownerId?: string;
};

const MAX_NAME_LENGTH = 80;
const hasText = (value: string) => value.trim().length > 0;

export const createGeofence = (
  input: NewGeofence,
  context: { id: GeofenceId; createdAt: string }
): Result<Geofence, DomainError> => {
  if (!hasText(input.name)) {
    return err({
      code: "geofence.name_required",
      message: "Name is required.",
      field: "name",
    });
  }

  if (input.name.length > MAX_NAME_LENGTH) {
    return err({
      code: "geofence.name_too_long",
      message: `Name must be ${MAX_NAME_LENGTH} characters or less.`,
      field: "name",
    });
  }

  const polygonResult = validatePolygon(input.polygon);
  if (!polygonResult.ok) {
    return polygonResult;
  }

  return ok({
    id: context.id,
    name: input.name,
    polygon: input.polygon,
    visibility: input.visibility,
    createdAt: context.createdAt,
    ownerId: input.ownerId,
  });
};

export const updateGeofence = (
  existing: Geofence,
  updates: UpdateGeofence
): Result<Geofence, DomainError> => {
  const merged: NewGeofence = {
    name: updates.name ?? existing.name,
    polygon: updates.polygon ?? existing.polygon,
    visibility: updates.visibility ?? existing.visibility,
    ownerId: updates.ownerId !== undefined ? updates.ownerId : existing.ownerId,
  };

  const validationResult = createGeofence(merged, {
    id: existing.id,
    createdAt: existing.createdAt,
  });

  if (!validationResult.ok) {
    return validationResult;
  }

  return ok(validationResult.value);
};
