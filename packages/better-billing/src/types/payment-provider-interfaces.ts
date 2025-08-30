import type z from "zod";
import type { coreSchema } from "~/plugins/core";

type PlanCadence = "monthly" | "yearly";

// Checkout Session Types
export interface CheckoutSessionCreateParams {
  billableId: string;
  billableType: string;
  planName: string;
  cadence: PlanCadence;
  email?: string;
  allowPromotionCodes?: boolean;
  metadata?: Record<string, any>;
}

export interface CheckoutSession {
  id: string;
  url: string;
  status?: string;
  metadata?: Record<string, any>;
}

export type Billable = z.infer<typeof coreSchema.billables>;

// Subscription Types
export interface SubscriptionCreateParams {
  billableId: string;
  billableType: string;
  email?: string;
  metadata?: Record<string, any>;
  planName: string;
  cadence: PlanCadence;
}

export interface SubscriptionCancelParams {
  subscriptionId: string;
  cancelAtPeriodEnd?: boolean;
  cancellationReason?: string;
  prorate?: boolean;
}

export interface SubscriptionUpdateParams {
  subscriptionId: string;
  newPlan: {
    name: string;
    cadence: PlanCadence;
  };
  metadata?: Record<string, any>;
}

export interface SubscriptionGetParams {
  subscriptionId: string;
}

export type Subscription = z.infer<typeof coreSchema.subscriptions>;

// Invoice Types
export interface InvoiceGetParams {
  invoiceId: string;
}

export type Invoice = z.infer<typeof coreSchema.invoices>;

// Success/Cancel URL Types
export interface CheckoutSuccessParams {
  sessionId: string;
}

export interface CheckoutCancelParams {
  sessionId: string;
}

// Provider Method Interfaces
export interface CheckoutSessionProviderMethods {
  createCheckoutSession: (
    params: CheckoutSessionCreateParams
  ) => Promise<CheckoutSession>;
  handleCheckoutSuccess: (
    params: CheckoutSuccessParams
  ) => Promise<{ subscription?: Subscription }>;
  handleCheckoutCancel: (
    params: CheckoutCancelParams
  ) => Promise<{ canceled: boolean }>;
}

export interface SubscriptionProviderMethods {
  createSubscription: (
    params: SubscriptionCreateParams
  ) => Promise<Subscription>;
  cancelSubscription: (
    params: SubscriptionCancelParams
  ) => Promise<Subscription>;
  getSubscription: (params: SubscriptionGetParams) => Promise<Subscription>;
  updateSubscription: (
    params: SubscriptionUpdateParams
  ) => Promise<Subscription>;
}

export interface InvoiceProviderMethods {
  getInvoice: (params: InvoiceGetParams) => Promise<Invoice>;
}

export interface CustomerUpsertParams {
  billableId: string;
  billableType: string;
  email?: string;
  metadata?: Record<string, any>;
}

export interface CustomerProviderMethods {
  upsertCustomer: (params: CustomerUpsertParams) => Promise<Billable>;
}

export type PaymentProviderMethodsByCapability = {
  subscription: SubscriptionProviderMethods;
  "checkout-session": CheckoutSessionProviderMethods;
  invoice: InvoiceProviderMethods;
  customer: CustomerProviderMethods;
  extension: Record<string, (params: any) => Promise<any>>;
};

export type PaymentProviderCapability =
  keyof PaymentProviderMethodsByCapability;
