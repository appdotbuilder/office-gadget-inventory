import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { notificationsTable } from '../db/schema';
import { markAllNotificationsRead } from '../handlers/mark_all_notifications_read';
import { eq } from 'drizzle-orm';

describe('markAllNotificationsRead', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should mark all notifications as read', async () => {
    // Create test notifications - some read, some unread
    const testNotifications = [
      {
        title: 'Test Notification 1',
        message: 'First test message',
        type: 'info' as const,
        read: false,
        entity_type: null,
        entity_id: null
      },
      {
        title: 'Test Notification 2',
        message: 'Second test message',
        type: 'warning' as const,
        read: true,
        entity_type: 'task' as const,
        entity_id: 1
      },
      {
        title: 'Test Notification 3',
        message: 'Third test message',
        type: 'error' as const,
        read: false,
        entity_type: 'product' as const,
        entity_id: 2
      }
    ];

    // Insert test notifications
    await db.insert(notificationsTable)
      .values(testNotifications)
      .execute();

    // Verify initial state - should have both read and unread notifications
    const beforeUpdate = await db.select()
      .from(notificationsTable)
      .execute();

    expect(beforeUpdate).toHaveLength(3);
    expect(beforeUpdate.filter(n => n.read)).toHaveLength(1);
    expect(beforeUpdate.filter(n => !n.read)).toHaveLength(2);

    // Execute the handler
    await markAllNotificationsRead();

    // Verify all notifications are now marked as read
    const afterUpdate = await db.select()
      .from(notificationsTable)
      .execute();

    expect(afterUpdate).toHaveLength(3);
    expect(afterUpdate.every(n => n.read)).toBe(true);
    
    // Verify specific notifications
    afterUpdate.forEach(notification => {
      expect(notification.read).toBe(true);
      expect(notification.title).toBeDefined();
      expect(notification.message).toBeDefined();
      expect(notification.type).toBeDefined();
    });
  });

  it('should handle empty notifications table gracefully', async () => {
    // Verify table is empty
    const before = await db.select()
      .from(notificationsTable)
      .execute();

    expect(before).toHaveLength(0);

    // Should not throw error with empty table
    await expect(markAllNotificationsRead()).resolves.toBeUndefined();

    // Table should still be empty
    const after = await db.select()
      .from(notificationsTable)
      .execute();

    expect(after).toHaveLength(0);
  });

  it('should not affect other notification fields', async () => {
    // Create a test notification with specific values
    const testNotification = {
      title: 'Important Notification',
      message: 'This is important',
      type: 'success' as const,
      read: false,
      entity_type: 'customer' as const,
      entity_id: 5
    };

    const [inserted] = await db.insert(notificationsTable)
      .values(testNotification)
      .returning()
      .execute();

    // Mark all as read
    await markAllNotificationsRead();

    // Retrieve the updated notification
    const [updated] = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.id, inserted.id))
      .execute();

    // Verify only the read field changed
    expect(updated.read).toBe(true);
    expect(updated.title).toEqual(testNotification.title);
    expect(updated.message).toEqual(testNotification.message);
    expect(updated.type).toEqual(testNotification.type);
    expect(updated.entity_type).toEqual(testNotification.entity_type);
    expect(updated.entity_id).toEqual(testNotification.entity_id);
    expect(updated.created_at).toBeInstanceOf(Date);
  });

  it('should work with mixed entity types and null values', async () => {
    // Create notifications with different entity types and null values
    const mixedNotifications = [
      {
        title: 'Task Notification',
        message: 'Task related',
        type: 'info' as const,
        read: false,
        entity_type: 'task' as const,
        entity_id: 1
      },
      {
        title: 'Product Notification',
        message: 'Product related',
        type: 'warning' as const,
        read: false,
        entity_type: 'product' as const,
        entity_id: 2
      },
      {
        title: 'General Notification',
        message: 'No specific entity',
        type: 'error' as const,
        read: false,
        entity_type: null,
        entity_id: null
      }
    ];

    await db.insert(notificationsTable)
      .values(mixedNotifications)
      .execute();

    // Mark all as read
    await markAllNotificationsRead();

    // Verify all are marked as read regardless of entity type
    const results = await db.select()
      .from(notificationsTable)
      .execute();

    expect(results).toHaveLength(3);
    results.forEach(notification => {
      expect(notification.read).toBe(true);
    });

    // Verify entity information is preserved
    const taskNotification = results.find(n => n.entity_type === 'task');
    const productNotification = results.find(n => n.entity_type === 'product');
    const generalNotification = results.find(n => n.entity_type === null);

    expect(taskNotification?.entity_id).toBe(1);
    expect(productNotification?.entity_id).toBe(2);
    expect(generalNotification?.entity_id).toBe(null);
  });
});