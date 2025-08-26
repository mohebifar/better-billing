import { describe, it, expect, beforeEach } from 'vitest';
import { adapter } from '../setup';
import { createTestCustomer, createTestSubscription } from '../fixtures/test-data';
import type { Customer, Subscription } from '../../src/types/core-api-types';

describe('DrizzleAdapter', () => {
  beforeEach(() => {
    // adapter is already initialized in setup.ts
  });

  describe('Customer Operations', () => {
    it('should create a customer', async () => {
      const customerData = createTestCustomer();
      
      const result = await adapter.create<Customer>('customer', customerData);
      
      expect(result).toBeDefined();
      expect(result.id).toBe(customerData.id);
      expect(result.email).toBe(customerData.email);
      expect(result.billableId).toBe(customerData.billableId);
    });

    it('should find a customer by ID', async () => {
      const customerData = createTestCustomer();
      await adapter.create<Customer>('customer', customerData);
      
      const result = await adapter.findOne<Customer>('customer', { field: 'id', value: customerData.id });
      
      expect(result).toBeDefined();
      expect(result?.id).toBe(customerData.id);
      expect(result?.email).toBe(customerData.email);
    });

    it('should return null for non-existent customer', async () => {
      const result = await adapter.findOne<Customer>('customer', { field: 'id', value: 'non_existent' });
      expect(result).toBeNull();
    });

    it('should update a customer', async () => {
      const customerData = createTestCustomer();
      await adapter.create<Customer>('customer', customerData);
      
      const updateData = { email: 'updated@example.com' };
      const result = await adapter.update<Customer>('customer', { field: 'id', value: customerData.id }, updateData);
      
      expect(result.email).toBe('updated@example.com');
      expect(result.id).toBe(customerData.id);
    });

    it('should find multiple customers', async () => {
      const customer1 = createTestCustomer({ id: 'cust_1' });
      const customer2 = createTestCustomer({ id: 'cust_2' });
      
      await adapter.create<Customer>('customer', customer1);
      await adapter.create<Customer>('customer', customer2);
      
      const results = await adapter.findMany<Customer>('customer');
      
      expect(results).toHaveLength(2);
      expect(results.map(c => c.id)).toContain('cust_1');
      expect(results.map(c => c.id)).toContain('cust_2');
    });

    it('should delete a customer', async () => {
      const customerData = createTestCustomer();
      await adapter.create<Customer>('customer', customerData);
      
      await adapter.delete('customer', { field: 'id', value: customerData.id });
      
      const result = await adapter.findOne<Customer>('customer', { field: 'id', value: customerData.id });
      expect(result).toBeNull();
    });
  });

  describe('Subscription Operations', () => {
    beforeEach(async () => {
      // Create a customer first for FK constraints
      const customerData = createTestCustomer();
      await adapter.create<Customer>('customer', customerData);
    });

    it('should create a subscription', async () => {
      const subscriptionData = createTestSubscription();
      
      const result = await adapter.create<Subscription>('subscription', subscriptionData);
      
      expect(result).toBeDefined();
      expect(result.id).toBe(subscriptionData.id);
      expect(result.customerId).toBe(subscriptionData.customerId);
      expect(result.status).toBe(subscriptionData.status);
    });

    it('should find a subscription by ID', async () => {
      const subscriptionData = createTestSubscription();
      await adapter.create<Subscription>('subscription', subscriptionData);
      
      const result = await adapter.findOne<Subscription>('subscription', { field: 'id', value: subscriptionData.id });
      
      expect(result).toBeDefined();
      expect(result?.id).toBe(subscriptionData.id);
      expect(result?.customerId).toBe(subscriptionData.customerId);
    });

    it('should update a subscription', async () => {
      const subscriptionData = createTestSubscription();
      await adapter.create<Subscription>('subscription', subscriptionData);
      
      const updateData = { quantity: 5, status: 'canceled' as const };
      const result = await adapter.update<Subscription>('subscription', { field: 'id', value: subscriptionData.id }, updateData);
      
      expect(result.quantity).toBe(5);
      expect(result.status).toBe('canceled');
      expect(result.id).toBe(subscriptionData.id);
    });

    it('should find subscriptions by customer ID', async () => {
      const subscription1 = createTestSubscription({ id: 'sub_1' });
      const subscription2 = createTestSubscription({ id: 'sub_2' });
      
      await adapter.create<Subscription>('subscription', subscription1);
      await adapter.create<Subscription>('subscription', subscription2);
      
      const results = await adapter.findMany<Subscription>('subscription', { field: 'customerId', value: subscription1.customerId });
      
      expect(results).toHaveLength(2);
      expect(results.map(s => s.id)).toContain('sub_1');
      expect(results.map(s => s.id)).toContain('sub_2');
    });

    it('should delete a subscription', async () => {
      const subscriptionData = createTestSubscription();
      await adapter.create<Subscription>('subscription', subscriptionData);
      
      await adapter.delete('subscription', { field: 'id', value: subscriptionData.id });
      
      const result = await adapter.findOne<Subscription>('subscription', { field: 'id', value: subscriptionData.id });
      expect(result).toBeNull();
    });
  });

  describe('Field Name Conversion', () => {
    it('should handle snake_case to camelCase conversion', async () => {
      const customerData = createTestCustomer();
      await adapter.create<Customer>('customer', customerData);
      
      const result = await adapter.findOne<Customer>('customer', { field: 'id', value: customerData.id });
      
      // Verify that camelCase fields are properly handled
      expect(result?.billableId).toBeDefined();
      expect(result?.providerId).toBeDefined();
      expect(result?.createdAt).toBeInstanceOf(Date);
      expect(result?.updatedAt).toBeInstanceOf(Date);
    });

    it('should handle timestamp fields properly', async () => {
      // First create the customer to satisfy foreign key constraint
      const customerData = createTestCustomer();
      await adapter.create<Customer>('customer', customerData);
      
      const usageData = {
        id: 'usage_test_123',
        customerId: 'cust_test_123',
        productId: 'prod_test_123',
        quantity: 100,
        metricName: 'storage_gb',
        createdAt: new Date('2023-01-15T12:00:00Z'),
        updatedAt: new Date('2023-01-15T12:00:00Z'),
        timestamp: new Date('2023-01-15T12:00:00Z'),
      };
      
      const result = await adapter.create('usage', usageData);
      
      // Verify that timestamp field is properly handled
      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Error Handling', () => {
    it('should handle constraint violations gracefully', async () => {
      // Try to create a subscription without a customer (FK violation)
      const subscriptionData = createTestSubscription({ customerId: 'non_existent' });
      
      await expect(adapter.create<Subscription>('subscription', subscriptionData)).rejects.toThrow();
    });

    it('should handle invalid table names', async () => {
      const data = { id: 'test', name: 'test' };
      
      await expect(adapter.create<any>('non_existent_table', data)).rejects.toThrow();
    });
  });
});