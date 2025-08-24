// Better Auth inspired adapter types
export interface Where {
  field: string;
  value: any;
  operator?:
    | 'eq'
    | 'ne'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'in'
    | 'contains'
    | 'starts_with'
    | 'ends_with';
  connector?: 'AND' | 'OR';
}

export interface SortBy {
  field: string;
  direction: 'asc' | 'desc';
}

// Current simplified adapter interface that matches our existing implementation
export interface DatabaseAdapter {
  type: 'drizzle' | 'prisma' | 'kysely';
  provider: 'postgres' | 'mysql' | 'sqlite';

  // Core database operations (current simplified format)
  create: <T>(model: string, data: Partial<T>) => Promise<T>;
  update: <T>(model: string, where: any, data: Partial<T>) => Promise<T>;
  findOne: <T>(model: string, where: any) => Promise<T | null>;
  findMany: <T>(model: string, where?: any) => Promise<T[]>;
  delete: (model: string, where: any) => Promise<void>;

  // Transaction support
  transaction?: <T>(fn: (tx: any) => Promise<T>) => Promise<T>;
}

// Future Better Auth style adapter interface (for Phase 2)
export interface BetterAuthStyleAdapter {
  type: 'drizzle' | 'prisma' | 'kysely';
  provider: 'postgres' | 'mysql' | 'sqlite';

  // Core database operations following Better Auth patterns
  create: <T extends Record<string, any>, R = T>(args: {
    model: string;
    data: T;
    select?: string[];
    forceAllowId?: boolean;
  }) => Promise<R>;

  update: <T>(args: {
    model: string;
    where: Where[];
    update: Record<string, any>;
  }) => Promise<T | null>;

  updateMany: (args: {
    model: string;
    where: Where[];
    update: Record<string, any>;
  }) => Promise<number>;

  findOne: <T extends Record<string, any>>(args: {
    model: string;
    where: Where[];
    select?: string[];
  }) => Promise<T | null>;

  findMany: <T extends Record<string, any>>(args: {
    model: string;
    where?: Where[];
    limit?: number;
    sortBy?: SortBy;
    offset?: number;
  }) => Promise<T[]>;

  delete: (args: { model: string; where: Where[] }) => Promise<void>;

  deleteMany: (args: { model: string; where: Where[] }) => Promise<number>;

  count: (args: { model: string; where?: Where[] }) => Promise<number>;

  // Transaction support
  transaction?: <T>(fn: (tx: any) => Promise<T>) => Promise<T>;

  // Schema creation support (optional)
  createSchema?: (args: { file?: string; tables: Record<string, any> }) => Promise<void>;

  // Adapter options and configuration
  options?: {
    adapterConfig?: any;
    [key: string]: any;
  };

  // Adapter ID for identification
  id?: string;
}

export interface AdapterOptions {
  tablePrefix?: string;
  schema?: string;
  debug?: boolean;
  usePlural?: boolean;
  modelMapping?: Record<string, string>;
}

// Better Auth style adapter config
export interface AdapterConfig {
  adapterId: string;
  adapterName?: string;
  usePlural?: boolean;
  debugLogs?: boolean | AdapterDebugLogs;
  supportsBooleans?: boolean;
  supportsDates?: boolean;
  supportsJSON?: boolean;
  supportsNumericIds?: boolean;
  disableIdGeneration?: boolean;
  customIdGenerator?: (args: { model: string }) => string;
  customTransformInput?: (args: any) => any;
  customTransformOutput?: (args: any) => any;
  mapKeysTransformInput?: Record<string, string>;
  mapKeysTransformOutput?: Record<string, string>;
}

export interface AdapterDebugLogs {
  create?: boolean;
  update?: boolean;
  updateMany?: boolean;
  findOne?: boolean;
  findMany?: boolean;
  delete?: boolean;
  deleteMany?: boolean;
  count?: boolean;
  logCondition?: () => boolean;
  isRunningAdapterTests?: boolean;
}

// Legacy adapter interface for backwards compatibility
export interface LegacyDatabaseAdapter {
  type: 'drizzle' | 'prisma' | 'kysely';
  provider: 'postgres' | 'mysql' | 'sqlite';

  // Core database operations (legacy format)
  create: <T>(model: string, data: Partial<T>) => Promise<T>;
  update: <T>(model: string, where: any, data: Partial<T>) => Promise<T>;
  findOne: <T>(model: string, where: any) => Promise<T | null>;
  findMany: <T>(model: string, where?: any) => Promise<T[]>;
  delete: (model: string, where: any) => Promise<void>;

  // Transaction support
  transaction?: <T>(fn: (tx: any) => Promise<T>) => Promise<T>;
}
