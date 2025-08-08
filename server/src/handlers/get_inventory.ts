import { db } from '../db';
import { inventoryTable, productsTable } from '../db/schema';
import { type Inventory } from '../schema';
import { eq, lte, and, type SQL } from 'drizzle-orm';

export interface GetInventoryFilters {
  location?: string;
  lowStockOnly?: boolean;
}

export const getInventory = async (filters: GetInventoryFilters = {}): Promise<Inventory[]> => {
  try {
    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    if (filters.location) {
      conditions.push(eq(inventoryTable.location, filters.location));
    }

    if (filters.lowStockOnly) {
      // Filter for items where quantity is less than or equal to min_stock_level
      conditions.push(lte(inventoryTable.quantity, inventoryTable.min_stock_level));
    }

    // Build query with conditional where clause
    const baseQuery = db.select({
      id: inventoryTable.id,
      product_id: inventoryTable.product_id,
      quantity: inventoryTable.quantity,
      min_stock_level: inventoryTable.min_stock_level,
      max_stock_level: inventoryTable.max_stock_level,
      location: inventoryTable.location,
      last_updated: inventoryTable.last_updated,
      // Include product information
      product_name: productsTable.name,
      product_sku: productsTable.sku,
      product_category: productsTable.category,
    }).from(inventoryTable)
      .innerJoin(productsTable, eq(inventoryTable.product_id, productsTable.id));

    // Apply conditions if any exist
    const query = conditions.length > 0
      ? baseQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions))
      : baseQuery;

    const results = await query.execute();

    // Transform results to match Inventory schema with additional product info
    return results.map(result => ({
      id: result.id,
      product_id: result.product_id,
      quantity: result.quantity,
      min_stock_level: result.min_stock_level,
      max_stock_level: result.max_stock_level,
      location: result.location,
      last_updated: result.last_updated,
      // Include product information as additional properties
      product_name: result.product_name,
      product_sku: result.product_sku,
      product_category: result.product_category,
    } as Inventory & {
      product_name: string;
      product_sku: string;
      product_category: string | null;
    }));
  } catch (error) {
    console.error('Get inventory failed:', error);
    throw error;
  }
};