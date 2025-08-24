import { promises as fs } from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';

interface InitOptions {
  database: 'drizzle' | 'prisma';
  provider: 'stripe' | 'polar';
  framework?: string;
}

export async function init(options: InitOptions) {
  console.log(chalk.gray('Database adapter:'), options.database);
  console.log(chalk.gray('Payment provider:'), options.provider);
  if (options.framework) {
    console.log(chalk.gray('Framework:'), options.framework);
  }

  // Check if package.json exists
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  try {
    await fs.access(packageJsonPath);
  } catch {
    console.error(
      chalk.red('No package.json found. Please run this command in a Node.js project.')
    );
    process.exit(1);
  }

  // Create config file
  const config = generateConfig(options);
  const configPath = path.join(process.cwd(), 'better-billing.config.ts');

  await fs.writeFile(configPath, config, 'utf-8');
  console.log(chalk.green('✓'), 'Created better-billing.config.ts');

  // Create .env template
  const envTemplate = generateEnvTemplate(options);
  const envPath = path.join(process.cwd(), '.env.example');

  await fs.writeFile(envPath, envTemplate, 'utf-8');
  console.log(chalk.green('✓'), 'Created .env.example');

  // Create schema directory
  const schemaDir = path.join(process.cwd(), 'billing');
  await fs.mkdir(schemaDir, { recursive: true });

  // Generate initial schema file
  if (options.database === 'drizzle') {
    const drizzleSchema = generateDrizzleSchema();
    await fs.writeFile(path.join(schemaDir, 'schema.ts'), drizzleSchema, 'utf-8');
    console.log(chalk.green('✓'), 'Created billing/schema.ts');
  } else if (options.database === 'prisma') {
    const prismaSchema = generatePrismaSchema();
    await fs.writeFile(path.join(schemaDir, 'schema.prisma'), prismaSchema, 'utf-8');
    console.log(chalk.green('✓'), 'Created billing/schema.prisma');
  }

  // Generate API route template
  if (options.framework) {
    await generateFrameworkFiles(options.framework);
  }

  console.log(`\n${chalk.green('✨ Better Billing initialized successfully!')}`);
  console.log('\nNext steps:');
  console.log('  1. Install dependencies:');
  console.log(chalk.cyan(`     npm install @better-billing/core`));
  if (options.database === 'drizzle') {
    console.log(chalk.cyan(`     npm install drizzle-orm`));
  } else if (options.database === 'prisma') {
    console.log(chalk.cyan(`     npm install @prisma/client prisma`));
  }
  if (options.provider === 'stripe') {
    console.log(chalk.cyan(`     npm install stripe`));
  }
  console.log('  2. Configure your environment variables in .env');
  console.log('  3. Run migrations:');
  console.log(chalk.cyan('     npx better-billing migrate'));
  console.log('  4. Start building! 🚀');
}

function generateConfig(options: InitOptions): string {
  const { database, provider } = options;

  return `import { betterBilling } from '@better-billing/core';
import { ${database}Adapter } from '@better-billing/core/adapters/${database}';
${provider === 'stripe' ? "import { stripeProvider } from '@better-billing/core/providers/stripe';" : ''}
${provider === 'polar' ? "import { polarProvider } from '@better-billing/core/providers/polar';" : ''}
${database === 'drizzle' ? "import { db } from './db';" : ''}
${database === 'prisma' ? "import { prisma } from './prisma';" : ''}

export const billing = betterBilling({
  database: ${database}Adapter(${database === 'drizzle' ? 'db' : 'prisma'}),
  ${
    provider === 'stripe'
      ? `provider: stripeProvider({
    secretKey: process.env.STRIPE_SECRET_KEY!,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  }),`
      : ''
  }
  ${
    provider === 'polar'
      ? `provider: polarProvider({
    apiKey: process.env.POLAR_API_KEY!,
    webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,
  }),`
      : ''
  }
  billable: {
    model: 'user', // or 'organization', 'team', etc.
  },
  webhooks: {
    endpoint: '/api/billing/webhooks',
  },
});

export default billing;
`;
}

function generateEnvTemplate(options: InitOptions): string {
  let env = '# Better Billing Configuration\n\n';

  if (options.provider === 'stripe') {
    env += '# Stripe\n';
    env += 'STRIPE_SECRET_KEY=sk_test_...\n';
    env += 'STRIPE_WEBHOOK_SECRET=whsec_...\n';
  } else if (options.provider === 'polar') {
    env += '# Polar\n';
    env += 'POLAR_API_KEY=polar_...\n';
    env += 'POLAR_WEBHOOK_SECRET=polar_whsec_...\n';
  }

  env += '\n# Database\n';
  env += 'DATABASE_URL=postgresql://user:password@localhost:5432/mydb\n';

  return env;
}

function generateDrizzleSchema(): string {
  return `import { pgTable, text, timestamp, integer, boolean, jsonb } from 'drizzle-orm/pg-core';

export const customers = pgTable('customers', {
  id: text('id').primaryKey(),
  billableId: text('billable_id').notNull(),
  billableType: text('billable_type').notNull(),
  providerId: text('provider_id').notNull(),
  providerCustomerId: text('provider_customer_id').notNull(),
  email: text('email'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const subscriptions = pgTable('subscriptions', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull(),
  providerId: text('provider_id').notNull(),
  providerSubscriptionId: text('provider_subscription_id').notNull(),
  status: text('status').notNull(),
  productId: text('product_id').notNull(),
  priceId: text('price_id').notNull(),
  quantity: integer('quantity'),
  currentPeriodStart: timestamp('current_period_start').notNull(),
  currentPeriodEnd: timestamp('current_period_end').notNull(),
  cancelAt: timestamp('cancel_at'),
  canceledAt: timestamp('canceled_at'),
  endedAt: timestamp('ended_at'),
  trialEnd: timestamp('trial_end'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Add more tables as needed...
`;
}

function generatePrismaSchema(): string {
  return `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Customer {
  id                   String   @id @default(cuid())
  billableId           String
  billableType         String
  providerId           String
  providerCustomerId   String
  email                String?
  metadata             Json?
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
  
  subscriptions        Subscription[]
  invoices            Invoice[]
  paymentMethods      PaymentMethod[]
  usage               Usage[]
}

model Subscription {
  id                      String    @id @default(cuid())
  customerId              String
  customer                Customer  @relation(fields: [customerId], references: [id])
  providerId              String
  providerSubscriptionId  String
  status                  String
  productId               String
  priceId                 String
  quantity                Int?
  currentPeriodStart      DateTime
  currentPeriodEnd        DateTime
  cancelAt                DateTime?
  canceledAt              DateTime?
  endedAt                 DateTime?
  trialEnd                DateTime?
  metadata                Json?
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt
  
  items                   SubscriptionItem[]
  invoices                Invoice[]
}

// Add more models as needed...
`;
}

async function generateFrameworkFiles(framework: string) {
  const routeDir = path.join(process.cwd(), 'app', 'api', 'billing');
  await fs.mkdir(routeDir, { recursive: true });

  if (framework === 'nextjs') {
    const routeContent = `import { billing } from '@/better-billing.config';
import { toNextJsHandler } from '@better-billing/core';

export const { GET, POST, PUT, DELETE } = toNextJsHandler(billing);
`;

    await fs.writeFile(path.join(routeDir, 'route.ts'), routeContent, 'utf-8');
    console.log(chalk.green('✓'), 'Created app/api/billing/route.ts');
  }
}
