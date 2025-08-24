import { describe, it, expect, beforeEach } from 'vitest';
import { PGliteTestAdapter } from '../pglite-adapter';
import { db } from '../setup';
import { createTestCustomer, createTestSubscription } from '../fixtures/test-data';
import type { Customer, Subscription } from '../../src/types';

describe('PGliteTestAdapter', () => {
  let adapter: PGliteTestAdapter;

  beforeEach(() => {
    adapter = new PGliteTestAdapter(db);
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
      
      const result = await adapter.findOne<Customer>('customer', { id: customerData.id });
      
      expect(result).toBeDefined();
      expect(result?.id).toBe(customerData.id);
      expect(result?.email).toBe(customerData.email);
    });

    it('should return null for non-existent customer', async () => {
      const result = await adapter.findOne<Customer>('customer', { id: 'non_existent' });
      expect(result).toBeNull();
    });

    it('should update a customer', async () => {
      const customerData = createTestCustomer();
      await adapter.create<Customer>('customer', customerData);
      
      const updateData = { email: 'updated@example.com' };
      const result = await adapter.update<Customer>('customer', { id: customerData.id }, updateData);
      
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
      
      await adapter.delete('customer', { id: customerData.id });
      
      const result = await adapter.findOne<Customer>('customer', { id: customerData.id });
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
      
      const result = await adapter.findOne<Subscription>('subscription', { id: subscriptionData.id });
      
      expect(result).toBeDefined();
      expect(result?.id).toBe(subscriptionData.id);
      expect(result?.customerId).toBe(subscriptionData.customerId);
    });

    it('should update a subscription', async () => {
      const subscriptionData = createTestSubscription();
      await adapter.create<Subscription>('subscription', subscriptionData);
      
      const updateData = { quantity: 5, status: 'canceled' as const };
      const result = await adapter.update<Subscription>('subscription', { id: subscriptionData.id }, updateData);
      
      expect(result.quantity).toBe(5);
      expect(result.status).toBe('canceled');
      expect(result.id).toBe(subscriptionData.id);
    });

    it('should find subscriptions by customer ID', async () => {
      const subscription1 = createTestSubscription({ id: 'sub_1' });
      const subscription2 = createTestSubscription({ id: 'sub_2' });
      
      await adapter.create<Subscription>('subscription', subscription1);
      await adapter.create<Subscription>('subscription', subscription2);
      
      const results = await adapter.findMany<Subscription>('subscription', { customerId: subscription1.customerId });
      
      expect(results).toHaveLength(2);
      expect(results.map(s => s.id)).toContain('sub_1');
      expect(results.map(s => s.id)).toContain('sub_2');
    });

    it('should delete a subscription', async () => {
      const subscriptionData = createTestSubscription();
      await adapter.create<Subscription>('subscription', subscriptionData);
      
      await adapter.delete('subscription', { id: subscriptionData.id });
      
      const result = await adapter.findOne<Subscription>('subscription', { id: subscriptionData.id });
      expect(result).toBeNull();
    });
  });

  describe('Usage Operations', () => {
    beforeEach(async () => {
      // Create a customer first for FK constraints
      const customerData = createTestCustomer();
      await adapter.create<Customer>('customer', customerData);
    });

    it('should create usage records', async () => {
      const usageData = {
        id: 'usage_test_123',
        customerId: 'cust_test_123',
        productId: 'prod_test_123',
        quantity: 100,
        timestamp: new Date('2023-01-15T12:00:00Z'),
        metadata: { source: 'api' },
      };
      
      const result = await adapter.create<any>('usage', usageData);
      
      expect(result).toBeDefined();
      expect(result.id).toBe(usageData.id);
      expect(result.quantity).toBe(usageData.quantity);
      expect(result.customerId).toBe(usageData.customerId);
    });

    it('should find usage records', async () => {
      const usageData1 = {
        id: 'usage_1',
        customerId: 'cust_test_123',
        productId: 'prod_test_123',
        quantity: 50,
        timestamp: new Date(),
      };
      const usageData2 = {
        id: 'usage_2',
        customerId: 'cust_test_123',
        productId: 'prod_test_123',
        quantity: 75,
        timestamp: new Date(),
      };
      
      await adapter.create<any>('usage', usageData1);
      await adapter.create<any>('usage', usageData2);
      
      const results = await adapter.findMany<any>('usage', { customerId: 'cust_test_123' });
      
      expect(results).toHaveLength(2);
      expect(results.reduce((sum: number, record: any) => sum + record.quantity, 0)).toBe(125);
    });
  });

  describe('Field Name Conversion', () => {
    it('should handle snake_case to camelCase conversion', async () => {
      const customerData = createTestCustomer();
      await adapter.create<Customer>('customer', customerData);
      
      const result = await adapter.findOne<Customer>('customer', { id: customerData.id });
      
      // Verify that snake_case fields are converted to camelCase
      expect(result?.billableId).toBeDefined(); // billable_id -> billableId
      expect(result?.providerId).toBeDefined(); // provider_id -> providerId
      expect(result?.createdAt).toBeInstanceOf(Date); // created_at -> createdAt
      expect(result?.updatedAt).toBeInstanceOf(Date); // updated_at -> updatedAt
    });

    it('should handle special field mappings for reserved keywords', async () => {
      // First create the customer to satisfy foreign key constraint
      const customerData = createTestCustomer();
      await adapter.create<Customer>('customer', customerData);
      
      const usageData = {
        id: 'usage_test_123',
        customerId: 'cust_test_123',
        productId: 'prod_test_123',
        quantity: 100,
        timestamp: new Date('2023-01-15T12:00:00Z'),
      };
      
      const result = await adapter.create<any>('usage', usageData);
      
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