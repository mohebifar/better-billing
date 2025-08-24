import type { SchemaGenerator } from './types';

export const generateSQLSchema: SchemaGenerator = async ({ options, file, adapter }) => {
  const filePath = file || './billing-schema.sql';
  const dialect = adapter?.provider || 'postgres';
  const schema = getSchemaFromOptions(options);

  let code = `-- Generated SQL schema for Better Billing\n-- Dialect: ${dialect}\n\n`;

  // Generate table definitions
  for (const [tableName, fields] of Object.entries(schema)) {
    const tableCode = generateSQLTable(tableName, fields as any, dialect);
    code += `${tableCode}\n\n`;
  }

  // Add indexes
  code += generateIndexes(schema, dialect);

  return {
    code,
    fileName: filePath,
    overwrite: true,
  };
};

function getSchemaFromOptions(_options: any) {
  // This would normally get schema from the billing instance
  // For now, return the core schema
  return getCoreSchema();
}

function getCoreSchema() {
  return {
    customers: {
      id: { type: 'string', required: true },
      billable_id: { type: 'string', required: true },
      billable_type: { type: 'string', required: true },
      provider_id: { type: 'string', required: true },
      provider_customer_id: { type: 'string', required: true },
      email: { type: 'string' },
      metadata: { type: 'json' },
      created_at: { type: 'date', required: true },
      updated_at: { type: 'date', required: true },
    },
    subscriptions: {
      id: { type: 'string', required: true },
      customer_id: { type: 'string', required: true },
      provider_id: { type: 'string', required: true },
      provider_subscription_id: { type: 'string', required: true },
      status: { type: 'string', required: true },
      product_id: { type: 'string', required: true },
      price_id: { type: 'string', required: true },
      quantity: { type: 'number' },
      current_period_start: { type: 'date', required: true },
      current_period_end: { type: 'date', required: true },
      cancel_at: { type: 'date' },
      canceled_at: { type: 'date' },
      ended_at: { type: 'date' },
      trial_end: { type: 'date' },
      metadata: { type: 'json' },
      created_at: { type: 'date', required: true },
      updated_at: { type: 'date', required: true },
    },
    subscription_items: {
      id: { type: 'string', required: true },
      subscription_id: { type: 'string', required: true },
      product_id: { type: 'string', required: true },
      price_id: { type: 'string', required: true },
      quantity: { type: 'number', required: true },
      metadata: { type: 'json' },
    },
    invoices: {
      id: { type: 'string', required: true },
      customer_id: { type: 'string', required: true },
      subscription_id: { type: 'string' },
      provider_id: { type: 'string', required: true },
      provider_invoice_id: { type: 'string', required: true },
      number: { type: 'string', required: true },
      status: { type: 'string', required: true },
      amount: { type: 'number', required: true },
      currency: { type: 'string', required: true },
      paid_at: { type: 'date' },
      due_date: { type: 'date' },
      metadata: { type: 'json' },
      created_at: { type: 'date', required: true },
    },
    usage: {
      id: { type: 'string', required: true },
      customer_id: { type: 'string', required: true },
      subscription_item_id: { type: 'string' },
      product_id: { type: 'string', required: true },
      quantity: { type: 'number', required: true },
      timestamp: { type: 'date', required: true },
      metadata: { type: 'json' },
      idempotency_key: { type: 'string' },
    },
    payment_methods: {
      id: { type: 'string', required: true },
      customer_id: { type: 'string', required: true },
      provider_id: { type: 'string', required: true },
      provider_payment_method_id: { type: 'string', required: true },
      type: { type: 'string', required: true },
      last4: { type: 'string' },
      brand: { type: 'string' },
      is_default: { type: 'boolean', required: true },
      metadata: { type: 'json' },
    },
  };
}

function generateSQLTable(tableName: string, fields: any, dialect: string): string {
  const columns: string[] = [];

  for (const [fieldName, field] of Object.entries(fields) as [string, any][]) {
    let columnDef = `  ${fieldName} ${getSQLType(field, dialect)}`;

    if (field.required) {
      columnDef += ' NOT NULL';
    }

    if (fieldName === 'id') {
      columnDef += ' PRIMARY KEY';
    }

    // Add defaults for timestamps
    if ((fieldName === 'created_at' || fieldName === 'updated_at') && dialect === 'postgres') {
      columnDef += ' DEFAULT NOW()';
    }

    columns.push(columnDef);
  }

  return `CREATE TABLE ${tableName} (
${columns.join(',\n')}
);`;
}

function getSQLType(field: any, dialect: string): string {
  const typeMap: Record<string, Record<string, string>> = {
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

  return typeMap[dialect]?.[field.type] || 'TEXT';
}

function generateIndexes(_schema: any, _dialect: string): string {
  const indexes: string[] = [];

  // Add common indexes
  indexes.push('-- Common indexes for better performance');
  indexes.push('CREATE INDEX idx_customers_billable ON customers(billable_type, billable_id);');
  indexes.push('CREATE INDEX idx_subscriptions_customer ON subscriptions(customer_id);');
  indexes.push('CREATE INDEX idx_subscriptions_status ON subscriptions(status);');
  indexes.push(
    'CREATE INDEX idx_subscription_items_subscription ON subscription_items(subscription_id);'
  );
  indexes.push('CREATE INDEX idx_invoices_customer ON invoices(customer_id);');
  indexes.push('CREATE INDEX idx_usage_customer ON usage(customer_id);');
  indexes.push('CREATE INDEX idx_usage_timestamp ON usage(timestamp);');
  indexes.push('CREATE INDEX idx_payment_methods_customer ON payment_methods(customer_id);');

  return `${indexes.join('\n')}\n`;
}
