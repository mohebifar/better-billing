import type { BetterBillingOptions } from 'better-billing';

// Schema generator types similar to better-auth
export interface SchemaGeneratorOptions {
  adapter: any;
  file?: string;
  options: BetterBillingOptions;
  format?: 'sql' | 'prisma' | 'drizzle';
}

export interface SchemaGeneratorResult {
  code: string;
  fileName: string;
  overwrite: boolean;
}

export type SchemaGenerator = (opts: SchemaGeneratorOptions) => Promise<SchemaGeneratorResult>;
