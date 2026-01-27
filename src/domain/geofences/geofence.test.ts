import {
  createGeofence,
  type GeofenceId,
  type NewGeofence,
} from "@/domain/geofences/geofence";

const baseInput: NewGeofence = {
  name: "Downtown alerts",
  visibility: "public",
  polygon: {
    points: [
      { lat: 37.81, lng: -122.42 },
      { lat: 37.81, lng: -122.4 },
      { lat: 37.79, lng: -122.4 },
      { lat: 37.79, lng: -122.42 },
    ],
  },
};

describe("createGeofence", () => {
  it("rejects missing name", () => {
    const result = createGeofence(
      { ...baseInput, name: " " },
      { id: "g1" as GeofenceId, createdAt: new Date().toISOString() }
    );

    expect(result.ok).toBe(false);
  });

  it("accepts valid input", () => {
    const result = createGeofence(baseInput, {
      id: "g2" as GeofenceId,
      createdAt: new Date().toISOString(),
    });

    expect(result.ok).toBe(true);
  });
});
