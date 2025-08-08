import { type CreateNotificationInput, type Notification } from '../schema';

export async function createNotification(input: CreateNotificationInput): Promise<Notification> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is creating a new notification and persisting it in the database.
    // Should be used internally by other handlers to create system notifications.
    return Promise.resolve({
        id: 0, // Placeholder ID
        title: input.title,
        message: input.message,
        type: input.type,
        read: false,
        entity_type: input.entity_type,
        entity_id: input.entity_id,
        created_at: new Date(),
    } as Notification);
}