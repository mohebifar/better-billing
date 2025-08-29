import type { DatabaseAdapter, SchemaDefinition } from "@better-billing/db";
import drizzleAdapter from "@better-billing/db/adapters/drizzle";
import { generateDrizzleSchema } from "@better-billing/db/generators/drizzle";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { betterBilling } from "~/index";
import { corePlugin } from "~/plugins/core";

const drizzleSchema = {};

describe("core plugin schema", () => {
  let db: DatabaseAdapter<SchemaDefinition, any>;
  let pglite: PGlite;

  beforeAll(async () => {
    pglite = new PGlite();

    const drizzleDb = drizzle(pglite);

    db = drizzleAdapter(drizzleDb, {
      provider: "pg",
      schema: drizzleSchema,
    });
  });

  it("should have a schema", () => {
    const schema = corePlugin({
      plans: [],
    });

    const billing = betterBilling({
      plugins: [schema],
      adapter: db,
    });

    const generatedSchema = generateDrizzleSchema(
      billing.getMergedSchema(),
      db
    );

    expect(generatedSchema).toMatchInlineSnapshot(`
      "import { integer, jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

      export const billables = pgTable("billables", {
          id: varchar("id").notNull(),
          type: varchar("type").notNull(),
          externalId: varchar("external_id").notNull(),
          createdAt: timestamp("created_at").notNull(),
          updatedAt: timestamp("updated_at").notNull()
        });
      export const subscriptions = pgTable("subscriptions", {
          id: varchar("id").notNull(),
          billableId: varchar("billable_id").notNull(),
          planName: varchar("plan_name").notNull(),
          providerId: varchar("provider_id").notNull(),
          providerSubscriptionId: varchar("provider_subscription_id"),
          status: jsonb("status").notNull(),
          currentPeriodStart: timestamp("current_period_start"),
          currentPeriodEnd: timestamp("current_period_end"),
          trialStart: timestamp("trial_start"),
          trialEnd: timestamp("trial_end"),
          cancelAt: timestamp("cancel_at"),
          canceledAt: timestamp("canceled_at"),
          endedAt: timestamp("ended_at"),
          quantity: text("quantity").notNull(),
          createdAt: timestamp("created_at").notNull(),
          updatedAt: timestamp("updated_at").notNull()
        });
      export const paymentMethods = pgTable("payment_methods", {
          id: varchar("id").notNull(),
          billableId: varchar("billable_id").notNull(),
          providerId: varchar("provider_id").notNull(),
          providerPaymentMethodId: varchar("provider_payment_method_id").notNull(),
          type: jsonb("type").notNull(),
          brand: varchar("brand"),
          lastFour: varchar("last_four"),
          expiryMonth: integer("expiry_month"),
          expiryYear: integer("expiry_year"),
          isDefault: text("is_default").notNull(),
          createdAt: timestamp("created_at").notNull(),
          updatedAt: timestamp("updated_at").notNull()
        });
      export const paymentIntents = pgTable("payment_intents", {
          id: varchar("id").notNull(),
          billableId: varchar("billable_id").notNull(),
          providerId: varchar("provider_id").notNull(),
          providerPaymentIntentId: varchar("provider_payment_intent_id").notNull(),
          amount: integer("amount").notNull(),
          currency: text("currency").notNull(),
          status: jsonb("status").notNull(),
          description: varchar("description"),
          createdAt: timestamp("created_at").notNull(),
          updatedAt: timestamp("updated_at").notNull()
        });
      export const invoices = pgTable("invoices", {
          id: varchar("id").notNull(),
          billableId: varchar("billable_id").notNull(),
          subscriptionId: varchar("subscription_id"),
          providerId: varchar("provider_id").notNull(),
          providerInvoiceId: varchar("provider_invoice_id").notNull(),
          number: varchar("number"),
          status: jsonb("status").notNull(),
          subtotal: integer("subtotal").notNull(),
          tax: integer("tax"),
          total: integer("total").notNull(),
          currency: text("currency").notNull(),
          dueDate: timestamp("due_date"),
          paidAt: timestamp("paid_at"),
          voidedAt: timestamp("voided_at"),
          periodStart: timestamp("period_start").notNull(),
          periodEnd: timestamp("period_end").notNull(),
          createdAt: timestamp("created_at").notNull(),
          updatedAt: timestamp("updated_at").notNull()
        });
      export const invoiceItems = pgTable("invoice_items", {
          id: varchar("id").notNull(),
          invoiceId: varchar("invoice_id").notNull(),
          subscriptionId: varchar("subscription_id"),
          planName: varchar("plan_name"),
          description: varchar("description").notNull(),
          quantity: text("quantity").notNull(),
          unitAmount: integer("unit_amount").notNull(),
          amount: integer("amount").notNull(),
          currency: text("currency").notNull(),
          periodStart: timestamp("period_start"),
          periodEnd: timestamp("period_end"),
          createdAt: timestamp("created_at").notNull()
        });"
    `);
  });
});
