import type { DatabaseAdapter } from '../adapters/types';

// Core billing instance
export interface BetterBilling {
  api: any; // Better Call router with endpoints
  handler: (request: Request) => Promise<Response>;
  $Infer: InferredTypes;
}

// Main configuration
export interface BetterBillingOptions {
  database: DatabaseAdapter;
  provider?: PaymentProvider;
  billable?: {
    model: 'user' | 'organization' | 'team' | string;
    fields?: FieldMapping;
  };
  products?: ProductConfiguration;
  webhooks?: WebhookConfiguration;
  plugins?: BillingPlugin[];
  advanced?: AdvancedOptions;
}

// Payment Provider Interface
export interface PaymentProvider {
  id: string;
  name: string;

  // Customer operations
  createCustomer(data: CreateCustomerData): Promise<Customer>;
  updateCustomer(id: string, data: UpdateCustomerData): Promise<Customer>;
  deleteCustomer(id: string): Promise<void>;

  // Subscription operations
  createSubscription(data: CreateSubscriptionData): Promise<Subscription>;
  updateSubscription(id: string, data: UpdateSubscriptionData): Promise<Subscription>;
  cancelSubscription(id: string, options?: CancelOptions): Promise<Subscription>;
  resumeSubscription(id: string): Promise<Subscription>;

  // Checkout/portal operations
  createCheckoutSession(data: CheckoutSessionData): Promise<CheckoutSession>;
  createPortalSession(customerId: string): Promise<PortalSession>;

  // Usage operations
  reportUsage(
    subscriptionItemId: string,
    quantity: number,
    options?: UsageOptions
  ): Promise<UsageRecord>;

  // Webhook handling
  constructWebhookEvent(payload: string, signature: string): WebhookEvent;
  handleWebhook(event: WebhookEvent): Promise<void>;

  // Payment methods
  attachPaymentMethod(customerId: string, paymentMethodId: string): Promise<PaymentMethod>;
  detachPaymentMethod(paymentMethodId: string): Promise<void>;
  setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<void>;
}

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

export interface Usage {
  id: string;
  customerId: string;
  subscriptionItemId?: string;
  productId: string;
  quantity: number;
  timestamp: Date;
  metadata?: Record<string, any>;
  idempotencyKey?: string;
}

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

// API Types
export interface BillingAPI {
  // Customer management
  createCustomer: APIEndpoint<CreateCustomerRequest, Customer>;
  getCustomer: APIEndpoint<GetCustomerRequest, Customer>;
  updateCustomer: APIEndpoint<UpdateCustomerRequest, Customer>;

  // Subscription management
  subscribe: APIEndpoint<SubscribeRequest, Subscription>;
  updateSubscription: APIEndpoint<UpdateSubscriptionRequest, Subscription>;
  cancelSubscription: APIEndpoint<CancelSubscriptionRequest, Subscription>;
  resumeSubscription: APIEndpoint<ResumeSubscriptionRequest, Subscription>;
  getSubscriptions: APIEndpoint<GetSubscriptionsRequest, Subscription[]>;

  // Checkout & portal
  createCheckout: APIEndpoint<CreateCheckoutRequest, CheckoutSession>;
  createPortal: APIEndpoint<CreatePortalRequest, PortalSession>;

  // Usage tracking
  reportUsage: APIEndpoint<ReportUsageRequest, UsageRecord>;
  getUsage: APIEndpoint<GetUsageRequest, UsageRecord[]>;

  // Invoices
  getInvoices: APIEndpoint<GetInvoicesRequest, Invoice[]>;
  downloadInvoice: APIEndpoint<DownloadInvoiceRequest, InvoiceDownload>;

  // Payment methods
  addPaymentMethod: APIEndpoint<AddPaymentMethodRequest, PaymentMethod>;
  removePaymentMethod: APIEndpoint<RemovePaymentMethodRequest, void>;
  setDefaultPaymentMethod: APIEndpoint<SetDefaultPaymentMethodRequest, PaymentMethod>;
  getPaymentMethods: APIEndpoint<GetPaymentMethodsRequest, PaymentMethod[]>;

  // Webhooks
  handleWebhook: APIEndpoint<WebhookRequest, WebhookResponse>;
}

// Helper Types
export type APIEndpoint<TRequest = any, TResponse = any> = (
  request: TRequest
) => Promise<TResponse>;

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

export interface UsageOptions {
  timestamp?: Date;
  idempotencyKey?: string;
  // For Stripe Meter Events API
  eventName?: string;
  customerId?: string;
}

export interface UsageRecord {
  id: string;
  quantity: number;
  timestamp: Date;
}

export interface WebhookEvent {
  id: string;
  type: string;
  data: any;
  timestamp: Date;
}

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
  priceId: string;
  quantity?: number;
  successUrl: string;
  cancelUrl: string;
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

// Plugin Types
export interface BillingPlugin {
  id: string;

  // Schema extensions
  schema?: SchemaExtension;

  // API extensions
  endpoints?: Record<string, APIEndpoint>;

  // Hooks
  hooks?: BillingHooks;

  // Provider extensions
  extendProvider?: (provider: PaymentProvider) => PaymentProvider;
}

export interface BillingHooks {
  // Customer hooks
  beforeCustomerCreate?: Hook<CustomerCreateContext>;
  afterCustomerCreate?: Hook<CustomerContext>;

  // Subscription hooks
  beforeSubscribe?: Hook<SubscribeContext>;
  afterSubscribe?: Hook<SubscriptionContext>;
  beforeCancel?: Hook<CancelContext>;
  afterCancel?: Hook<CancelledContext>;
  onUsageReported?: Hook<UsageContext>;
  onInvoicePaid?: Hook<InvoiceContext>;
  onPaymentFailed?: Hook<PaymentFailedContext>;
}

export type Hook<T> = (context: T) => Promise<void> | void;

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
  usage: Usage;
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

// Configuration Types
export interface FieldMapping {
  [key: string]: string;
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

// Type Inference
export interface InferredTypes {
  Billable: any;
  Products: any;
  Subscription: Subscription;
  Customer: Customer;
}

export interface SchemaExtension {
  [tableName: string]: {
    fields: Record<string, FieldDefinition>;
  };
}

export interface FieldDefinition {
  type: 'string' | 'number' | 'boolean' | 'date' | 'json';
  required?: boolean;
  default?: any;
}
