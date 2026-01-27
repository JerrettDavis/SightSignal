import {
  createSighting,
  type NewSighting,
  type SightingId,
} from "@/domain/sightings/sighting";

const baseInput: NewSighting = {
  typeId: "type-bird" as NewSighting["typeId"],
  categoryId: "cat-nature" as NewSighting["categoryId"],
  location: { lat: 35.0, lng: -120.0 },
  description: "Blue jay spotted near the park.",
  observedAt: new Date().toISOString(),
};

describe("createSighting", () => {
  it("rejects empty descriptions", () => {
    const result = createSighting(
      { ...baseInput, description: " " },
      { id: "s1" as SightingId, createdAt: new Date().toISOString() }
    );

    expect(result.ok).toBe(false);
  });

  it("accepts valid input", () => {
    const result = createSighting(baseInput, {
      id: "s2" as SightingId,
      createdAt: new Date().toISOString(),
    });

    expect(result.ok).toBe(true);
  });
});
