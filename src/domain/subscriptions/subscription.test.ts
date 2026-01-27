import {
  createSubscription,
  type NewSubscription,
  type SubscriptionId,
} from "@/domain/subscriptions/subscription";

const baseInput: NewSubscription = {
  email: "alerts@example.com",
  target: {
    kind: "polygon",
    polygon: {
      points: [
        { lat: 37.81, lng: -122.42 },
        { lat: 37.81, lng: -122.4 },
        { lat: 37.79, lng: -122.4 },
      ],
    },
  },
};

describe("createSubscription", () => {
  it("rejects invalid email", () => {
    const result = createSubscription(
      { ...baseInput, email: "nope" },
      { id: "sub-1" as SubscriptionId, createdAt: new Date().toISOString() }
    );

    expect(result.ok).toBe(false);
  });

  it("accepts polygon target", () => {
    const result = createSubscription(baseInput, {
      id: "sub-2" as SubscriptionId,
      createdAt: new Date().toISOString(),
    });

    expect(result.ok).toBe(true);
  });
});
