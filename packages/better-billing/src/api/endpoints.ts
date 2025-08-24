import { createEndpoint, createMiddleware } from 'better-call';
import type { BillingCore } from '../core/billing';
import {
  AddPaymentMethodRequestSchema,
  CancelSubscriptionRequestSchema,
  CreateCheckoutRequestSchema,
  CreateCustomerRequestSchema,
  CreatePortalRequestSchema,
  GetCustomerRequestSchema,
  GetInvoicesRequestSchema,
  GetPaymentMethodsRequestSchema,
  GetSubscriptionsRequestSchema,
  GetUsageRequestSchema,
  ReportUsageRequestSchema,
  ResumeSubscriptionRequestSchema,
  SetDefaultPaymentMethodRequestSchema,
  SubscribeRequestSchema,
  UpdateCustomerRequestSchema,
  UpdateSubscriptionRequestSchema,
} from './schemas';

// Middleware to inject billing instance
export const billingMiddleware = (billing: BillingCore) =>
  createMiddleware(async () => {
    return {
      billing,
    };
  });

// Customer endpoints
export const createCustomerEndpoint = (billing: BillingCore) =>
  createEndpoint(
    '/api/billing/customers',
    {
      method: 'POST',
      body: CreateCustomerRequestSchema,
      use: [billingMiddleware(billing)],
      metadata: {
        openapi: {
          summary: 'Create a new customer',
          description: 'Creates a new customer in the billing system',
          tags: ['Customers'],
        },
      },
    },
    async (ctx) => {
      const customer = await ctx.context.billing.createCustomer({
        billableId: ctx.body.billableId,
        billableType: ctx.body.billableType,
        email: ctx.body.email,
        metadata: { name: ctx.body.name, ...ctx.body.metadata },
      });

      return customer;
    }
  );

export const getCustomerEndpoint = (billing: BillingCore) =>
  createEndpoint(
    '/api/billing/customers',
    {
      method: 'GET',
      query: GetCustomerRequestSchema,
      use: [billingMiddleware(billing)],
      metadata: {
        openapi: {
          summary: 'Get customer details',
          description: 'Retrieves customer information by ID or billable ID',
          tags: ['Customers'],
        },
      },
    },
    async (ctx) => {
      const where = ctx.query.customerId
        ? { id: ctx.query.customerId }
        : { billableId: ctx.query.billableId! };

      const customer = await ctx.context.billing.getCustomer(where);
      if (!customer) {
        throw ctx.error(404, { message: 'Customer not found' });
      }

      return customer;
    }
  );

export const updateCustomerEndpoint = (billing: BillingCore) =>
  createEndpoint(
    '/api/billing/customers/:customerId',
    {
      method: 'PUT',
      body: UpdateCustomerRequestSchema,
      use: [billingMiddleware(billing)],
      metadata: {
        openapi: {
          summary: 'Update customer',
          description: 'Updates customer information',
          tags: ['Customers'],
        },
      },
    },
    async (ctx) => {
      const customer = await ctx.context.billing.updateCustomer(ctx.params.customerId, {
        email: ctx.body.email,
        metadata: { ...ctx.body.metadata, name: ctx.body.name },
      });

      return customer;
    }
  );

// Subscription endpoints
export const subscribeEndpoint = (billing: BillingCore) =>
  createEndpoint(
    '/api/billing/subscriptions',
    {
      method: 'POST',
      body: SubscribeRequestSchema,
      use: [billingMiddleware(billing)],
      metadata: {
        openapi: {
          summary: 'Create subscription',
          description: 'Creates a new subscription for a customer',
          tags: ['Subscriptions'],
        },
      },
    },
    async (ctx) => {
      const customer = await ctx.context.billing.getCustomer({
        id: ctx.body.customerId,
      });
      if (!customer) {
        throw ctx.error(404, { message: 'Customer not found' });
      }

      const subscription = await ctx.context.billing.createSubscription({
        customerId: ctx.body.customerId,
        priceId: ctx.body.priceId,
        quantity: ctx.body.quantity,
        productId: 'product_default', // TODO: Extract from price
        providerId: 'provider_default',
        providerSubscriptionId: `sub_${Date.now()}`,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        trialEnd: ctx.body.trialDays
          ? new Date(Date.now() + ctx.body.trialDays * 24 * 60 * 60 * 1000)
          : undefined,
      });

      return subscription;
    }
  );

