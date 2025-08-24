import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  entries: [
    "./src/index",
    "./src/client/index",
    // DB Adapters
    "./src/adapters/drizzle",
    "./src/adapters/prisma",
    // Payment Providers (isolated modules)
    "./src/providers/stripe/index",
    // Integrations
    "./src/integrations/next-js",
    "./src/integrations/node",
    "./src/integrations/react-start",
    "./src/integrations/solid-start",
    "./src/integrations/svelte-kit",
  ],
  declaration: true,
  clean: true,
  rollup: {
    emitCJS: true,
  },
  externals: [
    "@prisma/client",
    "drizzle-orm",
    "prisma",
    // Mark all database drivers as external so they're not bundled
    "pg",
    "mysql2",
    "sqlite3",
    "better-sqlite3",
    "@planetscale/database",
    "@vercel/postgres",
    "@neondatabase/serverless",
    "@libsql/client",
    // Mark Stripe as external so users must install it themselves
    "stripe",
  ],
  failOnWarn: false,
});
