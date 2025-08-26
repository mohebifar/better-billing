// Core Data Types
export interface Customer {
  id: string;
  billableId: string;
  billableType: string;
  providerId: string;
  providerCustomerId: string;
  email?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subscription {
  id: string;
  customerId: string;
  providerId: string;
  providerSubscriptionId: string;
  status: SubscriptionStatus;
  productId: string;
  priceId: string;
  quantity?: number;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAt?: Date;
  canceledAt?: Date;
  endedAt?: Date;
  trialEnd?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'past_due'
  | 'unpaid'
  | 'paused';

export interface SubscriptionItem {
  id: string;
  subscriptionId: string;
  productId: string;
  priceId: string;
  quantity: number;
  metadata?: Record<string, any>;
}

export interface Invoice {
  id: string;
  customerId: string;
  subscriptionId?: string;
  providerId: string;
  providerInvoiceId: string;
  number: string;
  status: InvoiceStatus;
  amount: number;
  currency: string;
  paidAt?: Date;
  dueDate?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';

export interface PaymentMethod {
  id: string;
  customerId: string;
  providerId: string;
  providerPaymentMethodId: string;
  type: string;
  last4?: string;
  brand?: string;
  isDefault: boolean;
  metadata?: Record<string, any>;
}

export interface CreateCustomerData {
  billableId: string;
  billableType: string;
  email?: string;
  name?: string;
  metadata?: Record<string, any>;
}

export interface UpdateCustomerData {
  email?: string;
  name?: string;
  metadata?: Record<string, any>;
}

export interface CreateSubscriptionData {
  customerId: string;
  items: Array<{
    priceId: string;
    quantity?: number;
  }>;
  trialDays?: number;
  metadata?: Record<string, any>;
}

export interface UpdateSubscriptionData {
  items?: Array<{
    priceId: string;
    quantity?: number;
  }>;
  metadata?: Record<string, any>;
}

export interface CancelOptions {
  immediately?: boolean;
  atPeriodEnd?: boolean;
}

export interface CheckoutSessionData {
  customerId: string;
  priceId: string;
  quantity?: number;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, any>;
}

export interface CheckoutSession {
  id: string;
  url: string;
  expiresAt: Date;
}

export interface PortalSession {
  id: string;
  url: string;
}

// Usage-related types moved to usage-metering plugin

// Request/Response Types
export interface CreateCustomerRequest {
  billableId: string;
  billableType?: string;
  email?: string;
  name?: string;
}

export interface GetCustomerRequest {
  customerId?: string;
  billableId?: string;
}

export interface UpdateCustomerRequest {
  customerId: string;
  email?: string;
  name?: string;
  metadata?: Record<string, any>;
}

export interface SubscribeRequest {
  customerId: string;
  priceId: string;
  quantity?: number;
  trialDays?: number;
}

export interface UpdateSubscriptionRequest {
  subscriptionId: string;
  priceId?: string;
  quantity?: number;
}

export interface CancelSubscriptionRequest {
  subscriptionId: string;
  immediately?: boolean;
}

export interface ResumeSubscriptionRequest {
  subscriptionId: string;
}

export interface GetSubscriptionsRequest {
  customerId: string;
  status?: SubscriptionStatus;
}

export interface CreateCheckoutRequest {
  customerId: string;
  priceId?: string;
  planId?: string;
  quantity?: number;
  successUrl: string;
  cancelUrl: string;
  callbackData?: Record<string, any>;
}

export interface CreatePortalRequest {
  customerId: string;
  returnUrl?: string;
}

export interface ReportUsageRequest {
  subscriptionItemId: string;
  quantity: number;
  timestamp?: Date;
  idempotencyKey?: string;
}

export interface GetUsageRequest {
  subscriptionItemId: string;
  startDate?: Date;
  endDate?: Date;
}

export interface GetInvoicesRequest {
  customerId: string;
  status?: InvoiceStatus;
  limit?: number;
}

export interface DownloadInvoiceRequest {
  invoiceId: string;
}

export interface InvoiceDownload {
  url: string;
  contentType: string;
}

export interface AddPaymentMethodRequest {
  customerId: string;
  paymentMethodId: string;
  setDefault?: boolean;
}

export interface RemovePaymentMethodRequest {
  paymentMethodId: string;
}

export interface SetDefaultPaymentMethodRequest {
  customerId: string;
  paymentMethodId: string;
}

export interface GetPaymentMethodsRequest {
  customerId: string;
}

export interface WebhookRequest {
  body: string;
  signature: string;
}

export interface WebhookResponse {
  success: boolean;
  message?: string;
}

// Checkout callback handling
export interface CheckoutSuccessRequest {
  sessionId: string;
}

export interface CheckoutCancelRequest {
  sessionId: string;
}

export interface CheckoutCallbackResponse {
  success: boolean;
  redirectUrl?: string;
  message?: string;
  callbackData?: Record<string, any>;
}

// Context Types for Hooks
export interface CustomerCreateContext {
  data: Partial<Customer>;
}

export interface CustomerContext {
  customer: Customer;
}

export interface SubscribeContext {
  customer: Customer;
  priceId: string;
  quantity?: number;
}

export interface SubscriptionContext {
  subscription: Subscription;
  customer: Customer;
}

export interface CancelContext {
  subscription: Subscription;
  customer: Customer;
  reason?: string;
}

export interface CancelledContext {
  subscription: Subscription;
  customer: Customer;
}

export interface UsageContext {
  usage: any; // Will be defined by usage plugin
  customer: Customer;
}

export interface InvoiceContext {
  invoice: Invoice;
  customer: Customer;
}

export interface PaymentFailedContext {
  invoice: Invoice;
  customer: Customer;
  error: Error;
}

export interface UsageRecordContext {
  customerId: string;
  productId: string;
  quantity: number;
  metadata?: Record<string, any>;
}

export interface ProductConfiguration {
  [productId: string]: {
    name: string;
    description?: string;
    prices: Array<{
      id: string;
      amount: number;
      currency: string;
      interval?: 'month' | 'year';
    }>;
  };
}

export interface WebhookConfiguration {
  endpoint?: string;
  secret?: string;
}

export interface AdvancedOptions {
  debug?: boolean;
  logLevel?: 'error' | 'warn' | 'info' | 'debug';
  customModels?: Record<string, any>;
}

// Product and Price types
export interface Product {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  metadata?: Record<string, any>;
}

export interface Price {
  id: string;
  productId: string;
  amount: number;
  currency: string;
  interval?: 'day' | 'week' | 'month' | 'year';
  intervalCount?: number;
  type: 'recurring' | 'one_time';
  active: boolean;
  metadata?: Record<string, any>;
}

// Subscription Plan Configuration
export interface SubscriptionPlan {
  name: string;
  description?: string;
  priceId: string;
  features?: string[];
  metadata?: Record<string, any>;
  trialDays?: number;
  allowQuantity?: boolean;
  maxQuantity?: number;
  callbackData?: Record<string, any>;
}

// Enhanced checkout session data with plan support
export interface CreateCheckoutSessionData extends Omit<CheckoutSessionData, 'priceId'> {
  priceId?: string;
  planId?: string;
  callbackData?: Record<string, any>;
}

// Checkout callback data for success/cancel URLs
export interface CheckoutCallbackContext {
  sessionId: string;
  customerId: string;
  planId?: string;
  subscriptionId?: string;
  status: 'success' | 'cancelled';
  callbackData?: Record<string, any>;
  metadata?: Record<string, any>;
}
