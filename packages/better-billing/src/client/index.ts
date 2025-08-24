export interface BillingClientOptions {
  baseUrl?: string;
  headers?: Record<string, string>;
}

export interface BillingClient {
  // Subscription management
  subscribe: (options: SubscribeOptions) => Promise<Subscription>;
  updateSubscription: (options: UpdateSubscriptionOptions) => Promise<Subscription>;
  cancelSubscription: (options?: CancelOptions) => Promise<Subscription>;
  resumeSubscription: () => Promise<Subscription>;

  // Checkout & portal
  checkout: (options: CheckoutOptions) => Promise<void>;
  openBillingPortal: () => Promise<void>;

  // Usage
  reportUsage: (productId: string, quantity: number) => Promise<UsageRecord>;

  // State management (to be implemented with framework-specific versions)
  // useSubscription: () => SubscriptionState;
  // useInvoices: () => InvoicesState;
  // usePaymentMethods: () => PaymentMethodsState;
}

// Request/Response types
export interface SubscribeOptions {
  priceId: string;
  quantity?: number;
  trialDays?: number;
}

export interface UpdateSubscriptionOptions {
  subscriptionId: string;
  priceId?: string;
  quantity?: number;
}

export interface CancelOptions {
  immediately?: boolean;
}

export interface CheckoutOptions {
  priceId: string;
  quantity?: number;
  successUrl: string;
  cancelUrl: string;
}

export interface Subscription {
  id: string;
  status: string;
  currentPeriodEnd: Date;
  cancelAt?: Date;
}

export interface UsageRecord {
  id: string;
  quantity: number;
  timestamp: Date;
}

// Client factory
export function createBillingClient(options: BillingClientOptions = {}): BillingClient {
  const baseUrl = options.baseUrl || '/api/billing';
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const request = async (endpoint: string, body?: any, method = 'POST') => {
    const response = await fetch(`${baseUrl}/${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  };

  return {
    subscribe: async (options) => {
      return await request('subscriptions', options);
    },

    updateSubscription: async (options) => {
      return await request('subscriptions', options, 'PUT');
    },

    cancelSubscription: async (options) => {
      return await request('subscriptions:cancel', options);
    },

    resumeSubscription: async () => {
      return await request('subscriptions:resume');
    },

    checkout: async (options) => {
      const session = await request('checkout', options);
      window.location.href = session.url;
    },

    openBillingPortal: async () => {
      const session = await request('portal');
      window.location.href = session.url;
    },

    reportUsage: async (productId, quantity) => {
      return await request('usage', { productId, quantity });
    },
  };
}

export default createBillingClient;
