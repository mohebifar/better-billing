import { promises as fs } from 'node:fs';
import path from 'node:path';

interface GenerateTypesOptions {
  output: string;
}

export async function generateTypes(options: GenerateTypesOptions) {
  // TODO: Read billing config
  // TODO: Get schema from billing instance
  // TODO: Generate TypeScript types

  const types = generateTypeDefinitions();

  // Write to output file
  const outputPath = path.resolve(process.cwd(), options.output);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, types, 'utf-8');

  console.log(`Types generated at: ${outputPath}`);
}

function generateTypeDefinitions(): string {
  return `// Generated Better Billing Types
export interface Customer {
  id: string;
  billableId: string;
  billableType: string;
  providerId: string;
  providerCustomerId: string;
  email?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subscription {
  id: string;
  customerId: string;
  providerId: string;
  providerSubscriptionId: string;
  status: SubscriptionStatus;
  productId: string;
  priceId: string;
  quantity?: number;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAt?: Date;
  canceledAt?: Date;
  endedAt?: Date;
  trialEnd?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export type SubscriptionStatus = 
  | 'trialing'
  | 'active'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'past_due'
  | 'unpaid'
  | 'paused';

export interface Invoice {
  id: string;
  customerId: string;
  subscriptionId?: string;
  providerId: string;
  providerInvoiceId: string;
  number: string;
  status: InvoiceStatus;
  amount: number;
  currency: string;
  paidAt?: Date;
  dueDate?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export type InvoiceStatus = 
  | 'draft'
  | 'open'
  | 'paid'
  | 'uncollectible'
  | 'void';

// Add more types...
`;
}