export const getSubscriptionsEndpoint = (billing: BillingCore) =>
  createEndpoint(
    '/api/billing/subscriptions',
    {
      method: 'GET',
      query: GetSubscriptionsRequestSchema,
      use: [billingMiddleware(billing)],
      metadata: {
        openapi: {
          summary: 'Get subscriptions',
          description: 'Retrieves subscriptions for a customer',
          tags: ['Subscriptions'],
        },
      },
    },
    async (ctx) => {
      const where: any = { customerId: ctx.query.customerId };
      if (ctx.query.status) {
        where.status = ctx.query.status;
      }

      const subscriptions = await ctx.context.billing.getSubscriptions(where);
      return subscriptions;
    }
  );

export const updateSubscriptionEndpoint = (billing: BillingCore) =>
  createEndpoint(
    '/api/billing/subscriptions/:subscriptionId',
    {
      method: 'PUT',
      body: UpdateSubscriptionRequestSchema,
      use: [billingMiddleware(billing)],
      metadata: {
        openapi: {
          summary: 'Update subscription',
          description: 'Updates subscription details',
          tags: ['Subscriptions'],
        },
      },
    },
    async (ctx) => {
      const subscription = await ctx.context.billing.updateSubscription(ctx.params.subscriptionId, {
        priceId: ctx.body.priceId,
        quantity: ctx.body.quantity,
      });

      return subscription;
    }
  );

export const cancelSubscriptionEndpoint = (billing: BillingCore) =>
  createEndpoint(
    '/api/billing/subscriptions/:subscriptionId/cancel',
    {
      method: 'POST',
      body: CancelSubscriptionRequestSchema,
      use: [billingMiddleware(billing)],
      metadata: {
        openapi: {
          summary: 'Cancel subscription',
          description: 'Cancels a subscription',
          tags: ['Subscriptions'],
        },
      },
    },
    async (ctx) => {
      const subscription = await ctx.context.billing.cancelSubscription(
        ctx.params.subscriptionId,
        ctx.body.immediately
      );

      return subscription;
    }
  );

export const resumeSubscriptionEndpoint = (billing: BillingCore) =>
  createEndpoint(
    '/api/billing/subscriptions/:subscriptionId/resume',
    {
      method: 'POST',
      body: ResumeSubscriptionRequestSchema,
      use: [billingMiddleware(billing)],
      metadata: {
        openapi: {
          summary: 'Resume subscription',
          description: 'Resumes a cancelled subscription',
          tags: ['Subscriptions'],
        },
      },
    },
    async (ctx) => {
      const subscription = await ctx.context.billing.updateSubscription(ctx.params.subscriptionId, {
        status: 'active',
        cancelAt: undefined,
        canceledAt: undefined,
      });

      return subscription;
    }
  );

// Checkout & Portal endpoints
export const createCheckoutEndpoint = (billing: BillingCore) =>
  createEndpoint(
    '/api/billing/checkout',
    {
      method: 'POST',
      body: CreateCheckoutRequestSchema,
      use: [billingMiddleware(billing)],
      metadata: {
        openapi: {
          summary: 'Create checkout session',
          description: 'Creates a checkout session for payment',
          tags: ['Checkout'],
        },
      },
    },
    async (ctx) => {
      const provider = ctx.context.billing.paymentProvider;
      if (!provider) {
        throw ctx.error(400, { message: 'No payment provider configured' });
      }

      const checkoutSession = await provider.createCheckoutSession({
        customerId: ctx.body.customerId,
        priceId: ctx.body.priceId,
        quantity: ctx.body.quantity,
        successUrl: ctx.body.successUrl,
        cancelUrl: ctx.body.cancelUrl,
      });

      return checkoutSession;
    }
  );

