import {
  type ZodTypeAny,
  ZodString,
  ZodNumber,
  ZodBigInt,
  ZodBoolean,
  ZodDate,
  ZodArray,
  ZodObject,
  ZodRecord,
  ZodEnum,
  ZodOptional,
  ZodNullable,
  ZodUUID,
  ZodEmail,
} from "zod";
import { DrizzleAdapterConfig } from "~/adapters/drizzle";
import { DatabaseAdapter, SchemaDefinition } from "~/types";

interface ColumnTypeInfo {
  drizzleType: string;
  imports: Set<string>;
}

interface ProviderConfig {
  tableFunction: string;
  importPath: string;
  typeMapping: Record<string, ColumnTypeInfo>;
}

const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  pg: {
    tableFunction: "pgTable",
    importPath: "drizzle-orm/pg-core",
    typeMapping: {
      string: {
        drizzleType: "varchar",
        imports: new Set(["varchar"]),
      },
      email: {
        drizzleType: "varchar",
        imports: new Set(["varchar"]),
      },
      uuid: {
        drizzleType: "uuid",
        imports: new Set(["uuid"]),
      },
      number: {
        drizzleType: "integer",
        imports: new Set(["integer"]),
      },
      bigint: {
        drizzleType: "bigint",
        imports: new Set(["bigint"]),
      },
      boolean: {
        drizzleType: "boolean",
        imports: new Set(["boolean"]),
      },
      date: {
        drizzleType: "timestamp",
        imports: new Set(["timestamp"]),
      },
      text: {
        drizzleType: "text",
        imports: new Set(["text"]),
      },
      json: {
        drizzleType: "jsonb",
        imports: new Set(["jsonb"]),
      },
    },
  },
  mysql: {
    tableFunction: "mysqlTable",
    importPath: "drizzle-orm/mysql-core",
    typeMapping: {
      string: {
        drizzleType: "varchar",
        imports: new Set(["varchar"]),
      },
      email: {
        drizzleType: "varchar",
        imports: new Set(["varchar"]),
      },
      uuid: {
        drizzleType: "varchar",
        imports: new Set(["varchar"]),
      },
      number: {
        drizzleType: "int",
        imports: new Set(["int"]),
      },
      bigint: {
        drizzleType: "bigint",
        imports: new Set(["bigint"]),
      },
      boolean: {
        drizzleType: "boolean",
        imports: new Set(["boolean"]),
      },
      date: {
        drizzleType: "datetime",
        imports: new Set(["datetime"]),
      },
      text: {
        drizzleType: "text",
        imports: new Set(["text"]),
      },
      json: {
        drizzleType: "json",
        imports: new Set(["json"]),
      },
    },
  },
  sqlite: {
    tableFunction: "sqliteTable",
    importPath: "drizzle-orm/sqlite-core",
    typeMapping: {
      string: {
        drizzleType: "text",
        imports: new Set(["text"]),
      },
      email: {
        drizzleType: "text",
        imports: new Set(["text"]),
      },
      uuid: {
        drizzleType: "text",
        imports: new Set(["text"]),
      },
      number: {
        drizzleType: "integer",
        imports: new Set(["integer"]),
      },
      bigint: {
        drizzleType: "integer",
        imports: new Set(["integer"]),
      },
      boolean: {
        drizzleType: "integer",
        imports: new Set(["integer"]),
      },
      date: {
        drizzleType: "integer",
        imports: new Set(["integer"]),
      },
      text: {
        drizzleType: "text",
        imports: new Set(["text"]),
      },
      json: {
        drizzleType: "text",
        imports: new Set(["text"]),
      },
    },
  },
};

