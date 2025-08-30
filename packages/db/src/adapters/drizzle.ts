import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  inArray,
  like,
  lt,
  lte,
  ne,
  or,
  type SQL,
} from "drizzle-orm";
import type { PgSelectWithout, PgTable } from "drizzle-orm/pg-core";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import type {
  DatabaseAdapter,
  ModelNames,
  SchemaDefinition,
  SchemaMapping,
  SortBy,
  Where,
} from "../types";

type DrizzleDb = PgliteDatabase<Record<string, unknown>>;

export interface DrizzleDB extends DrizzleDb {}

export interface DrizzleAdapterConfig<T extends SchemaDefinition> {
  /**
   * The drizzle schema object that defines the tables and fields
   */
  schema: Record<string, unknown>;
  /**
   * The database provider
   */
  provider: "pg" | "mysql" | "sqlite";
  /**
   * If the table names in the schema are plural
   * set this to true. For example, if the schema
   * has an object with a key "customers" instead of "customer"
   */
  usePlural?: boolean;
  /**
   * By default snake case is used for table and field names
   * when the CLI is used to generate the schema. If you want
   * to use camel case, set this to true.
   * @default false
   */
  camelCase?: boolean;
  /**
   * The schema mapping
   */
  schemaMapping?: SchemaMapping<T>;
}

export function drizzleAdapter<T extends SchemaDefinition>(
  db: DrizzleDB,
  config: DrizzleAdapterConfig<T>
): DatabaseAdapter<SchemaDefinition, DrizzleAdapterConfig<T>> {
  const { schema, schemaMapping } = config;

  const getSchema = (model: ModelNames<SchemaDefinition>) => {
    const actualName = schemaMapping?.[model]?.model ?? model;
    return schema[actualName] as PgTable;
  };

  const mapFieldName = (model: ModelNames<SchemaDefinition>, field: string) => {
    const actualName = schemaMapping?.[model]?.fields?.[field] ?? field;
    if (!schema[model]) {
      throw new Error(`Model ${model} not found in schema`);
    }
    return (schema[model] as any)[actualName] as SQL;
  };

  const convertWhereToDrizzleWhere = <T extends ModelNames<SchemaDefinition>>(
    model: T,
    where: Where<SchemaDefinition[T]>
  ): SQL | undefined => {
    if ("type" in where) {
      if (where.type === "and") {
        return and(
          ...where.value.map((w) => convertWhereToDrizzleWhere(model, w))
        );
      }
      if (where.type === "or") {
        return or(
          ...where.value.map((w) => convertWhereToDrizzleWhere(model, w))
        );
      }

      throw new Error(`Unknown where type: ${where.type}`);
    }

    const fieldName = String(where.field);
    switch (where.operator) {
      case "contains":
        return like(mapFieldName(model, fieldName), `%${where.value}%`);
      case "ne":
        return ne(mapFieldName(model, fieldName), where.value);
      case "gt":
        return gt(mapFieldName(model, fieldName), where.value);
      case "gte":
        return gte(mapFieldName(model, fieldName), where.value);
      case "lt":
        return lt(mapFieldName(model, fieldName), where.value);
      case "lte":
        return lte(mapFieldName(model, fieldName), where.value);
      case "in":
        return inArray(
          mapFieldName(model, fieldName),
          where.value as unknown as SQL[]
        );
      case "eq":
      default:
        return eq(mapFieldName(model, fieldName), where.value);
    }
  };

  const convertSortByToDrizzleOrderBy = <
    T extends ModelNames<SchemaDefinition>
  >(
    model: T,
    sortBy: SortBy<SchemaDefinition[T]>
  ) => {
    const fieldName = String(sortBy.field);
    const field = mapFieldName(model, fieldName);
    return sortBy.direction === "desc" ? desc(field) : asc(field);
  };

  return {
    create: async (model, data) => {
      const result = await db.insert(getSchema(model)).values(data);
      return result.rows[0];
    },
    update: async (model, where, data) => {
      await db
        .update(getSchema(model))
        .set(data)
        .where(convertWhereToDrizzleWhere(model, where));
    },
    findOne: async (model, where, sortBy) => {
      let query: PgSelectWithout<any, any, any> = db
        .select()
        .from(getSchema(model));

      if (where) {
        const drizzleWhere = convertWhereToDrizzleWhere(model, where);
        if (drizzleWhere) {
          query = query.where(drizzleWhere);
        }
      }

      if (sortBy) {
        query = query.orderBy(convertSortByToDrizzleOrderBy(model, sortBy));
      }

      const result = await query.limit(1);
      return result[0] || null;
    },
    findMany: async (model, where, sortBy) => {
      let query: PgSelectWithout<any, any, any> = db
        .select()
        .from(getSchema(model));

      if (where) {
        const drizzleWhere = convertWhereToDrizzleWhere(model, where);
        if (drizzleWhere) {
          query = query.where(drizzleWhere);
        }
      }

      if (sortBy) {
        query = query.orderBy(convertSortByToDrizzleOrderBy(model, sortBy));
      }

      return await query;
    },
    delete: async (model, where) => {
      await db
        .delete(getSchema(model))
        .where(convertWhereToDrizzleWhere(model, where));
    },
    transaction: async (fn) => {
      return await db.transaction(async (tx) => {
        const txAdapter = drizzleAdapter(tx, config);
        return await fn(txAdapter);
      });
    },
    getConfig: () => config,
  };
}

export default drizzleAdapter;
