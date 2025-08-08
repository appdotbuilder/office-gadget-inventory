import { db } from '../db';
import { notificationsTable } from '../db/schema';
import { type Notification } from '../schema';
import { desc } from 'drizzle-orm';

export async function getNotifications(): Promise<Notification[]> {
  try {
    // Fetch all notifications ordered by created_at descending (newest first)
    const results = await db.select()
      .from(notificationsTable)
      .orderBy(desc(notificationsTable.created_at))
      .execute();

    // Return the notifications (no numeric fields to convert in this table)
    return results;
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    throw error;
  }
}