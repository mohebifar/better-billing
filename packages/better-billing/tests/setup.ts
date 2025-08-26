import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { beforeAll, afterAll, beforeEach } from 'vitest';
import { drizzleAdapter } from '../src/adapters/drizzle';
import * as schema from './schema';

let pglite: PGlite;
let db: ReturnType<typeof drizzle>;
let adapter: ReturnType<typeof drizzleAdapter>;

beforeAll(async () => {
  pglite = new PGlite();
  
  db = drizzle(pglite, { schema });
  
  adapter = drizzleAdapter(db, { 
    provider: 'pg',
    schema,
  });
  
  // Create the Better Billing schema tables
  await pglite.exec(`
    CREATE TABLE IF NOT EXISTS customer (
      id VARCHAR(255) PRIMARY KEY,
      billable_id VARCHAR(255) NOT NULL,
      billable_type VARCHAR(255) NOT NULL,
      provider_id VARCHAR(255) NOT NULL,
      provider_customer_id VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      metadata JSONB,
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subscription (
      id VARCHAR(255) PRIMARY KEY,
      customer_id VARCHAR(255) NOT NULL,
      provider_id VARCHAR(255) NOT NULL,
      provider_subscription_id VARCHAR(255) NOT NULL,
      status VARCHAR(255) NOT NULL,
      product_id VARCHAR(255) NOT NULL,
      price_id VARCHAR(255) NOT NULL,
      quantity INTEGER,
      current_period_start TIMESTAMP NOT NULL,
      current_period_end TIMESTAMP NOT NULL,
      cancel_at TIMESTAMP,
      canceled_at TIMESTAMP,
      ended_at TIMESTAMP,
      trial_end TIMESTAMP,
      metadata JSONB,
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customer(id)
    );

    CREATE TABLE IF NOT EXISTS subscription_item (
      id VARCHAR(255) PRIMARY KEY,
      subscription_id VARCHAR(255) NOT NULL,
      product_id VARCHAR(255) NOT NULL,
      price_id VARCHAR(255) NOT NULL,
      quantity INTEGER NOT NULL,
      metadata JSONB,
      FOREIGN KEY (subscription_id) REFERENCES subscription(id)
    );

    CREATE TABLE IF NOT EXISTS invoice (
      id VARCHAR(255) PRIMARY KEY,
      customer_id VARCHAR(255) NOT NULL,
      subscription_id VARCHAR(255),
      provider_id VARCHAR(255) NOT NULL,
      provider_invoice_id VARCHAR(255) NOT NULL,
      number VARCHAR(255) NOT NULL,
      status VARCHAR(255) NOT NULL,
      amount INTEGER NOT NULL,
      currency VARCHAR(255) NOT NULL,
      paid_at TIMESTAMP,
      due_date TIMESTAMP,
      metadata JSONB,
      created_at TIMESTAMP NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customer(id),
      FOREIGN KEY (subscription_id) REFERENCES subscription(id)
    );

    CREATE TABLE IF NOT EXISTS usage (
      id VARCHAR(255) PRIMARY KEY,
      customer_id VARCHAR(255) NOT NULL,
      subscription_id VARCHAR(255),
      metric_name VARCHAR(255) NOT NULL,
      subscription_item_id VARCHAR(255),
      product_id VARCHAR(255) NOT NULL,
      quantity INTEGER NOT NULL,
      timestamp TIMESTAMP NOT NULL,
      metadata JSONB,
      idempotency_key VARCHAR(255),
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customer(id),
      FOREIGN KEY (subscription_id) REFERENCES subscription(id),
      FOREIGN KEY (subscription_item_id) REFERENCES subscription_item(id)
    );

    CREATE TABLE IF NOT EXISTS payment_method (
      id VARCHAR(255) PRIMARY KEY,
      customer_id VARCHAR(255) NOT NULL,
      provider_id VARCHAR(255) NOT NULL,
      provider_payment_method_id VARCHAR(255) NOT NULL,
      type VARCHAR(255) NOT NULL,
      last4 VARCHAR(255),
      brand VARCHAR(255),
      is_default BOOLEAN NOT NULL,
      metadata JSONB,
      FOREIGN KEY (customer_id) REFERENCES customer(id)
    );
  `);
});

beforeEach(async () => {
  // Clean up data before each test
  await pglite.exec(`
    DELETE FROM payment_method;
    DELETE FROM usage;
    DELETE FROM invoice;
    DELETE FROM subscription_item;
    DELETE FROM subscription;
    DELETE FROM customer;
  `);
});

afterAll(async () => {
  await pglite.close();
});

export { db, adapter, pglite };