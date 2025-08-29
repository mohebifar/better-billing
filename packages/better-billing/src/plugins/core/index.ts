import { z } from "zod";
import { createPlugin } from "../../plugin-factory";
import { indexRegistry } from "../../utils/db";

export interface SubscriptionPlan {
  planName: string;
  displayName?: string;
  description?: string;
  trialDays?: number;
  features?: string[];
}

export interface CorePluginOptions {
  plans: SubscriptionPlan[];
}

const schema = {
  // Polymorphic billable entities (users, organizations, teams, etc.)
  billables: z.object({
    id: z.string(),
    type: z.string(), // "user", "organization", "team", etc.
    externalId: z.string(), // Reference to your existing user/org table
    createdAt: z.date(),
    updatedAt: z.date(),
  }),

  // Subscriptions linking billables to plans with provider info
  subscriptions: z.object({
    id: z.string(),
    billableId: z.string(), // References billables.id
    planName: z.string(), // References plan name from options
    providerId: z.string(), // "stripe", "polar", etc.
    providerSubscriptionId: z.string().optional(), // Provider's subscription ID
    status: z.enum([
      "active",
      "canceled",
      "incomplete",
      "incomplete_expired",
      "past_due",
      "trialing",
      "unpaid",
      "paused",
    ]),
    currentPeriodStart: z.date().optional(),
    currentPeriodEnd: z.date().optional(),
    trialStart: z.date().optional(),
    trialEnd: z.date().optional(),
    cancelAt: z.date().optional(),
    canceledAt: z.date().optional(),
    endedAt: z.date().optional(),
    quantity: z.number().default(1),
    createdAt: z.date(),
    updatedAt: z.date(),
  }),

  // Payment methods for billables
  paymentMethods: z.object({
    id: z.string(),
    billableId: z.string(), // References billables.id
    providerId: z.string(), // "stripe", "polar", etc.
    providerPaymentMethodId: z.string(),
    type: z.enum(["card", "bank_account", "wallet", "other"]),
    brand: z.string().optional(), // "visa", "mastercard", etc.
    lastFour: z.string().optional(),
    expiryMonth: z.number().optional(),
    expiryYear: z.number().optional(),
    isDefault: z.boolean().default(false),
    createdAt: z.date(),
    updatedAt: z.date(),
  }),

  // One-time payment intents
  paymentIntents: z.object({
    id: z.string(),
    billableId: z.string(), // References billables.id
    providerId: z.string(), // "stripe", "polar", etc.
    providerPaymentIntentId: z.string(),
    amount: z.number(), // Amount in cents
    currency: z.string().default("usd"),
    status: z.enum([
      "requires_payment_method",
      "requires_confirmation",
      "requires_action",
      "processing",
      "requires_capture",
      "canceled",
      "succeeded",
    ]),
    description: z.string().optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
  }),

  // Invoice tracking
  invoices: z.object({
    id: z.string(),
    billableId: z.string(), // References billables.id
    subscriptionId: z.string().optional(), // References subscriptions.id
    providerId: z.string(), // "stripe", "polar", etc.
    providerInvoiceId: z.string(),
    number: z.string().optional(), // Invoice number
    status: z.enum(["draft", "open", "paid", "uncollectible", "void"]),
    subtotal: z.number(), // Amount in cents before tax
    tax: z.number().optional(), // Tax amount in cents
    total: z.number(), // Final amount in cents
    currency: z.string().default("usd"),
    dueDate: z.date().optional(),
    paidAt: z.date().optional(),
    voidedAt: z.date().optional(),
    periodStart: z.date(),
    periodEnd: z.date(),
    createdAt: z.date(),
    updatedAt: z.date(),
  }),

  // Invoice line items
  invoiceItems: z.object({
    id: z.string(),
    invoiceId: z.string(), // References invoices.id
    subscriptionId: z.string().optional(), // References subscriptions.id
    planName: z.string().optional(), // Plan name for this line item
    description: z.string(),
    quantity: z.number().default(1),
    unitAmount: z.number(), // Price per unit in cents
    amount: z.number(), // Total amount for this line item in cents
    currency: z.string().default("usd"),
    periodStart: z.date().optional(),
    periodEnd: z.date().optional(),
    createdAt: z.date(),
  }),
};

export const corePlugin = (_options: CorePluginOptions) => {
  return createPlugin(
    () => {
      indexRegistry.add(schema.billables, [
        {
          fields: ["id"],
          unique: true,
        },
        {
          fields: ["type", "externalId"],
          unique: true,
        },
      ]);
      return {
        schema,
        providers: [],
      };
    },
    {
      dependsOn: [] as const,
    }
  );
};

type CorePlugin = ReturnType<typeof corePlugin>;

export const $corePluginType = {} as CorePlugin;
