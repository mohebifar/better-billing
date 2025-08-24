import type { SchemaExtension } from '../types';

export class SchemaManager {
  private extensions: Map<string, SchemaExtension> = new Map();

  // Register schema extension from plugins
  registerExtension(extensionName: string, extension: SchemaExtension) {
    this.extensions.set(extensionName, extension);
  }

  // Get core schema definitions
  getCoreSchema() {
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

  // Get merged schema with extensions
  getFullSchema() {
    const coreSchema = this.getCoreSchema();
    const fullSchema: any = { ...coreSchema };

    // Merge extensions
    this.extensions.forEach((extension) => {
      Object.entries(extension).forEach(([tableName, tableDefinition]) => {
        if (fullSchema[tableName]) {
          // Merge fields from extension into existing table
          fullSchema[tableName] = {
            ...fullSchema[tableName],
            ...tableDefinition.fields,
          };
        } else {
          // Add new table from extension
          fullSchema[tableName] = tableDefinition.fields;
        }
      });
    });

    return fullSchema;
  }

  // Generate SQL schema
  generateSQL(dialect: 'postgres' | 'mysql' | 'sqlite' = 'postgres'): string {
    const schema = this.getFullSchema();
    const tables: string[] = [];

    Object.entries(schema).forEach(([tableName, fields]: [string, any]) => {
      const columns: string[] = [];

      Object.entries(fields).forEach(([fieldName, def]: [string, any]) => {
        let columnDef = `  ${this.toSnakeCase(fieldName)} ${this.getSQLType(def.type, dialect)}`;

        if (def.required) {
          columnDef += ' NOT NULL';
        }

        if (fieldName === 'id') {
          columnDef += ' PRIMARY KEY';
        }

        if (def.default !== undefined) {
          columnDef += ` DEFAULT ${this.formatDefault(def.default, def.type)}`;
        }

        columns.push(columnDef);
      });

      const tableSQL = `CREATE TABLE ${this.toSnakeCase(tableName)} (\n${columns.join(',\n')}\n);`;
      tables.push(tableSQL);
    });

    return tables.join('\n\n');
  }

  private getSQLType(type: string, dialect: string): string {
    const typeMap: any = {
      postgres: {
        string: 'VARCHAR(255)',
        number: 'INTEGER',
        boolean: 'BOOLEAN',
        date: 'TIMESTAMP',
        json: 'JSONB',
      },
      mysql: {
        string: 'VARCHAR(255)',
        number: 'INT',
        boolean: 'BOOLEAN',
        date: 'DATETIME',
        json: 'JSON',
      },
      sqlite: {
        string: 'TEXT',
        number: 'INTEGER',
        boolean: 'INTEGER',
        date: 'TEXT',
        json: 'TEXT',
      },
    };

    return typeMap[dialect][type] || 'TEXT';
  }

  private formatDefault(value: any, type: string): string {
    if (value === null) return 'NULL';
    if (type === 'string') return `'${value}'`;
    if (type === 'boolean') return value ? 'TRUE' : 'FALSE';
    return String(value);
  }

  private toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`).replace(/^_/, '');
  }
}
