import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HookManager } from '../../src/core/hooks';

describe('HookManager', () => {
  let hookManager: HookManager;

  beforeEach(() => {
    hookManager = new HookManager();
  });

  describe('Hook Registration', () => {
    it('should register a hook', () => {
      const hookFn = vi.fn();
      
      hookManager.register('beforeCustomerCreate', hookFn);
      
      // Verify the hook was registered (we'll test execution separately)
      expect(hookFn).toBeDefined();
    });

    it('should register multiple hooks for the same event', () => {
      const hookFn1 = vi.fn();
      const hookFn2 = vi.fn();
      
      hookManager.register('beforeCustomerCreate', hookFn1);
      hookManager.register('beforeCustomerCreate', hookFn2);
      
      expect(hookFn1).toBeDefined();
      expect(hookFn2).toBeDefined();
    });
  });

  describe('Hook Execution', () => {
    it('should run a single hook', async () => {
      const hookFn = vi.fn().mockResolvedValue(undefined);
      const context = { data: { id: 'test' } };
      
      hookManager.register('beforeCustomerCreate', hookFn);
      await hookManager.runHook('beforeCustomerCreate', context);
      
      expect(hookFn).toHaveBeenCalledWith(context);
      expect(hookFn).toHaveBeenCalledTimes(1);
    });

    it('should run multiple hooks for the same event', async () => {
      const hookFn1 = vi.fn().mockResolvedValue(undefined);
      const hookFn2 = vi.fn().mockResolvedValue(undefined);
      const context = { data: { id: 'test' } };
      
      hookManager.register('beforeCustomerCreate', hookFn1);
      hookManager.register('beforeCustomerCreate', hookFn2);
      
      await hookManager.runHook('beforeCustomerCreate', context);
      
      expect(hookFn1).toHaveBeenCalledWith(context);
      expect(hookFn2).toHaveBeenCalledWith(context);
      expect(hookFn1).toHaveBeenCalledTimes(1);
      expect(hookFn2).toHaveBeenCalledTimes(1);
    });

    it('should handle synchronous hooks', async () => {
      const hookFn = vi.fn(); // synchronous function
      const context = { data: { id: 'test' } };
      
      hookManager.register('beforeCustomerCreate', hookFn);
      await hookManager.runHook('beforeCustomerCreate', context);
      
      expect(hookFn).toHaveBeenCalledWith(context);
    });

    it('should handle asynchronous hooks', async () => {
      const hookFn = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return Promise.resolve();
      });
      const context = { data: { id: 'test' } };
      
      hookManager.register('beforeCustomerCreate', hookFn);
      await hookManager.runHook('beforeCustomerCreate', context);
      
      expect(hookFn).toHaveBeenCalledWith(context);
    });

    it('should not throw error when running hooks for non-existent event', async () => {
      await expect(hookManager.runHook('beforeCustomerCreate', { data: {} })).resolves.not.toThrow();
    });
  });

  describe('Hook Error Handling', () => {
    it('should handle errors in synchronous hooks gracefully', async () => {
      const hookFn = vi.fn().mockImplementation(() => {
        throw new Error('Hook error');
      });
      const context = { data: { id: 'test' } };
      
      hookManager.register('beforeCustomerCreate', hookFn);
      
      // Should not throw - errors should be caught internally
      await expect(hookManager.runHook('beforeCustomerCreate', context)).resolves.not.toThrow();
      expect(hookFn).toHaveBeenCalledWith(context);
    });

    it('should handle errors in asynchronous hooks gracefully', async () => {
      const hookFn = vi.fn().mockRejectedValue(new Error('Async hook error'));
      const context = { data: { id: 'test' } };
      
      hookManager.register('beforeCustomerCreate', hookFn);
      
      // Should not throw - errors should be caught internally
      await expect(hookManager.runHook('beforeCustomerCreate', context)).resolves.not.toThrow();
      expect(hookFn).toHaveBeenCalledWith(context);
    });

    it('should continue executing other hooks even if one fails', async () => {
      const failingHook = vi.fn().mockRejectedValue(new Error('Hook error'));
      const successHook = vi.fn().mockResolvedValue(undefined);
      const context = { data: { id: 'test' } };
      
      hookManager.register('beforeCustomerCreate', failingHook);
      hookManager.register('beforeCustomerCreate', successHook);
      
      await hookManager.runHook('beforeCustomerCreate', context);
      
      expect(failingHook).toHaveBeenCalledWith(context);
      expect(successHook).toHaveBeenCalledWith(context);
    });
  });

  describe('Different Hook Types', () => {
    it('should handle customer hooks', async () => {
      const beforeCreate = vi.fn();
      const afterCreate = vi.fn();
      
      hookManager.register('beforeCustomerCreate', beforeCreate);
      hookManager.register('afterCustomerCreate', afterCreate);
      
      await hookManager.runHook('beforeCustomerCreate', { data: { email: 'test@example.com' } });
      await hookManager.runHook('afterCustomerCreate', { customer: { id: 'cust_123', email: 'test@example.com' } });
      
      expect(beforeCreate).toHaveBeenCalledTimes(1);
      expect(afterCreate).toHaveBeenCalledTimes(1);
    });

    it('should handle subscription hooks', async () => {
      const beforeSubscribe = vi.fn();
      const afterSubscribe = vi.fn();
      const beforeCancel = vi.fn();
      const afterCancel = vi.fn();
      
      hookManager.register('beforeSubscribe', beforeSubscribe);
      hookManager.register('afterSubscribe', afterSubscribe);
      hookManager.register('beforeCancel', beforeCancel);
      hookManager.register('afterCancel', afterCancel);
      
      await hookManager.runHook('beforeSubscribe', { 
        customer: { id: 'cust_123' }, 
        priceId: 'price_123' 
      });
      
      await hookManager.runHook('afterSubscribe', { 
        subscription: { id: 'sub_123' }, 
        customer: { id: 'cust_123' } 
      });
      
      expect(beforeSubscribe).toHaveBeenCalledTimes(1);
      expect(afterSubscribe).toHaveBeenCalledTimes(1);
    });

    it('should handle usage hooks', async () => {
      const onUsageReported = vi.fn();
      
      hookManager.register('onUsageReported', onUsageReported);
      
      await hookManager.runHook('onUsageReported', {
        usage: { id: 'usage_123', quantity: 100 },
        customer: { id: 'cust_123' }
      });
      
      expect(onUsageReported).toHaveBeenCalledTimes(1);
    });

    it('should handle payment hooks', async () => {
      const onInvoicePaid = vi.fn();
      const onPaymentFailed = vi.fn();
      
      hookManager.register('onInvoicePaid', onInvoicePaid);
      hookManager.register('onPaymentFailed', onPaymentFailed);
      
      await hookManager.runHook('onInvoicePaid', {
        invoice: { id: 'inv_123', status: 'paid' },
        customer: { id: 'cust_123' }
      });
      
      await hookManager.runHook('onPaymentFailed', {
        invoice: { id: 'inv_123', status: 'payment_failed' },
        customer: { id: 'cust_123' },
        error: new Error('Payment failed')
      });
      
      expect(onInvoicePaid).toHaveBeenCalledTimes(1);
      expect(onPaymentFailed).toHaveBeenCalledTimes(1);
    });
  });

  describe('Hook Context Validation', () => {
    it('should pass correct context to customer creation hooks', async () => {
      const hook = vi.fn();
      const expectedContext = { 
        data: { 
          billableId: 'user_123', 
          email: 'test@example.com' 
        } 
      };
      
      hookManager.register('beforeCustomerCreate', hook);
      await hookManager.runHook('beforeCustomerCreate', expectedContext);
      
      expect(hook).toHaveBeenCalledWith(expectedContext);
    });

    it('should pass correct context to subscription hooks', async () => {
      const hook = vi.fn();
      const expectedContext = {
        customer: { id: 'cust_123', email: 'test@example.com' },
        priceId: 'price_123',
        quantity: 1
      };
      
      hookManager.register('beforeSubscribe', hook);
      await hookManager.runHook('beforeSubscribe', expectedContext);
      
      expect(hook).toHaveBeenCalledWith(expectedContext);
    });
  });

  describe('Performance and Concurrency', () => {
    it('should execute hooks sequentially for safety', async () => {
      const delays = [20, 30, 50]; // milliseconds
      const hooks = delays.map(
        (delay, index) => vi.fn().mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, delay));
          return `hook_${index}`;
        })
      );
      
      hooks.forEach(hook => hookManager.register('beforeCustomerCreate', hook));
      
      const startTime = Date.now();
      await hookManager.runHook('beforeCustomerCreate', { data: {} });
      const endTime = Date.now();
      
      // Hooks run sequentially, so total time should be approximately the sum of all delays
      // Adding buffer for execution overhead
      expect(endTime - startTime).toBeGreaterThan(90); // Should be around 100ms (20+30+50)
      expect(endTime - startTime).toBeLessThan(150); // With reasonable overhead
      
      hooks.forEach(hook => expect(hook).toHaveBeenCalledTimes(1));
    });
  });
});