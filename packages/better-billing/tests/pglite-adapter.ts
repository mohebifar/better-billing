import { PGlite } from '@electric-sql/pglite';
import type { DatabaseAdapter } from '../src/adapters/types';

export class PGliteTestAdapter implements DatabaseAdapter {
  type = 'drizzle' as const;
  provider = 'postgres' as const;

  constructor(private db: PGlite) {}

  async create<T>(model: string, data: Partial<T>): Promise<T> {
    const dataObj = { ...data } as any;
    
    // Generate ID if not provided
    if (!dataObj.id) {
      dataObj.id = `${model}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }
    
    const fields = Object.keys(dataObj);
    const values = Object.values(dataObj);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    
    const query = `
      INSERT INTO ${this.getTableName(model)} (${fields.map(f => this.toSnakeCase(f)).join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;
    
    const result = await this.db.query(query, values);
    return this.mapResult(result.rows[0]) as T;
  }

  async update<T>(model: string, where: any, data: Partial<T>): Promise<T> {
    const fields = Object.keys(data as object);
    const values = Object.values(data as object);
    const setClause = fields.map((field, i) => `${this.toSnakeCase(field)} = $${i + 1}`).join(', ');
    
    // Handle where clause - assume simple id-based for now
    const whereClause = typeof where === 'object' && where.id ? 'id = $' + (values.length + 1) : 'id = $' + (values.length + 1);
    const whereValue = typeof where === 'object' && where.id ? where.id : where;
    
    const query = `
      UPDATE ${this.getTableName(model)}
      SET ${setClause}
      WHERE ${whereClause}
      RETURNING *
    `;
    
    const result = await this.db.query(query, [...values, whereValue]);
    return this.mapResult(result.rows[0]) as T;
  }

  async findOne<T>(model: string, where: any): Promise<T | null> {
    // Handle where clause - assume simple id-based for now
    const whereClause = typeof where === 'object' && where.id ? 'id = $1' : 'id = $1';
    const whereValue = typeof where === 'object' && where.id ? where.id : where;
    
    const query = `SELECT * FROM ${this.getTableName(model)} WHERE ${whereClause} LIMIT 1`;
    const result = await this.db.query(query, [whereValue]);
    
    return result.rows.length > 0 ? this.mapResult(result.rows[0]) as T : null;
  }

  async findMany<T>(model: string, where?: any): Promise<T[]> {
    let query = `SELECT * FROM ${this.getTableName(model)}`;
    const params: any[] = [];
    
    if (where) {
      if (typeof where === 'object' && where.id) {
        query += ' WHERE id = $1';
        params.push(where.id);
      } else if (typeof where === 'string') {
        query += ' WHERE id = $1';
        params.push(where);
      } else if (typeof where === 'object' && where.customerId) {
        query += ' WHERE customer_id = $1';
        params.push(where.customerId);
      }
    }
    
    const result = await this.db.query(query, params);
    return result.rows.map(row => this.mapResult(row)) as T[];
  }

  async delete(model: string, where: any): Promise<void> {
    const whereClause = typeof where === 'object' && where.id ? 'id = $1' : 'id = $1';
    const whereValue = typeof where === 'object' && where.id ? where.id : where;
    
    const query = `DELETE FROM ${this.getTableName(model)} WHERE ${whereClause}`;
    await this.db.query(query, [whereValue]);
  }

  private getTableName(model: string): string {
    // Convert model names to table names
    const tableMap: Record<string, string> = {
      customer: 'customer',
      subscription: 'subscription',
      subscriptionItem: 'subscription_item',
      invoice: 'invoice',
      usage: 'usage',
      paymentMethod: 'payment_method',
    };
    
    return tableMap[model] || model;
  }

  private toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
  }

  private mapResult(row: any): any {
    if (!row) return row;
    
    // Convert snake_case back to camelCase for certain fields
    const mapped: any = {};
    
    for (const [key, value] of Object.entries(row)) {
      const camelKey = this.toCamelCase(key);
      mapped[camelKey] = value;
    }
    
    return mapped;
  }

  private toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }
}