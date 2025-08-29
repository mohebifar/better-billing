import type { DatabaseAdapter, SchemaDefinition } from "@better-billing/db";
import drizzleAdapter from "@better-billing/db/adapters/drizzle";
import { generateDrizzleSchema } from "@better-billing/db/generators/drizzle";
import { PGlite } from "@electric-sql/pglite";
import { pgTable, text } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { betterBilling, createPlugin } from "../src/index";

const drizzleSchema = {
  x: pgTable("x", {
    a: text("a"),
  }),
};

describe("plugins merged schema", () => {
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

  it("should merge schemas", () => {
    const plugin1 = createPlugin(
      () => {
        return {
          schema: {
            x: z.object({
              a: z.string(),
            }),
          },
        };
      },
      {
        dependsOn: [] as const,
      }
    );

    const plugin2 = createPlugin(
      () => {
        return {
          schema: {
            x: z.object({
              b: z.string(),
            }),
          },
        };
      },
      {
        dependsOn: [plugin1] as const,
      }
    );

    const billing = betterBilling({
      adapter: db,
      plugins: [plugin1, plugin2] as const,
    });

    const mergedSchema = billing.getMergedSchema();

    const generatedSchema = generateDrizzleSchema(mergedSchema, db);

    expect(generatedSchema).toMatchInlineSnapshot(`
      "import { pgTable, varchar } from "drizzle-orm/pg-core";

      export const x = pgTable("x", {
          a: varchar("a").notNull(),
          b: varchar("b").notNull()
        });"
    `);
  });

  it("should merge schemas with all undefined", () => {
    const plugin1 = createPlugin(
      () => {
        return {};
      },
      {
        dependsOn: [] as const,
      }
    );

    const plugin2 = createPlugin(
      () => {
        return {};
      },
      {
        dependsOn: [plugin1] as const,
      }
    );

    const billing = betterBilling({
      adapter: db,
      plugins: [plugin1, plugin2] as const,
    });

    const mergedSchema = billing.getMergedSchema();

    const generatedSchema = generateDrizzleSchema(mergedSchema, db);

    expect(generatedSchema).toMatchInlineSnapshot(`
      "import { pgTable } from "drizzle-orm/pg-core";
      "
    `);
  });

  it("should merge schemas with undefined and defined", () => {
    const plugin1 = createPlugin(
      () => {
        return {};
      },
      {
        dependsOn: [] as const,
      }
    );

    const plugin2 = createPlugin(
      () => {
        return {
          schema: {
            x: z.object({
              a: z.string(),
            }),
          },
        };
      },
      {
        dependsOn: [plugin1] as const,
      }
    );

    const billing = betterBilling({
      adapter: db,
      plugins: [plugin1, plugin2] as const,
    });

    const mergedSchema = billing.getMergedSchema();

    const generatedSchema = generateDrizzleSchema(mergedSchema, db);

    expect(generatedSchema).toMatchInlineSnapshot(`
      "import { pgTable, varchar } from "drizzle-orm/pg-core";

      export const x = pgTable("x", {
          a: varchar("a").notNull()
        });"
    `);
  });

  it("overrides field types", () => {
    const plugin1 = createPlugin(
      () => {
        return {
          schema: {
            x: z.object({
              a: z.string(),
            }),
          },
        };
      },
      {
        dependsOn: [] as const,
      }
    );

    const plugin2 = createPlugin(
      () => {
        return {
          schema: {
            x: z.object({
              a: z.number(),
            }),
          },
        };
      },
      {
        dependsOn: [plugin1] as const,
      }
    );

    const billing = betterBilling({
      adapter: db,
      plugins: [plugin1, plugin2] as const,
    });

    const mergedSchema = billing.getMergedSchema();

    const generatedSchema = generateDrizzleSchema(mergedSchema, db);

    expect(generatedSchema).toMatchInlineSnapshot(`
      "import { integer, pgTable } from "drizzle-orm/pg-core";

      export const x = pgTable("x", {
          a: integer("a").notNull()
        });"
    `);
  });
});
