import { existsSync } from 'node:fs';
import type { SchemaGenerator } from './types';

export const generateDrizzleSchema: SchemaGenerator = async ({ options, file, adapter }) => {
  const filePath = file || './billing-schema.ts';
  const databaseType: 'sqlite' | 'mysql' | 'pg' | undefined =
    adapter.provider || adapter.options?.provider;

  if (!databaseType) {
    throw new Error(
      `Database provider type is undefined during Drizzle schema generation. Please define a \`provider\` in the adapter config.`
    );
  }

  const fileExist = existsSync(filePath);

  // Get schema from billing config or use core schema
  const schema = getSchemaFromOptions(options);

  let code: string = generateImports({ databaseType, schema });

  // Generate table definitions
  for (const [tableName, fields] of Object.entries(schema)) {
    const tableCode = generateTableSchema(tableName, fields as any, databaseType);
    code += `\n${tableCode}\n`;
  }

  return {
    code,
    fileName: filePath,
    overwrite: fileExist,
  };
};

function getSchemaFromOptions(_options: any) {
  // This would normally get schema from the billing instance
  // For now, return the core schema
  return getCoreSchema();
}

function getCoreSchema() {
  return {
    customer: {
      id: { type: 'string', required: true },
      billableId: { type: 'string', required: true },
      billableType: { type: 'string', required: true },
      providerId: { type: 'string', required: true },
      providerCustomerId: { type: 'string', required: true },
      email: { type: 'string' },
      metadata: { type: 'json' },
      createdAt: { type: 'date', required: true },
      updatedAt: { type: 'date', required: true },
    },
    subscription: {
      id: { type: 'string', required: true },
      customerId: { type: 'string', required: true },
      providerId: { type: 'string', required: true },
      providerSubscriptionId: { type: 'string', required: true },
      status: { type: 'string', required: true },
      productId: { type: 'string', required: true },
      priceId: { type: 'string', required: true },
      quantity: { type: 'number' },
      currentPeriodStart: { type: 'date', required: true },
      currentPeriodEnd: { type: 'date', required: true },
      cancelAt: { type: 'date' },
      canceledAt: { type: 'date' },
      endedAt: { type: 'date' },
      trialEnd: { type: 'date' },
      metadata: { type: 'json' },
      createdAt: { type: 'date', required: true },
      updatedAt: { type: 'date', required: true },
    },
    subscriptionItem: {
      id: { type: 'string', required: true },
      subscriptionId: { type: 'string', required: true },
      productId: { type: 'string', required: true },
      priceId: { type: 'string', required: true },
      quantity: { type: 'number', required: true },
      metadata: { type: 'json' },
    },
    invoice: {
      id: { type: 'string', required: true },
      customerId: { type: 'string', required: true },
      subscriptionId: { type: 'string' },
      providerId: { type: 'string', required: true },
      providerInvoiceId: { type: 'string', required: true },
      number: { type: 'string', required: true },
      status: { type: 'string', required: true },
      amount: { type: 'number', required: true },
      currency: { type: 'string', required: true },
      paidAt: { type: 'date' },
      dueDate: { type: 'date' },
      metadata: { type: 'json' },
      createdAt: { type: 'date', required: true },
    },
    usage: {
      id: { type: 'string', required: true },
      customerId: { type: 'string', required: true },
      subscriptionItemId: { type: 'string' },
      productId: { type: 'string', required: true },
      quantity: { type: 'number', required: true },
      timestamp: { type: 'date', required: true },
      metadata: { type: 'json' },
      idempotencyKey: { type: 'string' },
    },
    paymentMethod: {
      id: { type: 'string', required: true },
      customerId: { type: 'string', required: true },
      providerId: { type: 'string', required: true },
      providerPaymentMethodId: { type: 'string', required: true },
      type: { type: 'string', required: true },
      last4: { type: 'string' },
      brand: { type: 'string' },
      isDefault: { type: 'boolean', required: true },
      metadata: { type: 'json' },
    },
  };
}

function generateImports({ databaseType, schema }: { databaseType: string; schema: any }) {
  const imports: string[] = [];

  imports.push(`${databaseType}Table`);
  imports.push('text');

  // Check what types we need based on schema
  const needsNumber = Object.values(schema).some((table: any) =>
    Object.values(table).some((field: any) => field.type === 'number')
  );
  const needsDate = Object.values(schema).some((table: any) =>
    Object.values(table).some((field: any) => field.type === 'date')
  );
  const needsBoolean = Object.values(schema).some((table: any) =>
    Object.values(table).some((field: any) => field.type === 'boolean')
  );
  const needsJson = Object.values(schema).some((table: any) =>
    Object.values(table).some((field: any) => field.type === 'json')
  );

  if (needsNumber) {
    imports.push(databaseType === 'mysql' ? 'int' : 'integer');
  }
  if (needsDate) {
    if (databaseType !== 'sqlite') {
      imports.push('timestamp');
    }
  }
  if (needsBoolean) {
    if (databaseType !== 'sqlite') {
      imports.push('boolean');
    }
  }
  if (needsJson) {
    if (databaseType === 'pg') {
      imports.push('jsonb');
    } else if (databaseType === 'mysql') {
      imports.push('json');
    }
    // SQLite uses text for JSON, which is already imported
  }

  return `import { ${imports.join(', ')} } from "drizzle-orm/${databaseType}-core";\n`;
}

function generateTableSchema(tableName: string, fields: any, databaseType: string): string {
  const columns: string[] = [];

  for (const [fieldName, field] of Object.entries(fields) as [string, any][]) {
    let columnDef = `  ${convertToSnakeCase(fieldName)}: ${getDrizzleType(field, databaseType, fieldName)}`;

    if (fieldName === 'id') {
      columnDef += '.primaryKey()';
    }

    if (field.required) {
      columnDef += '.notNull()';
    }

    if (field.default !== undefined) {
      if (typeof field.default === 'function') {
        columnDef += `.$defaultFn(${field.default})`;
      } else if (typeof field.default === 'string') {
        columnDef += `.default("${field.default}")`;
      } else {
        columnDef += `.default(${field.default})`;
      }
    }

    // Add default timestamps for createdAt/updatedAt
    if (fieldName === 'createdAt' || fieldName === 'updatedAt') {
      columnDef += databaseType === 'sqlite' ? '.$defaultFn(() => new Date())' : '.defaultNow()';
    }

    columns.push(columnDef);
  }

  return `export const ${tableName} = ${databaseType}Table("${convertToSnakeCase(tableName)}", {
${columns.join(',\n')}
});`;
}

function getDrizzleType(field: any, databaseType: string, fieldName: string): string {
  const columnName = convertToSnakeCase(fieldName);

  switch (field.type) {
    case 'string':
      return `text('${columnName}')`;
    case 'number':
      return databaseType === 'mysql' ? `int('${columnName}')` : `integer('${columnName}')`;
    case 'boolean':
      return databaseType === 'sqlite'
        ? `integer('${columnName}', { mode: 'boolean' })`
        : `boolean('${columnName}')`;
    case 'date':
      return databaseType === 'sqlite'
        ? `integer('${columnName}', { mode: 'timestamp' })`
        : `timestamp('${columnName}')`;
    case 'json':
      if (databaseType === 'pg') return `jsonb('${columnName}')`;
      if (databaseType === 'mysql') return `json('${columnName}')`;
      return `text('${columnName}')`; // SQLite
    default:
      return `text('${columnName}')`;
  }
}

function convertToSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`).replace(/^_/, '');
}
