import { db } from '../db';
import { productsTable, inventoryTable, notificationsTable } from '../db/schema';
import { type DeleteInput } from '../schema';
import { eq } from 'drizzle-orm';

export const deleteProduct = async (input: DeleteInput): Promise<void> => {
  try {
    // First, delete related inventory entries
    await db.delete(inventoryTable)
      .where(eq(inventoryTable.product_id, input.id))
      .execute();

    // Delete related notifications
    await db.delete(notificationsTable)
      .where(eq(notificationsTable.entity_id, input.id))
      .execute();

    // Finally, delete the product
    await db.delete(productsTable)
      .where(eq(productsTable.id, input.id))
      .execute();
  } catch (error) {
    console.error('Product deletion failed:', error);
    throw error;
  }
};