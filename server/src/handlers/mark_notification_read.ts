import { db } from '../db';
import { notificationsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type MarkNotificationReadInput, type Notification } from '../schema';

export async function markNotificationRead(input: MarkNotificationReadInput): Promise<Notification> {
  try {
    // Update the notification's read status to true
    const result = await db.update(notificationsTable)
      .set({ 
        read: true 
      })
      .where(eq(notificationsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Notification with ID ${input.id} not found`);
    }

    // Return the updated notification
    return result[0];
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    throw error;
  }
}