import { and, desc, eq, gt, gte, inArray, like, lt, lte, ne, or, type SQL } from 'drizzle-orm';
import type { DatabaseAdapter, Where, WhereMaybeArray } from './types';

export type { Where } from './types';

export interface DrizzleDB {
  [key: string]: any;
  _: {
    fullSchema: Record<string, any>;
  };
}

export interface DrizzleAdapterConfig {
  /**
   * The schema object that defines the tables and fields
   */
  schema?: Record<string, any>;
  /**
   * The database provider
   */
  provider: 'pg' | 'mysql' | 'sqlite';
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
}

export function drizzleAdapter(db: DrizzleDB, config: DrizzleAdapterConfig): DatabaseAdapter {
  function getSchema(model: string) {
    const schema = config.schema || db._.fullSchema;
    if (!schema) {
      throw new Error(
        'Drizzle adapter failed to initialize. Schema not found. Please provide a schema object in the adapter options object.'
      );
    }

    // Handle plural naming convention
    const modelName = config.usePlural ? `${model}s` : model;
    const schemaModel = schema[modelName] || schema[model];

    if (!schemaModel) {
      throw new Error(
        `[Drizzle Adapter]: The model "${model}" (or "${modelName}") was not found in the schema object. Please pass the schema directly to the adapter options.`
      );
    }
    return schemaModel;
  }

  const withReturning = async (
    model: string,
    builder: any,
    data: Record<string, any>,
    where?: Where[]
  ) => {
    if (config.provider !== 'mysql') {
      const result = await builder.returning();
      return result[0];
    }

    // For MySQL, we need to fetch after insert/update
    await builder.execute();
    const schemaModel = getSchema(model);

    if (where?.length) {
      const clause = convertWhereClause(where, model);
      const res = await db
        .select()
        .from(schemaModel)
        .where(...clause);
      return res[0];
    } else if (data.id) {
      const res = await db
        .select()
        .from(schemaModel)
        .where(eq(schemaModel.id, data.id))
        .limit(1)
        .execute();
      return res[0];
    } else {
      // Get the last inserted record
      const res = await db
        .select()
        .from(schemaModel)
        .orderBy(desc(schemaModel.id))
        .limit(1)
        .execute();
      return res[0];
    }
  };

  function convertWhereClause(where: Where[], model: string) {
    const schemaModel = getSchema(model);
    if (!where || where.length === 0) return [];

    if (where.length === 1) {
      const w = where[0];
      if (!w) return [];

      const field = schemaModel[w.field];
      if (!field) {
        throw new Error(
          `The field "${w.field}" does not exist in the schema for the model "${model}". Please update your schema.`
        );
      }

      switch (w.operator) {
        case 'in':
          if (!Array.isArray(w.value)) {
            throw new Error(
              `The value for the field "${w.field}" must be an array when using the "in" operator.`
            );
          }
          return [inArray(field, w.value)];
        case 'contains':
          return [like(field, `%${w.value}%`)];
        case 'starts_with':
          return [like(field, `${w.value}%`)];
        case 'ends_with':
          return [like(field, `%${w.value}`)];
        case 'lt':
          return [lt(field, w.value)];
        case 'lte':
          return [lte(field, w.value)];
        case 'ne':
          return [ne(field, w.value)];
        case 'gt':
          return [gt(field, w.value)];
        case 'gte':
          return [gte(field, w.value)];
        default:
          return [eq(field, w.value)];
      }
    }

    // Handle multiple conditions
    const andGroup = where.filter((w) => w.connector === 'AND' || !w.connector);
    const orGroup = where.filter((w) => w.connector === 'OR');

    const clause: SQL<unknown>[] = [];

    if (andGroup.length) {
      const andClause = and(
        ...andGroup.map((w) => {
          const field = schemaModel[w.field];
          if (w.operator === 'in') {
            if (!Array.isArray(w.value)) {
              throw new Error(
                `The value for the field "${w.field}" must be an array when using the "in" operator.`
              );
            }
            return inArray(field, w.value);
          }
          return eq(field, w.value);
        })
      );
      clause.push(andClause!);
    }

    if (orGroup.length) {
      const orClause = or(
        ...orGroup.map((w) => {
          const field = schemaModel[w.field];
          return eq(field, w.value);
        })
      );
      clause.push(orClause!);
    }

    return clause;
  }

  function checkMissingFields(
    schema: Record<string, any>,
    model: string,
    values: Record<string, any>
  ) {
    if (!schema) {
      throw new Error(
        'Drizzle adapter failed to initialize. Schema not found. Please provide a schema object in the adapter options object.'
      );
    }
    for (const key in values) {
      if (!schema[key]) {
        throw new Error(
          `The field "${key}" does not exist in the "${model}" schema. Please update your drizzle schema or re-generate using the CLI.`
        );
      }
    }
  }

  return {
    type: 'drizzle',
    provider: config.provider === 'pg' ? 'postgres' : config.provider,

    async create<T>(model: string, data: Partial<T>): Promise<T> {
      const schemaModel = getSchema(model);

      // Generate ID if not provided
      const recordData = { ...data } as any;
      if (!recordData.id) {
        recordData.id = `${model}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      }

      checkMissingFields(schemaModel, model, recordData);

      const builder = db.insert(schemaModel).values(recordData);
      const result = await withReturning(model, builder, recordData);
      return result as T;
    },

    async update<T>(model: string, where: WhereMaybeArray, data: Partial<T>): Promise<T> {
      const schemaModel = getSchema(model);

      // Convert where clause
      const whereConditions = Array.isArray(where)
        ? where
        : Object.entries(where).map(([field, value]) => ({ field, value }));
      const clause = convertWhereClause(whereConditions, model);

      const builder = db
        .update(schemaModel)
        .set(data)
        .where(...clause);

      return await withReturning(model, builder, data as Record<string, any>, whereConditions);
    },

    async findOne<T>(model: string, where: WhereMaybeArray): Promise<T | null> {
      const schemaModel = getSchema(model);

      // Convert where clause
      const whereConditions = Array.isArray(where)
        ? where
        : Object.entries(where).map(([field, value]) => ({ field, value }));
      const clause = convertWhereClause(whereConditions, model);

      const result = await db
        .select()
        .from(schemaModel)
        .where(...clause)
        .limit(1);

      return result.length > 0 ? (result[0] as T) : null;
    },

    async findMany<T>(model: string, where?: any): Promise<T[]> {
      const schemaModel = getSchema(model);

      let query = db.select().from(schemaModel);

      if (where) {
        const whereConditions = Array.isArray(where)
          ? where
          : Object.entries(where).map(([field, value]) => ({ field, value }));
        const clause = convertWhereClause(whereConditions, model);
        query = query.where(...clause);
      }

      const result = await query;
      return result as T[];
    },

    async delete(model: string, where: WhereMaybeArray): Promise<void> {
      const schemaModel = getSchema(model);

      // Convert where clause
      const whereConditions = Array.isArray(where)
        ? where
        : Object.entries(where).map(([field, value]) => ({ field, value }));
      const clause = convertWhereClause(whereConditions, model);

      await db.delete(schemaModel).where(...clause);
    },

    // Transaction support
    transaction: db.transaction
      ? async <T>(fn: (tx: DrizzleDB) => Promise<T>): Promise<T> => {
          return await db.transaction(fn);
        }
      : undefined,
  };
}

export default drizzleAdapter;
