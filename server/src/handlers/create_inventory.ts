import { db } from '../db';
import { inventoryTable, productsTable, notificationsTable } from '../db/schema';
import { type CreateInventoryInput, type Inventory } from '../schema';
import { eq } from 'drizzle-orm';

export const createInventory = async (input: CreateInventoryInput): Promise<Inventory> => {
  try {
    // First, validate that the product exists
    const product = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, input.product_id))
      .execute();

    if (product.length === 0) {
      throw new Error(`Product with ID ${input.product_id} does not exist`);
    }

    // Insert inventory record
    const result = await db.insert(inventoryTable)
      .values({
        product_id: input.product_id,
        quantity: input.quantity,
        min_stock_level: input.min_stock_level,
        max_stock_level: input.max_stock_level,
        location: input.location
      })
      .returning()
      .execute();

    const inventory = result[0];

    // Create a notification if quantity is below minimum stock level
    if (input.quantity < input.min_stock_level) {
      await db.insert(notificationsTable)
        .values({
          title: 'Low Stock Alert',
          message: `Product "${product[0].name}" (SKU: ${product[0].sku}) has quantity ${input.quantity} which is below minimum stock level of ${input.min_stock_level}.`,
          type: 'warning',
          entity_type: 'inventory',
          entity_id: inventory.id
        })
        .execute();
    }

    return inventory;
  } catch (error) {
    console.error('Inventory creation failed:', error);
    throw error;
  }
};