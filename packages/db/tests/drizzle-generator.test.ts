import { describe, it, expect } from "vitest";
import { z } from "zod";
import { generateDrizzleSchema } from "~/generators/drizzle";
import { drizzleAdapter, DrizzleAdapterConfig } from "~/adapters/drizzle";

describe("generateDrizzleSchema", () => {
  // Mock database instance - we're only testing the generator, not actual DB operations
  const mockDb = {} as any;

  describe("PostgreSQL provider", () => {
    it("should generate basic schema with different field types", () => {
      const schema = {
        users: z.object({
          id: z.uuid(),
          name: z.string(),
          email: z.email(),
          age: z.number(),
          isActive: z.boolean(),
          createdAt: z.date(),
          metadata: z.object({ role: z.string() }),
        }),
      };

      const config: DrizzleAdapterConfig = {
        schema: {},
        provider: "pg",
      };

      const adapter = drizzleAdapter(mockDb, config);
      const generated = generateDrizzleSchema(schema, adapter);

      expect(generated).toContain(
        'import { boolean, integer, jsonb, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core"'
      );
      expect(generated).toContain('export const users = pgTable("users", {');
      expect(generated).toContain('id: uuid("id").notNull()');
      expect(generated).toContain('name: varchar("name").notNull()');
      expect(generated).toContain('email: varchar("email").notNull()');
      expect(generated).toContain('age: integer("age").notNull()');
      expect(generated).toContain('isActive: boolean("is_active").notNull()');
      expect(generated).toContain(
        'createdAt: timestamp("created_at").notNull()'
      );
      expect(generated).toContain('metadata: jsonb("metadata").notNull()');
    });

    it("should handle usePlural option", () => {
      const schema = {
        user: z.object({
          id: z.string(),
          name: z.string(),
        }),
      };

      const config: DrizzleAdapterConfig = {
        schema: {},
        provider: "pg",
        usePlural: true,
      };

      const adapter = drizzleAdapter(mockDb, config);
      const generated = generateDrizzleSchema(schema, adapter);

      expect(generated).toContain('export const user = pgTable("users", {');
    });

    it("should handle camelCase option", () => {
      const schema = {
        users: z.object({
          firstName: z.string(),
          lastName: z.string(),
        }),
      };

      const config: DrizzleAdapterConfig = {
        schema: {},
        provider: "pg",
        camelCase: true,
      };

      const adapter = drizzleAdapter(mockDb, config);
      const generated = generateDrizzleSchema(schema, adapter);

      expect(generated).toContain('firstName: varchar("firstName").notNull()');
      expect(generated).toContain('lastName: varchar("lastName").notNull()');
    });

    it("should handle schema mapping", () => {
      const schema = {
        users: z.object({
          id: z.string(),
          name: z.string(),
        }),
      };

      const config: DrizzleAdapterConfig = {
        schema: {},
        provider: "pg",
        schemaMapping: {
          users: {
            model: "customers",
            fields: {
              name: "customer_name",
            },
          },
        },
      };

      const adapter = drizzleAdapter(mockDb, config);
      const generated = generateDrizzleSchema(schema, adapter);

      expect(generated).toContain(
        'export const users = pgTable("customers", {'
      );
      expect(generated).toContain('name: varchar("customer_name").notNull()');
    });
  });

  describe("MySQL provider", () => {
    it("should generate MySQL schema", () => {
      const schema = {
        users: z.object({
          id: z.string().uuid(),
          name: z.string(),
          age: z.number(),
          createdAt: z.date(),
        }),
      };

      const config: DrizzleAdapterConfig = {
        schema: {},
        provider: "mysql",
      };

      const adapter = drizzleAdapter(mockDb, config);
      const generated = generateDrizzleSchema(schema, adapter);

      expect(generated).toContain(
        'import { datetime, int, mysqlTable, varchar } from "drizzle-orm/mysql-core"'
      );
      expect(generated).toContain('export const users = mysqlTable("users", {');
      expect(generated).toContain('id: varchar("id").notNull()'); // UUID becomes varchar in MySQL
      expect(generated).toContain('age: int("age").notNull()');
      expect(generated).toContain(
        'createdAt: datetime("created_at").notNull()'
      );
    });
  });

  describe("SQLite provider", () => {
    it("should generate SQLite schema", () => {
      const schema = {
        users: z.object({
          id: z.string(),
          name: z.string(),
          age: z.number(),
          isActive: z.boolean(),
          createdAt: z.date(),
        }),
      };

      const config: DrizzleAdapterConfig = {
        schema: {},
        provider: "sqlite",
      };

      const adapter = drizzleAdapter(mockDb, config);
      const generated = generateDrizzleSchema(schema, adapter);

      expect(generated).toContain(
        'import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"'
      );
      expect(generated).toContain(
        'export const users = sqliteTable("users", {'
      );
      expect(generated).toContain('id: text("id").notNull()');
      expect(generated).toContain('name: text("name").notNull()');
      expect(generated).toContain('age: integer("age").notNull()');
      expect(generated).toContain('isActive: integer("is_active").notNull()'); // Boolean becomes integer in SQLite
      expect(generated).toContain('createdAt: integer("created_at").notNull()'); // Date becomes integer in SQLite
    });
  });

  describe("optional fields", () => {
    it("should handle optional fields correctly", () => {
      const schema = {
        users: z.object({
          id: z.string(),
          name: z.string(),
          email: z.string().optional(),
          age: z.number().nullable(),
        }),
      };

      const config: DrizzleAdapterConfig = {
        schema: {},
        provider: "pg",
      };

      const adapter = drizzleAdapter(mockDb, config);
      const generated = generateDrizzleSchema(schema, adapter);

      expect(generated).toContain('id: varchar("id").notNull()');
      expect(generated).toContain('name: varchar("name").notNull()');
      expect(generated).toContain('email: varchar("email")'); // No .notNull() for optional
      expect(generated).toContain('age: integer("age")'); // No .notNull() for nullable
    });
  });

  describe("multiple tables", () => {
    it("should generate multiple table definitions", () => {
      const schema = {
        users: z.object({
          id: z.string(),
          name: z.string(),
        }),
        posts: z.object({
          id: z.string(),
          title: z.string(),
          authorId: z.string(),
        }),
      };

      const config: DrizzleAdapterConfig = {
        schema: {},
        provider: "pg",
      };

      const adapter = drizzleAdapter(mockDb, config);
      const generated = generateDrizzleSchema(schema, adapter);

      expect(generated).toContain('export const users = pgTable("users", {');
      expect(generated).toContain('export const posts = pgTable("posts", {');
      expect(generated).toContain('authorId: varchar("author_id").notNull()');
    });
  });

  describe("error handling", () => {
    it("should throw error for unsupported provider", () => {
      const schema = {
        users: z.object({
          id: z.string(),
        }),
      };

      const config: DrizzleAdapterConfig = {
        schema: {},
        provider: "unsupported" as any,
      };

      const adapter = drizzleAdapter(mockDb, config);

      expect(() => generateDrizzleSchema(schema, adapter)).toThrow(
        "Unsupported provider: unsupported"
      );
    });
  });
});
