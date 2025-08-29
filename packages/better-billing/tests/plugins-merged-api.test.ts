import type { DatabaseAdapter, SchemaDefinition } from "@better-billing/db";
import drizzleAdapter from "@better-billing/db/adapters/drizzle";
import { PGlite } from "@electric-sql/pglite";
import { createEndpoint } from "better-call";
import { pgTable, text } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { betterBilling, createPlugin } from "../src/index";

const drizzleSchema = {
  x: pgTable("x", {
    a: text("a"),
  }),
};

describe("plugins merged api", () => {
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

  it("should call the api", async () => {
    const plugin1 = createPlugin(
      () => {
        return {
          endpoints: {
            test: createEndpoint(
              "/test",
              {
                method: "GET",
                path: "/test",
              },
              async () => {
                return "Hello, world!";
              }
            ),
          },
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

    const response = await billing.api.handler(
      new Request("http://localhost/api/billing/test")
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("Hello, world!");

    const notFoundResponse = await billing.api.handler(
      new Request("http://localhost/api/billing/not-found")
    );

    expect(notFoundResponse.status).toBe(404);
  });

  it("should merge endpoints from multiple plugins", async () => {
    const plugin1 = createPlugin(
      () => {
        return {
          endpoints: {
            test: createEndpoint(
              "/test",
              {
                method: "GET",
                path: "/test",
              },
              async () => {
                return "Hello, world!";
              }
            ),
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
          endpoints: {
            "test-2": createEndpoint(
              "/test2",
              {
                method: "GET",
                path: "/test2",
              },
              async () => {
                return "Hello, world 2!";
              }
            ),
          },
        };
      },
      {
        dependsOn: [plugin1] as const,
      }
    );

    const billing = betterBilling({
      adapter: db,
      plugins: [plugin1, plugin2],
    });

    const response = await billing.api.handler(
      new Request("http://localhost/api/billing/test")
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("Hello, world!");

    const notFoundResponse = await billing.api.handler(
      new Request("http://localhost/api/billing/test2")
    );

    expect(notFoundResponse.status).toBe(200);
    expect(await notFoundResponse.text()).toBe("Hello, world 2!");
  });

  it("should merge endpoints and override existing ones", async () => {
    const plugin1 = createPlugin(
      () => {
        return {
          endpoints: {
            test: createEndpoint(
              "/test",
              {
                method: "GET",
                path: "/test",
              },
              async () => {
                return "Hello, world!";
              }
            ),
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
          endpoints: {
            test: createEndpoint(
              "/test",
              {
                method: "GET",
                path: "/test",
              },
              async () => {
                return "Hello, world 2!";
              }
            ),
          },
        };
      },
      {
        dependsOn: [plugin1] as const,
      }
    );

    const billing = betterBilling({
      adapter: db,
      plugins: [plugin1, plugin2],
    });

    const response = await billing.api.handler(
      new Request("http://localhost/api/billing/test")
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("Hello, world 2!");
  });
});
