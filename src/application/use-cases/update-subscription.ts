import {
  updateSubscription as updateSubscriptionEntity,
  type Subscription,
  type SubscriptionId,
  type UpdateSubscription as UpdateSubscriptionInput,
} from "@/domain/subscriptions/subscription";
import type { SubscriptionRepository } from "@/ports/subscription-repository";
import { err, type DomainError, type Result } from "@/shared/result";

export type UpdateSubscription = (
  id: string,
  updates: UpdateSubscriptionInput
) => Promise<Result<Subscription, DomainError>>;

type Dependencies = {
  repository: SubscriptionRepository;
};

export const buildUpdateSubscription = ({
  repository,
}: Dependencies): UpdateSubscription => {
  return async (id, updates) => {
    const existing = await repository.getById(id as SubscriptionId);

    if (!existing) {
      return err({
        code: "subscription.not_found",
        message: "Subscription not found.",
      });
    }

    const updateResult = updateSubscriptionEntity(existing, updates);

    if (!updateResult.ok) {
      return updateResult;
    }

    await repository.update(updateResult.value);
    return updateResult;
  };
};
