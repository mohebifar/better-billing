import type { WhereMaybeArray } from '../adapters/types';
import { createBillingEndpoint } from '../core/endpoints';
import type { HookManager } from '../core/hooks';
import type { BillingPlugin, DatabaseAdapter, PaymentProvider } from '../types';
import type {
  CancelOptions,
  CheckoutCallbackResponse,
  CheckoutSession,
  CreateCheckoutSessionData,
  CreateCustomerData,
  CreateSubscriptionData,
  Customer,
  Subscription,
  SubscriptionStatus,
  UpdateCustomerData,
  UpdateSubscriptionData,
} from '../types/core-api-types';

interface CorePluginContext {
  getProvider: () => PaymentProvider;
  hookManager: HookManager;
}

export const corePlugin = (database: DatabaseAdapter, context: CorePluginContext) => {
  return {
    id: 'core' as const,
    schema: {
      customer: {
        fields: {
          id: { type: 'string', required: true },
          billableId: { type: 'string', required: true }, // The id of the billable model
          billableType: { type: 'string', required: true }, // The type of the billable model
          providerId: { type: 'string', required: true },
          providerCustomerId: { type: 'string', required: true },
          email: { type: 'string' },
          metadata: { type: 'json' },
          createdAt: { type: 'date', required: true },
          updatedAt: { type: 'date', required: true },
        },
      },
      subscription: {
        fields: {
          id: { type: 'string', required: true },
          customerId: { type: 'string', required: true },
          providerId: { type: 'string', required: true },
          providerSubscriptionId: { type: 'string', required: true },
          status: { type: 'string', required: true },
          productId: { type: 'string', required: true },
          priceId: { type: 'string', required: true },
          quantity: { type: 'number' },
          currentPeriodStart: { type: 'date', required: true },
          currentPeriodEnd: { type: 'date', required: true },
          cancelAt: { type: 'date' },
          canceledAt: { type: 'date' },
          endedAt: { type: 'date' },
          trialEnd: { type: 'date' },
          metadata: { type: 'json' },
          createdAt: { type: 'date', required: true },
          updatedAt: { type: 'date', required: true },
        },
      },
      subscriptionItem: {
        fields: {
          id: { type: 'string', required: true },
          subscriptionId: { type: 'string', required: true },
          productId: { type: 'string', required: true },
          priceId: { type: 'string', required: true },
          quantity: { type: 'number', required: true },
          metadata: { type: 'json' },
        },
      },
      invoice: {
        fields: {
          id: { type: 'string', required: true },
          customerId: { type: 'string', required: true },
          subscriptionId: { type: 'string' },
          providerId: { type: 'string', required: true },
          providerInvoiceId: { type: 'string', required: true },
          number: { type: 'string', required: true },
          status: { type: 'string', required: true },
          amount: { type: 'number', required: true },
          currency: { type: 'string', required: true },
          paidAt: { type: 'date' },
          dueDate: { type: 'date' },
          metadata: { type: 'json' },
          createdAt: { type: 'date', required: true },
        },
      },
      paymentMethod: {
        fields: {
          id: { type: 'string', required: true },
          customerId: { type: 'string', required: true },
          providerId: { type: 'string', required: true },
          providerPaymentMethodId: { type: 'string', required: true },
          type: { type: 'string', required: true },
          last4: { type: 'string' },
          brand: { type: 'string' },
          isDefault: { type: 'boolean', required: true },
          metadata: { type: 'json' },
        },
      },
    },
    methods: {
      createCustomer: async (data: CreateCustomerData): Promise<Customer> => {
        // Call beforeCustomerCreate hook
        await context.hookManager.runHook('beforeCustomerCreate', { data });

        // Get the provider and delegate the creation
        const provider = context.getProvider();
        const customer = await provider.createCustomer(data);

        // Store in database
        await database.create('customer', {
          id: customer.id,
          billableId: customer.billableId,
          billableType: customer.billableType,
          providerId: customer.providerId,
          providerCustomerId: customer.providerCustomerId,
          email: customer.email,
          metadata: customer.metadata,
          createdAt: customer.createdAt,
          updatedAt: customer.updatedAt,
        });

        // Call afterCustomerCreate hook
        await context.hookManager.runHook('afterCustomerCreate', { customer });

        return customer;
      },

      updateCustomer: async (id: string, data: UpdateCustomerData): Promise<Customer> => {
        // Get existing customer from database
        const existingCustomer = await database.findOne<Customer>('customer', [
          { field: 'id', value: id },
        ]);
        if (!existingCustomer) {
          throw new Error(`Customer ${id} not found`);
        }

        // Update via provider
        const provider = context.getProvider();
        const updatedCustomer = await provider.updateCustomer(
          existingCustomer.providerCustomerId,
          data
        );

        // Update in database
        await database.update('customer', [{ field: 'id', value: id }], {
          email: updatedCustomer.email,
          metadata: updatedCustomer.metadata,
          updatedAt: new Date(),
        });

        return updatedCustomer;
      },

      deleteCustomer: async (id: string): Promise<void> => {
        // Get existing customer from database
        const existingCustomer = await database.findOne<Customer>('customer', [
          { field: 'id', value: id },
        ]);
        if (!existingCustomer) {
          throw new Error(`Customer ${id} not found`);
        }

        // Delete via provider
        const provider = context.getProvider();
        await provider.deleteCustomer(existingCustomer.providerCustomerId);

        // Delete from database
        await database.delete('customer', [{ field: 'id', value: id }]);
      },

      getCustomer: async (id: string): Promise<Customer | null> => {
        const customer = await database.findOne<Customer>('customer', [{ field: 'id', value: id }]);
        return customer;
      },

      listCustomers: async (where?: WhereMaybeArray): Promise<Customer[]> => {
        const customers = await database.findMany<Customer>('customer', where);
        return customers;
      },

      createSubscription: async (data: CreateSubscriptionData): Promise<Subscription> => {
        // Call beforeSubscribe hook
        await context.hookManager.runHook('beforeSubscribe', { data });

        // Get the provider and delegate the creation
        const provider = context.getProvider();
        const subscription = await provider.createSubscription(data);

        // Store in database
        await database.create('subscription', {
          id: subscription.id,
          customerId: subscription.customerId,
          providerId: subscription.providerId,
          providerSubscriptionId: subscription.providerSubscriptionId,
          status: subscription.status,
          productId: subscription.productId,
          priceId: subscription.priceId,
          quantity: subscription.quantity,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          cancelAt: subscription.cancelAt,
          canceledAt: subscription.canceledAt,
          endedAt: subscription.endedAt,
          trialEnd: subscription.trialEnd,
          metadata: subscription.metadata,
          createdAt: subscription.createdAt,
          updatedAt: subscription.updatedAt,
        });

        // Call afterSubscribe hook
        await context.hookManager.runHook('afterSubscribe', { subscription });

        return subscription;
      },

      updateSubscription: async (
        id: string,
        data: UpdateSubscriptionData
      ): Promise<Subscription> => {
        // Get existing subscription from database
        const existingSubscription = await database.findOne<Subscription>('subscription', [
          { field: 'id', value: id },
        ]);
        if (!existingSubscription) {
          throw new Error(`Subscription ${id} not found`);
        }

        // Update via provider
        const provider = context.getProvider();
        const updatedSubscription = await provider.updateSubscription(
          existingSubscription.providerSubscriptionId,
          data
        );

        // Update in database
        await database.update('subscription', [{ field: 'id', value: id }], {
          status: updatedSubscription.status,
          quantity: updatedSubscription.quantity,
          metadata: updatedSubscription.metadata,
          updatedAt: new Date(),
        });

        return updatedSubscription;
      },

      cancelSubscription: async (id: string, options?: CancelOptions): Promise<Subscription> => {
        // Get existing subscription from database
        const existingSubscription = await database.findOne<Subscription>('subscription', [
          { field: 'id', value: id },
        ]);
        if (!existingSubscription) {
          throw new Error(`Subscription ${id} not found`);
        }

        // Cancel via provider
        const provider = context.getProvider();
        const canceledSubscription = await provider.cancelSubscription(
          existingSubscription.providerSubscriptionId,
          options
        );

        // Update in database
        await database.update('subscription', [{ field: 'id', value: id }], {
          status: canceledSubscription.status,
          cancelAt: canceledSubscription.cancelAt,
          canceledAt: canceledSubscription.canceledAt,
          updatedAt: new Date(),
        });

        return canceledSubscription;
      },

      resumeSubscription: async (id: string): Promise<Subscription> => {
        // Get existing subscription from database
        const existingSubscription = await database.findOne<Subscription>('subscription', [
          { field: 'id', value: id },
        ]);
        if (!existingSubscription) {
          throw new Error(`Subscription ${id} not found`);
        }

        // Resume via provider
        const provider = context.getProvider();
        const resumedSubscription = await provider.resumeSubscription(
          existingSubscription.providerSubscriptionId
        );

        // Update in database
        await database.update('subscription', [{ field: 'id', value: id }], {
          status: resumedSubscription.status,
          cancelAt: null,
          updatedAt: new Date(),
        });

        return resumedSubscription;
      },

      getSubscription: async (id: string): Promise<Subscription | null> => {
        const subscription = await database.findOne<Subscription>('subscription', [
          { field: 'id', value: id },
        ]);
        return subscription;
      },

      listSubscriptions: async (where?: WhereMaybeArray): Promise<Subscription[]> => {
        const subscriptions = await database.findMany<Subscription>('subscription', where);
        return subscriptions;
      },

      // New methods for subscription plan management
      createCheckoutSession: async (data: CreateCheckoutSessionData): Promise<CheckoutSession> => {
        // Validate that either priceId or planId is provided
        if (!data.priceId && !data.planId) {
          throw new Error(
            'Either priceId or planId must be provided for checkout session creation'
          );
        }

        // If planId is provided, we need access to billing config to resolve it
        // For now, we'll let the provider handle plan resolution
        // This is consistent with how Stripe plugin works

        // Get the provider and delegate the creation
        const provider = context.getProvider();
        const checkoutSession = await provider.createCheckoutSession(data);

        return checkoutSession;
      },

      getActiveSubscriptions: async (customerId: string): Promise<Subscription[]> => {
        const activeStatuses: SubscriptionStatus[] = ['active', 'trialing'];
        const subscriptions = await database.findMany<Subscription>('subscription', [
          { field: 'customerId', value: customerId },
          { field: 'status', value: activeStatuses, operator: 'in' },
        ]);
        return subscriptions;
      },
    },
    endpoints: {
      healthCheck: createBillingEndpoint(
        '/health',
        {
          method: 'GET',
        },
        async (_ctx) => {
          return new Response(JSON.stringify({ status: 'ok' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      ),

      checkoutSuccess: createBillingEndpoint(
        '/billing/checkout/success',
        {
          method: 'GET',
        },
        async (ctx) => {
          if (!ctx.request) {
            return new Response(JSON.stringify({ success: false, message: 'Invalid request' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            });
          }

          const url = new URL(ctx.request.url);
          const sessionId = url.searchParams.get('session_id');

          if (!sessionId) {
            return new Response(JSON.stringify({ success: false, message: 'Missing session_id' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            });
          }

          // Here we would typically:
          // 1. Retrieve the checkout session from the provider
          // 2. Extract callback data and other relevant information
          // 3. Process any post-checkout actions
          // 4. Return success response with optional redirect

          const response: CheckoutCallbackResponse = {
            success: true,
            message: 'Checkout completed successfully',
          };

          return new Response(JSON.stringify(response), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      ),

      checkoutCancel: createBillingEndpoint(
        '/billing/checkout/cancel',
        {
          method: 'GET',
        },
        async (ctx) => {
          if (!ctx.request) {
            return new Response(JSON.stringify({ success: false, message: 'Invalid request' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            });
          }

          const url = new URL(ctx.request.url);
          const sessionId = url.searchParams.get('session_id');

          if (!sessionId) {
            return new Response(JSON.stringify({ success: false, message: 'Missing session_id' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            });
          }

          // Here we would typically:
          // 1. Log the cancellation
          // 2. Clean up any temporary data
          // 3. Return cancel response with optional redirect

          const response: CheckoutCallbackResponse = {
            success: false,
            message: 'Checkout was cancelled',
          };

          return new Response(JSON.stringify(response), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      ),
    },
  } satisfies BillingPlugin;
};

export type CorePlugin = ReturnType<typeof corePlugin>;
