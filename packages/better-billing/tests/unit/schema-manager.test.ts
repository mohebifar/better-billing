import { describe, it, expect, beforeEach } from 'vitest';
import { SchemaManager } from '../../src/core/schema';
import type { SchemaExtension } from '../../src/types';

describe('SchemaManager', () => {
  let schemaManager: SchemaManager;

  beforeEach(() => {
    schemaManager = new SchemaManager();
  });

  describe('Core Schema', () => {
    it('should return core schema with all required tables', () => {
      const coreSchema = schemaManager.getCoreSchema();

      expect(coreSchema).toHaveProperty('customer');
      expect(coreSchema).toHaveProperty('subscription');
      expect(coreSchema).toHaveProperty('subscriptionItem');
      expect(coreSchema).toHaveProperty('invoice');
      expect(coreSchema).toHaveProperty('usage');
      expect(coreSchema).toHaveProperty('paymentMethod');
    });

    it('should have correct customer schema fields', () => {
      const coreSchema = schemaManager.getCoreSchema();
      const customerSchema = coreSchema.customer;

      expect(customerSchema).toHaveProperty('id');
      expect(customerSchema).toHaveProperty('billableId');
      expect(customerSchema).toHaveProperty('billableType');
      expect(customerSchema).toHaveProperty('providerId');
      expect(customerSchema).toHaveProperty('providerCustomerId');
      expect(customerSchema).toHaveProperty('email');
      expect(customerSchema).toHaveProperty('metadata');
      expect(customerSchema).toHaveProperty('createdAt');
      expect(customerSchema).toHaveProperty('updatedAt');

      // Check required fields
      expect((customerSchema.id as any).required).toBe(true);
      expect((customerSchema.billableId as any).required).toBe(true);
      expect((customerSchema.billableType as any).required).toBe(true);
      expect((customerSchema.email as any).required).toBeUndefined(); // optional

      // Check field types
      expect((customerSchema.id as any).type).toBe('string');
      expect((customerSchema.metadata as any).type).toBe('json');
      expect((customerSchema.createdAt as any).type).toBe('date');
    });

    it('should have correct subscription schema fields', () => {
      const coreSchema = schemaManager.getCoreSchema();
      const subscriptionSchema = coreSchema.subscription;

      expect(subscriptionSchema).toHaveProperty('id');
      expect(subscriptionSchema).toHaveProperty('customerId');
      expect(subscriptionSchema).toHaveProperty('providerId');
      expect(subscriptionSchema).toHaveProperty('status');
      expect(subscriptionSchema).toHaveProperty('productId');
      expect(subscriptionSchema).toHaveProperty('priceId');
      expect(subscriptionSchema).toHaveProperty('quantity');
      expect(subscriptionSchema).toHaveProperty('currentPeriodStart');
      expect(subscriptionSchema).toHaveProperty('currentPeriodEnd');
      expect(subscriptionSchema).toHaveProperty('cancelAt');
      expect(subscriptionSchema).toHaveProperty('canceledAt');
      expect(subscriptionSchema).toHaveProperty('endedAt');
      expect(subscriptionSchema).toHaveProperty('trialEnd');

      // Check required fields
      expect((subscriptionSchema.id as any).required).toBe(true);
      expect((subscriptionSchema.customerId as any).required).toBe(true);
      expect((subscriptionSchema.status as any).required).toBe(true);
      expect((subscriptionSchema.quantity as any).required).toBeUndefined(); // optional

      // Check field types
      expect((subscriptionSchema.quantity as any).type).toBe('number');
      expect((subscriptionSchema.currentPeriodStart as any).type).toBe('date');
    });

    it('should have correct usage schema fields', () => {
      const coreSchema = schemaManager.getCoreSchema();
      const usageSchema = coreSchema.usage;

      expect(usageSchema).toHaveProperty('id');
      expect(usageSchema).toHaveProperty('customerId');
      expect(usageSchema).toHaveProperty('subscriptionItemId');
      expect(usageSchema).toHaveProperty('productId');
      expect(usageSchema).toHaveProperty('quantity');
      expect(usageSchema).toHaveProperty('timestamp');
      expect(usageSchema).toHaveProperty('idempotencyKey');

      // Check required fields
      expect((usageSchema.id as any).required).toBe(true);
      expect((usageSchema.customerId as any).required).toBe(true);
      expect((usageSchema.productId as any).required).toBe(true);
      expect((usageSchema.quantity as any).required).toBe(true);
      expect((usageSchema.timestamp as any).required).toBe(true);
      expect((usageSchema.subscriptionItemId as any).required).toBeUndefined(); // optional

      // Check field types
      expect((usageSchema.quantity as any).type).toBe('number');
      expect((usageSchema.timestamp as any).type).toBe('date');
    });
  });

  describe('Schema Extensions', () => {
    it('should register and apply schema extensions', () => {
      const extension: SchemaExtension = {
        customer: {
          fields: {
            companyName: { type: 'string' },
            isVip: { type: 'boolean', required: true },
          },
        },
      };

      schemaManager.registerExtension('customer', extension);
      const fullSchema = schemaManager.getFullSchema();

      expect(fullSchema.customer).toHaveProperty('companyName');
      expect(fullSchema.customer).toHaveProperty('isVip');
      expect((fullSchema.customer.companyName as any).type).toBe('string');
      expect((fullSchema.customer.isVip as any).required).toBe(true);
    });

    it('should merge multiple extensions for the same table', () => {
      const extension1: SchemaExtension = {
        customer: {
          fields: {
            companyName: { type: 'string' },
          },
        },
      };
      const extension2: SchemaExtension = {
        customer: {
          fields: {
            isVip: { type: 'boolean' },
          },
        },
      };

      schemaManager.registerExtension('customer_ext1', extension1);
      schemaManager.registerExtension('customer_ext2', extension2);
      const fullSchema = schemaManager.getFullSchema();

      expect(fullSchema.customer).toHaveProperty('companyName');
      expect(fullSchema.customer).toHaveProperty('isVip');
    });

    it('should add new tables through extensions', () => {
      const extension: SchemaExtension = {
        customTable: {
          fields: {
            id: { type: 'string', required: true },
            name: { type: 'string', required: true },
            value: { type: 'number' },
          },
        },
      };

      schemaManager.registerExtension('customTable', extension);
      const fullSchema = schemaManager.getFullSchema();

      expect(fullSchema).toHaveProperty('customTable');
      expect(fullSchema.customTable).toHaveProperty('id');
      expect(fullSchema.customTable).toHaveProperty('name');
      expect(fullSchema.customTable).toHaveProperty('value');
    });
  });

  describe('SQL Generation', () => {
    it('should generate PostgreSQL schema', () => {
      const sql = schemaManager.generateSQL('postgres');

      expect(sql).toContain('CREATE TABLE customer');
      expect(sql).toContain('CREATE TABLE subscription');
      expect(sql).toContain('CREATE TABLE usage');
      expect(sql).toContain('CREATE TABLE payment_method');

      // Check PostgreSQL-specific types
      expect(sql).toContain('VARCHAR(255)');
      expect(sql).toContain('TIMESTAMP');
      expect(sql).toContain('JSONB');
      expect(sql).toContain('INTEGER');
      expect(sql).toContain('BOOLEAN');

      // Check constraints
      expect(sql).toContain('NOT NULL');
      expect(sql).toContain('PRIMARY KEY');
    });

    it('should generate MySQL schema', () => {
      const sql = schemaManager.generateSQL('mysql');

      expect(sql).toContain('CREATE TABLE customer');
      
      // Check MySQL-specific types
      expect(sql).toContain('VARCHAR(255)');
      expect(sql).toContain('DATETIME');
      expect(sql).toContain('JSON');
      expect(sql).toContain('INT');
      expect(sql).toContain('BOOLEAN');
    });

    it('should generate SQLite schema', () => {
      const sql = schemaManager.generateSQL('sqlite');

      expect(sql).toContain('CREATE TABLE customer');
      
      // Check SQLite-specific types
      expect(sql).toContain('TEXT');
      expect(sql).toContain('INTEGER');
    });

    it('should handle schema extensions in SQL generation', () => {
      const extension: SchemaExtension = {
        customer: {
          fields: {
            companyName: { type: 'string' },
            employeeCount: { type: 'number', required: true },
          },
        },
      };

      schemaManager.registerExtension('customer', extension);
      const sql = schemaManager.generateSQL('postgres');

      expect(sql).toContain('company_name VARCHAR(255)');
      expect(sql).toContain('employee_count INTEGER NOT NULL');
    });

    it('should convert camelCase to snake_case in SQL', () => {
      const sql = schemaManager.generateSQL('postgres');

      expect(sql).toContain('billable_id');
      expect(sql).toContain('billable_type');
      expect(sql).toContain('provider_id');
      expect(sql).toContain('provider_customer_id');
      expect(sql).toContain('created_at');
      expect(sql).toContain('updated_at');
      expect(sql).toContain('current_period_start');
      expect(sql).toContain('current_period_end');
    });

    it('should handle default values in SQL generation', () => {
      const extension: SchemaExtension = {
        testTable: {
          fields: {
            id: { type: 'string', required: true },
            status: { type: 'string', default: 'active' },
            isEnabled: { type: 'boolean', default: true },
            count: { type: 'number', default: 0 },
            metadata: { type: 'json', default: null },
          },
        },
      };

      schemaManager.registerExtension('testTable', extension);
      const sql = schemaManager.generateSQL('postgres');

      expect(sql).toContain("status VARCHAR(255) DEFAULT 'active'");
      expect(sql).toContain('is_enabled BOOLEAN DEFAULT TRUE');
      expect(sql).toContain('count INTEGER DEFAULT 0');
      expect(sql).toContain('metadata JSONB DEFAULT NULL');
    });
  });

  describe('Utility Methods', () => {
    it('should convert camelCase to snake_case correctly', () => {
      // Test private method indirectly through SQL generation
      const extension: SchemaExtension = {
        testTable: {
          fields: {
            someFieldName: { type: 'string' },
            anotherLongFieldName: { type: 'string' },
          },
        },
      };

      schemaManager.registerExtension('testTable', extension);
      const sql = schemaManager.generateSQL('postgres');

      expect(sql).toContain('some_field_name');
      expect(sql).toContain('another_long_field_name');
    });

    it('should handle field names that are already snake_case', () => {
      const extension: SchemaExtension = {
        testTable: {
          fields: {
            already_snake_case: { type: 'string' },
            mixed_camelCase: { type: 'string' },
          },
        },
      };

      schemaManager.registerExtension('testTable', extension);
      const sql = schemaManager.generateSQL('postgres');

      expect(sql).toContain('already_snake_case');
      expect(sql).toContain('mixed_camel_case');
    });
  });

  describe('Full Schema Integration', () => {
    it('should maintain core schema integrity when adding extensions', () => {
      const extension: SchemaExtension = {
        customer: {
          fields: {
            newField: { type: 'string' },
          },
        },
      };

      schemaManager.registerExtension('customer', extension);
      const fullSchema = schemaManager.getFullSchema();

      // Core fields should still exist
      expect(fullSchema.customer).toHaveProperty('id');
      expect(fullSchema.customer).toHaveProperty('billableId');
      expect(fullSchema.customer).toHaveProperty('email');
      
      // New field should be added
      expect(fullSchema.customer).toHaveProperty('newField');
      
      // Core field properties should be preserved
      expect((fullSchema.customer.id as any).required).toBe(true);
    });
  });
});