import type { DatabaseAdapter } from './types';

export type { Where } from './types';

// Better Auth style Prisma client interface
export interface PrismaModel {
  create: (args: { data: any }) => Promise<any>;
  update: (args: { where: any; data: any }) => Promise<any>;
  updateMany: (args: { where: any; data: any }) => Promise<{ count: number }>;
  delete: (args: { where: any }) => Promise<any>;
  deleteMany: (args: { where: any }) => Promise<{ count: number }>;
  findFirst: (args: { where: any; select?: any }) => Promise<any>;
  findMany: (args: {
    where?: any;
    select?: any;
    orderBy?: any;
    take?: number;
    skip?: number;
  }) => Promise<any[]>;
  count: (args?: { where?: any }) => Promise<number>;
}

export interface PrismaClient {
  [key: string]: PrismaModel | any;
  $transaction?: <T>(fn: (tx: PrismaClient) => Promise<T>) => Promise<T>;
}

export interface PrismaAdapterConfig {
  /**
   * Custom model name mappings
   */
  modelMapping?: Record<string, string>;
  /**
   * If the table names in the schema are plural
   */
  usePlural?: boolean;
}

export function prismaAdapter(
  prisma: PrismaClient,
  config: PrismaAdapterConfig = {}
): DatabaseAdapter {
  const { modelMapping = {}, usePlural = false } = config;

  const getModel = (modelName: string) => {
    // Map to custom model name if provided
    const mappedName = modelMapping[modelName] || modelName;
    // Handle plural naming convention
    const finalModelName = usePlural ? `${mappedName}s` : mappedName;

    const model = prisma[finalModelName] || prisma[mappedName] || prisma[modelName];

    if (!model) {
      throw new Error(
        `Model ${finalModelName} (or ${mappedName}, ${modelName}) not found in Prisma client`
      );
    }

    return model;
  };

  const convertWhereClause = (where: any): any => {
    if (!where) return {};

    // If it's already a Prisma-style where clause, return as is
    if (typeof where === 'object' && !Array.isArray(where) && !where.field) {
      return where;
    }

    // If it's our Where[] format, convert it
    if (Array.isArray(where)) {
      const andConditions: any[] = [];
      const orConditions: any[] = [];

      for (const condition of where) {
        const { field, value, operator = 'eq', connector = 'AND' } = condition;

        let prismaCondition: any;

        switch (operator) {
          case 'eq':
            prismaCondition = { [field]: value };
            break;
          case 'ne':
            prismaCondition = { [field]: { not: value } };
            break;
          case 'gt':
            prismaCondition = { [field]: { gt: value } };
            break;
          case 'gte':
            prismaCondition = { [field]: { gte: value } };
            break;
          case 'lt':
            prismaCondition = { [field]: { lt: value } };
            break;
          case 'lte':
            prismaCondition = { [field]: { lte: value } };
            break;
          case 'in':
            prismaCondition = { [field]: { in: value } };
            break;
          case 'contains':
            prismaCondition = { [field]: { contains: value } };
            break;
          case 'starts_with':
            prismaCondition = { [field]: { startsWith: value } };
            break;
          case 'ends_with':
            prismaCondition = { [field]: { endsWith: value } };
            break;
          default:
            prismaCondition = { [field]: value };
        }

        if (connector === 'OR') {
          orConditions.push(prismaCondition);
        } else {
          andConditions.push(prismaCondition);
        }
      }

      if (orConditions.length && andConditions.length) {
        return {
          AND: andConditions,
          OR: orConditions,
        };
      } else if (orConditions.length) {
        return { OR: orConditions };
      } else if (andConditions.length === 1) {
        return andConditions[0];
      } else if (andConditions.length > 1) {
        return { AND: andConditions };
      }

      return {};
    }

    // For simple cases like { id: "123" }, return as is
    return where;
  };

  return {
    type: 'prisma',
    provider: 'postgres', // This could be determined from Prisma instance

    async create<T>(model: string, data: Partial<T>): Promise<T> {
      const prismaModel = getModel(model);
      const result = await prismaModel.create({ data });
      return result as T;
    },

    async update<T>(model: string, where: any, data: Partial<T>): Promise<T> {
      const prismaModel = getModel(model);
      const whereClause = convertWhereClause(where);
      const result = await prismaModel.update({ where: whereClause, data });
      return result as T;
    },

    async findOne<T>(model: string, where: any): Promise<T | null> {
      const prismaModel = getModel(model);
      const whereClause = convertWhereClause(where);
      const result = await prismaModel.findFirst({ where: whereClause });
      return result as T | null;
    },

    async findMany<T>(model: string, where?: any): Promise<T[]> {
      const prismaModel = getModel(model);
      const query: { where?: any } = {};

      if (where) {
        query.where = convertWhereClause(where);
      }

      const result = await prismaModel.findMany(query);
      return result as T[];
    },

    async delete(model: string, where: any): Promise<void> {
      const prismaModel = getModel(model);
      const whereClause = convertWhereClause(where);
      await prismaModel.delete({ where: whereClause });
    },

    transaction: prisma.$transaction
      ? async <T>(fn: (tx: PrismaClient) => Promise<T>): Promise<T> => {
          return (await prisma.$transaction?.(fn)) as T;
        }
      : undefined,
  };
}

export default prismaAdapter;