export const createPortalEndpoint = (billing: BillingCore) =>
  createEndpoint(
    '/api/billing/portal',
    {
      method: 'POST',
      body: CreatePortalRequestSchema,
      use: [billingMiddleware(billing)],
      metadata: {
        openapi: {
          summary: 'Create customer portal session',
          description: 'Creates a customer portal session for self-service',
          tags: ['Portal'],
        },
      },
    },
    async (ctx) => {
      const provider = ctx.context.billing.paymentProvider;
      if (!provider) {
        throw ctx.error(400, { message: 'No payment provider configured' });
      }

      const portalSession = await provider.createPortalSession(ctx.body.customerId);
      return portalSession;
    }
  );

// Usage endpoints
export const reportUsageEndpoint = (billing: BillingCore) =>
  createEndpoint(
    '/api/billing/usage',
    {
      method: 'POST',
      body: ReportUsageRequestSchema,
      use: [billingMiddleware(billing)],
      metadata: {
        openapi: {
          summary: 'Report usage',
          description: 'Records usage data for metered billing',
          tags: ['Usage'],
        },
      },
    },
    async (ctx) => {
      const usage = await ctx.context.billing.reportUsage({
        subscriptionItemId: ctx.body.subscriptionItemId,
        customerId: 'customer_default', // TODO: Get from subscription item
        productId: 'product_default',
        quantity: ctx.body.quantity,
        timestamp: ctx.body.timestamp || new Date(),
        idempotencyKey: ctx.body.idempotencyKey,
      });

      return {
        id: usage.id,
        quantity: usage.quantity,
        timestamp: usage.timestamp,
      };
    }
  );

export const getUsageEndpoint = (billing: BillingCore) =>
  createEndpoint(
    '/api/billing/usage',
    {
      method: 'GET',
      query: GetUsageRequestSchema,
      use: [billingMiddleware(billing)],
      metadata: {
        openapi: {
          summary: 'Get usage data',
          description: 'Retrieves usage data for a subscription item',
          tags: ['Usage'],
        },
      },
    },
    async (ctx) => {
      const where: any = { subscriptionItemId: ctx.query.subscriptionItemId };

      if (ctx.query.startDate) {
        where.timestamp = { gte: ctx.query.startDate };
      }

      if (ctx.query.endDate) {
        where.timestamp = { ...where.timestamp, lte: ctx.query.endDate };
      }

      const usageRecords = await ctx.context.billing.getUsage(where);

      return usageRecords.map((u) => ({
        id: u.id,
        quantity: u.quantity,
        timestamp: u.timestamp,
      }));
    }
  );

// Invoice endpoints
export const getInvoicesEndpoint = (billing: BillingCore) =>
  createEndpoint(
    '/api/billing/invoices',
    {
      method: 'GET',
      query: GetInvoicesRequestSchema,
      use: [billingMiddleware(billing)],
      metadata: {
        openapi: {
          summary: 'Get invoices',
          description: 'Retrieves invoices for a customer',
          tags: ['Invoices'],
        },
      },
    },
    async (ctx) => {
      const where: any = { customerId: ctx.query.customerId };

      if (ctx.query.status) {
        where.status = ctx.query.status;
      }

      const invoices = await ctx.context.billing.getInvoices(where);
      return invoices;
    }
  );

export const downloadInvoiceEndpoint = (billing: BillingCore) =>
  createEndpoint(
    '/api/billing/invoices/:invoiceId/download',
    {
      method: 'GET',
      use: [billingMiddleware(billing)],
      metadata: {
        openapi: {
          summary: 'Download invoice',
          description: 'Gets download URL for an invoice',
          tags: ['Invoices'],
        },
      },
    },
    async (ctx) => {
      // TODO: Implement with provider
      return {
        url: `https://invoices.example.com/${ctx.params.invoiceId}`,
        contentType: 'application/pdf',
      };
    }
  );

