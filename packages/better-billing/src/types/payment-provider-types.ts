import type { Plugin } from "./main-types";

export type PaymentProviderCapability =
  | "subscription"
  | "one-time"
  | "checkout-session";

export type CheckoutSessionCreateParams = Record<string, never>;
export type SubscriptionCreateParams = Record<string, never>;
export type SubscriptionCancelParams = Record<string, never>;
export type SubscriptionUpdateParams = Record<string, never>;
export type SubscriptionGetParams = Record<string, never>;
export type Subscription = Record<string, never>;

export type OneTimeProviderMethods = Record<string, never>;

export type CheckoutSessionProviderMethods = {
  createCheckoutSession: (params: CheckoutSessionCreateParams) => Promise<void>;
};

export interface SubscriptionProviderMethods {
  createSubscription: (params: SubscriptionCreateParams) => Promise<void>;
  cancelSubscription: (params: SubscriptionCancelParams) => Promise<void>;
  updateSubscription: (params: SubscriptionUpdateParams) => Promise<void>;
  getSubscription: (params: SubscriptionGetParams) => Promise<Subscription>;
}

export type PaymentProviderImplementation<
  C extends PaymentProviderCapability = PaymentProviderCapability
> = {
  providerId: string;
  capability: C;
  methods: C extends "subscription"
    ? SubscriptionProviderMethods
    : C extends "one-time"
    ? OneTimeProviderMethods
    : C extends "checkout-session"
    ? CheckoutSessionProviderMethods
    : never;
};

/**
 * Let's say we have three implementations of a payment provider:
 *
 * {
 *   providerId: "stripe",
 *   capability: "checkout-session",
 *   methods: {
 *     createCheckoutSession: () => {},
 *   },
 * }
 *
 * {
 *   providerId: "stripe",
 *   capability: "subscription",
 *   methods: {
 *     createSubscription: () => {},
 *   },
 * }
 *
 * {
 *   providerId: "polar",
 *   capability: "subscription",
 *   methods: {
 *     createSubscription: () => {},
 *   },
 * }
 *
 * We want to merge them into a single implementation:
 *
 * {
 *   stripe: {
 *     createCheckoutSession: () => {},
 *     createSubscription: () => {},
 *   },
 *   polar: {
 *     createSubscription: () => {},
 *   },
 * }
 *
 */

// Helper type to extract all provider IDs from the array
type ExtractProviderIds<P extends PaymentProviderImplementation[]> =
  P[number]["providerId"];

// Helper type to filter implementations by provider ID
type FilterByProviderId<
  P extends PaymentProviderImplementation[],
  ProviderId extends string
> = Extract<P[number], { providerId: ProviderId }>;

// Helper type to merge all methods from implementations with the same provider ID
type MergeMethodsForProvider<
  P extends PaymentProviderImplementation[],
  ProviderId extends string
> = FilterByProviderId<P, ProviderId>["methods"] extends infer Methods
  ? Methods extends Record<string, any>
    ? UnionToIntersection<Methods>
    : never
  : never;

// Utility type to convert union to intersection
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;

// Main type that merges all payment provider implementations
export type MergePaymentProviderImplementations<
  P extends PaymentProviderImplementation[]
> = {
  [K in ExtractProviderIds<P>]: UnionToIntersection<
    MergeMethodsForProvider<P, K>
  >;
};

export type ExtractProvidersFromAllPlugins<
  Plugins extends Plugin<any, any, any>[]
> = Plugins extends readonly [infer First, ...infer Rest]
  ? First extends Plugin<any, infer P, any>
    ? P extends PaymentProviderImplementation[]
      ? Rest extends Plugin<any, any, any>[]
        ? [...P, ...ExtractProvidersFromAllPlugins<Rest>]
        : P
      : Rest extends Plugin<any, any, any>[]
      ? ExtractProvidersFromAllPlugins<Rest>
      : []
    : Rest extends Plugin<any, any, any>[]
    ? ExtractProvidersFromAllPlugins<Rest>
    : []
  : [];
