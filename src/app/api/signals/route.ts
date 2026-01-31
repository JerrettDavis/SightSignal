import { buildCreateSignal } from "@/application/use-cases/signals/create-signal";
import { buildGetUserSignals } from "@/application/use-cases/signals/get-user-signals";
import { getSignalRepository } from "@/adapters/repositories/repository-factory";
import { systemClock } from "@/adapters/clock/system-clock";
import { ulidGenerator } from "@/adapters/id/ulid-generator";
import { CreateSignalRequestSchema } from "@/contracts/signal";
import {
  jsonBadRequest,
  jsonCreated,
  jsonOk,
  jsonUnauthorized,
} from "@/shared/http";

export const runtime = "nodejs";

const repository = getSignalRepository();
const createSignal = buildCreateSignal({
  repository,
  idGenerator: ulidGenerator,
  clock: systemClock,
});
const getUserSignals = buildGetUserSignals({ repository });

// Placeholder for auth - will be implemented later
const getUserIdFromSession = (): string | null => {
  // TODO: Implement proper auth
  return "placeholder-user-id";
};

export const GET = async (request: Request) => {
  // For browsing all signals (like browsing subreddits), don't filter by user
  // In the future, we might add query params like ?mine=true to filter by ownership
  const signals = await repository.listWithSubscriptionCounts({});
  return jsonOk({ data: signals });
};

export const POST = async (request: Request) => {
  const userId = getUserIdFromSession();
  if (!userId) {
    return jsonUnauthorized("Authentication required");
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonBadRequest({ message: "Invalid JSON payload." });
  }

  const parsed = CreateSignalRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return jsonBadRequest({
      message: "Invalid payload.",
      details: parsed.error.flatten(),
    });
  }

  const result = await createSignal({
    ...parsed.data,
    ownerId: userId,
  });

  if (!result.ok) {
    return jsonBadRequest({
      message: result.error.message,
      details: result.error,
    });
  }

  return jsonCreated({ data: result.value });
};
