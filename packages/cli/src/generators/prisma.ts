import type { SchemaGenerator } from './types';

export const generatePrismaSchema: SchemaGenerator = async ({ options, file }) => {
  const filePath = file || './schema.prisma';
  const schema = getSchemaFromOptions(options);

  let code = '// Generated Prisma schema for Better Billing\n\n';

  // Generate model definitions
  for (const [tableName, fields] of Object.entries(schema)) {
    const modelCode = generatePrismaModel(tableName, fields as any);
    code += `${modelCode}\n\n`;
  }

  return {
    code,
    fileName: filePath,
    overwrite: true, // Prisma schemas typically overwrite
  };
};

function getSchemaFromOptions(_options: any) {
  // This would normally get schema from the billing instance
  // For now, return the core schema
  return getCoreSchema();
}

function getCoreSchema() {
  return {
    Customer: {
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
    Subscription: {
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
    SubscriptionItem: {
      id: { type: 'string', required: true },
      subscriptionId: { type: 'string', required: true },
      productId: { type: 'string', required: true },
      priceId: { type: 'string', required: true },
      quantity: { type: 'number', required: true },
      metadata: { type: 'json' },
    },
    Invoice: {
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
    Usage: {
      id: { type: 'string', required: true },
      customerId: { type: 'string', required: true },
      subscriptionItemId: { type: 'string' },
      productId: { type: 'string', required: true },
      quantity: { type: 'number', required: true },
      timestamp: { type: 'date', required: true },
      metadata: { type: 'json' },
      idempotencyKey: { type: 'string' },
    },
    PaymentMethod: {
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

function generatePrismaModel(modelName: string, fields: any): string {
  const fieldDefinitions: string[] = [];

  for (const [fieldName, field] of Object.entries(fields) as [string, any][]) {
    let fieldDef = `  ${fieldName} ${getPrismaType(field)}`;

    if (fieldName === 'id') {
      fieldDef += ' @id @default(cuid())';
    }

    if (!field.required && fieldName !== 'id') {
      fieldDef += '?';
    }

    if (fieldName === 'createdAt') {
      fieldDef += ' @default(now())';
    }

    if (fieldName === 'updatedAt') {
      fieldDef += ' @updatedAt';
    }

    fieldDefinitions.push(fieldDef);
  }

  return `model ${modelName} {
${fieldDefinitions.join('\n')}
}`;
}

function getPrismaType(field: any): string {
  switch (field.type) {
    case 'string':
      return 'String';
    case 'number':
      return 'Int';
    case 'boolean':
      return 'Boolean';
    case 'date':
      return 'DateTime';
    case 'json':
      return 'Json';
    default:
      return 'String';
  }
}
