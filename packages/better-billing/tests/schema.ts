import { pgTable, varchar, timestamp, jsonb, integer, boolean } from 'drizzle-orm/pg-core';

export const customer = pgTable('customer', {
  id: varchar('id', { length: 255 }).primaryKey(),
  billableId: varchar('billable_id', { length: 255 }).notNull(),
  billableType: varchar('billable_type', { length: 255 }).notNull(),
  providerId: varchar('provider_id', { length: 255 }).notNull(),
  providerCustomerId: varchar('provider_customer_id', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

export const subscription = pgTable('subscription', {
  id: varchar('id', { length: 255 }).primaryKey(),
  customerId: varchar('customer_id', { length: 255 }).notNull().references(() => customer.id),
  providerId: varchar('provider_id', { length: 255 }).notNull(),
  providerSubscriptionId: varchar('provider_subscription_id', { length: 255 }).notNull(),
  status: varchar('status', { length: 255 }).notNull(),
  productId: varchar('product_id', { length: 255 }).notNull(),
  priceId: varchar('price_id', { length: 255 }).notNull(),
  quantity: integer('quantity'),
  currentPeriodStart: timestamp('current_period_start').notNull(),
  currentPeriodEnd: timestamp('current_period_end').notNull(),
  cancelAt: timestamp('cancel_at'),
  canceledAt: timestamp('canceled_at'),
  endedAt: timestamp('ended_at'),
  trialEnd: timestamp('trial_end'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

export const subscriptionItem = pgTable('subscription_item', {
  id: varchar('id', { length: 255 }).primaryKey(),
  subscriptionId: varchar('subscription_id', { length: 255 }).notNull().references(() => subscription.id),
  productId: varchar('product_id', { length: 255 }).notNull(),
  priceId: varchar('price_id', { length: 255 }).notNull(),
  quantity: integer('quantity').notNull(),
  metadata: jsonb('metadata'),
});

export const invoice = pgTable('invoice', {
  id: varchar('id', { length: 255 }).primaryKey(),
  customerId: varchar('customer_id', { length: 255 }).notNull().references(() => customer.id),
  subscriptionId: varchar('subscription_id', { length: 255 }).references(() => subscription.id),
  providerId: varchar('provider_id', { length: 255 }).notNull(),
  providerInvoiceId: varchar('provider_invoice_id', { length: 255 }).notNull(),
  number: varchar('number', { length: 255 }).notNull(),
  status: varchar('status', { length: 255 }).notNull(),
  amount: integer('amount').notNull(),
  currency: varchar('currency', { length: 255 }).notNull(),
  paidAt: timestamp('paid_at'),
  dueDate: timestamp('due_date'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull(),
});

export const usage = pgTable('usage', {
  id: varchar('id', { length: 255 }).primaryKey(),
  customerId: varchar('customer_id', { length: 255 }).notNull().references(() => customer.id),
  subscriptionItemId: varchar('subscription_item_id', { length: 255 }).references(() => subscriptionItem.id),
  productId: varchar('product_id', { length: 255 }).notNull(),
  quantity: integer('quantity').notNull(),
  timestamp: timestamp('timestamp').notNull(),
  metadata: jsonb('metadata'),
  idempotencyKey: varchar('idempotency_key', { length: 255 }),
});

export const paymentMethod = pgTable('payment_method', {
  id: varchar('id', { length: 255 }).primaryKey(),
  customerId: varchar('customer_id', { length: 255 }).notNull().references(() => customer.id),
  providerId: varchar('provider_id', { length: 255 }).notNull(),
  providerPaymentMethodId: varchar('provider_payment_method_id', { length: 255 }).notNull(),
  type: varchar('type', { length: 255 }).notNull(),
  last4: varchar('last4', { length: 255 }),
  brand: varchar('brand', { length: 255 }),
  isDefault: boolean('is_default').notNull(),
  metadata: jsonb('metadata'),
});

export const schema = {
  customer,
  subscription,
  subscriptionItem,
  invoice,
  usage,
  paymentMethod,
};