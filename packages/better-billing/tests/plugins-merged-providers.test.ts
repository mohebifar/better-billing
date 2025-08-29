import type { DatabaseAdapter, SchemaDefinition } from "@better-billing/db";
import drizzleAdapter from "@better-billing/db/adapters/drizzle";
import { PGlite } from "@electric-sql/pglite";
import { pgTable, text } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { betterBilling, createPlugin } from "../src/index";

const drizzleSchema = {
  customers: pgTable("customers", {
    id: text("id").primaryKey(),
    name: text("name"),
  }),
};

describe("plugins merged providers", () => {
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

  afterAll(async () => {
    await pglite.close();
  });

  it("should expose the provider methods", () => {
    const mockCreateSubscription = vi.fn();

    const plugin1 = createPlugin(
      () => {
        return {
          providers: [
            {
              capability: "subscription",
              providerId: "mock",
              methods: {
                createSubscription: mockCreateSubscription,
                cancelSubscription: vi.fn(),
                updateSubscription: vi.fn(),
                getSubscription: vi.fn(),
              },
            },
          ],
        };
      },
      {
        dependsOn: [] as const,
      }
    );

    const billing = betterBilling({
      adapter: db,
      plugins: [plugin1],
    });

    billing.providers.mock.createSubscription({});

    expect(mockCreateSubscription).toHaveBeenCalled();
  });

  it("should merge methods from multiple plugins with the same provider", () => {
    const stripeCreateSub = vi.fn();
    const stripeCreateCheckout = vi.fn();
    const polarCreateSub = vi.fn();

    const plugin1 = createPlugin(
      () => {
        return {
          providers: [
            {
              providerId: "stripe",
              capability: "subscription" as const,
              methods: {
                createSubscription: stripeCreateSub,
                cancelSubscription: vi.fn(),
                updateSubscription: vi.fn(),
                getSubscription: vi.fn(),
              },
            },
            {
              providerId: "polar",
              capability: "subscription" as const,
              methods: {
                createSubscription: polarCreateSub,
                cancelSubscription: vi.fn(),
                updateSubscription: vi.fn(),
                getSubscription: vi.fn(),
              },
            },
          ],
        };
      },
      {
        dependsOn: [] as const,
      }
    );

    const plugin2 = createPlugin(
      () => {
        return {
          providers: [
            {
              providerId: "stripe",
              capability: "checkout-session" as const,
              methods: {
                createCheckoutSession: stripeCreateCheckout,
              },
            },
          ],
        };
      },
      {
        dependsOn: [] as const,
      }
    );

    const billing = betterBilling({
      adapter: db,
      plugins: [plugin1, plugin2] as const,
    });

    billing.providers.stripe.createSubscription({});
    billing.providers.stripe.createCheckoutSession({});

    billing.providers.polar.createSubscription({});

    expect(stripeCreateSub).toHaveBeenCalled();
    expect(stripeCreateCheckout).toHaveBeenCalled();
    expect(polarCreateSub).toHaveBeenCalled();
  });
});
