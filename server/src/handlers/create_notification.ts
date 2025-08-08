import { db } from '../db';
import { notificationsTable } from '../db/schema';
import { type CreateNotificationInput, type Notification } from '../schema';

export async function createNotification(input: CreateNotificationInput): Promise<Notification> {
  try {
    // Insert notification record
    const result = await db.insert(notificationsTable)
      .values({
        title: input.title,
        message: input.message,
        type: input.type,
        entity_type: input.entity_type,
        entity_id: input.entity_id,
        read: false, // Default value
      })
      .returning()
      .execute();

    // Return the created notification
    const notification = result[0];
    return {
      ...notification,
    };
  } catch (error) {
    console.error('Notification creation failed:', error);
    throw error;
  }
}