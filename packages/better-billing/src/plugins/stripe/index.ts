import { createEndpoint } from "better-call";
import type { Stripe } from "stripe";
import { z } from "zod";
import { createPlugin } from "../../plugin-factory";
import { $corePluginType } from "../core";

interface StripeSubscriptionPlan {
  planName: string; // Refers to the plan id in core plugin
  stripePriceId: string;
}

export interface StripePluginOptions {
  stripe: Stripe;
  subscriptionPlans: StripeSubscriptionPlan[];
}

export const stripePlugin = ({
  stripe,
  subscriptionPlans,
}: StripePluginOptions) => {
  // Create lookup map for plan name to Stripe price ID
  const planPriceMap = new Map(
    subscriptionPlans.map((plan) => [plan.planName, plan.stripePriceId])
  );

  return createPlugin(
    (deps) => {
      return {
        providers: [
          {
            capability: "subscription" as const,
            providerId: "stripe" as const,
            methods: {
              createSubscription: async (params: any) => {
                const stripePriceId = planPriceMap.get(params.planName);
                if (!stripePriceId) {
                  throw new Error(
                    `No Stripe price ID found for plan: ${params.planName}`
                  );
                }

                // Get billable info
                const billable = await deps.db.findOne("billables", {
                  field: "id",
                  value: params.billableId,
                });
                if (!billable) {
                  throw new Error(`Billable not found: ${params.billableId}`);
                }

                // Create Stripe subscription
                const stripeSubscription = await stripe.subscriptions.create({
                  customer: billable.externalId, // Assuming customer ID is stored as externalId
                  items: [{ price: stripePriceId }],
                  payment_behavior: "default_incomplete",
                  payment_settings: {
                    save_default_payment_method: "on_subscription",
                  },
                  expand: ["latest_invoice.payment_intent"],
                  trial_period_days: params.trialDays,
                  metadata: params.metadata,
                });

                // Create subscription record in our database
                await deps.db.create("subscriptions", {
                  billableId: params.billableId,
                  planName: params.planName,
                  providerId: "stripe",
                  providerSubscriptionId: stripeSubscription.id,
                  status: stripeSubscription.status as any,
                  quantity: 1,
                  currentPeriodStart: (stripeSubscription as any)
                    .current_period_start
                    ? new Date(
                        (stripeSubscription as any).current_period_start * 1000
                      )
                    : undefined,
                  currentPeriodEnd: (stripeSubscription as any)
                    .current_period_end
                    ? new Date(
                        (stripeSubscription as any).current_period_end * 1000
                      )
                    : undefined,
                  trialStart: (stripeSubscription as any).trial_start
                    ? new Date((stripeSubscription as any).trial_start * 1000)
                    : undefined,
                  trialEnd: (stripeSubscription as any).trial_end
                    ? new Date((stripeSubscription as any).trial_end * 1000)
                    : undefined,
                  metadata: stripeSubscription.metadata as any,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                });
              },
              cancelSubscription: async (params: any) => {
                console.log(params, stripe.subscriptions.cancel);
                // Implementation would go here
              },
              updateSubscription: async (params: any) => {
                console.log(params, stripe.subscriptions.update);
                // Implementation would go here
              },
              getSubscription: async (params: any) => {
                console.log(params, stripe.subscriptions.retrieve);
                return {} as any; // Return empty object to match interface
              },
            },
          },
          {
            capability: "checkout-session" as const,
            providerId: "stripe" as const,
            methods: {
              createCheckoutSession: async (params: any) => {
                const stripePriceId = planPriceMap.get(params.planName);
                if (!stripePriceId) {
                  throw new Error(
                    `No Stripe price ID found for plan: ${params.planName}`
                  );
                }

                // Get billable info
                const billable = await deps.db.findOne("billables", {
                  field: "id",
                  value: params.billableId,
                });
                if (!billable) {
                  throw new Error(`Billable not found: ${params.billableId}`);
                }

                await stripe.checkout.sessions.create({
                  customer: billable.externalId,
                  payment_method_types: ["card"],
                  line_items: [
                    {
                      price: stripePriceId,
                      quantity: 1,
                    },
                  ],
                  mode: "subscription",
                  success_url: params.successUrl,
                  cancel_url: params.cancelUrl,
                  allow_promotion_codes: params.allowPromotionCodes,
                  subscription_data: params.trialDays
                    ? {
                        trial_period_days: params.trialDays,
                      }
                    : undefined,
                });
                // Store session info in database if needed
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
            async () => {
              return "Hello, world!";
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
            async (req) => {
              const { session_id } = req.query;
              console.log(session_id);
              return "Hello, world!";
            }
          ),
        },
      };
    },
    {
      dependsOn: [$corePluginType] as const,
    }
  );
};
