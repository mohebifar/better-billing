import { z } from "zod";
import { SchemaDefinition } from "~/types";

// Helper type to merge two shapes using Zod's Extend utility
type MergeShapes<A, B> = A extends z.ZodRawShape
  ? B extends z.ZodRawShape
    ? z.util.Extend<A, B>
    : B
  : B;

// Helper type to merge two schema values
type MergeSchemaValues<A, B> = A extends z.ZodObject<infer ShapeA, any>
  ? B extends z.ZodObject<infer ShapeB, any>
    ? z.ZodObject<MergeShapes<ShapeA, ShapeB>>
    : B
  : B;

// Helper type to merge a single schema into an accumulator
type MergeSchemaIntoAcc<
  Acc extends SchemaDefinition,
  Schema extends SchemaDefinition
> = {
  [K in keyof Acc | keyof Schema]: K extends keyof Acc
    ? K extends keyof Schema
      ? MergeSchemaValues<Acc[K], Schema[K]>
      : Acc[K]
    : K extends keyof Schema
    ? Schema[K]
    : never;
};

// Main type that reduces the array of schemas into a single merged schema
export type MergeSchemas<T extends readonly SchemaDefinition[]> =
  T extends readonly [infer First, ...infer Rest]
    ? First extends SchemaDefinition
      ? Rest extends readonly SchemaDefinition[]
        ? MergeSchemaIntoAcc<First, MergeSchemas<Rest>>
        : First
      : {}
    : {};

export function mergeSchema<T extends readonly SchemaDefinition[]>(
  ...schemas: T
): MergeSchemas<T> {
  const mergedSchemas: SchemaDefinition = {};

  for (const schema of schemas) {
    for (const [key, value] of Object.entries(schema)) {
      if (mergedSchemas[key]) {
        // Extend the existing schema with the new one
        mergedSchemas[key] = mergedSchemas[key].extend(value.shape);
      } else {
        mergedSchemas[key] = value;
      }
    }
  }

  return mergedSchemas as MergeSchemas<T>;
}
