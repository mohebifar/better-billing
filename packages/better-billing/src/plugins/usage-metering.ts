import type { WhereMaybeArray } from '../adapters/types';
import type { BetterBillingRef } from '../types';

// Usage record interface
interface UsageRecord {
  id: string;
  customerId: string;
  subscriptionId: string;
  metricName: string;
  quantity: number;
  timestamp: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Usage aggregation interface
interface UsageAggregation {
  customerId: string;
  subscriptionId: string;
  metricName: string;
  totalQuantity: number;
  periodStart: Date;
  periodEnd: Date;
  records: UsageRecord[];
}

export const usageMeteringPlugin = () => {
  return (ref: BetterBillingRef) =>
    ({
      id: 'usageMetering' as const,

      schema: {
        usage: {
          fields: {
            id: { type: 'string', required: true },
            customerId: { type: 'string', required: true },
            subscriptionId: { type: 'string', required: true },
            metricName: { type: 'string', required: true },
            quantity: { type: 'number', required: true },
            timestamp: { type: 'date', required: true },
            metadata: { type: 'json', required: false },
            createdAt: { type: 'date', required: true },
            updatedAt: { type: 'date', required: true },
          },
        },
      },

      methods: {
        recordUsage: async (data: {
          customerId: string;
          subscriptionId: string;
          metricName: string;
          productId: string;
          quantity: number;
          timestamp?: Date;
          metadata?: Record<string, any>;
        }) => {
          // Access billing methods lazily to avoid circular dependency during initialization
          const coreMethods = ref.current.methods.core;
          if (!coreMethods) {
            throw new Error('Core plugin methods not available. Ensure core plugin is loaded.');
          }

          const customer = await coreMethods.getCustomer(data.customerId);
          if (!customer) {
            throw new Error('Customer not found');
          }

          const subscriptions = await coreMethods.listSubscriptions([
            { field: 'customerId', value: data.customerId },
          ]);
          const subscription = subscriptions.find((s: any) => s.id === data.subscriptionId);
          if (!subscription) {
            throw new Error('Subscription not found');
          }

          const usageRecord = await ref.current.config.database.create('usage', {
            id: crypto.randomUUID(),
            customerId: data.customerId,
            subscriptionId: data.subscriptionId,
            metricName: data.metricName,
            productId: data.productId,
            quantity: data.quantity,
            timestamp: data.timestamp || new Date(),
            metadata: data.metadata,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          return usageRecord as UsageRecord;
        },

        getUsage: async (data: {
          customerId: string;
          subscriptionId?: string;
          metricName?: string;
          periodStart?: Date;
          periodEnd?: Date;
        }) => {
          const conditions: WhereMaybeArray = [];

          conditions.push({
            field: 'customerId',
            value: data.customerId,
          });

          if (data.subscriptionId) {
            conditions.push({
              field: 'subscriptionId',
              value: data.subscriptionId,
            });
          }

          if (data.metricName) {
            conditions.push({
              field: 'metricName',
              value: data.metricName,
            });
          }

          const dateConditions: WhereMaybeArray = [];
          if (data.periodStart) {
            dateConditions.push({
              field: 'timestamp',
              value: data.periodStart,
              operator: 'gte',
            });
          }
          if (data.periodEnd) {
            dateConditions.push({
              field: 'timestamp',
              value: data.periodEnd,
              operator: 'lte',
            });
          }

          const records = (await ref.current.config.database.findMany('usage', [
            ...conditions,
            ...dateConditions,
          ])) as UsageRecord[];

          const aggregationMap = new Map<string, UsageAggregation>();

          records.forEach((record) => {
            const key = `${record.subscriptionId}-${record.metricName}`;

            if (!aggregationMap.has(key)) {
              aggregationMap.set(key, {
                customerId: record.customerId,
                subscriptionId: record.subscriptionId,
                metricName: record.metricName,
                totalQuantity: 0,
                periodStart:
                  data.periodStart ||
                  new Date(Math.min(...records.map((r: UsageRecord) => r.timestamp.getTime()))),
                periodEnd:
                  data.periodEnd ||
                  new Date(Math.max(...records.map((r: UsageRecord) => r.timestamp.getTime()))),
                records: [],
              });
            }

            const aggregation = aggregationMap.get(key);
            if (!aggregation) {
              throw new Error('Aggregation not found');
            }

            aggregation.totalQuantity += record.quantity;
            aggregation.records.push(record);
          });

          return Array.from(aggregationMap.values());
        },

        deleteUsage: async (usageId: string) => {
          await ref.current.config.database.delete('usage', {
            field: 'id',
            value: usageId,
          });
        },

        getUsageRecords: async (data: {
          customerId: string;
          subscriptionId?: string;
          metricName?: string;
          limit?: number;
          offset?: number;
        }) => {
          const conditions: WhereMaybeArray = [];

          conditions.push({
            field: 'customerId',
            value: data.customerId,
          });

          if (data.subscriptionId) {
            conditions.push({
              field: 'subscriptionId',
              value: data.subscriptionId,
            });
          }

          if (data.metricName) {
            conditions.push({
              field: 'metricName',
              value: data.metricName,
            });
          }

          return await ref.current.config.database.findMany('usage', conditions);
        },
      },
    }) as const;
};
