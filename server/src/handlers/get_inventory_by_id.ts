import { db } from '../db';
import { inventoryTable, productsTable } from '../db/schema';
import { type Inventory } from '../schema';
import { eq } from 'drizzle-orm';

export async function getInventoryById(id: number): Promise<Inventory | null> {
  try {
    // Query inventory with product information using join
    const results = await db.select()
      .from(inventoryTable)
      .innerJoin(productsTable, eq(inventoryTable.product_id, productsTable.id))
      .where(eq(inventoryTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    // Extract inventory data from joined result
    const inventoryData = results[0].inventory;

    // Return inventory data with proper type conversion
    return {
      id: inventoryData.id,
      product_id: inventoryData.product_id,
      quantity: inventoryData.quantity,
      min_stock_level: inventoryData.min_stock_level,
      max_stock_level: inventoryData.max_stock_level,
      location: inventoryData.location,
      last_updated: inventoryData.last_updated
    };
  } catch (error) {
    console.error('Get inventory by ID failed:', error);
    throw error;
  }
}