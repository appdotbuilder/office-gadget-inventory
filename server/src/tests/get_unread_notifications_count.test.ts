import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { notificationsTable } from '../db/schema';
import { type CreateNotificationInput } from '../schema';
import { getUnreadNotificationsCount } from '../handlers/get_unread_notifications_count';

// Test notification inputs
const unreadNotification1: CreateNotificationInput = {
  title: 'Test Notification 1',
  message: 'This is an unread notification',
  type: 'info',
  entity_type: 'task',
  entity_id: 1
};

const unreadNotification2: CreateNotificationInput = {
  title: 'Test Notification 2',
  message: 'Another unread notification',
  type: 'warning',
  entity_type: null,
  entity_id: null
};

const readNotification: CreateNotificationInput = {
  title: 'Read Notification',
  message: 'This notification is already read',
  type: 'success',
  entity_type: 'product',
  entity_id: 5
};

describe('getUnreadNotificationsCount', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return 0 when no notifications exist', async () => {
    const count = await getUnreadNotificationsCount();
    
    expect(count).toEqual(0);
    expect(typeof count).toBe('number');
  });

  it('should return correct count with only unread notifications', async () => {
    // Insert unread notifications (read defaults to false)
    await db.insert(notificationsTable)
      .values([
        {
          title: unreadNotification1.title,
          message: unreadNotification1.message,
          type: unreadNotification1.type,
          entity_type: unreadNotification1.entity_type,
          entity_id: unreadNotification1.entity_id
        },
        {
          title: unreadNotification2.title,
          message: unreadNotification2.message,
          type: unreadNotification2.type,
          entity_type: unreadNotification2.entity_type,
          entity_id: unreadNotification2.entity_id
        }
      ])
      .execute();

    const count = await getUnreadNotificationsCount();
    
    expect(count).toEqual(2);
    expect(typeof count).toBe('number');
  });

  it('should return 0 when all notifications are read', async () => {
    // Insert notifications with read = true
    await db.insert(notificationsTable)
      .values([
        {
          title: readNotification.title,
          message: readNotification.message,
          type: readNotification.type,
          read: true, // Explicitly set to read
          entity_type: readNotification.entity_type,
          entity_id: readNotification.entity_id
        }
      ])
      .execute();

    const count = await getUnreadNotificationsCount();
    
    expect(count).toEqual(0);
    expect(typeof count).toBe('number');
  });

  it('should return correct count with mixed read/unread notifications', async () => {
    // Insert mix of read and unread notifications
    await db.insert(notificationsTable)
      .values([
        // Unread notifications (read defaults to false)
        {
          title: unreadNotification1.title,
          message: unreadNotification1.message,
          type: unreadNotification1.type,
          entity_type: unreadNotification1.entity_type,
          entity_id: unreadNotification1.entity_id
        },
        {
          title: unreadNotification2.title,
          message: unreadNotification2.message,
          type: unreadNotification2.type,
          entity_type: unreadNotification2.entity_type,
          entity_id: unreadNotification2.entity_id
        },
        // Read notifications
        {
          title: readNotification.title,
          message: readNotification.message,
          type: readNotification.type,
          read: true,
          entity_type: readNotification.entity_type,
          entity_id: readNotification.entity_id
        },
        {
          title: 'Another Read Notification',
          message: 'This is also read',
          type: 'error',
          read: true,
          entity_type: null,
          entity_id: null
        }
      ])
      .execute();

    const count = await getUnreadNotificationsCount();
    
    expect(count).toEqual(2); // Only the unread ones should be counted
    expect(typeof count).toBe('number');
  });

  it('should handle large number of notifications efficiently', async () => {
    // Create a large number of notifications (mix of read/unread)
    const notifications = [];
    const unreadCount = 50;
    const readCount = 30;

    // Add unread notifications
    for (let i = 0; i < unreadCount; i++) {
      notifications.push({
        title: `Unread Notification ${i}`,
        message: `Message ${i}`,
        type: 'info' as const,
        read: false, // Explicitly unread
        entity_type: null,
        entity_id: null
      });
    }

    // Add read notifications
    for (let i = 0; i < readCount; i++) {
      notifications.push({
        title: `Read Notification ${i}`,
        message: `Read Message ${i}`,
        type: 'success' as const,
        read: true, // Explicitly read
        entity_type: null,
        entity_id: null
      });
    }

    await db.insert(notificationsTable)
      .values(notifications)
      .execute();

    const count = await getUnreadNotificationsCount();
    
    expect(count).toEqual(unreadCount);
    expect(typeof count).toBe('number');
  });

  it('should handle different notification types and entity associations', async () => {
    // Insert notifications with various types and entity associations
    await db.insert(notificationsTable)
      .values([
        {
          title: 'Task Notification',
          message: 'Task related notification',
          type: 'info',
          read: false, // Unread
          entity_type: 'task',
          entity_id: 1
        },
        {
          title: 'Product Notification',
          message: 'Product related notification',
          type: 'warning',
          read: false, // Unread
          entity_type: 'product',
          entity_id: 2
        },
        {
          title: 'Customer Notification',
          message: 'Customer related notification',
          type: 'error',
          read: true, // Read
          entity_type: 'customer',
          entity_id: 3
        },
        {
          title: 'General Notification',
          message: 'No entity association',
          type: 'success',
          read: false, // Unread
          entity_type: null,
          entity_id: null
        }
      ])
      .execute();

    const count = await getUnreadNotificationsCount();
    
    expect(count).toEqual(3); // 3 unread notifications regardless of type/entity
    expect(typeof count).toBe('number');
  });
});