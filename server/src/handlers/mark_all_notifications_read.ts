import { db } from '../db';
import { notificationsTable } from '../db/schema';

export async function markAllNotificationsRead(): Promise<void> {
  try {
    // Update all notifications to mark them as read
    await db.update(notificationsTable)
      .set({ read: true })
      .execute();
  } catch (error) {
    console.error('Mark all notifications read failed:', error);
    throw error;
  }
}