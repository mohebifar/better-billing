import { z } from "zod";

type SchemaFields<T extends z.ZodType> = keyof z.infer<T>;

interface IndexDefinition<T extends z.ZodType> {
  fields: SchemaFields<T>[];
  unique?: boolean;
}

export class IndexRegistry {
  private _map = new Map<z.ZodObject, IndexDefinition<z.ZodObject>[]>();

  add<S extends z.ZodObject>(schema: S, metadata: IndexDefinition<S>[]) {
    this._map.set(schema, metadata);
    return this;
  }

  get<S extends z.ZodObject>(schema: S) {
    return this._map.get(schema);
  }

  has(schema: z.ZodObject) {
    return this._map.has(schema);
  }

  clear() {
    this._map.clear();
    return this;
  }

  remove(schema: z.ZodObject) {
    this._map.delete(schema);
    return this;
  }
}
