import {
  createSubscription as createSubscriptionEntity,
  type NewSubscription,
  type Subscription,
  type SubscriptionId,
} from "@/domain/subscriptions/subscription";
import type { Clock } from "@/ports/clock";
import type { IdGenerator } from "@/ports/id-generator";
import type { SubscriptionRepository } from "@/ports/subscription-repository";
import type { DomainError, Result } from "@/shared/result";

export type CreateSubscription = (
  input: NewSubscription
) => Promise<Result<Subscription, DomainError>>;

type Dependencies = {
  repository: SubscriptionRepository;
  idGenerator: IdGenerator;
  clock: Clock;
};

export const buildCreateSubscription = ({
  repository,
  idGenerator,
  clock,
}: Dependencies): CreateSubscription => {
  return async (input) => {
    const id = idGenerator.nextId() as SubscriptionId;
    const createdAt = clock.now();
    const subscriptionResult = createSubscriptionEntity(input, {
      id,
      createdAt,
    });

    if (!subscriptionResult.ok) {
      return subscriptionResult;
    }

    await repository.create(subscriptionResult.value);
    return subscriptionResult;
  };
};
