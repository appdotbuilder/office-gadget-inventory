import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { notificationsTable } from '../db/schema';
import { type CreateNotificationInput } from '../schema';
import { getNotifications } from '../handlers/get_notifications';

describe('getNotifications', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test notifications
  const createTestNotification = async (notification: CreateNotificationInput) => {
    const result = await db.insert(notificationsTable)
      .values({
        title: notification.title,
        message: notification.message,
        type: notification.type,
        entity_type: notification.entity_type,
        entity_id: notification.entity_id,
      })
      .returning()
      .execute();

    return result[0];
  };

  it('should return empty array when no notifications exist', async () => {
    const result = await getNotifications();

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('should return all notifications', async () => {
    // Create test notifications
    await createTestNotification({
      title: 'First Notification',
      message: 'This is the first notification',
      type: 'info',
      entity_type: null,
      entity_id: null,
    });

    await createTestNotification({
      title: 'Second Notification',
      message: 'This is the second notification',
      type: 'warning',
      entity_type: 'task',
      entity_id: 1,
    });

    await createTestNotification({
      title: 'Third Notification',
      message: 'This is the third notification',
      type: 'error',
      entity_type: 'product',
      entity_id: 2,
    });

    const result = await getNotifications();

    expect(result).toHaveLength(3);

    // Verify all notifications are included
    const titles = result.map(n => n.title);
    expect(titles).toContain('First Notification');
    expect(titles).toContain('Second Notification');
    expect(titles).toContain('Third Notification');
  });

  it('should return notifications ordered by created_at descending (newest first)', async () => {
    // Create notifications with slight delays to ensure different timestamps
    const first = await createTestNotification({
      title: 'Oldest Notification',
      message: 'This was created first',
      type: 'info',
      entity_type: null,
      entity_id: null,
    });

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const second = await createTestNotification({
      title: 'Middle Notification',
      message: 'This was created second',
      type: 'warning',
      entity_type: 'task',
      entity_id: 1,
    });

    await new Promise(resolve => setTimeout(resolve, 10));

    const third = await createTestNotification({
      title: 'Newest Notification',
      message: 'This was created last',
      type: 'success',
      entity_type: 'customer',
      entity_id: 3,
    });

    const result = await getNotifications();

    expect(result).toHaveLength(3);

    // Verify correct ordering (newest first)
    expect(result[0].title).toEqual('Newest Notification');
    expect(result[1].title).toEqual('Middle Notification');
    expect(result[2].title).toEqual('Oldest Notification');

    // Verify timestamps are in descending order
    expect(result[0].created_at >= result[1].created_at).toBe(true);
    expect(result[1].created_at >= result[2].created_at).toBe(true);
  });

  it('should return notifications with correct field types and values', async () => {
    await createTestNotification({
      title: 'Test Notification',
      message: 'Testing field types and values',
      type: 'error',
      entity_type: 'inventory',
      entity_id: 42,
    });

    const result = await getNotifications();

    expect(result).toHaveLength(1);

    const notification = result[0];

    // Verify all required fields exist
    expect(notification.id).toBeDefined();
    expect(typeof notification.id).toEqual('number');
    expect(notification.title).toEqual('Test Notification');
    expect(notification.message).toEqual('Testing field types and values');
    expect(notification.type).toEqual('error');
    expect(notification.read).toEqual(false); // Default value
    expect(notification.entity_type).toEqual('inventory');
    expect(notification.entity_id).toEqual(42);
    expect(notification.created_at).toBeInstanceOf(Date);

    // Verify field types
    expect(typeof notification.title).toEqual('string');
    expect(typeof notification.message).toEqual('string');
    expect(typeof notification.type).toEqual('string');
    expect(typeof notification.read).toEqual('boolean');
    expect(typeof notification.entity_type).toEqual('string');
    expect(typeof notification.entity_id).toEqual('number');
  });

  it('should handle notifications with null entity fields', async () => {
    await createTestNotification({
      title: 'Notification without entity',
      message: 'This notification has no associated entity',
      type: 'info',
      entity_type: null,
      entity_id: null,
    });

    const result = await getNotifications();

    expect(result).toHaveLength(1);

    const notification = result[0];
    expect(notification.title).toEqual('Notification without entity');
    expect(notification.entity_type).toBeNull();
    expect(notification.entity_id).toBeNull();
  });

  it('should handle mixed notification types', async () => {
    // Create notifications with different types
    await createTestNotification({
      title: 'Info Notification',
      message: 'Information message',
      type: 'info',
      entity_type: null,
      entity_id: null,
    });

    await createTestNotification({
      title: 'Warning Notification',
      message: 'Warning message',
      type: 'warning',
      entity_type: 'task',
      entity_id: 1,
    });

    await createTestNotification({
      title: 'Error Notification',
      message: 'Error message',
      type: 'error',
      entity_type: 'product',
      entity_id: 2,
    });

    await createTestNotification({
      title: 'Success Notification',
      message: 'Success message',
      type: 'success',
      entity_type: 'customer',
      entity_id: 3,
    });

    const result = await getNotifications();

    expect(result).toHaveLength(4);

    // Verify all notification types are present
    const types = result.map(n => n.type);
    expect(types).toContain('info');
    expect(types).toContain('warning');
    expect(types).toContain('error');
    expect(types).toContain('success');
  });

  it('should handle notifications with different entity types', async () => {
    // Create notifications with different entity types
    await createTestNotification({
      title: 'Task Notification',
      message: 'Related to a task',
      type: 'info',
      entity_type: 'task',
      entity_id: 1,
    });

    await createTestNotification({
      title: 'Product Notification',
      message: 'Related to a product',
      type: 'warning',
      entity_type: 'product',
      entity_id: 2,
    });

    await createTestNotification({
      title: 'Inventory Notification',
      message: 'Related to inventory',
      type: 'error',
      entity_type: 'inventory',
      entity_id: 3,
    });

    await createTestNotification({
      title: 'Customer Notification',
      message: 'Related to a customer',
      type: 'success',
      entity_type: 'customer',
      entity_id: 4,
    });

    const result = await getNotifications();

    expect(result).toHaveLength(4);

    // Verify all entity types are present
    const entityTypes = result.map(n => n.entity_type);
    expect(entityTypes).toContain('task');
    expect(entityTypes).toContain('product');
    expect(entityTypes).toContain('inventory');
    expect(entityTypes).toContain('customer');
  });
});