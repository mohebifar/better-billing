import { beforeEach, describe, expect, it, vi } from 'vitest';
import { betterBilling } from '../../src';
import { mockPlugin } from '../../src/plugins/mock-plugin';
import { createTestCustomer } from '../fixtures/test-data';
import { adapter } from '../setup';

describe('BillingCore', () => {
  let billing: ReturnType<typeof betterBilling>;

  beforeEach(() => {
    billing = betterBilling({
      database: adapter,
      plugins: [mockPlugin()],
      provider: 'mockProvider',
    });
  });

  describe('Customer Management', () => {
    it('should create a customer', async () => {
      const customerData = {
        billableId: 'user_123',
        billableType: 'user',
        providerId: 'stripe',
        providerCustomerId: 'cus_stripe_123',
        email: 'test@example.com',
      };

      const customer = await billing.methods.core.createCustomer(customerData);

      expect(customer).toBeDefined();
      expect(customer.id).toBeDefined();
      expect(customer.billableId).toBe('user_123');
      expect(customer.email).toBe('test@example.com');
      expect(customer.createdAt).toBeInstanceOf(Date);
      expect(customer.updatedAt).toBeInstanceOf(Date);
    });

    it('should get a customer by ID', async () => {
      const testCustomerData = createTestCustomer();
      const createdCustomer = await billing.methods.core.createCustomer(testCustomerData);

      const foundCustomer = await billing.methods.core.getCustomer(createdCustomer.id);

      expect(foundCustomer).toBeDefined();
      expect(foundCustomer?.id).toBe(createdCustomer.id);
      expect(foundCustomer?.email).toBe(testCustomerData.email);
    });

    it('should return null for non-existent customer', async () => {
      const customer = await billing.methods.core.getCustomer('non_existent');
      expect(customer).toBeNull();
    });

    it('should update a customer', async () => {
      const testCustomerData = createTestCustomer();
      const createdCustomer = await billing.methods.core.createCustomer(testCustomerData);

      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1));

      const updatedCustomer = await billing.methods.core.updateCustomer(createdCustomer.id, {
        email: 'updated@example.com',
      });

      expect(updatedCustomer.email).toBe('updated@example.com');
      expect(updatedCustomer.updatedAt.getTime()).toBeGreaterThanOrEqual(createdCustomer.updatedAt.getTime());
    });
  });

  describe('Subscription Management', () => {
    it('should create a subscription for existing customer', async () => {
      const testCustomerData = createTestCustomer();
      const createdCustomer = await billing.methods.core.createCustomer(testCustomerData);

      const subscriptionData = {
        customerId: createdCustomer.id,
        providerId: 'stripe',
        providerSubscriptionId: 'sub_stripe_123',
        items: [{
          productId: 'prod_test_123',
          priceId: 'price_test_123',
          quantity: 1,
        }],
        currentPeriodStart: new Date('2023-01-01T00:00:00Z'),
        currentPeriodEnd: new Date('2023-02-01T00:00:00Z'),
      };

      const subscription = await billing.methods.core.createSubscription(subscriptionData);

      expect(subscription).toBeDefined();
      expect(subscription.id).toBeDefined();
      expect(subscription.customerId).toBe(createdCustomer.id);
      expect(subscription.status).toBe('active');
    });

    it('should throw error when creating subscription for non-existent customer', async () => {
      const subscriptionData = {
        customerId: 'non_existent',
        providerId: 'stripe',
        providerSubscriptionId: 'sub_stripe_123',
        items: [{
          productId: 'prod_test_123',
          priceId: 'price_test_123',
          quantity: 1,
        }],
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
      };

      await expect(billing.methods.core.createSubscription(subscriptionData)).rejects.toThrow('Customer not found');
    });

    it('should get subscriptions for a customer', async () => {
      const testCustomerData = createTestCustomer();
      const createdCustomer = await billing.methods.core.createCustomer(testCustomerData);

      const subscriptionData1 = {
        customerId: createdCustomer.id,
        providerId: 'stripe',
        providerSubscriptionId: 'sub_stripe_123',
        items: [{ productId: 'prod_test_123', priceId: 'price_test_123', quantity: 1 }],
        currentPeriodStart: new Date('2023-01-01T00:00:00Z'),
        currentPeriodEnd: new Date('2023-02-01T00:00:00Z'),
      };
      const subscriptionData2 = {
        customerId: createdCustomer.id,
        providerId: 'stripe',
        providerSubscriptionId: 'sub_stripe_456',
        items: [{ productId: 'prod_test_456', priceId: 'price_test_456', quantity: 1 }],
        currentPeriodStart: new Date('2023-01-01T00:00:00Z'),
        currentPeriodEnd: new Date('2023-02-01T00:00:00Z'),
      };

      await billing.methods.core.createSubscription(subscriptionData1);
      await billing.methods.core.createSubscription(subscriptionData2);

      const subscriptions = await billing.methods.core.listSubscriptions([{ field: 'customerId', value: createdCustomer.id }]);

      expect(subscriptions).toHaveLength(2);
    });

    it('should update a subscription', async () => {
      const testCustomerData = createTestCustomer();
      const createdCustomer = await billing.methods.core.createCustomer(testCustomerData);

      const subscriptionData = {
        customerId: createdCustomer.id,
        providerId: 'stripe',
        providerSubscriptionId: 'sub_stripe_123',
        items: [{ productId: 'prod_test_123', priceId: 'price_test_123', quantity: 1 }],
        currentPeriodStart: new Date('2023-01-01T00:00:00Z'),
        currentPeriodEnd: new Date('2023-02-01T00:00:00Z'),
      };
      const subscription = await billing.methods.core.createSubscription(subscriptionData);

      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1));

      const updatedSubscription = await billing.methods.core.updateSubscription(subscription.id, {
        metadata: { updated: true },
      });

      expect(updatedSubscription.metadata?.updated).toBe(true);
      expect(updatedSubscription.updatedAt.getTime()).toBeGreaterThanOrEqual(subscription.updatedAt.getTime());
    });

    it('should cancel a subscription at period end', async () => {
      const testCustomerData = createTestCustomer();
      const createdCustomer = await billing.methods.core.createCustomer(testCustomerData);

      const subscriptionData = {
        customerId: createdCustomer.id,
        providerId: 'stripe',
        providerSubscriptionId: 'sub_stripe_123',
        items: [{ productId: 'prod_test_123', priceId: 'price_test_123', quantity: 1 }],
        currentPeriodStart: new Date('2023-01-01T00:00:00Z'),
        currentPeriodEnd: new Date('2023-02-01T00:00:00Z'),
      };
      const subscription = await billing.methods.core.createSubscription(subscriptionData);

      const canceledSubscription = await billing.methods.core.cancelSubscription(subscription.id, { atPeriodEnd: true });

      expect(canceledSubscription.status).toBe('active'); // Still active until period end
      expect(canceledSubscription.canceledAt).toBeInstanceOf(Date);
      expect(canceledSubscription.cancelAt).toBeInstanceOf(Date);
      expect(canceledSubscription.endedAt).toBeUndefined();
    });

    it('should cancel a subscription immediately', async () => {
      const testCustomerData = createTestCustomer();
      const createdCustomer = await billing.methods.core.createCustomer(testCustomerData);

      const subscriptionData = {
        customerId: createdCustomer.id,
        providerId: 'stripe',
        providerSubscriptionId: 'sub_stripe_123',
        items: [{ productId: 'prod_test_123', priceId: 'price_test_123', quantity: 1 }],
        currentPeriodStart: new Date('2023-01-01T00:00:00Z'),
        currentPeriodEnd: new Date('2023-02-01T00:00:00Z'),
      };
      const subscription = await billing.methods.core.createSubscription(subscriptionData);

      const canceledSubscription = await billing.methods.core.cancelSubscription(subscription.id, { immediately: true });

      expect(canceledSubscription.status).toBe('canceled');
      expect(canceledSubscription.canceledAt).toBeInstanceOf(Date);
      expect(canceledSubscription.endedAt).toBeInstanceOf(Date);
    });

    it('should throw error when canceling non-existent subscription', async () => {
      await expect(billing.methods.core.cancelSubscription('non_existent')).rejects.toThrow('Subscription non_existent not found');
    });
  });



  describe('Hook System', () => {
    it('should call beforeCustomerCreate hook', async () => {
      const hookSpy = vi.fn();
      billing.pluginManager.getHookManager().register('beforeCustomerCreate', hookSpy);

      const customerData = createTestCustomer();
      await billing.methods.core.createCustomer(customerData);

      expect(hookSpy).toHaveBeenCalledWith({ data: expect.objectContaining(customerData) });
    });

    it('should call afterCustomerCreate hook', async () => {
      const hookSpy = vi.fn();
      billing.pluginManager.getHookManager().register('afterCustomerCreate', hookSpy);

      const customerData = createTestCustomer();
      const customer = await billing.methods.core.createCustomer(customerData);

      expect(hookSpy).toHaveBeenCalledWith({ customer });
    });

    it('should call subscription hooks', async () => {
      const beforeHook = vi.fn();
      const afterHook = vi.fn();
      
      billing.pluginManager.getHookManager().register('beforeSubscribe', beforeHook);
      billing.pluginManager.getHookManager().register('afterSubscribe', afterHook);

      const testCustomerData = createTestCustomer();
      const createdCustomer = await billing.methods.core.createCustomer(testCustomerData);

      const subscriptionData = {
        customerId: createdCustomer.id,
        providerId: 'stripe',
        providerSubscriptionId: 'sub_stripe_123',
        items: [{ productId: 'prod_test_123', priceId: 'price_test_123', quantity: 1 }],
        currentPeriodStart: new Date('2023-01-01T00:00:00Z'),
        currentPeriodEnd: new Date('2023-02-01T00:00:00Z'),
      };
      const subscription = await billing.methods.core.createSubscription(subscriptionData);

      expect(beforeHook).toHaveBeenCalledWith({ data: expect.objectContaining(subscriptionData) });
      expect(afterHook).toHaveBeenCalledWith({ subscription });
    });
  });

});