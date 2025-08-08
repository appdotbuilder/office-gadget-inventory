import { db } from '../db';
import { customersTable, notificationsTable } from '../db/schema';
import { type DeleteInput } from '../schema';
import { eq, and } from 'drizzle-orm';

export const deleteCustomer = async (input: DeleteInput): Promise<void> => {
  try {
    // Delete related notifications first (to avoid foreign key constraints)
    await db.delete(notificationsTable)
      .where(
        and(
          eq(notificationsTable.entity_type, 'customer'),
          eq(notificationsTable.entity_id, input.id)
        )
      )
      .execute();

    // Delete the customer
    await db.delete(customersTable)
      .where(eq(customersTable.id, input.id))
      .execute();
  } catch (error) {
    console.error('Customer deletion failed:', error);
    throw error;
  }
};