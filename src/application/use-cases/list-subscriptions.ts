import type { Subscription } from "@/domain/subscriptions/subscription";
import type {
  SubscriptionFilters,
  SubscriptionRepository,
} from "@/ports/subscription-repository";

export type ListSubscriptions = (
  filters?: SubscriptionFilters
) => Promise<Subscription[]>;

export const buildListSubscriptions = (
  repository: SubscriptionRepository
): ListSubscriptions => {
  return async (filters) => repository.list(filters);
};
