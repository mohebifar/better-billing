import { generateDrizzleSchema } from './drizzle';
import { generatePrismaSchema } from './prisma';
import { generateSQLSchema } from './sql';
import type { SchemaGenerator, SchemaGeneratorOptions } from './types';

export const adapters = {
  drizzle: generateDrizzleSchema,
  prisma: generatePrismaSchema,
  sql: generateSQLSchema,
  postgres: generateSQLSchema,
  mysql: generateSQLSchema,
  sqlite: generateSQLSchema,
};

export const generateSchema = (opts: SchemaGeneratorOptions) => {
  const { adapter, format } = opts;

  // Determine generator type from format first, then adapter
  let generatorType: string;

  if (format) {
    generatorType = format;
  } else if (adapter.type) {
    generatorType = adapter.type;
  } else if (adapter.id) {
    generatorType = adapter.id;
  } else {
    // Fallback to provider-based SQL generation
    generatorType = adapter.provider || 'sql';
  }

  const generator = adapters[generatorType as keyof typeof adapters];

  if (generator) {
    return generator(opts);
  }

  // Check if adapter has custom createSchema method (like better-auth)
  if (adapter.createSchema) {
    return adapter
      .createSchema(opts.options, opts.file)
      .then(({ code, path: fileName, overwrite }: any) => ({
        code,
        fileName,
        overwrite,
      }));
  }

  throw new Error(
    `${generatorType} is not supported. If it is a custom adapter, please request the maintainer to implement createSchema`
  );
};

export type { SchemaGenerator };
export * from './types';
