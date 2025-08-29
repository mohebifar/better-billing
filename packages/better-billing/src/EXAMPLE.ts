import drizzleAdapter from "@better-billing/db/adapters/drizzle";
import Stripe from "stripe";
import { betterBilling } from "./index";
import { corePlugin } from "./plugins/core";
import { stripePlugin } from "./plugins/stripe";

// drizzleDb = drizzle(new PGlite());
const drizzleDb = {} as any;

const stripe = new Stripe("sk_test_123");

const billing = betterBilling({
  adapter: drizzleAdapter(drizzleDb, {
    provider: "pg",
    schema: {},
  }),
  plugins: [
    corePlugin({
      plans: [
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
      subscriptionPlans: [
        { planName: "Free", stripePriceId: "price_123" },
        { planName: "Pro", stripePriceId: "price_123" },
      ],
    }),
  ] as const,
});

const checkoutSession = billing.providers.stripe.createCheckoutSession({});
console.log("Checkout session:", checkoutSession);
