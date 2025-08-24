import type { Customer, Subscription, Usage, Invoice, PaymentMethod } from '../../src/types';

export function createTestCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: 'cust_test_123',
    billableId: 'user_123',
    billableType: 'user',
    providerId: 'stripe',
    providerCustomerId: 'cus_stripe_123',
    email: 'test@example.com',
    metadata: { test: true },
    createdAt: new Date('2023-01-01T00:00:00Z'),
    updatedAt: new Date('2023-01-01T00:00:00Z'),
    ...overrides,
  };
}

export function createTestSubscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: 'sub_test_123',
    customerId: 'cust_test_123',
    providerId: 'stripe',
    providerSubscriptionId: 'sub_stripe_123',
    status: 'active',
    productId: 'prod_test_123',
    priceId: 'price_test_123',
    quantity: 1,
    currentPeriodStart: new Date('2023-01-01T00:00:00Z'),
    currentPeriodEnd: new Date('2023-02-01T00:00:00Z'),
    metadata: { test: true },
    createdAt: new Date('2023-01-01T00:00:00Z'),
    updatedAt: new Date('2023-01-01T00:00:00Z'),
    ...overrides,
  };
}

export function createTestUsage(overrides: Partial<Usage> = {}): Usage {
  return {
    id: 'usage_test_123',
    customerId: 'cust_test_123',
    productId: 'prod_test_123',
    quantity: 100,
    timestamp: new Date('2023-01-01T12:00:00Z'),
    metadata: { source: 'api' },
    ...overrides,
  };
}

export function createTestInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: 'inv_test_123',
    customerId: 'cust_test_123',
    providerId: 'stripe',
    providerInvoiceId: 'in_stripe_123',
    number: 'INV-001',
    status: 'paid',
    amount: 2000,
    currency: 'usd',
    createdAt: new Date('2023-01-01T00:00:00Z'),
    metadata: { test: true },
    ...overrides,
  };
}

export function createTestPaymentMethod(overrides: Partial<PaymentMethod> = {}): PaymentMethod {
  return {
    id: 'pm_test_123',
    customerId: 'cust_test_123',
    providerId: 'stripe',
    providerPaymentMethodId: 'pm_stripe_123',
    type: 'card',
    last4: '4242',
    brand: 'visa',
    isDefault: true,
    metadata: { test: true },
    ...overrides,
  };
}

export const mockStripeCustomer = {
  id: 'cus_stripe_123',
  email: 'test@example.com',
  name: 'Test User',
  created: Math.floor(new Date('2023-01-01T00:00:00Z').getTime() / 1000),
  metadata: {
    billableId: 'user_123',
    billableType: 'user',
    test: 'true',
  },
};

export const mockStripeSubscription = {
  id: 'sub_stripe_123',
  customer: 'cus_stripe_123',
  status: 'active',
  created: Math.floor(new Date('2023-01-01T00:00:00Z').getTime() / 1000),
  current_period_start: Math.floor(new Date('2023-01-01T00:00:00Z').getTime() / 1000),
  current_period_end: Math.floor(new Date('2023-02-01T00:00:00Z').getTime() / 1000),
  items: {
    data: [
      {
        id: 'si_test_123',
        price: {
          id: 'price_test_123',
          product: 'prod_test_123',
        },
        quantity: 1,
        current_period_start: Math.floor(new Date('2023-01-01T00:00:00Z').getTime() / 1000),
        current_period_end: Math.floor(new Date('2023-02-01T00:00:00Z').getTime() / 1000),
      },
    ],
  },
  metadata: { test: 'true' },
};

export const mockStripePaymentMethod = {
  id: 'pm_stripe_123',
  type: 'card',
  card: {
    last4: '4242',
    brand: 'visa',
  },
  metadata: { test: 'true' },
};