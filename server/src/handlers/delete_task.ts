import { db } from '../db';
import { tasksTable, notificationsTable } from '../db/schema';
import { type DeleteInput } from '../schema';
import { eq, and } from 'drizzle-orm';

export const deleteTask = async (input: DeleteInput): Promise<void> => {
  try {
    // Delete related notifications first (foreign key constraint)
    await db.delete(notificationsTable)
      .where(
        and(
          eq(notificationsTable.entity_type, 'task'),
          eq(notificationsTable.entity_id, input.id)
        )
      )
      .execute();

    // Delete the task
    await db.delete(tasksTable)
      .where(eq(tasksTable.id, input.id))
      .execute();
  } catch (error) {
    console.error('Task deletion failed:', error);
    throw error;
  }
};