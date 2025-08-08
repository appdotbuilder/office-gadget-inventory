import { db } from '../db';
import { notificationsTable } from '../db/schema';
import { eq, count } from 'drizzle-orm';

export const getUnreadNotificationsCount = async (): Promise<number> => {
  try {
    // Query count of unread notifications (read = false)
    const result = await db.select({ count: count() })
      .from(notificationsTable)
      .where(eq(notificationsTable.read, false))
      .execute();

    return result[0]?.count || 0;
  } catch (error) {
    console.error('Failed to get unread notifications count:', error);
    throw error;
  }
};