function getZodTypeInfo(zodType: ZodTypeAny): {
  type: string;
  isOptional: boolean;
} {
  // Handle optional types
  if (zodType instanceof ZodOptional) {
    const innerInfo = getZodTypeInfo(zodType._def.innerType as ZodTypeAny);
    return { ...innerInfo, isOptional: true };
  }

  // Handle nullable types
  if (zodType instanceof ZodNullable) {
    const innerInfo = getZodTypeInfo(zodType._def.innerType as ZodTypeAny);
    return { ...innerInfo, isOptional: true };
  }

  // Handle different Zod types
  if (zodType instanceof ZodString) {
    // Check for specific string validations
    const checks = zodType._def.checks || [];

    // In Zod v4, checks have a different structure
    const emailCheck = checks.find(
      (check: any) => check.def?.format === "email" || check.kind === "email"
    );
    const uuidCheck = checks.find(
      (check: any) => check.def?.format === "uuid" || check.kind === "uuid"
    );

    if (emailCheck) return { type: "email", isOptional: false };
    if (uuidCheck) return { type: "uuid", isOptional: false };
    return { type: "string", isOptional: false };
  }

  if (zodType instanceof ZodNumber) {
    return { type: "number", isOptional: false };
  }

  if (zodType instanceof ZodBigInt) {
    return { type: "bigint", isOptional: false };
  }

  if (zodType instanceof ZodBoolean) {
    return { type: "boolean", isOptional: false };
  }

  if (zodType instanceof ZodDate) {
    return { type: "date", isOptional: false };
  }

  if (zodType instanceof ZodUUID) {
    return { type: "uuid", isOptional: false };
  }

  if (zodType instanceof ZodEmail) {
    return { type: "email", isOptional: false };
  }

  if (
    zodType instanceof ZodArray ||
    zodType instanceof ZodObject ||
    zodType instanceof ZodRecord ||
    zodType instanceof ZodEnum
  ) {
    return { type: "json", isOptional: false };
  }

  // Default to text for unknown types
  return { type: "text", isOptional: false };
}

function transformName(name: string, camelCase: boolean): string {
  if (camelCase) {
    return name;
  }
  // Convert camelCase to snake_case
  return name.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function getTableName(
  modelName: string,
  usePlural: boolean,
  camelCase: boolean,
  schemaMapping?: any
): string {
  // First check schema mapping
  const mappedName = schemaMapping?.[modelName]?.model;
  if (mappedName) {
    return transformName(mappedName, camelCase);
  }

  // Handle plural
  let tableName = modelName;
  if (usePlural && !tableName.endsWith("s")) {
    tableName = tableName + "s";
  }

  return transformName(tableName, camelCase);
}

function getColumnName(
  modelName: string,
  fieldName: string,
  camelCase: boolean,
  schemaMapping?: any
): string {
  // First check schema mapping
  const mappedName = schemaMapping?.[modelName]?.fields?.[fieldName];
  if (mappedName) {
    return transformName(mappedName, camelCase);
  }

  return transformName(fieldName, camelCase);
}

export function generateDrizzleSchema<T extends SchemaDefinition>(
  schema: T,
  adapter: DatabaseAdapter<T, DrizzleAdapterConfig>
): string {
  const config = adapter.getConfig();
  const {
    provider,
    usePlural = false,
    camelCase = false,
    schemaMapping,
  } = config;

  const providerConfig = PROVIDER_CONFIGS[provider];
  if (!providerConfig) {
    throw new Error(`Unsupported provider: ${provider}`);
  }

  const allImports = new Set<string>();
  allImports.add(providerConfig.tableFunction);

  const tableDefinitions: string[] = [];

  // Process each model in the schema
  for (const [modelName, zodSchema] of Object.entries(schema)) {
    const tableName = getTableName(
      modelName,
      usePlural,
      camelCase,
      schemaMapping
    );
    const shape = zodSchema.shape;

    const columns: string[] = [];

    // Process each field in the model
    for (const [fieldName, fieldType] of Object.entries(shape)) {
      const typeInfo = getZodTypeInfo(fieldType as ZodTypeAny);
      const columnMapping = providerConfig.typeMapping[typeInfo.type];

      if (!columnMapping) {
        throw new Error(
          `Unsupported field type: ${typeInfo.type} for provider: ${provider}`
        );
      }

      // Add column type imports
      columnMapping.imports.forEach((imp) => allImports.add(imp));

      const columnName = getColumnName(
        modelName,
        fieldName,
        camelCase,
        schemaMapping
      );

      // Build column definition
      let columnDef = `${fieldName}: ${columnMapping.drizzleType}("${columnName}")`;

      // Add modifiers
      if (!typeInfo.isOptional) {
        columnDef += ".notNull()";
      }

      columns.push(`    ${columnDef}`);
    }

    // Generate table definition
    const tableDefinition = `export const ${modelName} = ${
      providerConfig.tableFunction
    }("${tableName}", {
${columns.join(",\n")}
  });`;

    tableDefinitions.push(tableDefinition);
  }

  // Generate import statement
  const sortedImports = Array.from(allImports).sort();
  const importStatement = `import { ${sortedImports.join(", ")} } from "${
    providerConfig.importPath
  }";`;

  // Combine everything
  const generatedCode = [importStatement, "", ...tableDefinitions].join("\n");

  return generatedCode;
}
