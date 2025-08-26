import { describe, it, expect, beforeEach } from 'vitest';
import { SchemaManager } from '../../src/core/schema';
import type { SchemaExtension } from '../../src/types';

describe('SchemaManager', () => {
  let schemaManager: SchemaManager;

  beforeEach(() => {
    schemaManager = new SchemaManager();
  });

  describe('Core Schema Integration', () => {
    it('should handle core schema as a plugin extension', () => {
      // Simulate core plugin registration
      const coreSchema: SchemaExtension = {
        customer: {
          fields: {
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
        },
        subscription: {
          fields: {
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
        },
      };

      // Register core plugin schema as extension
      schemaManager.registerExtension('core', coreSchema);
      const fullSchema = schemaManager.getFullSchema();

      // Core tables should be available
      expect(fullSchema).toHaveProperty('customer');
      expect(fullSchema).toHaveProperty('subscription');
      
      // Check field properties
      expect(fullSchema.customer.fields).toHaveProperty('id');
      expect(fullSchema.customer.fields).toHaveProperty('billableId');
      expect(fullSchema.customer.fields.id.required).toBe(true);
      expect(fullSchema.customer.fields.id.type).toBe('string');
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

      expect(fullSchema.customer.fields).toHaveProperty('companyName');
      expect(fullSchema.customer.fields).toHaveProperty('isVip');
      expect((fullSchema.customer.fields.companyName as any).type).toBe('string');
      expect((fullSchema.customer.fields.isVip as any).required).toBe(true);
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

      expect(fullSchema.customer.fields).toHaveProperty('companyName');
      expect(fullSchema.customer.fields).toHaveProperty('isVip');
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
      expect(fullSchema.customTable.fields).toHaveProperty('id');
      expect(fullSchema.customTable.fields).toHaveProperty('name');
      expect(fullSchema.customTable.fields).toHaveProperty('value');
    });
  });


  describe('Plugin-First Architecture', () => {
    it('should handle core plugin alongside other plugins', () => {
      // First register core plugin (simulating core plugin registration)
      const coreSchema: SchemaExtension = {
        customer: {
          fields: {
            id: { type: 'string', required: true },
            billableId: { type: 'string', required: true },
            email: { type: 'string' },
          },
        },
      };

      // Then register a feature plugin extension
      const featureExtension: SchemaExtension = {
        customer: {
          fields: {
            companyName: { type: 'string' },
          },
        },
      };

      schemaManager.registerExtension('core', coreSchema);
      schemaManager.registerExtension('feature', featureExtension);
      const fullSchema = schemaManager.getFullSchema();

      // Core fields should exist
      expect(fullSchema.customer.fields).toHaveProperty('id');
      expect(fullSchema.customer.fields).toHaveProperty('billableId');
      expect(fullSchema.customer.fields).toHaveProperty('email');
      
      // Extension field should be merged
      expect(fullSchema.customer.fields).toHaveProperty('companyName');
      
      // Core field properties should be preserved
      expect(fullSchema.customer.fields.id.required).toBe(true);
    });

    it('should demonstrate that SchemaManager only handles extensions', () => {
      // SchemaManager starts empty - it has no inherent "core" knowledge
      const emptySchema = schemaManager.getFullSchema();
      expect(Object.keys(emptySchema)).toHaveLength(0);

      // Everything comes through plugin registration
      const somePluginSchema: SchemaExtension = {
        someTable: {
          fields: {
            id: { type: 'string', required: true },
          },
        },
      };

      schemaManager.registerExtension('somePlugin', somePluginSchema);
      const fullSchema = schemaManager.getFullSchema();
      
      expect(fullSchema).toHaveProperty('someTable');
      expect(Object.keys(fullSchema)).toHaveLength(1);
    });
  });
});