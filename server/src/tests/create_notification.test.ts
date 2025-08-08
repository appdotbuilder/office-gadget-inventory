import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { notificationsTable } from '../db/schema';
import { type CreateNotificationInput } from '../schema';
import { createNotification } from '../handlers/create_notification';
import { eq } from 'drizzle-orm';

// Test input for a basic notification
const testInput: CreateNotificationInput = {
  title: 'Test Notification',
  message: 'This is a test notification message',
  type: 'info',
  entity_type: 'task',
  entity_id: 123,
};

// Test input with null entity references
const testInputWithNulls: CreateNotificationInput = {
  title: 'System Notification',
  message: 'System-wide notification without entity reference',
  type: 'warning',
  entity_type: null,
  entity_id: null,
};

describe('createNotification', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a notification with entity reference', async () => {
    const result = await createNotification(testInput);

    // Basic field validation
    expect(result.title).toEqual('Test Notification');
    expect(result.message).toEqual('This is a test notification message');
    expect(result.type).toEqual('info');
    expect(result.entity_type).toEqual('task');
    expect(result.entity_id).toEqual(123);
    expect(result.read).toEqual(false);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a notification without entity reference', async () => {
    const result = await createNotification(testInputWithNulls);

    // Validate null fields are handled correctly
    expect(result.title).toEqual('System Notification');
    expect(result.message).toEqual('System-wide notification without entity reference');
    expect(result.type).toEqual('warning');
    expect(result.entity_type).toBeNull();
    expect(result.entity_id).toBeNull();
    expect(result.read).toEqual(false);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save notification to database', async () => {
    const result = await createNotification(testInput);

    // Query using proper drizzle syntax
    const notifications = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.id, result.id))
      .execute();

    expect(notifications).toHaveLength(1);
    expect(notifications[0].title).toEqual('Test Notification');
    expect(notifications[0].message).toEqual(testInput.message);
    expect(notifications[0].type).toEqual('info');
    expect(notifications[0].entity_type).toEqual('task');
    expect(notifications[0].entity_id).toEqual(123);
    expect(notifications[0].read).toEqual(false);
    expect(notifications[0].created_at).toBeInstanceOf(Date);
  });

  it('should create different notification types correctly', async () => {
    // Test all notification types
    const notificationTypes = ['info', 'warning', 'error', 'success'] as const;
    const createdNotifications = [];

    for (const type of notificationTypes) {
      const input: CreateNotificationInput = {
        title: `${type.toUpperCase()} Notification`,
        message: `This is a ${type} notification`,
        type: type,
        entity_type: 'product',
        entity_id: 456,
      };

      const result = await createNotification(input);
      createdNotifications.push(result);
      
      expect(result.type).toEqual(type);
      expect(result.title).toEqual(`${type.toUpperCase()} Notification`);
    }

    // Verify all were saved
    const allNotifications = await db.select()
      .from(notificationsTable)
      .execute();

    expect(allNotifications).toHaveLength(4);
    
    // Verify each type exists
    for (const type of notificationTypes) {
      const typeNotifications = allNotifications.filter(n => n.type === type);
      expect(typeNotifications).toHaveLength(1);
    }
  });

  it('should create notifications for different entity types', async () => {
    const entityTypes = ['task', 'product', 'inventory', 'customer'] as const;

    for (const entityType of entityTypes) {
      const input: CreateNotificationInput = {
        title: `${entityType} Notification`,
        message: `Notification for ${entityType} entity`,
        type: 'info',
        entity_type: entityType,
        entity_id: 789,
      };

      const result = await createNotification(input);
      expect(result.entity_type).toEqual(entityType);
    }

    // Verify all entity types were created
    const allNotifications = await db.select()
      .from(notificationsTable)
      .execute();

    expect(allNotifications).toHaveLength(4);

    for (const entityType of entityTypes) {
      const entityNotifications = allNotifications.filter(n => n.entity_type === entityType);
      expect(entityNotifications).toHaveLength(1);
    }
  });

  it('should handle multiple notifications with same parameters', async () => {
    // Create multiple identical notifications
    const results = [];
    for (let i = 0; i < 3; i++) {
      const result = await createNotification(testInput);
      results.push(result);
    }

    // Each should have unique ID and timestamp
    expect(results).toHaveLength(3);
    
    const ids = results.map(r => r.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toEqual(3); // All IDs should be unique

    // Verify all were saved to database
    const allNotifications = await db.select()
      .from(notificationsTable)
      .execute();

    expect(allNotifications).toHaveLength(3);
  });
});