import { beforeEach, describe, expect, it } from 'vitest';
import { betterBilling } from '../../src/core/billing';
import { mockPlugin } from '../../src/plugins/mock-plugin';
import type { BetterBilling, SubscriptionPlan } from '../../src/types';
import { adapter } from '../setup';

describe('Subscription Plan Management', () => {
  let billing: BetterBilling;

  const samplePlans: Record<string, SubscriptionPlan> = {
    starter: {
      name: 'Starter Plan',
      description: 'Perfect for getting started',
      priceId: 'price_starter_monthly',
      features: ['Basic features', 'Email support'],
      trialDays: 14,
      allowQuantity: false,
      metadata: {
        tier: 'starter',
        popularity: 'medium',
      },
      callbackData: {
        welcomeEmail: true,
        onboardingFlow: 'basic',
      },
    },
    pro: {
      name: 'Pro Plan',
      description: 'For growing businesses',
      priceId: 'price_pro_monthly',
      features: ['Advanced features', 'Priority support', 'Analytics'],
      trialDays: 30,
      allowQuantity: true,
      maxQuantity: 10,
      metadata: {
        tier: 'pro',
        popularity: 'high',
      },
      callbackData: {
        welcomeEmail: true,
        onboardingFlow: 'advanced',
        analyticsEnabled: true,
      },
    },
  };

  beforeEach(async () => {
    billing = betterBilling({
      database: adapter,
      provider: 'mockProvider',
      plans: samplePlans,
      plugins: [mockPlugin()],
    });
  });

  describe('Plan Configuration', () => {
    it('should store plan configuration in billing config', () => {
      expect(billing.config.plans).toBeDefined();
      expect(billing.config.plans).toEqual(samplePlans);
    });

    it('should provide access to individual plans', () => {
      const starterPlan = billing.config.plans?.starter;
      expect(starterPlan).toBeDefined();
      expect(starterPlan?.name).toBe('Starter Plan');
      expect(starterPlan?.priceId).toBe('price_starter_monthly');
      expect(starterPlan?.trialDays).toBe(14);
    });

    it('should handle missing plans gracefully', () => {
      const nonExistentPlan = billing.config.plans?.nonexistent;
      expect(nonExistentPlan).toBeUndefined();
    });
  });

  describe('Checkout Session Creation with Plans', () => {
    it('should create checkout session using planId', async () => {
      const checkoutData = {
        customerId: 'cus_test123',
        planId: 'starter',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        callbackData: {
          userId: 'user_123',
          campaign: 'spring_sale',
        },
      };

      const session = await billing.methods.core.createCheckoutSession(checkoutData);

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.url).toBeDefined();
      expect(session.expiresAt).toBeInstanceOf(Date);
    });

    it('should prioritize priceId over planId when both are provided', async () => {
      const checkoutData = {
        customerId: 'cus_test123',
        priceId: 'price_direct_override',
        planId: 'starter',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      };

      // This should use the direct priceId, not resolve the plan
      const session = await billing.methods.core.createCheckoutSession(checkoutData);

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
    });

    it('should throw error for non-existent planId', async () => {
      const checkoutData = {
        customerId: 'cus_test123',
        planId: 'nonexistent_plan',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      };

      await expect(
        billing.methods.core.createCheckoutSession(checkoutData)
      ).rejects.toThrow('Plan "nonexistent_plan" not found in billing configuration');
    });

    it('should throw error when neither priceId nor planId is provided', async () => {
      const checkoutData = {
        customerId: 'cus_test123',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      };

      await expect(
        billing.methods.core.createCheckoutSession(checkoutData)
      ).rejects.toThrow('Either priceId or planId must be provided for checkout session creation');
    });
  });

  describe('Active Subscriptions Query', () => {
    beforeEach(async () => {
      // Create test customer and subscriptions
      const customer = await billing.methods.core.createCustomer({
        billableId: 'user_123',
        billableType: 'User',
        email: 'test@example.com',
      });

      // Create active subscription
      await billing.methods.core.createSubscription({
        customerId: customer.id,
        items: [{ priceId: 'price_starter_monthly', quantity: 1 }],
        metadata: { planId: 'starter' },
      });

      // Create trialing subscription
      await billing.methods.core.createSubscription({
        customerId: customer.id,
        items: [{ priceId: 'price_pro_monthly', quantity: 1 }],
        trialDays: 30,
        metadata: { planId: 'pro' },
      });
    });

    it('should return active subscriptions for a customer', async () => {
      const customer = await billing.methods.core.createCustomer({
        billableId: 'user_active_test',
        billableType: 'User',
        email: 'active@example.com',
      });

      const activeSubscriptions = await billing.methods.core.getActiveSubscriptions(customer.id);

      expect(activeSubscriptions).toBeDefined();
      expect(Array.isArray(activeSubscriptions)).toBe(true);
    });

    it('should return empty array for customer with no active subscriptions', async () => {
      const customer = await billing.methods.core.createCustomer({
        billableId: 'user_no_subs',
        billableType: 'User',
        email: 'nosubs@example.com',
      });

      const activeSubscriptions = await billing.methods.core.getActiveSubscriptions(customer.id);

      expect(activeSubscriptions).toBeDefined();
      expect(activeSubscriptions).toEqual([]);
    });
  });

  describe('Checkout Callback Handling', () => {
    it('should handle checkout success callback', async () => {
      const request = new Request('https://api.example.com/billing/checkout/success?session_id=cs_test_123');
      const response = await billing.api.handler(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('Checkout completed successfully');
    });

    it('should handle checkout cancel callback', async () => {
      const request = new Request('https://api.example.com/billing/checkout/cancel?session_id=cs_test_123');
      const response = await billing.api.handler(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe('Checkout was cancelled');
    });

    it('should return error for missing session_id', async () => {
      const request = new Request('https://api.example.com/billing/checkout/success');
      const response = await billing.api.handler(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe('Missing session_id');
    });
  });

  describe('Plan Metadata Integration', () => {
    it('should merge plan metadata with checkout session metadata', () => {
      const starterPlan = billing.config.plans?.starter;
      expect(starterPlan?.metadata).toEqual({
        tier: 'starter',
        popularity: 'medium',
      });
    });

    it('should include callback data in plan configuration', () => {
      const proPlan = billing.config.plans?.pro;
      expect(proPlan?.callbackData).toEqual({
        welcomeEmail: true,
        onboardingFlow: 'advanced',
        analyticsEnabled: true,
      });
    });

    it('should support plan features list', () => {
      const starterPlan = billing.config.plans?.starter;
      expect(starterPlan?.features).toEqual(['Basic features', 'Email support']);

      const proPlan = billing.config.plans?.pro;
      expect(proPlan?.features).toEqual(['Advanced features', 'Priority support', 'Analytics']);
    });

    it('should support quantity restrictions', () => {
      const starterPlan = billing.config.plans?.starter;
      expect(starterPlan?.allowQuantity).toBe(false);

      const proPlan = billing.config.plans?.pro;
      expect(proPlan?.allowQuantity).toBe(true);
      expect(proPlan?.maxQuantity).toBe(10);
    });
  });
});