import type { Endpoint, UnionToIntersection } from 'better-call';
import type { DatabaseAdapter } from '../adapters/types';
import type { CorePlugin } from '../plugins/core-plugin';
import type {
  AdvancedOptions,
  CancelContext,
  CancelledContext,
  CancelOptions,
  CheckoutCallbackContext,
  CheckoutCallbackResponse,
  CheckoutCancelRequest,
  CheckoutSession,
  CheckoutSuccessRequest,
  CreateCheckoutSessionData,
  CreateCustomerData,
  CreateSubscriptionData,
  Customer,
  CustomerContext,
  CustomerCreateContext,
  InvoiceContext,
  PaymentFailedContext,
  PaymentMethod,
  PortalSession,
  ProductConfiguration,
  SubscribeContext,
  Subscription,
  SubscriptionContext,
  SubscriptionPlan,
  UpdateCustomerData,
  UpdateSubscriptionData,
  UsageContext,
  UsageRecordContext,
  WebhookConfiguration,
} from './core-api-types';

export type { DatabaseAdapter };

// Re-export new subscription plan types
export type {
  SubscriptionPlan,
  CreateCheckoutSessionData,
  CheckoutCallbackContext,
  CheckoutCallbackResponse,
  CheckoutSuccessRequest,
  CheckoutCancelRequest,
};

// Schema types first
export interface SchemaExtension {
  [tableName: string]: {
    fields: Record<string, FieldDefinition>;
  };
}

export type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'json';

export type InferFieldType<T> = T extends 'string'
  ? string
  : T extends 'number'
    ? number
    : T extends 'boolean'
      ? boolean
      : T extends 'date'
        ? Date
        : T extends 'json'
          ? Record<string, any>
          : never;

export interface FieldDefinition<T extends FieldType = FieldType, R extends boolean = boolean> {
  type: T;
  required?: R;
  default?: InferFieldType<T>;
}

export type InferSchemaType<T extends SchemaExtension> = {
  [K in keyof T]: {
    [K2 in keyof T[K]]: T[K][K2] extends FieldDefinition<infer FTypeName, infer FRequired>
      ? FRequired extends true
        ? InferFieldType<FTypeName>
        : InferFieldType<FTypeName> | undefined
      : never;
  };
};

// Schema mapping interface
export interface SchemaMapping {
  [modelName: string]: {
    modelName?: string; // Custom model name
    fields?: {
      [fieldName: string]: string; // fieldName -> custom column name
    };
  };
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
  createCheckoutSession(data: CreateCheckoutSessionData): Promise<CheckoutSession>;
  createPortalSession(customerId: string): Promise<PortalSession>;

  // Payment methods
  attachPaymentMethod(customerId: string, paymentMethodId: string): Promise<PaymentMethod>;
  detachPaymentMethod(paymentMethodId: string): Promise<void>;
  setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<void>;
}

// Hooks
export interface BillingHooks {
  // Customer hooks
  beforeCustomerCreate?: Hook<CustomerCreateContext>;
  afterCustomerCreate?: Hook<CustomerContext>;

  // Subscription hooks
  beforeSubscribe?: Hook<SubscribeContext>;
  afterSubscribe?: Hook<SubscriptionContext>;
  beforeCancel?: Hook<CancelContext>;
  afterCancel?: Hook<CancelledContext>;

  // Usage hooks
  beforeRecordUsage?: Hook<UsageRecordContext>;
  afterRecordUsage?: Hook<UsageRecordContext>;
  onUsageReported?: Hook<UsageContext>;

  // Invoice/Payment hooks
  onInvoicePaid?: Hook<InvoiceContext>;
  onPaymentFailed?: Hook<PaymentFailedContext>;
}

export type Hook<T> = (context: T) => Promise<void> | void;

// Plugin Types
export interface BillingPlugin<
  ID extends string = string,
  TMethods extends Record<string, any> = Record<string, any>,
  TProviders extends Record<string, PaymentProvider> = Record<string, PaymentProvider>,
  TSchema extends SchemaExtension = SchemaExtension,
> {
  id: ID;

  // Schema extensions (tables this plugin needs)
  schema?: TSchema;

  // Methods to add to the billing object
  methods?: TMethods;

  // Hooks for lifecycle events
  hooks?: BillingHooks;

  // API endpoints this plugin provides
  endpoints?: Record<string, Endpoint>;

  providers?: TProviders;
}

export type BillingPluginFactory<T extends BillingPlugin> = (ref: BetterBillingRef) => T;

export type ExtractPluginFromFactory<T extends BillingPluginFactory<BillingPlugin>> = T extends (
  billing: BetterBilling
) => infer P
  ? P
  : never;

export type ExtractPluginsFromFactoryArray<
  P extends readonly BillingPluginFactory<BillingPlugin>[] | undefined,
> = P extends Array<infer T>
  ? Array<T extends BillingPluginFactory<infer P> ? (P extends BillingPlugin ? P : never) : never>
  : [];

export type InferPluginMethods<P extends readonly BillingPlugin[]> = UnionToIntersection<
  P extends ReadonlyArray<infer T>
    ? T extends BillingPlugin<infer ID, infer Methods>
      ? { [K in ID]: Methods }
      : never
    : never
>;

export type ExtractPluginPaymentProviders<P extends readonly BillingPlugin[]> = {
  [K in keyof P]: P[K] extends BillingPlugin<any, any, infer Providers> ? keyof Providers : never;
}[number];

type BasePlugins = [CorePlugin];

export type WithBasePlugins<T extends readonly BillingPluginFactory<BillingPlugin>[]> = [
  ...BasePlugins,
  ...ExtractPluginsFromFactoryArray<T>,
];

export interface BetterBillingOptions<
  TDatabaseAdapter extends DatabaseAdapter = DatabaseAdapter,
  TPluginFactories extends
    readonly BillingPluginFactory<BillingPlugin>[] = readonly BillingPluginFactory<BillingPlugin>[],
  TAllPlugins extends readonly BillingPlugin[] = WithBasePlugins<TPluginFactories>,
  TProviders extends
    ExtractPluginPaymentProviders<TAllPlugins> = ExtractPluginPaymentProviders<TAllPlugins>,
> {
  database: TDatabaseAdapter;
  provider: TProviders;
  billables?: Array<{
    model: string;
  }>;
  products?: ProductConfiguration;
  webhooks?: WebhookConfiguration;
  plugins: TPluginFactories;

  // NEW: Subscription plan configuration
  plans?: Record<string, SubscriptionPlan>;

  schemaMapping?: SchemaMapping;

  advanced?: AdvancedOptions;
}

// Better Billing Interface
export interface BetterBilling<
  TOptions extends BetterBillingOptions<any, any, any, any> = BetterBillingOptions,
> {
  config: TOptions;
  api: { handler: (request: Request) => Promise<Response> };
  methods: InferPluginMethods<[CorePlugin, ...ExtractPluginsFromFactoryArray<TOptions['plugins']>]>;
  endpoints: Record<string, Endpoint>;
  getProvider(): PaymentProvider;
}

export type BetterBillingRef = {
  current: BetterBilling;
};

export interface FieldMapping {
  [key: string]: string;
}
