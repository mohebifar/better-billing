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

export type PaymentProviderMethodsByCapability = {
  subscription: SubscriptionProviderMethods;
  "one-time": OneTimeProviderMethods;
  "checkout-session": CheckoutSessionProviderMethods;
};

export type PaymentProviderCapability =
  keyof PaymentProviderMethodsByCapability;
