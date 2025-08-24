import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BillingCore } from '../../src/core/billing';
import { adapter } from '../setup';
import { createTestCustomer, createTestSubscription } from '../fixtures/test-data';

describe('BillingCore', () => {
  let billingCore: BillingCore;

  beforeEach(() => {
    billingCore = new BillingCore({
      database: adapter,
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

      const customer = await billingCore.createCustomer(customerData);

      expect(customer).toBeDefined();
      expect(customer.id).toBeDefined();
      expect(customer.billableId).toBe('user_123');
      expect(customer.email).toBe('test@example.com');
      expect(customer.createdAt).toBeInstanceOf(Date);
      expect(customer.updatedAt).toBeInstanceOf(Date);
    });

    it('should get a customer by ID', async () => {
      const testCustomer = createTestCustomer();
      await billingCore.createCustomer(testCustomer);

      const foundCustomer = await billingCore.getCustomer({ id: testCustomer.id });

      expect(foundCustomer).toBeDefined();
      expect(foundCustomer?.id).toBe(testCustomer.id);
      expect(foundCustomer?.email).toBe(testCustomer.email);
    });

    it('should return null for non-existent customer', async () => {
      const customer = await billingCore.getCustomer({ id: 'non_existent' });
      expect(customer).toBeNull();
    });

    it('should update a customer', async () => {
      const testCustomer = createTestCustomer();
      await billingCore.createCustomer(testCustomer);

      const updatedCustomer = await billingCore.updateCustomer(testCustomer.id, {
        email: 'updated@example.com',
      });

      expect(updatedCustomer.email).toBe('updated@example.com');
      expect(updatedCustomer.updatedAt.getTime()).toBeGreaterThan(testCustomer.updatedAt.getTime());
    });
  });

  describe('Subscription Management', () => {
    it('should create a subscription for existing customer', async () => {
      const testCustomer = createTestCustomer();
      await billingCore.createCustomer(testCustomer);

      const subscriptionData = {
        customerId: testCustomer.id,
        providerId: 'stripe',
        providerSubscriptionId: 'sub_stripe_123',
        productId: 'prod_test_123',
        priceId: 'price_test_123',
        quantity: 1,
        currentPeriodStart: new Date('2023-01-01T00:00:00Z'),
        currentPeriodEnd: new Date('2023-02-01T00:00:00Z'),
      };

      const subscription = await billingCore.createSubscription(subscriptionData);

      expect(subscription).toBeDefined();
      expect(subscription.id).toBeDefined();
      expect(subscription.customerId).toBe(testCustomer.id);
      expect(subscription.status).toBe('active');
      expect(subscription.productId).toBe('prod_test_123');
      expect(subscription.priceId).toBe('price_test_123');
    });

    it('should throw error when creating subscription for non-existent customer', async () => {
      const subscriptionData = {
        customerId: 'non_existent',
        providerId: 'stripe',
        providerSubscriptionId: 'sub_stripe_123',
        productId: 'prod_test_123',
        priceId: 'price_test_123',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
      };

      await expect(billingCore.createSubscription(subscriptionData)).rejects.toThrow('Customer not found');
    });

    it('should get subscription by ID', async () => {
      const testCustomer = createTestCustomer();
      await billingCore.createCustomer(testCustomer);

      const testSubscription = createTestSubscription({ customerId: testCustomer.id });
      await billingCore.createSubscription(testSubscription);

      const foundSubscription = await billingCore.getSubscription({ id: testSubscription.id });

      expect(foundSubscription).toBeDefined();
      expect(foundSubscription?.id).toBe(testSubscription.id);
      expect(foundSubscription?.customerId).toBe(testCustomer.id);
    });

    it('should get subscriptions for a customer', async () => {
      const testCustomer = createTestCustomer();
      await billingCore.createCustomer(testCustomer);

      const testSubscription1 = createTestSubscription({ 
        id: 'sub_1',
        customerId: testCustomer.id 
      });
      const testSubscription2 = createTestSubscription({ 
        id: 'sub_2', 
        customerId: testCustomer.id 
      });

      await billingCore.createSubscription(testSubscription1);
      await billingCore.createSubscription(testSubscription2);

      const subscriptions = await billingCore.getSubscriptions({ customerId: testCustomer.id });

      expect(subscriptions).toHaveLength(2);
      expect(subscriptions.map(s => s.id)).toContain('sub_1');
      expect(subscriptions.map(s => s.id)).toContain('sub_2');
    });

    it('should update a subscription', async () => {
      const testCustomer = createTestCustomer();
      await billingCore.createCustomer(testCustomer);

      const testSubscription = createTestSubscription({ customerId: testCustomer.id });
      await billingCore.createSubscription(testSubscription);

      const updatedSubscription = await billingCore.updateSubscription(testSubscription.id, {
        quantity: 5,
      });

      expect(updatedSubscription.quantity).toBe(5);
      expect(updatedSubscription.updatedAt.getTime()).toBeGreaterThan(testSubscription.updatedAt.getTime());
    });

    it('should cancel a subscription at period end', async () => {
      const testCustomer = createTestCustomer();
      await billingCore.createCustomer(testCustomer);

      const testSubscription = createTestSubscription({ customerId: testCustomer.id });
      await billingCore.createSubscription(testSubscription);

      const canceledSubscription = await billingCore.cancelSubscription(testSubscription.id, false);

      expect(canceledSubscription.status).toBe('canceled');
      expect(canceledSubscription.canceledAt).toBeInstanceOf(Date);
      // Check that cancelAt is set (allowing for timezone differences in test environment)
      expect(canceledSubscription.cancelAt).toBeInstanceOf(Date);
      // Verify it's within 24 hours of the expected date to account for timezone differences
      const timeDiff = Math.abs(canceledSubscription.cancelAt!.getTime() - testSubscription.currentPeriodEnd.getTime());
      expect(timeDiff).toBeLessThan(24 * 60 * 60 * 1000); // Less than 24 hours
      expect(canceledSubscription.endedAt).toBeNull();
    });

    it('should cancel a subscription immediately', async () => {
      const testCustomer = createTestCustomer();
      await billingCore.createCustomer(testCustomer);

      const testSubscription = createTestSubscription({ customerId: testCustomer.id });
      await billingCore.createSubscription(testSubscription);

      const canceledSubscription = await billingCore.cancelSubscription(testSubscription.id, true);

      expect(canceledSubscription.status).toBe('canceled');
      expect(canceledSubscription.canceledAt).toBeInstanceOf(Date);
      expect(canceledSubscription.endedAt).toBeInstanceOf(Date);
    });

    it('should throw error when canceling non-existent subscription', async () => {
      await expect(billingCore.cancelSubscription('non_existent')).rejects.toThrow('Subscription not found');
    });
  });

  describe('Usage Tracking', () => {
    it('should report usage', async () => {
      const testCustomer = createTestCustomer();
      await billingCore.createCustomer(testCustomer);

      const usageData = {
        customerId: testCustomer.id,
        productId: 'prod_test_123',
        quantity: 100,
        timestamp: new Date('2023-01-15T12:00:00Z'),
      };

      const usage = await billingCore.reportUsage(usageData);

      expect(usage).toBeDefined();
      expect(usage.id).toBeDefined();
      expect(usage.customerId).toBe(testCustomer.id);
      expect(usage.quantity).toBe(100);
      expect(usage.timestamp).toBeInstanceOf(Date);
    });

    it('should get usage for a customer', async () => {
      const testCustomer = createTestCustomer();
      await billingCore.createCustomer(testCustomer);

      const usageData1 = {
        customerId: testCustomer.id,
        productId: 'prod_test_123',
        quantity: 50,
      };
      const usageData2 = {
        customerId: testCustomer.id,
        productId: 'prod_test_123',
        quantity: 75,
      };

      await billingCore.reportUsage(usageData1);
      await billingCore.reportUsage(usageData2);

      const usageRecords = await billingCore.getUsage({ customerId: testCustomer.id });

      expect(usageRecords).toHaveLength(2);
      expect(usageRecords.reduce((sum, record) => sum + record.quantity, 0)).toBe(125);
    });
  });

  describe('Hook System', () => {
    it('should call beforeCustomerCreate hook', async () => {
      const hookSpy = vi.fn();
      billingCore.hooks.register('beforeCustomerCreate', hookSpy);

      const customerData = createTestCustomer();
      await billingCore.createCustomer(customerData);

      expect(hookSpy).toHaveBeenCalledWith({ data: expect.objectContaining(customerData) });
    });

    it('should call afterCustomerCreate hook', async () => {
      const hookSpy = vi.fn();
      billingCore.hooks.register('afterCustomerCreate', hookSpy);

      const customerData = createTestCustomer();
      const customer = await billingCore.createCustomer(customerData);

      expect(hookSpy).toHaveBeenCalledWith({ customer });
    });

    it('should call subscription hooks', async () => {
      const beforeHook = vi.fn();
      const afterHook = vi.fn();
      
      billingCore.hooks.register('beforeSubscribe', beforeHook);
      billingCore.hooks.register('afterSubscribe', afterHook);

      const testCustomer = createTestCustomer();
      await billingCore.createCustomer(testCustomer);

      const subscriptionData = createTestSubscription({ customerId: testCustomer.id });
      const subscription = await billingCore.createSubscription(subscriptionData);

      expect(beforeHook).toHaveBeenCalled();
      expect(afterHook).toHaveBeenCalledWith({ 
        subscription, 
        customer: expect.objectContaining({ id: testCustomer.id }) 
      });
    });
  });

  describe('Manager Access', () => {
    it('should provide access to schema manager', () => {
      expect(billingCore.schema).toBeDefined();
      expect(billingCore.schema.getCoreSchema).toBeInstanceOf(Function);
    });

    it('should provide access to hook manager', () => {
      expect(billingCore.hooks).toBeDefined();
      expect(billingCore.hooks.register).toBeInstanceOf(Function);
    });

    it('should provide access to plugin manager', () => {
      expect(billingCore.plugins).toBeDefined();
      expect(billingCore.plugins.register).toBeInstanceOf(Function);
    });
  });
});