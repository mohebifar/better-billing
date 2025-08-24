import Stripe from 'stripe';
import type {
  CancelOptions,
  CheckoutSession,
  CheckoutSessionData,
  CreateCustomerData,
  CreateSubscriptionData,
  Customer,
  PaymentMethod,
  PaymentProvider,
  PortalSession,
  Subscription,
  SubscriptionStatus,
  UpdateCustomerData,
  UpdateSubscriptionData,
  UsageOptions,
  UsageRecord,
  WebhookEvent,
} from '../../types';

export interface StripeConfig {
  secretKey: string;
  publishableKey?: string;
  webhookSecret?: string;
  apiVersion?: Stripe.LatestApiVersion;
}

export function stripeProvider(config: StripeConfig): PaymentProvider {
  // Dynamic import will be handled by the user
  let stripe: Stripe;

  const initStripe = () => {
    if (!stripe) {
      try {
        // User must install stripe package
        stripe = new Stripe(config.secretKey, {
          apiVersion: config.apiVersion || '2025-07-30.basil',
        });
      } catch (_error) {
        throw new Error('Stripe package not found. Please install it: npm install stripe');
      }
    }
    return stripe;
  };

  return {
    id: 'stripe',
    name: 'Stripe',

    // Customer operations
    async createCustomer(data: CreateCustomerData): Promise<Customer> {
      const stripe = initStripe();

      const customer = await stripe.customers.create({
        email: data.email,
        name: data.name,
        metadata: {
          billableId: data.billableId,
          billableType: data.billableType,
          ...data.metadata,
        },
      });

      return mapStripeCustomer(customer, data.billableId, data.billableType);
    },

    async updateCustomer(id: string, data: UpdateCustomerData): Promise<Customer> {
      const stripe = initStripe();

      const customer = await stripe.customers.update(id, {
        email: data.email,
        name: data.name,
        metadata: data.metadata,
      });

      // Get billable info from existing metadata
      const billableId = customer.metadata?.billableId || '';
      const billableType = customer.metadata?.billableType || 'user';

      return mapStripeCustomer(customer, billableId, billableType);
    },

    async deleteCustomer(id: string): Promise<void> {
      const stripe = initStripe();
      await stripe.customers.del(id);
    },

    // Subscription operations
    async createSubscription(data: CreateSubscriptionData): Promise<Subscription> {
      const stripe = initStripe();

      const subscriptionItems = data.items.map((item) => ({
        price: item.priceId,
        quantity: item.quantity || 1,
      }));

      const subscription = await stripe.subscriptions.create({
        customer: data.customerId,
        items: subscriptionItems,
        trial_period_days: data.trialDays,
        metadata: data.metadata,
        expand: ['latest_invoice', 'customer'],
      });

      return mapStripeSubscription(subscription);
    },

    async updateSubscription(id: string, data: UpdateSubscriptionData): Promise<Subscription> {
      const stripe = initStripe();

      const subscription = await stripe.subscriptions.retrieve(id);

      const updateData: Stripe.SubscriptionUpdateParams = {
        metadata: data.metadata,
      };

      if (data.items && data.items.length > 0) {
        const subscriptionItems = subscription.items.data;
        updateData.items = data.items.map((item, index: number) => {
          const existingItem = subscriptionItems[index];
          return {
            id: existingItem?.id,
            price: item.priceId,
            quantity: item.quantity || 1,
          };
        });
      }

      const updatedSubscription = await stripe.subscriptions.update(id, updateData);
      return mapStripeSubscription(updatedSubscription);
    },

    async cancelSubscription(id: string, options?: CancelOptions): Promise<Subscription> {
      const stripe = initStripe();

      let subscription: Stripe.Subscription;

      if (options?.immediately) {
        subscription = await stripe.subscriptions.cancel(id);
      } else {
        subscription = await stripe.subscriptions.update(id, {
          cancel_at_period_end: true,
        });
      }

      return mapStripeSubscription(subscription);
    },

    async resumeSubscription(id: string): Promise<Subscription> {
      const stripe = initStripe();

      const subscription = await stripe.subscriptions.update(id, {
        cancel_at_period_end: false,
      });

      return mapStripeSubscription(subscription);
    },

    // Checkout/portal operations
    async createCheckoutSession(data: CheckoutSessionData): Promise<CheckoutSession> {
      const stripe = initStripe();

      const session = await stripe.checkout.sessions.create({
        customer: data.customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: data.priceId,
            quantity: data.quantity || 1,
          },
        ],
        mode: 'subscription',
        success_url: data.successUrl,
        cancel_url: data.cancelUrl,
        metadata: data.metadata,
      });

      return {
        id: session.id,
        url: session.url!,
        expiresAt: new Date(session.expires_at * 1000),
      };
    },

    async createPortalSession(customerId: string): Promise<PortalSession> {
      const stripe = initStripe();

      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
      });

      return {
        id: session.id,
        url: session.url,
      };
    },

    // Usage operations - Using Stripe's new Meter Events API
    async reportUsage(
      _subscriptionItemId: string, // Note: Not used in meter events, but kept for interface compatibility
      quantity: number,
      options?: UsageOptions
    ): Promise<UsageRecord> {
      const stripe = initStripe();

      // Stripe has moved to Meter Events API for usage-based billing
      // For Meter Events API, we need customerId instead of subscriptionItemId
      if (!options?.customerId) {
        throw new Error(
          'customerId is required for Stripe meter events. Please provide it in UsageOptions.'
        );
      }

      // Create a meter event using Stripe's new Meter Events API
      // This replaces the legacy usage records approach
      const meterEvent = await stripe.billing.meterEvents.create(
        {
          event_name: options.eventName || 'api_request', // Default event name
          payload: {
            stripe_customer_id: options.customerId, // Required for meter events
            value: quantity.toString(),
          },
          timestamp: options.timestamp
            ? Math.floor(options.timestamp.getTime() / 1000)
            : Math.floor(Date.now() / 1000),
        },
        {
          idempotencyKey: options.idempotencyKey,
        }
      );

      return {
        id: meterEvent.identifier,
        quantity: parseInt(meterEvent.payload.value, 10),
        timestamp: new Date(meterEvent.created * 1000),
      };
    },

    // Webhook handling
    constructWebhookEvent(payload: string, signature: string): WebhookEvent {
      const stripe = initStripe();

      if (!config.webhookSecret) {
        throw new Error('Webhook secret is required for webhook verification');
      }

      const event = stripe.webhooks.constructEvent(payload, signature, config.webhookSecret);

      return {
        id: event.id,
        type: event.type,
        data: event.data.object,
        timestamp: new Date(event.created * 1000),
      };
    },

    async handleWebhook(event: WebhookEvent): Promise<void> {
      // This will be called by the core billing system
      // The core system will handle database updates based on the event
      console.log(`Received Stripe webhook: ${event.type}`);
    },

    // Payment methods
    async attachPaymentMethod(customerId: string, paymentMethodId: string): Promise<PaymentMethod> {
      const stripe = initStripe();

      const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      return mapStripePaymentMethod(paymentMethod, customerId);
    },

    async detachPaymentMethod(paymentMethodId: string): Promise<void> {
      const stripe = initStripe();
      await stripe.paymentMethods.detach(paymentMethodId);
    },

    async setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<void> {
      const stripe = initStripe();

      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
    },
  };
}

