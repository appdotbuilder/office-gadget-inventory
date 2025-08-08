import { db } from '../db';
import { inventoryTable, notificationsTable, productsTable } from '../db/schema';
import { type UpdateInventoryInput, type Inventory } from '../schema';
import { eq, and } from 'drizzle-orm';

export const updateInventory = async (input: UpdateInventoryInput): Promise<Inventory> => {
  try {
    // First, get the current inventory data to check if it exists and for notification logic
    const currentInventory = await db.select()
      .from(inventoryTable)
      .where(eq(inventoryTable.id, input.id))
      .execute();

    if (currentInventory.length === 0) {
      throw new Error(`Inventory item with id ${input.id} not found`);
    }

    // Build update object with only provided fields
    const updateData: any = {
      last_updated: new Date(), // Always update timestamp
    };

    if (input.product_id !== undefined) updateData.product_id = input.product_id;
    if (input.quantity !== undefined) updateData.quantity = input.quantity;
    if (input.min_stock_level !== undefined) updateData.min_stock_level = input.min_stock_level;
    if (input.max_stock_level !== undefined) updateData.max_stock_level = input.max_stock_level;
    if (input.location !== undefined) updateData.location = input.location;

    // Update the inventory record
    const result = await db.update(inventoryTable)
      .set(updateData)
      .where(eq(inventoryTable.id, input.id))
      .returning()
      .execute();

    const updatedInventory = result[0];

    // Check if quantity is below minimum stock level and create notification if needed
    const finalQuantity = input.quantity !== undefined ? input.quantity : currentInventory[0].quantity;
    const finalMinStockLevel = input.min_stock_level !== undefined ? input.min_stock_level : currentInventory[0].min_stock_level;
    
    if (finalQuantity < finalMinStockLevel) {
      // Get product name for notification
      const productResult = await db.select()
        .from(productsTable)
        .where(eq(productsTable.id, updatedInventory.product_id))
        .execute();
      
      const productName = productResult.length > 0 ? productResult[0].name : 'Unknown Product';
      
      // Create low stock notification
      await db.insert(notificationsTable)
        .values({
          title: 'Low Stock Alert',
          message: `${productName} inventory is below minimum stock level. Current: ${finalQuantity}, Minimum: ${finalMinStockLevel}`,
          type: 'warning',
          entity_type: 'inventory',
          entity_id: updatedInventory.id,
        })
        .execute();
    }

    return updatedInventory;
  } catch (error) {
    console.error('Inventory update failed:', error);
    throw error;
  }
};