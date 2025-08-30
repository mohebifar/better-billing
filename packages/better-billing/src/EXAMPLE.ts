import drizzleAdapter from "@better-billing/db/adapters/drizzle";
import Stripe from "stripe";
import { betterBilling } from "./index";
import { corePlugin } from "./plugins/core";
import { stripePlugin } from "./plugins/stripe";

// drizzleDb = drizzle(new PGlite());
const drizzleDb = {} as any;

const stripe = new Stripe("sk_test_123");

const billing = betterBilling({
  serverUrl: "http://localhost:3000",
  adapter: drizzleAdapter(drizzleDb, {
    provider: "pg",
    schema: {},
  }),
  plugins: [
    corePlugin({
      subscriptionPlans: [
        {
          planName: "Free",
        },
        {
          planName: "Pro",
          trialDays: 7,
        },
      ],
    }),
    stripePlugin({
      stripe,
      subscriptionPlans: {
        monthly: [
          { planName: "Freea", items: [{ price: "price_123" }] },
          { planName: "Pro", items: [{ price: "price_123" }] },
        ],
        yearly: [
          { planName: "Free", items: [{ price: "price_123" }] },
          { planName: "Pro", items: [{ price: "price_123" }] },
        ],
      },
      postSuccessUrl: "http://localhost:3000/success",
      postCancelUrl: "http://localhost:3000/cancel",
      webhookEndpointSecret: "123",
    }),
  ] as const,
});

const checkoutSession = billing.providers.stripe.startSubscriptionCheckout({
  billableId: "123",
  billableType: "user",
  planName: "Pro",
  cadence: "monthly",
  email: "test@test.com",
  metadata: {
    userId: "123",
  },
  allowPromotionCodes: true,
});

const activeSubscriptions =
  await billing.providers.core.getBillableActiveSubscriptions({
    billableId: "123",
    billableType: "user",
  });

const hasProPlan = activeSubscriptions.some((s) => s.planName === "Pro");

console.log("Has Pro plan:", hasProPlan);

console.log("Checkout session:", checkoutSession);