// Helper functions to map Stripe objects to internal types
function mapStripeCustomer(
  customer: Stripe.Customer,
  billableId: string,
  billableType: string
): Customer {
  return {
    id: customer.id,
    billableId,
    billableType,
    providerId: 'stripe',
    providerCustomerId: customer.id,
    email: customer.email || undefined,
    metadata: customer.metadata,
    createdAt: new Date(customer.created * 1000),
    updatedAt: new Date(), // Stripe doesn't provide updated timestamp
  };
}

function mapStripeSubscription(subscription: Stripe.Subscription): Subscription {
  const firstItem = subscription.items.data[0];

  return {
    id: subscription.id,
    customerId:
      typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
    providerId: 'stripe',
    providerSubscriptionId: subscription.id,
    status: mapStripeSubscriptionStatus(subscription.status),
    productId:
      typeof firstItem.price.product === 'string'
        ? firstItem.price.product
        : firstItem.price.product?.id || '',
    priceId: firstItem.price.id,
    quantity: firstItem.quantity || undefined,
    currentPeriodStart: new Date(firstItem.current_period_start * 1000),
    currentPeriodEnd: new Date(firstItem.current_period_end * 1000),
    cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : undefined,
    canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : undefined,
    endedAt: subscription.ended_at ? new Date(subscription.ended_at * 1000) : undefined,
    trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined,
    metadata: subscription.metadata,
    createdAt: new Date(subscription.created * 1000),
    updatedAt: new Date(), // Stripe doesn't provide updated timestamp
  };
}

function mapStripeSubscriptionStatus(status: string): SubscriptionStatus {
  switch (status) {
    case 'trialing':
      return 'trialing';
    case 'active':
      return 'active';
    case 'canceled':
      return 'canceled';
    case 'incomplete':
      return 'incomplete';
    case 'incomplete_expired':
      return 'incomplete_expired';
    case 'past_due':
      return 'past_due';
    case 'unpaid':
      return 'unpaid';
    case 'paused':
      return 'paused';
    default:
      return 'active';
  }
}

function mapStripePaymentMethod(
  paymentMethod: Stripe.PaymentMethod,
  customerId: string
): PaymentMethod {
  return {
    id: paymentMethod.id,
    customerId,
    providerId: 'stripe',
    providerPaymentMethodId: paymentMethod.id,
    type: paymentMethod.type,
    last4: paymentMethod.card?.last4,
    brand: paymentMethod.card?.brand,
    isDefault: false, // Would need to check customer's default payment method
    metadata: paymentMethod.metadata || undefined,
  };
}

// Export types for better developer experience
// StripeConfig already exported above
