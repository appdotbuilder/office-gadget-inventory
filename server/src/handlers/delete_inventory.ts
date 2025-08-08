import { db } from '../db';
import { inventoryTable, notificationsTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { type DeleteInput } from '../schema';

export async function deleteInventory(input: DeleteInput): Promise<void> {
  try {
    // Delete the inventory record
    await db.delete(inventoryTable)
      .where(eq(inventoryTable.id, input.id))
      .execute();

    // Delete related notifications
    await db.delete(notificationsTable)
      .where(
        and(
          eq(notificationsTable.entity_type, 'inventory'),
          eq(notificationsTable.entity_id, input.id)
        )
      )
      .execute();
  } catch (error) {
    console.error('Inventory deletion failed:', error);
    throw error;
  }
}