import type { SubscriptionId } from "@/domain/subscriptions/subscription";
import type { SubscriptionRepository } from "@/ports/subscription-repository";
import { err, ok, type DomainError, type Result } from "@/shared/result";

export type DeleteSubscription = (
  id: string
) => Promise<Result<void, DomainError>>;

type Dependencies = {
  repository: SubscriptionRepository;
};

export const buildDeleteSubscription = ({
  repository,
}: Dependencies): DeleteSubscription => {
  return async (id) => {
    const existing = await repository.getById(id as SubscriptionId);

    if (!existing) {
      return err({
        code: "subscription.not_found",
        message: "Subscription not found.",
      });
    }

    await repository.delete(id as SubscriptionId);
    return ok(undefined);
  };
};
