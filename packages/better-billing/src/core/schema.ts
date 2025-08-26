import type { SchemaExtension } from '../types';

export class SchemaManager {
  private extensions: Map<string, SchemaExtension> = new Map();

  registerExtension(extensionName: string, extension: SchemaExtension) {
    this.extensions.set(extensionName, extension);
  }

  getFullSchema() {
    const fullSchema = {} as SchemaExtension;

    this.extensions.forEach((extension) => {
      Object.entries(extension).forEach(([tableName, tableDefinition]) => {
        if (fullSchema[tableName]) {
          fullSchema[tableName].fields = {
            ...fullSchema[tableName].fields,
            ...tableDefinition.fields,
          };
        } else {
          fullSchema[tableName] = tableDefinition;
        }
      });
    });

    return fullSchema;
  }
}
