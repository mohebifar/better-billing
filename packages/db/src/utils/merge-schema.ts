import { SchemaDefinition } from "~/types";

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;

export function mergeSchema<T extends readonly SchemaDefinition[]>(
  ...schemas: T
): UnionToIntersection<T[number]> {
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

  return mergedSchemas as UnionToIntersection<T[number]>;
}
