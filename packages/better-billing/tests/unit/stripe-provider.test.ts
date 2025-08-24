import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the stripe module
vi.mock('stripe', () => {
  return {
    default: vi.fn().mockImplementation(() => mockStripe),
    __esModule: true,
  };
});

// Now import after mocking
import { stripeProvider } from '../../src/providers/stripe';
import { mockStripeCustomer, mockStripeSubscription, mockStripePaymentMethod } from '../fixtures/test-data';

// Get access to the mocked Stripe instance
const mockStripe = vi.hoisted(() => ({
  customers: {
    create: vi.fn(),
    update: vi.fn(),
    del: vi.fn(),
  },
  subscriptions: {
    create: vi.fn(),
    update: vi.fn(),
    cancel: vi.fn(),
    retrieve: vi.fn(),
  },
  checkout: {
    sessions: {
      create: vi.fn(),
    },
  },
  billingPortal: {
    sessions: {
      create: vi.fn(),
    },
  },
  billing: {
    meterEvents: {
      create: vi.fn(),
    },
  },
  webhooks: {
    constructEvent: vi.fn(),
  },
  paymentMethods: {
    attach: vi.fn(),
    detach: vi.fn(),
  },
}));

describe('StripeProvider', () => {
  let provider: ReturnType<typeof stripeProvider>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    provider = stripeProvider({
      secretKey: 'sk_test_123',
      publishableKey: 'pk_test_123',
      webhookSecret: 'whsec_test_123',
    });
  });

  describe('Provider Configuration', () => {
    it('should have correct provider metadata', () => {
      expect(provider.id).toBe('stripe');
      expect(provider.name).toBe('Stripe');
    });
  });

  describe('Customer Operations', () => {
    it('should create a customer', async () => {
      mockStripe.customers.create.mockResolvedValue(mockStripeCustomer);

      const customerData = {
        billableId: 'user_123',
        billableType: 'user',
        email: 'test@example.com',
        name: 'Test User',
        metadata: { test: true },
      };

      const result = await provider.createCustomer(customerData);

      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: customerData.email,
        name: customerData.name,
        metadata: {
          billableId: customerData.billableId,
          billableType: customerData.billableType,
          test: true,
        },
      });

      expect(result).toEqual({
        id: mockStripeCustomer.id,
        billableId: customerData.billableId,
        billableType: customerData.billableType,
        providerId: 'stripe',
        providerCustomerId: mockStripeCustomer.id,
        email: mockStripeCustomer.email,
        metadata: mockStripeCustomer.metadata,
        createdAt: new Date(mockStripeCustomer.created * 1000),
        updatedAt: expect.any(Date),
      });
    });

    it('should update a customer', async () => {
      const updatedCustomer = {
        ...mockStripeCustomer,
        email: 'updated@example.com',
        name: 'Updated User',
      };
      mockStripe.customers.update.mockResolvedValue(updatedCustomer);

      const updateData = {
        email: 'updated@example.com',
        name: 'Updated User',
        metadata: { updated: true },
      };

      const result = await provider.updateCustomer('cus_stripe_123', updateData);

      expect(mockStripe.customers.update).toHaveBeenCalledWith('cus_stripe_123', {
        email: updateData.email,
        name: updateData.name,
        metadata: updateData.metadata,
      });

      expect(result.email).toBe('updated@example.com');
    });

    it('should delete a customer', async () => {
      mockStripe.customers.del.mockResolvedValue({ deleted: true });

      await provider.deleteCustomer('cus_stripe_123');

      expect(mockStripe.customers.del).toHaveBeenCalledWith('cus_stripe_123');
    });
  });

  describe('Subscription Operations', () => {
    it('should create a subscription', async () => {
      mockStripe.subscriptions.create.mockResolvedValue(mockStripeSubscription);

      const subscriptionData = {
        customerId: 'cus_stripe_123',
        items: [
          { priceId: 'price_test_123', quantity: 1 },
        ],
        trialDays: 7,
        metadata: { test: true },
      };

      const result = await provider.createSubscription(subscriptionData);

      expect(mockStripe.subscriptions.create).toHaveBeenCalledWith({
        customer: subscriptionData.customerId,
        items: [{ price: 'price_test_123', quantity: 1 }],
        trial_period_days: 7,
        metadata: { test: true },
        expand: ['latest_invoice', 'customer'],
      });

      expect(result).toEqual({
        id: mockStripeSubscription.id,
        customerId: mockStripeSubscription.customer,
        providerId: 'stripe',
        providerSubscriptionId: mockStripeSubscription.id,
        status: 'active',
        productId: 'prod_test_123',
        priceId: 'price_test_123',
        quantity: 1,
        currentPeriodStart: new Date(mockStripeSubscription.items.data[0].current_period_start * 1000),
        currentPeriodEnd: new Date(mockStripeSubscription.items.data[0].current_period_end * 1000),
        metadata: mockStripeSubscription.metadata,
        createdAt: new Date(mockStripeSubscription.created * 1000),
        updatedAt: expect.any(Date),
      });
    });

    it('should update a subscription', async () => {
      const existingSubscription = {
        ...mockStripeSubscription,
        items: {
          data: [{ ...mockStripeSubscription.items.data[0], id: 'si_existing_123' }],
        },
      };
      
      mockStripe.subscriptions.retrieve.mockResolvedValue(existingSubscription);
      mockStripe.subscriptions.update.mockResolvedValue({
        ...existingSubscription,
        metadata: { updated: true },
      });

      const updateData = {
        items: [{ priceId: 'price_new_123', quantity: 2 }],
        metadata: { updated: true },
      };

      const result = await provider.updateSubscription('sub_stripe_123', updateData);

      expect(mockStripe.subscriptions.retrieve).toHaveBeenCalledWith('sub_stripe_123');
      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_stripe_123', {
        metadata: { updated: true },
        items: [
          {
            id: 'si_existing_123',
            price: 'price_new_123',
            quantity: 2,
          },
        ],
      });

      expect(result.metadata).toEqual({ updated: true });
    });

    it('should cancel a subscription at period end', async () => {
      const canceledSubscription = {
        ...mockStripeSubscription,
        cancel_at_period_end: true,
      };
      mockStripe.subscriptions.update.mockResolvedValue(canceledSubscription);

      const result = await provider.cancelSubscription('sub_stripe_123', { immediately: false });

      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_stripe_123', {
        cancel_at_period_end: true,
      });

      expect(result).toBeDefined();
    });

    it('should cancel a subscription immediately', async () => {
      const canceledSubscription = {
        ...mockStripeSubscription,
        status: 'canceled',
        canceled_at: Math.floor(Date.now() / 1000),
      };
      mockStripe.subscriptions.cancel.mockResolvedValue(canceledSubscription);

      const result = await provider.cancelSubscription('sub_stripe_123', { immediately: true });

      expect(mockStripe.subscriptions.cancel).toHaveBeenCalledWith('sub_stripe_123');
      expect(result).toBeDefined();
    });

    it('should resume a subscription', async () => {
      const resumedSubscription = {
        ...mockStripeSubscription,
        cancel_at_period_end: false,
      };
      mockStripe.subscriptions.update.mockResolvedValue(resumedSubscription);

      const result = await provider.resumeSubscription('sub_stripe_123');

      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_stripe_123', {
        cancel_at_period_end: false,
      });

      expect(result).toBeDefined();
    });
  });

  describe('Checkout and Portal', () => {
    it('should create a checkout session', async () => {
      const mockSession = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      };
      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession);

      const sessionData = {
        customerId: 'cus_stripe_123',
        priceId: 'price_test_123',
        quantity: 1,
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        metadata: { source: 'api' },
      };

      const result = await provider.createCheckoutSession(sessionData);

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith({
        customer: sessionData.customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: sessionData.priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: sessionData.successUrl,
        cancel_url: sessionData.cancelUrl,
        metadata: sessionData.metadata,
      });

      expect(result).toEqual({
        id: mockSession.id,
        url: mockSession.url,
        expiresAt: new Date(mockSession.expires_at * 1000),
      });
    });

    it('should create a portal session', async () => {
      const mockSession = {
        id: 'bps_test_123',
        url: 'https://billing.stripe.com/p/session/bps_test_123',
      };
      mockStripe.billingPortal.sessions.create.mockResolvedValue(mockSession);

      const result = await provider.createPortalSession('cus_stripe_123');

      expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_stripe_123',
      });

      expect(result).toEqual({
        id: mockSession.id,
        url: mockSession.url,
      });
    });
  });

  describe('Usage Reporting', () => {
    it('should report usage using meter events', async () => {
      const mockMeterEvent = {
        identifier: 'evt_test_123',
        payload: { value: '100' },
        created: Math.floor(Date.now() / 1000),
      };
      mockStripe.billing.meterEvents.create.mockResolvedValue(mockMeterEvent);

      const options = {
        customerId: 'cus_stripe_123',
        eventName: 'api_request',
        timestamp: new Date('2023-01-15T12:00:00Z'),
        idempotencyKey: 'idem_123',
      };

      const result = await provider.reportUsage('si_test_123', 100, options);

      expect(mockStripe.billing.meterEvents.create).toHaveBeenCalledWith(
        {
          event_name: 'api_request',
          payload: {
            stripe_customer_id: 'cus_stripe_123',
            value: '100',
          },
          timestamp: Math.floor(options.timestamp.getTime() / 1000),
        },
        {
          idempotencyKey: 'idem_123',
        }
      );

      expect(result).toEqual({
        id: mockMeterEvent.identifier,
        quantity: 100,
        timestamp: new Date(mockMeterEvent.created * 1000),
      });
    });

    it('should throw error when customerId is missing for usage reporting', async () => {
      await expect(provider.reportUsage('si_test_123', 100, {})).rejects.toThrow(
        'customerId is required for Stripe meter events'
      );
    });
  });

  describe('Webhook Handling', () => {
    it('should construct webhook event', () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'customer.subscription.created',
        data: { object: mockStripeSubscription },
        created: Math.floor(Date.now() / 1000),
      };
      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

      const result = provider.constructWebhookEvent('payload', 'signature');

      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        'payload',
        'signature',
        'whsec_test_123'
      );

      expect(result).toEqual({
        id: mockEvent.id,
        type: mockEvent.type,
        data: mockEvent.data.object,
        timestamp: new Date(mockEvent.created * 1000),
      });
    });

    it('should throw error when webhook secret is missing', () => {
      const providerWithoutSecret = stripeProvider({
        secretKey: 'sk_test_123',
      });

      expect(() => providerWithoutSecret.constructWebhookEvent('payload', 'signature')).toThrow(
        'Webhook secret is required for webhook verification'
      );
    });

    it('should handle webhook event', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const webhookEvent = {
        id: 'evt_test_123',
        type: 'customer.subscription.created',
        data: mockStripeSubscription,
        timestamp: new Date(),
      };

      await provider.handleWebhook(webhookEvent);

      expect(consoleSpy).toHaveBeenCalledWith('Received Stripe webhook: customer.subscription.created');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Payment Methods', () => {
    it('should attach a payment method', async () => {
      mockStripe.paymentMethods.attach.mockResolvedValue(mockStripePaymentMethod);

      const result = await provider.attachPaymentMethod('cus_stripe_123', 'pm_stripe_123');

      expect(mockStripe.paymentMethods.attach).toHaveBeenCalledWith('pm_stripe_123', {
        customer: 'cus_stripe_123',
      });

      expect(result).toEqual({
        id: mockStripePaymentMethod.id,
        customerId: 'cus_stripe_123',
        providerId: 'stripe',
        providerPaymentMethodId: mockStripePaymentMethod.id,
        type: mockStripePaymentMethod.type,
        last4: mockStripePaymentMethod.card?.last4,
        brand: mockStripePaymentMethod.card?.brand,
        isDefault: false,
        metadata: mockStripePaymentMethod.metadata,
      });
    });

    it('should detach a payment method', async () => {
      mockStripe.paymentMethods.detach.mockResolvedValue({ id: 'pm_stripe_123' });

      await provider.detachPaymentMethod('pm_stripe_123');

      expect(mockStripe.paymentMethods.detach).toHaveBeenCalledWith('pm_stripe_123');
    });

    it('should set default payment method', async () => {
      mockStripe.customers.update.mockResolvedValue(mockStripeCustomer);

      await provider.setDefaultPaymentMethod('cus_stripe_123', 'pm_stripe_123');

      expect(mockStripe.customers.update).toHaveBeenCalledWith('cus_stripe_123', {
        invoice_settings: {
          default_payment_method: 'pm_stripe_123',
        },
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle Stripe API errors properly', async () => {
      const stripeError = new Error('Invalid API key provided');
      mockStripe.customers.create.mockRejectedValue(stripeError);

      const customerData = {
        billableId: 'user_123',
        billableType: 'user',
        email: 'test@example.com',
        name: 'Test User',
      };

      await expect(provider.createCustomer(customerData)).rejects.toThrow('Invalid API key provided');
    });
  });
});