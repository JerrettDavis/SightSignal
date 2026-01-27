import { err, ok, type DomainError, type Result } from "@/shared/result";

export type LatLng = {
  lat: number;
  lng: number;
};

export type Polygon = {
  points: LatLng[];
};

const isNumber = (value: number) => Number.isFinite(value);

export const validateLatLng = (value: LatLng): Result<LatLng, DomainError> => {
  if (!isNumber(value.lat) || value.lat < -90 || value.lat > 90) {
    return err({
      code: "geo.invalid_lat",
      message: "Latitude is invalid.",
      field: "lat",
    });
  }

  if (!isNumber(value.lng) || value.lng < -180 || value.lng > 180) {
    return err({
      code: "geo.invalid_lng",
      message: "Longitude is invalid.",
      field: "lng",
    });
  }

  return ok(value);
};

export const validatePolygon = (
  polygon: Polygon
): Result<Polygon, DomainError> => {
  if (polygon.points.length < 3) {
    return err({
      code: "geo.invalid_polygon",
      message: "Polygon must have at least 3 points.",
      field: "points",
    });
  }

  for (const point of polygon.points) {
    const result = validateLatLng(point);
    if (!result.ok) {
      return result;
    }
  }

  return ok(polygon);
};
