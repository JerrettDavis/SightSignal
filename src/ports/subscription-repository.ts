import type {
  Subscription,
  SubscriptionId,
} from "@/domain/subscriptions/subscription";

export type SubscriptionFilters = {
  email?: string;
};

export type SubscriptionRepository = {
  create: (subscription: Subscription) => Promise<void>;
  list: (filters?: SubscriptionFilters) => Promise<Subscription[]>;
  getById: (id: SubscriptionId) => Promise<Subscription | null>;
  update: (subscription: Subscription) => Promise<void>;
  delete: (id: SubscriptionId) => Promise<void>;
  deleteMany: (ids: SubscriptionId[]) => Promise<void>;
};
