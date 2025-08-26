import type { BetterBillingRef, PaymentProvider } from '../../src/types';
import type {
  CreateCheckoutSessionData,
  PaymentMethod,
  Subscription,
} from '../../src/types/core-api-types';

export const mockProvider: PaymentProvider = {
  id: 'mock-provider',
  name: 'Test Provider',
  createCustomer: async (data) => {
    const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    return {
      id: `cus_provider_${uniqueId}`,
      billableId: data.billableId,
      billableType: data.billableType,
      providerId: 'mockProvider',
      providerCustomerId: `cus_mock_${uniqueId}`,
      email: data.email,
      metadata: data.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  },
  updateCustomer: async (providerCustomerId, data) => {
    return {
      id: providerCustomerId.replace('cus_mock_', 'cus_provider_'),
      billableId: 'user_123',
      billableType: 'user',
      providerId: 'mockProvider',
      providerCustomerId,
      email: data.email,
      metadata: data.metadata || {},
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date(),
    };
  },
  deleteCustomer: async () => {},
  createSubscription: async (data) => {
    // Check if customer exists by looking for a customerId that doesn't match our mock pattern
    // In a real provider, this would be a call to the provider's API
    if (data.customerId === 'non_existent') {
      throw new Error('Customer not found');
    }

    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    return {
      id: `sub_provider_${uniqueId}`,
      customerId: data.customerId,
      providerId: 'mockProvider',
      providerSubscriptionId: `sub_mock_${uniqueId}`,
      status: 'active',
      productId: 'prod_mock_default',
      priceId: data.items?.[0]?.priceId || 'price_mock_default',
      quantity: data.items?.[0]?.quantity || 1,
      currentPeriodStart: now,
      currentPeriodEnd: nextMonth,
      cancelAt: undefined,
      canceledAt: undefined,
      endedAt: undefined,
      trialEnd: undefined,
      metadata: data.metadata || {},
      createdAt: now,
      updatedAt: now,
    };
  },
  updateSubscription: async (providerSubscriptionId, data) => {
    return {
      id: providerSubscriptionId.replace('sub_mock_', 'sub_provider_'),
      customerId: 'cust_123',
      providerId: 'mockProvider',
      providerSubscriptionId,
      status: 'active',
      productId: 'prod_123',
      priceId: data.items?.[0]?.priceId || 'price_123',
      quantity: data.items?.[0]?.quantity || 1,
      currentPeriodStart: new Date('2023-01-01'),
      currentPeriodEnd: new Date('2023-02-01'),
      cancelAt: undefined,
      canceledAt: undefined,
      endedAt: undefined,
      trialEnd: undefined,
      metadata: data.metadata || {},
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date(),
    };
  },
  cancelSubscription: async (providerSubscriptionId, options) => {
    const now = new Date();
    return {
      id: providerSubscriptionId.replace('sub_mock_', 'sub_provider_'),
      customerId: 'cust_123',
      providerId: 'mockProvider',
      providerSubscriptionId,
      status: options?.immediately ? 'canceled' : 'active',
      productId: 'prod_123',
      priceId: 'price_123',
      quantity: 1,
      currentPeriodStart: new Date('2023-01-01'),
      currentPeriodEnd: new Date('2023-02-01'),
      cancelAt: options?.immediately ? now : new Date('2023-02-01'),
      canceledAt: now, // Always set canceledAt when canceling
      endedAt: options?.immediately ? now : undefined,
      trialEnd: undefined,
      metadata: {},
      createdAt: new Date('2023-01-01'),
      updatedAt: now,
    };
  },

  createCheckoutSession: async (data: CreateCheckoutSessionData) => {
    // Validate that either priceId or planId is provided
    if (!data.priceId && !data.planId) {
      throw new Error('Either priceId or planId must be provided for checkout session creation');
    }

    // Mock plan validation - simulate non-existent plan error
    if (data.planId && data.planId === 'nonexistent_plan') {
      throw new Error(`Plan "${data.planId}" not found in billing configuration`);
    }

    return {
      url: 'https://test.com',
      id: 'cs_test',
      expiresAt: new Date(),
    };
  },
  createPortalSession: async () => ({ url: 'https://test.com', id: 'portal_test' }),
  resumeSubscription: async () => ({}) as Subscription,
  attachPaymentMethod: async () => ({ id: 'pm_test' }) as PaymentMethod,
  detachPaymentMethod: async () => {},
  setDefaultPaymentMethod: async () => {},
};

export const mockPlugin = () => {
  const plugin = (_ref: BetterBillingRef) => ({
    id: 'mock' as const,
    methods: {
      mockMethod: async () => {
        return 'mock';
      },
    },

    providers: {
      mockProvider,
    },
  });

  return plugin;
};
