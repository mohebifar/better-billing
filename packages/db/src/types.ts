import type { z } from "zod";

export type SchemaDefinition = {
  [modelName: string]: z.ZodObject<any>;
};

export type ModelNames<SchemaDef extends SchemaDefinition> = keyof SchemaDef;

type FieldReference<
  Model extends z.ZodObject<any>,
  K extends keyof z.infer<Model> = keyof z.infer<Model>
> = {
  type: "field";
  value: K;
};

type RightValue<Model extends z.ZodObject<any>, T> =
  | { type: "literal"; value: T }
  | FieldReference<Model>;

type LogicalOperation<Model extends z.ZodObject<any>> = {
  [K in keyof z.infer<Model>]: {
    field: K;
    value: RightValue<Model, z.infer<Model>[K]>;
    operator?: "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "in" | "contains";
  };
}[keyof z.infer<Model>];

type BinaryOperation<Model extends z.ZodObject<any>> = {
  type: "and" | "or";
  value: Where<Model>[];
};

export type Where<Model extends z.ZodObject<any>> =
  | LogicalOperation<Model>
  | BinaryOperation<Model>;

export type SortBy<Model extends z.ZodObject<any>> = {
  [K in keyof z.infer<Model>]: {
    field: K;
    direction: "asc" | "desc";
  };
}[keyof z.infer<Model>];

export interface DatabaseAdapter<SchemaDef extends SchemaDefinition, Config> {
  create<T extends ModelNames<SchemaDef>>(
    model: T,
    data: Omit<z.infer<SchemaDef[T]>, "id" | "createdAt" | "updatedAt"> &
      Partial<Pick<z.infer<SchemaDef[T]>, "createdAt" | "updatedAt">>
  ): Promise<z.infer<SchemaDef[T]>>;
  update<T extends ModelNames<SchemaDef>>(
    model: T,
    where: Where<SchemaDef[T]>,
    data: Partial<z.infer<SchemaDef[T]>>
  ): Promise<void>;
  findOne<T extends ModelNames<SchemaDef>>(
    model: T,
    where: Where<SchemaDef[T]>,
    sortBy?: SortBy<SchemaDef[T]>
  ): Promise<z.infer<SchemaDef[T]> | null>;
  findMany<T extends ModelNames<SchemaDef>>(
    model: T,
    where?: Where<SchemaDef[T]>,
    sortBy?: SortBy<SchemaDef[T]>
  ): Promise<z.infer<SchemaDef[T]>[]>;
  delete<T extends ModelNames<SchemaDef>>(
    model: T,
    where: Where<SchemaDef[T]>
  ): Promise<void>;
  transaction<T>(
    fn: (tx: DatabaseAdapter<SchemaDef, Config>) => Promise<T>
  ): Promise<T>;
  getConfig(): Config;
}

// For mapping schema to real database table and field names
export type SchemaMapping<SchemaDef extends SchemaDefinition> = {
  [T in ModelNames<SchemaDef>]: {
    model?: string;
    fields?: {
      [K in keyof z.infer<SchemaDef[T]>]: string;
    };
  };
};
