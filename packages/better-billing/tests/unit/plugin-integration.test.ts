import { beforeEach, describe, expect, it } from 'vitest';
import { betterBilling } from '../../src';
import { mockPlugin } from '../../src/plugins/mock-plugin';
import { usageMeteringPlugin } from '../../src/plugins/usage-metering';
import { adapter } from '../setup';
import { ExtractPluginFromFactory, ExtractPluginPaymentProviders } from '../../src/types';

type X = ExtractPluginFromFactory<ReturnType<typeof mockPlugin>>;
type Y = ExtractPluginPaymentProviders<[X]>;

function createBilling() {
  return betterBilling({
    database: adapter,
    plugins: [usageMeteringPlugin(), mockPlugin()] ,
    provider: 'mockProvider',
  });
}

describe('Plugin Integration', () => {
  let billing: ReturnType<typeof createBilling>;

  beforeEach(() => {
    billing = createBilling();
  });

  it('should add plugin methods to billing object under plugin namespace', () => {
    // Plugin methods should be accessible under the plugin ID namespace
    expect(billing.methods.usageMetering).toBeDefined();
    expect(typeof billing.methods.usageMetering).toBe('object');
  });

  it('should have plugin methods available', () => {
    expect(billing.methods.usageMetering.recordUsage).toBeDefined();
    expect(typeof billing.methods.usageMetering.recordUsage).toBe('function');
    
    expect(billing.methods.usageMetering.getUsage).toBeDefined();
    expect(typeof billing.methods.usageMetering.getUsage).toBe('function');
    
    expect(billing.methods.usageMetering.deleteUsage).toBeDefined();
    expect(typeof billing.methods.usageMetering.deleteUsage).toBe('function');
    
    expect(billing.methods.usageMetering.getUsageRecords).toBeDefined();
    expect(typeof billing.methods.usageMetering.getUsageRecords).toBe('function');
  });

  it('should be able to call plugin methods', async () => {
    // Create a customer first
    const customer = await billing.methods.core.createCustomer({
      billableId: 'user-123',
      billableType: 'user',
      email: 'test@example.com',
    });

    // Create a subscription
    const subscription = await billing.methods.core.createSubscription({
      customerId: customer.id,
      items: [{ priceId: 'price-123', quantity: 1 }],
    });

    // Test recordUsage method
    const usageRecord = await billing.methods.usageMetering.recordUsage({
      customerId: customer.id,
      subscriptionId: subscription.id,
      metricName: 'api_calls',
      quantity: 10,
      productId: 'prod_123',
    });

    expect(usageRecord).toBeDefined();
    expect(usageRecord.customerId).toBe(customer.id);
    expect(usageRecord.subscriptionId).toBe(subscription.id);
    expect(usageRecord.metricName).toBe('api_calls');
    expect(usageRecord.quantity).toBe(10);
  });

  it('should maintain proper method binding', async () => {
    // Extract method to test binding
    const { recordUsage } = billing.methods.usageMetering;
    
    // Create test data
    const customer = await billing.methods.core.createCustomer({
      billableId: 'user-456',
      billableType: 'user',
      email: 'test2@example.com',
    });

    const subscription = await billing.methods.core.createSubscription({
      customerId: customer.id,
      items: [{ priceId: 'price-456', quantity: 1 }],
    });

    // Method should still work when called separately
    const usageRecord = await recordUsage({
      customerId: customer.id,
      subscriptionId: subscription.id,
      metricName: 'storage_gb',
      productId: 'prod_123',
      quantity: 5,
    });

    expect(usageRecord.metricName).toBe('storage_gb');
    expect(usageRecord.quantity).toBe(5);
  });
});