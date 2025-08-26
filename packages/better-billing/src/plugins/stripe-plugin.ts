import type { Stripe } from 'stripe';
import { createBillingEndpoint } from '../core/endpoints';
import type { BetterBillingRef, BillingPlugin } from '../types';
import type {
  CancelOptions,
  CheckoutSession,
  CreateCheckoutSessionData,
  CreateCustomerData,
  CreateSubscriptionData,
  Customer,
  PaymentMethod,
  PortalSession,
  Subscription,
  UpdateCustomerData,
  UpdateSubscriptionData,
} from '../types/core-api-types';

export interface StripePluginOptions {
  stripe: Stripe;
  webhookSecret?: string;
}

export const stripePlugin = ({ stripe, webhookSecret }: StripePluginOptions) => {
  return (ref: BetterBillingRef) => {
    const plugin = {
      id: 'stripe' as const,

      providers: {
        stripe: {
          id: 'stripe',
          name: 'Stripe',

          async createCustomer(data: CreateCustomerData): Promise<Customer> {
            const customer = await stripe.customers.create({
              email: data.email,
              name: data.name,
              metadata: {
                billableId: data.billableId,
                billableType: data.billableType,
                ...data.metadata,
              },
            });

            return {
              id: customer.id,
              billableId: data.billableId,
              billableType: data.billableType,
              providerId: 'stripe',
              providerCustomerId: customer.id,
              email: customer.email || undefined,
              metadata: customer.metadata || undefined,
              createdAt: new Date(customer.created * 1000),
              updatedAt: new Date(customer.created * 1000),
            };
          },

          async updateCustomer(id: string, data: UpdateCustomerData): Promise<Customer> {
            const customer = await stripe.customers.update(id, {
              email: data.email,
              name: data.name,
              metadata: data.metadata,
            });

            return {
              id: customer.id,
              billableId: customer.metadata?.billableId || '',
              billableType: customer.metadata?.billableType || '',
              providerId: 'stripe',
              providerCustomerId: customer.id,
              email: customer.email || undefined,
              metadata: customer.metadata || undefined,
              createdAt: new Date(customer.created * 1000),
              updatedAt: new Date(),
            };
          },

          async deleteCustomer(id: string): Promise<void> {
            await stripe.customers.del(id);
          },

          async createSubscription(data: CreateSubscriptionData): Promise<Subscription> {
            const subscription = await stripe.subscriptions.create({
              customer: data.customerId,
              items: data.items.map((item) => ({
                price: item.priceId,
                quantity: item.quantity || 1,
              })),
              trial_period_days: data.trialDays,
              metadata: data.metadata,
            });

            return {
              id: subscription.id,
              customerId: subscription.customer as string,
              providerId: 'stripe',
              providerSubscriptionId: subscription.id,
              status: subscription.status as any,
              productId: (subscription.items.data[0]?.price.product as string) || '',
              priceId: subscription.items.data[0]?.price.id || '',
              quantity: subscription.items.data[0]?.quantity || 1,
              currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
              currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
              cancelAt: subscription.cancel_at
                ? new Date(subscription.cancel_at * 1000)
                : undefined,
              canceledAt: subscription.canceled_at
                ? new Date(subscription.canceled_at * 1000)
                : undefined,
              endedAt: subscription.ended_at ? new Date(subscription.ended_at * 1000) : undefined,
              trialEnd: subscription.trial_end
                ? new Date(subscription.trial_end * 1000)
                : undefined,
              metadata: subscription.metadata || undefined,
              createdAt: new Date(subscription.created * 1000),
              updatedAt: new Date(subscription.created * 1000),
            };
          },

          async updateSubscription(
            id: string,
            data: UpdateSubscriptionData
          ): Promise<Subscription> {
            const updateParams: any = {};

            if (data.items) {
              updateParams.items = data.items.map((item) => ({
                price: item.priceId,
                quantity: item.quantity || 1,
              }));
            }

            if (data.metadata) {
              updateParams.metadata = data.metadata;
            }

            const subscription = await stripe.subscriptions.update(id, updateParams);

            return {
              id: subscription.id,
              customerId: subscription.customer as string,
              providerId: 'stripe',
              providerSubscriptionId: subscription.id,
              status: subscription.status as any,
              productId: (subscription.items.data[0]?.price.product as string) || '',
              priceId: subscription.items.data[0]?.price.id || '',
              quantity: subscription.items.data[0]?.quantity || 1,
              currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
              currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
              cancelAt: subscription.cancel_at
                ? new Date(subscription.cancel_at * 1000)
                : undefined,
              canceledAt: subscription.canceled_at
                ? new Date(subscription.canceled_at * 1000)
                : undefined,
              endedAt: subscription.ended_at ? new Date(subscription.ended_at * 1000) : undefined,
              trialEnd: subscription.trial_end
                ? new Date(subscription.trial_end * 1000)
                : undefined,
              metadata: subscription.metadata || undefined,
              createdAt: new Date(subscription.created * 1000),
              updatedAt: new Date(),
            };
          },

          async cancelSubscription(id: string, options?: CancelOptions): Promise<Subscription> {
            const subscription = await stripe.subscriptions.update(id, {
              cancel_at_period_end: options?.atPeriodEnd ?? true,
            });

            return {
              id: subscription.id,
              customerId: subscription.customer as string,
              providerId: 'stripe',
              providerSubscriptionId: subscription.id,
              status: subscription.status as any,
              productId: (subscription.items.data[0]?.price.product as string) || '',
              priceId: subscription.items.data[0]?.price.id || '',
              quantity: subscription.items.data[0]?.quantity || 1,
              currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
              currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
              cancelAt: subscription.cancel_at
                ? new Date(subscription.cancel_at * 1000)
                : undefined,
              canceledAt: subscription.canceled_at
                ? new Date(subscription.canceled_at * 1000)
                : undefined,
              endedAt: subscription.ended_at ? new Date(subscription.ended_at * 1000) : undefined,
              trialEnd: subscription.trial_end
                ? new Date(subscription.trial_end * 1000)
                : undefined,
              metadata: subscription.metadata || undefined,
              createdAt: new Date(subscription.created * 1000),
              updatedAt: new Date(),
            };
          },

          async resumeSubscription(id: string): Promise<Subscription> {
            const subscription = await stripe.subscriptions.update(id, {
              cancel_at_period_end: false,
            });

            return {
              id: subscription.id,
              customerId: subscription.customer as string,
              providerId: 'stripe',
              providerSubscriptionId: subscription.id,
              status: subscription.status as any,
              productId: (subscription.items.data[0]?.price.product as string) || '',
              priceId: subscription.items.data[0]?.price.id || '',
              quantity: subscription.items.data[0]?.quantity || 1,
              currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
              currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
              cancelAt: subscription.cancel_at
                ? new Date(subscription.cancel_at * 1000)
                : undefined,
              canceledAt: subscription.canceled_at
                ? new Date(subscription.canceled_at * 1000)
                : undefined,
              endedAt: subscription.ended_at ? new Date(subscription.ended_at * 1000) : undefined,
              trialEnd: subscription.trial_end
                ? new Date(subscription.trial_end * 1000)
                : undefined,
              metadata: subscription.metadata || undefined,
              createdAt: new Date(subscription.created * 1000),
              updatedAt: new Date(),
            };
          },

          async createCheckoutSession(data: CreateCheckoutSessionData): Promise<CheckoutSession> {
            // Handle plan-based checkout by resolving planId to priceId
            let priceId = data.priceId;
            let metadata = { ...data.metadata };

            if (data.planId && !priceId) {
              // Get the billing configuration to lookup the plan
              const billingConfig = ref.current.config;
              const plan = billingConfig.plans?.[data.planId];

              if (!plan) {
                throw new Error(`Plan "${data.planId}" not found in billing configuration`);
              }

              priceId = plan.priceId;

              // Merge plan metadata and callback data
              metadata = {
                ...metadata,
                planId: data.planId,
                planName: plan.name,
                ...plan.metadata,
                ...data.callbackData,
              };
            }

            if (!priceId) {
              throw new Error(
                'Either priceId or planId must be provided for checkout session creation'
              );
            }

            const session = await stripe.checkout.sessions.create({
              customer: data.customerId,
              line_items: [
                {
                  price: priceId,
                  quantity: data.quantity || 1,
                },
              ],
              mode: 'subscription',
              success_url: data.successUrl,
              cancel_url: data.cancelUrl,
              metadata,
            });

            return {
              id: session.id,
              url: session.url || '',
              expiresAt: new Date(session.expires_at * 1000),
            };
          },

          async createPortalSession(customerId: string): Promise<PortalSession> {
            const session = await stripe.billingPortal.sessions.create({
              customer: customerId,
            });

            return {
              id: session.id,
              url: session.url,
            };
          },

          async attachPaymentMethod(
            customerId: string,
            paymentMethodId: string
          ): Promise<PaymentMethod> {
            const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
              customer: customerId,
            });

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
          },

          async detachPaymentMethod(paymentMethodId: string): Promise<void> {
            await stripe.paymentMethods.detach(paymentMethodId);
          },

          async setDefaultPaymentMethod(
            customerId: string,
            paymentMethodId: string
          ): Promise<void> {
            await stripe.customers.update(customerId, {
              invoice_settings: {
                default_payment_method: paymentMethodId,
              },
            });
          },
        },
      },

      endpoints: {
        stripeWebhook: createBillingEndpoint(
          '/stripe/webhook',
          {
            method: 'POST',
          },
          async (ctx) => {
            const signature = ctx.request?.headers.get('stripe-signature');
            if (!signature) {
              return new Response(JSON.stringify({ error: 'Missing Stripe signature header' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
              });
            }

            const payload = await ctx.request?.text();
            if (!payload) {
              return new Response(JSON.stringify({ error: 'Missing Stripe payload' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
              });
            }

            try {
              // Verify the webhook signature
              if (!webhookSecret) {
                throw new Error('Webhook secret is required for signature verification');
              }

              const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
              const adapter = ref.current.config.database;

              // Handle different webhook event types with proper upsert logic
              switch (event.type) {
                case 'customer.subscription.created':
                case 'customer.subscription.updated': {
                  const subscription = event.data.object as Stripe.Subscription;
                  const customerId = subscription.customer as string;

                  const subscriptionData = {
                    id: subscription.id,
                    customerId,
                    providerId: 'stripe' as const,
                    providerSubscriptionId: subscription.id,
                    status: subscription.status as any,
                    productId: (subscription.items.data[0]?.price.product as string) || '',
                    priceId: subscription.items.data[0]?.price.id || '',
                    quantity: subscription.items.data[0]?.quantity || 1,
                    currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
                    currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
                    cancelAt: subscription.cancel_at
                      ? new Date(subscription.cancel_at * 1000)
                      : undefined,
                    canceledAt: subscription.canceled_at
                      ? new Date(subscription.canceled_at * 1000)
                      : undefined,
                    endedAt: subscription.ended_at
                      ? new Date(subscription.ended_at * 1000)
                      : undefined,
                    trialEnd: subscription.trial_end
                      ? new Date(subscription.trial_end * 1000)
                      : undefined,
                    metadata: subscription.metadata || undefined,
                    createdAt: new Date(subscription.created * 1000),
                    updatedAt: new Date(),
                  };

                  // Try to get existing subscription first (upsert pattern)
                  const existing = await adapter.findOne('subscription', [
                    { field: 'id', value: subscription.id, operator: 'eq' },
                  ]);

                  if (existing) {
                    // Update existing subscription
                    await adapter.update(
                      'subscription',
                      [{ field: 'id', value: subscription.id, operator: 'eq' }],
                      subscriptionData
                    );
                    console.log(`Updated subscription ${subscription.id}`);
                  } else {
                    // Create new subscription
                    await adapter.create('subscription', subscriptionData);
                    console.log(`Created subscription ${subscription.id}`);
                  }
                  break;
                }

                case 'customer.subscription.deleted': {
                  const subscription = event.data.object as Stripe.Subscription;

                  // Try to get existing subscription first
                  const existing = await adapter.findOne('subscription', [
                    { field: 'id', value: subscription.id, operator: 'eq' },
                  ]);

                  if (existing) {
                    // Update subscription to mark as deleted/canceled
                    await adapter.update(
                      'subscription',
                      [{ field: 'id', value: subscription.id, operator: 'eq' }],
                      {
                        status: 'canceled',
                        canceledAt: new Date(),
                        endedAt: new Date(),
                        updatedAt: new Date(),
                      }
                    );
                    console.log(`Marked subscription ${subscription.id} as canceled`);
                  }
                  break;
                }

                case 'invoice.payment_succeeded': {
                  const invoice = event.data.object as Stripe.Invoice;

                  if ((invoice as any).subscription) {
                    const existing = await adapter.findOne('subscription', [
                      {
                        field: 'providerSubscriptionId',
                        value: (invoice as any).subscription as string,
                        operator: 'eq',
                      },
                    ]);

                    if (existing && (existing as any).status !== 'active') {
                      await adapter.update(
                        'subscription',
                        [{ field: 'id', value: (existing as any).id, operator: 'eq' }],
                        {
                          status: 'active',
                          updatedAt: new Date(),
                        }
                      );
                      console.log(`Updated subscription to active after payment success`);
                    }
                  }
                  break;
                }

                case 'invoice.payment_failed': {
                  const invoice = event.data.object as Stripe.Invoice;

                  if ((invoice as any).subscription) {
                    const existing = await adapter.findOne('subscription', [
                      {
                        field: 'providerSubscriptionId',
                        value: (invoice as any).subscription as string,
                        operator: 'eq',
                      },
                    ]);

                    if (existing) {
                      await adapter.update(
                        'subscription',
                        [{ field: 'id', value: (existing as any).id, operator: 'eq' }],
                        {
                          status: 'past_due',
                          updatedAt: new Date(),
                        }
                      );
                      console.log(`Updated subscription to past_due after payment failure`);
                    }
                  }
                  break;
                }

                case 'customer.created':
                case 'customer.updated': {
                  const customer = event.data.object as Stripe.Customer;

                  // Only process if customer has billing metadata
                  if (customer.metadata?.billableId && customer.metadata?.billableType) {
                    const customerData = {
                      id: customer.id,
                      billableId: customer.metadata.billableId,
                      billableType: customer.metadata.billableType,
                      providerId: 'stripe' as const,
                      providerCustomerId: customer.id,
                      email: customer.email || undefined,
                      metadata: customer.metadata || undefined,
                      createdAt: new Date(customer.created * 1000),
                      updatedAt: new Date(),
                    };

                    // Try to get existing customer first (upsert pattern)
                    const existing = await adapter.findOne('customer', [
                      { field: 'id', value: customer.id, operator: 'eq' },
                    ]);

                    if (existing) {
                      // Update existing customer
                      await adapter.update(
                        'customer',
                        [{ field: 'id', value: customer.id, operator: 'eq' }],
                        customerData
                      );
                      console.log(`Updated customer ${customer.id}`);
                    } else {
                      // Create new customer
                      await adapter.create('customer', customerData);
                      console.log(`Created customer ${customer.id}`);
                    }
                  }
                  break;
                }

                case 'customer.deleted': {
                  const customer = event.data.object as Stripe.Customer;

                  const existing = await adapter.findOne('customer', [
                    { field: 'id', value: customer.id, operator: 'eq' },
                  ]);

                  if (existing) {
                    // Delete the customer record
                    await adapter.delete('customer', [
                      { field: 'id', value: customer.id, operator: 'eq' },
                    ]);
                    console.log(`Deleted customer ${customer.id}`);
                  }
                  break;
                }

                default:
                  console.log(`Unhandled webhook event type: ${event.type}`);
              }

              return new Response(JSON.stringify({ received: true }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              });
            } catch (error) {
              console.error('Webhook processing failed:', error);
              return new Response(
                JSON.stringify({
                  error: error instanceof Error ? error.message : 'Webhook processing failed',
                }),
                {
                  status: 400,
                  headers: { 'Content-Type': 'application/json' },
                }
              );
            }
          }
        ),
      },
    } satisfies BillingPlugin;

    return plugin;
  };
};

export type StripePlugin = ReturnType<typeof stripePlugin>;
