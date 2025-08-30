import { createEndpoint } from "better-call";
import type { Stripe } from "stripe";
import { z } from "zod";

import { createPlugin } from "../../plugin-factory";
import type {
  CheckoutSession,
  CheckoutSessionCreateParams,
  CustomerUpsertParams,
  Invoice,
  InvoiceGetParams,
  Subscription,
  SubscriptionCancelParams,
  SubscriptionCreateParams,
  SubscriptionGetParams,
  SubscriptionUpdateParams,
} from "../../types/payment-provider-interfaces";
import { $corePluginType } from "../core";
import { findPlanByItem } from "./utils";

export interface StripeSubscriptionPlan<PlanName extends string> {
  planName: PlanName;
  items: Stripe.SubscriptionCreateParams.Item[];
  trialDays?: number;
}

export type StripeSubscriptionByCadence<PlanName extends string> = Record<
  "monthly" | "yearly",
  StripeSubscriptionPlan<PlanName>[]
>;

export interface StripePluginOptions<PlanName extends string> {
  stripe: Stripe;
  subscriptionPlans: StripeSubscriptionByCadence<PlanName>;
  postSuccessUrl?: string;
  postCancelUrl?: string;
  webhookEndpointSecret?: string;
}

export const stripePlugin = <PlanName extends string>({
  stripe,
  subscriptionPlans,
  postSuccessUrl,
  postCancelUrl,
  webhookEndpointSecret,
}: StripePluginOptions<PlanName>) => {
  const planToStripeMap = new Map(
    Object.entries(subscriptionPlans).map(([cadence, plans]) => [
      cadence,
      new Map(
        Object.entries(plans).map(([planName, plan]) => [planName, plan])
      ),
    ])
  );

  const plugin = createPlugin(
    (ogDeps) => {
      return {
        providers: [
          // Customer Management
          {
            capability: "customer" as const,
            providerId: "stripe" as const,
            methods: {
              upsertCustomer: async (params: CustomerUpsertParams) => {
                const existingCustomer = await ogDeps.db.findOne("billables", {
                  type: "and",
                  value: [
                    {
                      field: "billableId",
                      value: { type: "literal", value: params.billableId },
                    },
                    {
                      field: "billableType",
                      value: { type: "literal", value: params.billableType },
                    },
                    {
                      field: "provider",
                      value: { type: "literal", value: "stripe" },
                    },
                  ],
                });

                if (existingCustomer) {
                  return existingCustomer;
                }

                const stripeCustomer = await stripe.customers.create({
                  email: params.email,
                  metadata: params.metadata,
                });

                const billable = await ogDeps.db.create("billables", {
                  billableId: params.billableId,
                  billableType: params.billableType,
                  provider: "stripe",
                  providerBillableId: stripeCustomer.id,
                  email: params.email,
                  metadata: params.metadata,
                });

                await stripe.customers.update(stripeCustomer.id, {
                  metadata: {
                    billableId: billable.id,
                  },
                });

                return billable;
              },
            },
          },

          // Subscription Management
          {
            capability: "subscription" as const,
            providerId: "stripe" as const,
            methods: {
              createSubscription: async (
                params: SubscriptionCreateParams
              ): Promise<Subscription> => {
                const deps = ogDeps.withExtras<typeof plugin>();
                const billable = await deps.providers.stripe.upsertCustomer({
                  billableId: params.billableId,
                  billableType: params.billableType,
                  email: params.email,
                  metadata: params.metadata,
                });

                if (!billable) {
                  throw new Error(`Billable not found: ${params.billableId}`);
                }

                const plan = planToStripeMap
                  .get(params.cadence)
                  ?.get(params.planName);

                if (!plan) {
                  throw new Error(
                    `No Stripe price ID found for plan: ${params.planName} cadence: ${params.cadence}`
                  );
                }

                const stripeSubscription = await stripe.subscriptions.create({
                  customer: billable.providerBillableId,
                  items: plan.items,
                  trial_period_days: plan.trialDays,
                  trial_settings: {
                    end_behavior: {
                      missing_payment_method: "cancel",
                    },
                  },
                });

                const subscription = await ogDeps.db.create("subscriptions", {
                  billableId: billable.id,
                  planName: params.planName,
                  cadence: params.cadence,
                  provider: "stripe",
                  providerId: stripeSubscription.id,
                  status: stripeSubscription.status,
                  metadata: params.metadata,
                });

                return subscription;
              },

              cancelSubscription: async (
                params: SubscriptionCancelParams
              ): Promise<Subscription> => {
                return ogDeps.db.transaction(async (tx) => {
                  const subscription = await tx.findOne("subscriptions", {
                    type: "and",
                    value: [
                      {
                        field: "providerId",
                        value: {
                          type: "literal",
                          value: params.subscriptionId,
                        },
                      },
                      {
                        field: "provider",
                        value: { type: "literal", value: "stripe" },
                      },
                    ],
                  });

                  if (!subscription || !subscription.providerId) {
                    throw new Error(
                      `Stripe subscription not found for subscription: ${params.subscriptionId}`
                    );
                  }

                  const stripeSubscription =
                    await stripe.subscriptions.retrieve(
                      subscription.providerId
                    );

                  if (stripeSubscription.status !== "active") {
                    throw new Error(
                      `Stripe subscription is not active: ${params.subscriptionId}`
                    );
                  }

                  const stripeSubscriptionAfterCancel =
                    await stripe.subscriptions.cancel(subscription.providerId, {
                      prorate: params.prorate,
                      cancellation_details: {
                        comment: params.cancellationReason,
                      },
                    });

                  const firstLineItem =
                    stripeSubscriptionAfterCancel.items.data[0];

                  await tx.update(
                    "subscriptions",
                    {
                      field: "id",
                      value: { type: "literal", value: subscription.id },
                    },
                    {
                      status: stripeSubscriptionAfterCancel.status,
                      currentPeriodEnd: firstLineItem?.current_period_end
                        ? new Date(firstLineItem.current_period_end * 1000)
                        : undefined,
                      cancelAt: stripeSubscriptionAfterCancel.cancel_at
                        ? new Date(
                            stripeSubscriptionAfterCancel.cancel_at * 1000
                          )
                        : undefined,
                      cancelAtPeriodEnd:
                        stripeSubscriptionAfterCancel.cancel_at_period_end,
                      updatedAt: new Date(),
                    }
                  );

                  const subscriptionAfterCancel = await tx.findOne(
                    "subscriptions",
                    {
                      field: "id",
                      value: { type: "literal", value: subscription.id },
                    }
                  );

                  if (!subscriptionAfterCancel) {
                    throw new Error(
                      `Subscription not found after cancel: ${params.subscriptionId}`
                    );
                  }

                  return subscriptionAfterCancel;
                });
              },

              getSubscription: async (
                params: SubscriptionGetParams
              ): Promise<Subscription> => {
                const dbSubscription = await ogDeps.db.findOne(
                  "subscriptions",
                  {
                    field: "id",
                    value: { type: "literal", value: params.subscriptionId },
                  }
                );

                if (!dbSubscription) {
                  throw new Error(
                    `Subscription not found: ${params.subscriptionId}`
                  );
                }

                return dbSubscription;
              },

              updateSubscription: async (
                params: SubscriptionUpdateParams
              ): Promise<Subscription> => {
                return ogDeps.db.transaction(async (tx) => {
                  const subscription = await tx.findOne("subscriptions", {
                    field: "id",
                    value: { type: "literal", value: params.subscriptionId },
                  });

                  if (!subscription || !subscription.providerId) {
                    throw new Error(
                      `Subscription not found: ${params.subscriptionId}`
                    );
                  }

                  const stripeSubscription =
                    await stripe.subscriptions.retrieve(
                      subscription.providerId
                    );

                  if (stripeSubscription.status !== "active") {
                    throw new Error(
                      `Stripe subscription is not active: ${params.subscriptionId}`
                    );
                  }

                  const newPlanItems = planToStripeMap
                    .get(params.newPlan.cadence)
                    ?.get(params.newPlan.name)?.items;

                  if (!newPlanItems) {
                    throw new Error(
                      `No Stripe price ID found for plan: ${params.newPlan.name} cadence: ${params.newPlan.cadence}`
                    );
                  }

                  const stripeSubscriptionAfterUpgrade =
                    await stripe.subscriptions.update(subscription.providerId, {
                      items: newPlanItems,
                      proration_behavior: "create_prorations",
                    });

                  const firstLineItem =
                    stripeSubscriptionAfterUpgrade.items.data[0];

                  await tx.update(
                    "subscriptions",
                    {
                      field: "id",
                      value: { type: "literal", value: subscription.id },
                    },
                    {
                      status: stripeSubscriptionAfterUpgrade.status,
                      currentPeriodEnd: firstLineItem?.current_period_end
                        ? new Date(firstLineItem.current_period_end * 1000)
                        : undefined,
                      currentPeriodStart: firstLineItem?.current_period_start
                        ? new Date(firstLineItem.current_period_start * 1000)
                        : undefined,
                      updatedAt: new Date(),
                    }
                  );

                  const subscriptionAfterUpgrade = await tx.findOne(
                    "subscriptions",
                    {
                      field: "id",
                      value: { type: "literal", value: subscription.id },
                    }
                  );

                  if (!subscriptionAfterUpgrade) {
                    throw new Error(
                      `Subscription not found after upgrade: ${params.subscriptionId}`
                    );
                  }

                  return subscriptionAfterUpgrade;
                });
              },
            },
          },

          // Checkout Session Management & Stripe-specific Extensions
          {
            capability: "extension" as const,
            providerId: "stripe" as const,
            methods: {
              startSubscriptionCheckout: async (
                params: CheckoutSessionCreateParams
              ): Promise<{
                subscription?: Subscription;
                checkoutSession?: CheckoutSession;
              }> => {
                const deps = ogDeps.withExtras<typeof plugin>();
                const stripePlan = planToStripeMap
                  .get(params.cadence)
                  ?.get(params.planName);

                if (!stripePlan) {
                  throw new Error(
                    `No Stripe price ID found for plan: ${params.planName} cadence: ${params.cadence}`
                  );
                }

                const subscription =
                  await deps.providers.stripe.createSubscription({
                    billableId: params.billableId,
                    billableType: params.billableType,
                    cadence: params.cadence,
                    planName: params.planName,
                    email: params.email,
                    metadata: params.metadata,
                  });

                if (subscription.status === "incomplete") {
                  return {
                    subscription,
                  };
                }

                const successUrl = `${ogDeps.options.serverUrl}${ogDeps.options.basePath}/stripe/checkout-session/success?session_id={CHECKOUT_SESSION_ID}`;
                const cancelUrl = `${ogDeps.options.serverUrl}${ogDeps.options.basePath}/stripe/checkout-session/cancel?session_id={CHECKOUT_SESSION_ID}`;

                const session = await stripe.checkout.sessions.create({
                  customer: subscription.billableId,
                  payment_method_types: ["card"],
                  line_items: stripePlan.items.map((item) => ({
                    price: item.price,
                    quantity: item.quantity,
                  })),
                  mode: "subscription",
                  success_url: successUrl,
                  cancel_url: cancelUrl,
                  allow_promotion_codes: params.allowPromotionCodes,
                  subscription_data: stripePlan.trialDays
                    ? {
                        trial_period_days: stripePlan.trialDays,
                        trial_settings: {
                          end_behavior: {
                            missing_payment_method: "cancel",
                          },
                        },
                        metadata: params.metadata,
                      }
                    : undefined,
                  metadata: {
                    billableId: params.billableId,
                    planName: params.planName,
                    ...params.metadata,
                  },
                });

                if (!session.url) {
                  throw new Error("Checkout session URL not found");
                }

                return {
                  subscription,
                  checkoutSession: {
                    id: session.id,
                    url: session.url,
                    status: session.status || undefined,
                    metadata: session.metadata || undefined,
                  },
                };
              },

              // Stripe-specific invoice management methods
              createInvoiceFromStripe: async (
                stripeInvoice: Stripe.Invoice
              ): Promise<Invoice | null> => {
                return ogDeps.db.transaction(async (tx) => {
                  if (!stripeInvoice.id) {
                    return null;
                  }

                  // Find the associated billable
                  const customerId =
                    typeof stripeInvoice.customer === "string"
                      ? stripeInvoice.customer
                      : stripeInvoice.customer?.id;

                  if (!customerId) {
                    throw new Error(
                      `No customer found for invoice: ${stripeInvoice.id}`
                    );
                  }

                  const billable = await tx.findOne("billables", {
                    type: "and",
                    value: [
                      {
                        field: "providerBillableId",
                        value: { type: "literal", value: customerId },
                      },
                      {
                        field: "provider",
                        value: { type: "literal", value: "stripe" },
                      },
                    ],
                  });

                  if (!billable) {
                    throw new Error(
                      `Billable not found for customer: ${customerId}`
                    );
                  }

                  // Create the invoice
                  const invoice = await tx.create("invoices", {
                    billableId: billable.id,
                    provider: "stripe",
                    providerId: stripeInvoice.id,
                    number: stripeInvoice.number || undefined,
                    status: stripeInvoice.status || "draft",
                    subtotal: stripeInvoice.subtotal || 0,
                    tax:
                      stripeInvoice.total_taxes?.reduce(
                        (acc, tax) => acc + tax.amount,
                        0
                      ) || undefined,
                    total: stripeInvoice.total || 0,
                    currency: stripeInvoice.currency || "usd",
                    dueDate: stripeInvoice.due_date
                      ? new Date(stripeInvoice.due_date * 1000)
                      : undefined,
                    paidAt: stripeInvoice.status_transitions?.paid_at
                      ? new Date(
                          stripeInvoice.status_transitions.paid_at * 1000
                        )
                      : undefined,
                    voidedAt: stripeInvoice.status_transitions?.voided_at
                      ? new Date(
                          stripeInvoice.status_transitions.voided_at * 1000
                        )
                      : undefined,
                    periodStart: new Date(stripeInvoice.period_start * 1000),
                    periodEnd: new Date(stripeInvoice.period_end * 1000),
                  });

                  // Create invoice line items
                  if (stripeInvoice.lines?.data) {
                    for (const lineItem of stripeInvoice.lines.data) {
                      const stripeSubscriptionId = lineItem.subscription
                        ? typeof lineItem.subscription === "string"
                          ? lineItem.subscription
                          : lineItem.subscription.id
                        : undefined;

                      const subscription = await ogDeps.db.findOne(
                        "subscriptions",
                        {
                          type: "and",
                          value: [
                            {
                              field: "providerId",
                              value: {
                                type: "literal",
                                value: stripeSubscriptionId,
                              },
                            },
                            {
                              field: "provider",
                              value: { type: "literal", value: "stripe" },
                            },
                          ],
                        }
                      );

                      if (subscription) {
                        await tx.create("invoiceItems", {
                          invoiceId: invoice.id,
                          subscriptionId: subscription.id,
                          description: lineItem.description || "",
                          quantity: lineItem.quantity || 1,
                          amount: lineItem.amount || 0,
                          currency: lineItem.currency || "usd",
                          periodStart: lineItem.period?.start
                            ? new Date(lineItem.period.start * 1000)
                            : undefined,
                          periodEnd: lineItem.period?.end
                            ? new Date(lineItem.period.end * 1000)
                            : undefined,
                        });
                      }
                    }
                  }

                  return invoice;
                });
              },

              updateInvoiceFromStripe: async (
                stripeInvoice: Stripe.Invoice
              ): Promise<Invoice | null> => {
                return ogDeps.db.transaction(async (tx) => {
                  if (!stripeInvoice.id) {
                    return null;
                  }

                  const existingInvoice = await tx.findOne("invoices", {
                    type: "and",
                    value: [
                      {
                        field: "providerId",
                        value: { type: "literal", value: stripeInvoice.id },
                      },
                      {
                        field: "provider",
                        value: { type: "literal", value: "stripe" },
                      },
                    ],
                  });

                  if (!existingInvoice) {
                    return null;
                  }

                  await tx.update(
                    "invoices",
                    {
                      field: "id",
                      value: { type: "literal", value: existingInvoice.id },
                    },
                    {
                      number: stripeInvoice.number || undefined,
                      status: stripeInvoice.status || "draft",
                      subtotal: stripeInvoice.subtotal || 0,
                      tax:
                        stripeInvoice.total_taxes?.reduce(
                          (acc, tax) => acc + tax.amount,
                          0
                        ) || undefined,
                      total: stripeInvoice.total || 0,
                      paidAt: stripeInvoice.status_transitions?.paid_at
                        ? new Date(
                            stripeInvoice.status_transitions.paid_at * 1000
                          )
                        : undefined,
                      voidedAt: stripeInvoice.status_transitions?.voided_at
                        ? new Date(
                            stripeInvoice.status_transitions.voided_at * 1000
                          )
                        : undefined,
                      updatedAt: new Date(),
                    }
                  );

                  const updatedInvoice = await tx.findOne("invoices", {
                    field: "id",
                    value: { type: "literal", value: existingInvoice.id },
                  });

                  return updatedInvoice;
                });
              },
            },
          },

          // Invoice Management
          {
            capability: "invoice" as const,
            providerId: "stripe" as const,
            methods: {
              getInvoice: async (
                params: InvoiceGetParams
              ): Promise<Invoice> => {
                const invoice = await ogDeps.db.findOne("invoices", {
                  field: "id",
                  value: { type: "literal", value: params.invoiceId },
                });

                if (!invoice) {
                  throw new Error(`Invoice not found: ${params.invoiceId}`);
                }

                return invoice;
              },
            },
          },
        ] as const,
        endpoints: {
          stripeWebhook: createEndpoint(
            "/stripe/webhook",
            {
              method: "POST",
            },
            async (req): Promise<Response> => {
              const signature = req.headers?.get("stripe-signature") as string;
              const body = req.body as string;
              let event: Stripe.Event;

              const successResponse = Response.json({
                received: true,
                processed: true,
              });

              try {
                if (webhookEndpointSecret && signature) {
                  event = stripe.webhooks.constructEvent(
                    body,
                    signature,
                    webhookEndpointSecret
                  );
                } else {
                  event = JSON.parse(body);
                }

                // Handle different event types
                switch (event.type) {
                  // Start of Subscription Created Event
                  case "customer.subscription.created": {
                    const stripeSubscription = event.data.object;
                    const subscription = await ogDeps.db.findOne(
                      "subscriptions",
                      {
                        type: "and",
                        value: [
                          {
                            field: "providerId",
                            value: {
                              type: "literal",
                              value: stripeSubscription.id,
                            },
                          },
                          {
                            field: "provider",
                            value: { type: "literal", value: "stripe" },
                          },
                        ],
                      }
                    );

                    if (subscription) {
                      const firstLineItem = stripeSubscription.items.data[0];
                      await ogDeps.db.update(
                        "subscriptions",
                        {
                          field: "id",
                          value: { type: "literal", value: subscription.id },
                        },
                        {
                          status: stripeSubscription.status,
                          currentPeriodStart:
                            firstLineItem?.current_period_start
                              ? new Date(
                                  firstLineItem.current_period_start * 1000
                                )
                              : undefined,
                          currentPeriodEnd: firstLineItem?.current_period_end
                            ? new Date(firstLineItem.current_period_end * 1000)
                            : undefined,
                          updatedAt: new Date(),
                          cancelAtPeriodEnd:
                            stripeSubscription.cancel_at_period_end,
                          cancelAt: stripeSubscription.cancel_at
                            ? new Date(stripeSubscription.cancel_at * 1000)
                            : undefined,
                          canceledAt: stripeSubscription.canceled_at
                            ? new Date(stripeSubscription.canceled_at * 1000)
                            : undefined,
                          trialStart: stripeSubscription.trial_start
                            ? new Date(stripeSubscription.trial_start * 1000)
                            : undefined,
                          trialEnd: stripeSubscription.trial_end
                            ? new Date(stripeSubscription.trial_end * 1000)
                            : undefined,
                        }
                      );
                    } else {
                      const billable = await ogDeps.db.findOne("billables", {
                        type: "and",
                        value: [
                          {
                            field: "providerBillableId",
                            value: {
                              type: "literal",
                              value:
                                typeof stripeSubscription.customer === "string"
                                  ? stripeSubscription.customer
                                  : stripeSubscription.customer.id,
                            },
                          },
                          {
                            field: "provider",
                            value: { type: "literal", value: "stripe" },
                          },
                        ],
                      });

                      if (!billable) {
                        console.warn(
                          `Billable not found for subscription: ${stripeSubscription.id}`
                        );

                        return successResponse;
                      }

                      const firstLineItem = stripeSubscription.items.data[0];

                      const planMatches = stripeSubscription.items.data.map(
                        (item) => findPlanByItem(item, subscriptionPlans)
                      );

                      if (
                        planMatches.some(
                          (match) =>
                            match?.cadence !== planMatches[0]?.cadence ||
                            match?.planName !== planMatches[0]?.planName
                        )
                      ) {
                        return successResponse;
                      }

                      const match = planMatches[0];

                      if (!match) {
                        return successResponse;
                      }

                      await ogDeps.db.create("subscriptions", {
                        billableId: billable.id,
                        providerId: stripeSubscription.id,
                        status: stripeSubscription.status,
                        currentPeriodStart: firstLineItem?.current_period_start
                          ? new Date(firstLineItem.current_period_start * 1000)
                          : undefined,
                        currentPeriodEnd: firstLineItem?.current_period_end
                          ? new Date(firstLineItem.current_period_end * 1000)
                          : undefined,
                        updatedAt: new Date(),
                        cancelAtPeriodEnd:
                          stripeSubscription.cancel_at_period_end,
                        cancelAt: stripeSubscription.cancel_at
                          ? new Date(stripeSubscription.cancel_at * 1000)
                          : undefined,
                        canceledAt: stripeSubscription.canceled_at
                          ? new Date(stripeSubscription.canceled_at * 1000)
                          : undefined,
                        trialStart: stripeSubscription.trial_start
                          ? new Date(stripeSubscription.trial_start * 1000)
                          : undefined,
                        trialEnd: stripeSubscription.trial_end
                          ? new Date(stripeSubscription.trial_end * 1000)
                          : undefined,
                        planName: match.planName,
                        cadence: match.cadence,
                        provider: "stripe",
                        metadata: stripeSubscription.metadata,
                      });

                      return successResponse;
                    }

                    return successResponse;
                  }
                  // End of Subscription Created Event

                  // Start of Subscription Updated Event
                  case "customer.subscription.updated": {
                    const stripeSubscription = event.data.object;

                    const subscription = await ogDeps.db.findOne(
                      "subscriptions",
                      {
                        type: "and",
                        value: [
                          {
                            field: "providerId",
                            value: {
                              type: "literal",
                              value: stripeSubscription.id,
                            },
                          },
                          {
                            field: "provider",
                            value: { type: "literal", value: "stripe" },
                          },
                        ],
                      }
                    );

                    if (!subscription) {
                      return successResponse;
                    }

                    const firstLineItem = stripeSubscription.items.data[0];

                    const newPlanMatches = stripeSubscription.items.data.map(
                      (item) => findPlanByItem(item, subscriptionPlans)
                    );

                    const newPlanMatch = newPlanMatches.some(
                      (match) =>
                        match?.cadence !== newPlanMatches[0]?.cadence ||
                        match?.planName !== newPlanMatches[0]?.planName
                    )
                      ? null
                      : newPlanMatches[0];

                    await ogDeps.db.update(
                      "subscriptions",
                      {
                        field: "providerId",
                        value: {
                          type: "literal",
                          value: stripeSubscription.id,
                        },
                      },
                      {
                        status: stripeSubscription.status,
                        currentPeriodStart: firstLineItem?.current_period_start
                          ? new Date(firstLineItem.current_period_start * 1000)
                          : undefined,
                        currentPeriodEnd: firstLineItem?.current_period_end
                          ? new Date(firstLineItem.current_period_end * 1000)
                          : undefined,
                        updatedAt: new Date(),
                        cancelAtPeriodEnd:
                          stripeSubscription.cancel_at_period_end,
                        cancelAt: stripeSubscription.cancel_at
                          ? new Date(stripeSubscription.cancel_at * 1000)
                          : undefined,
                        canceledAt: stripeSubscription.canceled_at
                          ? new Date(stripeSubscription.canceled_at * 1000)
                          : undefined,
                        trialStart: stripeSubscription.trial_start
                          ? new Date(stripeSubscription.trial_start * 1000)
                          : undefined,
                        trialEnd: stripeSubscription.trial_end
                          ? new Date(stripeSubscription.trial_end * 1000)
                          : undefined,
                        ...(newPlanMatch
                          ? {
                              planName: newPlanMatch.planName,
                              cadence: newPlanMatch.cadence,
                            }
                          : {}),
                      }
                    );

                    return successResponse;
                  }
                  // End of Subscription Updated Event

                  case "customer.subscription.deleted": {
                    // Mark subscription as canceled
                    const stripeSubscription = event.data.object;

                    await ogDeps.db.update(
                      "subscriptions",
                      {
                        type: "and",
                        value: [
                          {
                            field: "providerId",
                            value: {
                              type: "literal",
                              value: stripeSubscription.id,
                            },
                          },
                          {
                            field: "provider",
                            value: { type: "literal", value: "stripe" },
                          },
                        ],
                      },
                      {
                        status: "canceled",
                        endedAt: stripeSubscription.ended_at
                          ? new Date(stripeSubscription.ended_at * 1000)
                          : undefined,
                        updatedAt: new Date(),
                      }
                    );

                    return successResponse;
                  }
                  // End of Subscription Deleted Event

                  // Start of Invoice Events
                  case "invoice.created": {
                    const stripeInvoice = event.data.object;
                    const deps = ogDeps.withExtras<typeof plugin>();

                    try {
                      await deps.providers.stripe.createInvoiceFromStripe(
                        stripeInvoice
                      );
                    } catch (error) {
                      console.warn(
                        `Failed to create invoice ${stripeInvoice.id}:`,
                        error
                      );
                      // Don't fail the webhook for invoice creation errors
                    }

                    return successResponse;
                  }

                  case "invoice.updated": {
                    const stripeInvoice = event.data.object;
                    const deps = ogDeps.withExtras<typeof plugin>();

                    try {
                      const result =
                        await deps.providers.stripe.updateInvoiceFromStripe(
                          stripeInvoice
                        );

                      // If invoice doesn't exist locally, create it
                      if (!result) {
                        await deps.providers.stripe.createInvoiceFromStripe(
                          stripeInvoice
                        );
                      }
                    } catch (error) {
                      console.warn(
                        `Failed to update invoice ${stripeInvoice.id}:`,
                        error
                      );
                    }

                    return successResponse;
                  }

                  case "invoice.paid": {
                    const stripeInvoice = event.data.object;
                    if (!stripeInvoice.id) {
                      return successResponse;
                    }

                    await ogDeps.db.update(
                      "invoices",
                      {
                        type: "and",
                        value: [
                          {
                            field: "providerId",
                            value: { type: "literal", value: stripeInvoice.id },
                          },
                          {
                            field: "provider",
                            value: { type: "literal", value: "stripe" },
                          },
                        ],
                      },
                      {
                        status: "paid",
                        paidAt: stripeInvoice.status_transitions?.paid_at
                          ? new Date(
                              stripeInvoice.status_transitions.paid_at * 1000
                            )
                          : new Date(),
                        updatedAt: new Date(),
                      }
                    );

                    return successResponse;
                  }

                  case "invoice.payment_failed": {
                    const stripeInvoice = event.data.object;
                    if (!stripeInvoice.id) {
                      return successResponse;
                    }

                    await ogDeps.db.update(
                      "invoices",
                      {
                        type: "and",
                        value: [
                          {
                            field: "providerId",
                            value: { type: "literal", value: stripeInvoice.id },
                          },
                          {
                            field: "provider",
                            value: { type: "literal", value: "stripe" },
                          },
                        ],
                      },
                      {
                        status: "open", // Reset to open for retry
                        updatedAt: new Date(),
                      }
                    );

                    return successResponse;
                  }

                  case "invoice.voided": {
                    const stripeInvoice = event.data.object;
                    if (!stripeInvoice.id) {
                      return successResponse;
                    }

                    await ogDeps.db.update(
                      "invoices",
                      {
                        type: "and",
                        value: [
                          {
                            field: "providerId",
                            value: { type: "literal", value: stripeInvoice.id },
                          },
                          {
                            field: "provider",
                            value: { type: "literal", value: "stripe" },
                          },
                        ],
                      },
                      {
                        status: "void",
                        voidedAt: stripeInvoice.status_transitions?.voided_at
                          ? new Date(
                              stripeInvoice.status_transitions.voided_at * 1000
                            )
                          : new Date(),
                        updatedAt: new Date(),
                      }
                    );

                    return successResponse;
                  }
                  // End of Invoice Events

                  default:
                    console.log(`Unhandled event type: ${event.type}`);
                }
              } catch (err) {
                console.error("Webhook processing failed:", err);
                return new Response("Webhook processing failed", {
                  status: 500,
                });
              }

              return successResponse;
            }
          ),

          checkoutSessionSuccess: createEndpoint(
            "/stripe/checkout-session/success",
            {
              method: "GET",
              query: z.object({
                session_id: z.string(),
              }),
            },
            async (req): Promise<Response> => {
              const { session_id } = req.query;

              const checkoutSession = await stripe.checkout.sessions.retrieve(
                session_id
              );

              if (checkoutSession.status !== "complete") {
                return Response.redirect(postCancelUrl || "/");
              }

              const stripeSubscriptionId =
                typeof checkoutSession.subscription === "string"
                  ? checkoutSession.subscription
                  : checkoutSession.subscription?.id || null;

              if (!stripeSubscriptionId) {
                // Non-subscription checkout sessions are not supported yet
                return Response.redirect(postCancelUrl || "/");
              }

              const stripeSubscription = await stripe.subscriptions.retrieve(
                stripeSubscriptionId
              );

              const subscription = await ogDeps.db.findOne("subscriptions", {
                type: "and",
                value: [
                  {
                    field: "providerId",
                    value: { type: "literal", value: stripeSubscription.id },
                  },
                  {
                    field: "provider",
                    value: { type: "literal", value: "stripe" },
                  },
                ],
              });

              if (!subscription) {
                // This should never happen, but we'll handle it just in case
                return Response.redirect(postCancelUrl || "/");
              }

              const firstLineItem = stripeSubscription.items.data[0];

              await ogDeps.db.update(
                "subscriptions",
                {
                  field: "providerId",
                  value: {
                    type: "literal",
                    value: stripeSubscription.id,
                  },
                },
                {
                  status: stripeSubscription.status,
                  currentPeriodStart: firstLineItem?.current_period_start
                    ? new Date(firstLineItem.current_period_start * 1000)
                    : undefined,
                  currentPeriodEnd: firstLineItem?.current_period_end
                    ? new Date(firstLineItem.current_period_end * 1000)
                    : undefined,
                  updatedAt: new Date(),
                  trialStart: stripeSubscription.trial_start
                    ? new Date(stripeSubscription.trial_start * 1000)
                    : undefined,
                  trialEnd: stripeSubscription.trial_end
                    ? new Date(stripeSubscription.trial_end * 1000)
                    : undefined,
                }
              );

              return Response.redirect(postSuccessUrl || "/");
            }
          ),

          checkoutSessionCancel: createEndpoint(
            "/stripe/checkout-session/cancel",
            {
              method: "GET",
              query: z.object({
                session_id: z.string(),
              }),
            },
            async (req): Promise<Response> => {
              const { session_id } = req.query;

              const checkoutSession = await stripe.checkout.sessions.retrieve(
                session_id
              );

              const stripeSubscriptionId =
                typeof checkoutSession.subscription === "string"
                  ? checkoutSession.subscription
                  : checkoutSession.subscription?.id || null;

              if (!stripeSubscriptionId) {
                // Non-subscription checkout sessions are not supported yet
                return Response.redirect(postCancelUrl || "/");
              }

              await ogDeps.db.update(
                "subscriptions",
                {
                  type: "and",
                  value: [
                    {
                      field: "providerId",
                      value: {
                        type: "literal",
                        value: stripeSubscriptionId,
                      },
                    },
                    {
                      field: "provider",
                      value: { type: "literal", value: "stripe" },
                    },
                    // It's dangerous to mark a subscription that is active as incomplete_expired
                    {
                      field: "status",
                      value: { type: "literal", value: "active" },
                      operator: "ne",
                    },
                  ],
                },
                {
                  status: "incomplete_expired",
                  updatedAt: new Date(),
                }
              );

              return Response.redirect(postCancelUrl || "/");
            }
          ),
        },
      };
    },
    {
      dependsOn: [$corePluginType] as const,
    }
  );

  return plugin;
};

type StripePlugin = ReturnType<typeof stripePlugin>;

export const $stripePluginType = {} as StripePlugin;
