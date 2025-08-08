import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { notificationsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type MarkNotificationReadInput } from '../schema';
import { markNotificationRead } from '../handlers/mark_notification_read';

describe('markNotificationRead', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should mark an unread notification as read', async () => {
    // Create an unread notification
    const [notification] = await db.insert(notificationsTable)
      .values({
        title: 'Test Notification',
        message: 'This is a test notification',
        type: 'info',
        read: false,
        entity_type: 'task',
        entity_id: 1
      })
      .returning()
      .execute();

    const input: MarkNotificationReadInput = {
      id: notification.id
    };

    const result = await markNotificationRead(input);

    // Verify the notification is marked as read
    expect(result.id).toEqual(notification.id);
    expect(result.title).toEqual('Test Notification');
    expect(result.message).toEqual('This is a test notification');
    expect(result.type).toEqual('info');
    expect(result.read).toBe(true);
    expect(result.entity_type).toEqual('task');
    expect(result.entity_id).toEqual(1);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update notification in database', async () => {
    // Create an unread notification
    const [notification] = await db.insert(notificationsTable)
      .values({
        title: 'Database Test',
        message: 'Testing database update',
        type: 'warning',
        read: false,
        entity_type: null,
        entity_id: null
      })
      .returning()
      .execute();

    await markNotificationRead({ id: notification.id });

    // Query the database to verify the update
    const updatedNotifications = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.id, notification.id))
      .execute();

    expect(updatedNotifications).toHaveLength(1);
    expect(updatedNotifications[0].read).toBe(true);
    expect(updatedNotifications[0].title).toEqual('Database Test');
    expect(updatedNotifications[0].type).toEqual('warning');
  });

  it('should handle already read notification', async () => {
    // Create a notification that's already read
    const [notification] = await db.insert(notificationsTable)
      .values({
        title: 'Already Read',
        message: 'This notification is already read',
        type: 'success',
        read: true,
        entity_type: 'product',
        entity_id: 5
      })
      .returning()
      .execute();

    const result = await markNotificationRead({ id: notification.id });

    // Should still work and return the notification
    expect(result.read).toBe(true);
    expect(result.title).toEqual('Already Read');
    expect(result.entity_type).toEqual('product');
    expect(result.entity_id).toEqual(5);
  });

  it('should throw error for non-existent notification', async () => {
    const nonExistentId = 99999;
    const input: MarkNotificationReadInput = {
      id: nonExistentId
    };

    await expect(markNotificationRead(input)).rejects.toThrow(/not found/i);
  });

  it('should handle notifications with different entity types', async () => {
    // Create notifications with different entity types
    const notifications = await db.insert(notificationsTable)
      .values([
        {
          title: 'Customer Notification',
          message: 'Customer related notification',
          type: 'info',
          read: false,
          entity_type: 'customer',
          entity_id: 10
        },
        {
          title: 'Inventory Notification',
          message: 'Inventory related notification',
          type: 'error',
          read: false,
          entity_type: 'inventory',
          entity_id: 20
        }
      ])
      .returning()
      .execute();

    // Mark first notification as read
    const result1 = await markNotificationRead({ id: notifications[0].id });
    expect(result1.read).toBe(true);
    expect(result1.entity_type).toEqual('customer');
    expect(result1.entity_id).toEqual(10);

    // Mark second notification as read
    const result2 = await markNotificationRead({ id: notifications[1].id });
    expect(result2.read).toBe(true);
    expect(result2.entity_type).toEqual('inventory');
    expect(result2.entity_id).toEqual(20);
  });

  it('should preserve all other notification fields', async () => {
    // Create notification with all possible field values
    const [notification] = await db.insert(notificationsTable)
      .values({
        title: 'Complete Notification',
        message: 'This notification has all fields populated',
        type: 'warning',
        read: false,
        entity_type: 'task',
        entity_id: 42
      })
      .returning()
      .execute();

    const result = await markNotificationRead({ id: notification.id });

    // Verify all fields are preserved except 'read' which should be updated
    expect(result.id).toEqual(notification.id);
    expect(result.title).toEqual(notification.title);
    expect(result.message).toEqual(notification.message);
    expect(result.type).toEqual(notification.type);
    expect(result.read).toBe(true); // This should be updated
    expect(result.entity_type).toEqual(notification.entity_type);
    expect(result.entity_id).toEqual(notification.entity_id);
    expect(result.created_at).toEqual(notification.created_at);
  });
});