// Payment Method endpoints
export const addPaymentMethodEndpoint = (billing: BillingCore) =>
  createEndpoint(
    '/api/billing/payment-methods',
    {
      method: 'POST',
      body: AddPaymentMethodRequestSchema,
      use: [billingMiddleware(billing)],
      metadata: {
        openapi: {
          summary: 'Add payment method',
          description: 'Adds a payment method to a customer',
          tags: ['Payment Methods'],
        },
      },
    },
    async (ctx) => {
      // TODO: Implement with provider
      return {
        id: `pm_${Date.now()}`,
        customerId: ctx.body.customerId,
        providerId: 'provider_default',
        providerPaymentMethodId: ctx.body.paymentMethodId,
        type: 'card',
        last4: '4242',
        brand: 'visa',
        isDefault: ctx.body.setDefault,
      };
    }
  );

export const removePaymentMethodEndpoint = (billing: BillingCore) =>
  createEndpoint(
    '/api/billing/payment-methods/:paymentMethodId',
    {
      method: 'DELETE',
      use: [billingMiddleware(billing)],
      metadata: {
        openapi: {
          summary: 'Remove payment method',
          description: 'Removes a payment method from a customer',
          tags: ['Payment Methods'],
        },
      },
    },
    async () => {
      // TODO: Implement with provider
      return { success: true };
    }
  );

export const setDefaultPaymentMethodEndpoint = (billing: BillingCore) =>
  createEndpoint(
    '/api/billing/payment-methods/:paymentMethodId/default',
    {
      method: 'POST',
      body: SetDefaultPaymentMethodRequestSchema,
      use: [billingMiddleware(billing)],
      metadata: {
        openapi: {
          summary: 'Set default payment method',
          description: 'Sets a payment method as default for a customer',
          tags: ['Payment Methods'],
        },
      },
    },
    async (ctx) => {
      // TODO: Implement with provider
      return {
        id: ctx.params.paymentMethodId,
        customerId: ctx.body.customerId,
        providerId: 'provider_default',
        providerPaymentMethodId: ctx.params.paymentMethodId,
        type: 'card',
        last4: '4242',
        brand: 'visa',
        isDefault: true,
      };
    }
  );

export const getPaymentMethodsEndpoint = (billing: BillingCore) =>
  createEndpoint(
    '/api/billing/payment-methods',
    {
      method: 'GET',
      query: GetPaymentMethodsRequestSchema,
      use: [billingMiddleware(billing)],
      metadata: {
        openapi: {
          summary: 'Get payment methods',
          description: 'Retrieves payment methods for a customer',
          tags: ['Payment Methods'],
        },
      },
    },
    async (ctx) => {
      const paymentMethods = await ctx.context.billing.getPaymentMethods({
        customerId: ctx.query.customerId,
      });

      return paymentMethods;
    }
  );

// Webhook endpoint
export const handleWebhookEndpoint = (billing: BillingCore) =>
  createEndpoint(
    '/api/billing/webhooks',
    {
      method: 'POST',
      requireHeaders: true,
      use: [billingMiddleware(billing)],
      metadata: {
        openapi: {
          summary: 'Handle webhook',
          description: 'Processes webhooks from payment providers',
          tags: ['Webhooks'],
        },
      },
    },
    async (ctx) => {
      const provider = ctx.context.billing.paymentProvider;
      if (!provider) {
        throw ctx.error(400, { message: 'No payment provider configured' });
      }

      const signature = ctx.headers.get('x-webhook-signature') || 
                        ctx.headers.get('stripe-signature') || '';
      const body = ctx.request ? await ctx.request.text() : '';

      try {
        // Construct and verify webhook event
        const event = provider.constructWebhookEvent(body, signature);
        
        // Handle the webhook event
        await provider.handleWebhook(event);

        return {
          success: true,
          message: 'Webhook processed successfully',
        };
      } catch (error) {
        console.error('Webhook processing error:', error);
        throw ctx.error(400, { 
          message: 'Invalid webhook signature or payload',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );
