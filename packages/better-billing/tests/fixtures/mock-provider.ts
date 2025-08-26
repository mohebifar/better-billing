// Mock provider for testing - standalone export for tests
import type { PaymentProvider } from '../../src/types';
import { CreateCustomerData, CreateSubscriptionData } from '../../src/types/core-api-types';

export const mockProvider: PaymentProvider = {
  id: 'mockProvider',
  name: 'Mock Provider',
  
  async createCustomer(data: CreateCustomerData) {
    const now = new Date();
    return {
      id: `cus_provider_${Date.now()}`,
      billableId: data.billableId,
      billableType: data.billableType,
      providerId: 'mockProvider',
      providerCustomerId: `cus_mock_${Date.now()}`,
      email: data.email,
      metadata: data.metadata || {},
      createdAt: now,
      updatedAt: now,
    };
  },

  async updateCustomer(providerCustomerId: string, data: any) {
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

  async deleteCustomer(providerCustomerId: string) {
    // Mock deletion - just return void
  },

  async createSubscription(data: CreateSubscriptionData) {
    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    return {
      id: `sub_provider_${Date.now()}`,
      customerId: data.customerId,
      providerId: 'mockProvider',
      providerSubscriptionId: `sub_mock_${Date.now()}`,
      status: 'active',
      productId: data.items?.[0]?.productId || 'prod_mock_default',
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

  async updateSubscription(providerSubscriptionId: string, data: any) {
    return {
      id: providerSubscriptionId.replace('sub_mock_', 'sub_provider_'),
      customerId: 'cust_123',
      providerId: 'mockProvider',
      providerSubscriptionId,
      status: data.status || 'active',
      productId: data.productId || 'prod_123',
      priceId: data.priceId || 'price_123',
      quantity: data.quantity || 1,
      currentPeriodStart: new Date('2023-01-01'),
      currentPeriodEnd: new Date('2023-02-01'),
      cancelAt: data.cancelAt,
      canceledAt: data.canceledAt,
      endedAt: data.endedAt,
      trialEnd: data.trialEnd,
      metadata: data.metadata || {},
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date(),
    };
  },

  async cancelSubscription(providerSubscriptionId: string, options?: any) {
    const now = new Date();
    return {
      id: providerSubscriptionId.replace('sub_mock_', 'sub_provider_'),
      customerId: 'cust_123',
      providerId: 'mockProvider',
      providerSubscriptionId,
      status: options?.immediate ? 'canceled' : 'active',
      productId: 'prod_123',
      priceId: 'price_123',
      quantity: 1,
      currentPeriodStart: new Date('2023-01-01'),
      currentPeriodEnd: new Date('2023-02-01'),
      cancelAt: options?.immediate ? now : new Date('2023-02-01'),
      canceledAt: options?.immediate ? now : undefined,
      endedAt: options?.immediate ? now : undefined,
      trialEnd: undefined,
      metadata: {},
      createdAt: new Date('2023-01-01'),
      updatedAt: now,
    };
  },

  async resumeSubscription(providerSubscriptionId: string) {
    return {
      id: providerSubscriptionId.replace('sub_mock_', 'sub_provider_'),
      customerId: 'cust_123',
      providerId: 'mockProvider',
      providerSubscriptionId,
      status: 'active',
      productId: 'prod_123',
      priceId: 'price_123',
      quantity: 1,
      currentPeriodStart: new Date('2023-01-01'),
      currentPeriodEnd: new Date('2023-02-01'),
      cancelAt: undefined,
      canceledAt: undefined,
      endedAt: undefined,
      trialEnd: undefined,
      metadata: {},
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date(),
    };
  },

  async createCheckoutSession(data: any) {
    return {
      id: 'cs_mock_123',
      url: 'https://mock-checkout.example.com/session/cs_mock_123',
    };
  },

  async createBillingPortalSession(data: any) {
    return {
      id: 'bps_mock_123',
      url: 'https://mock-portal.example.com/session/bps_mock_123',
    };
  },
};
