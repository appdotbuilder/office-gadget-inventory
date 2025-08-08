import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable, notificationsTable } from '../db/schema';
import { type DeleteInput, type CreateTaskInput, type CreateNotificationInput } from '../schema';
import { deleteTask } from '../handlers/delete_task';
import { eq, and } from 'drizzle-orm';

// Helper function to create a test task
const createTestTask = async (taskData: CreateTaskInput) => {
  const result = await db.insert(tasksTable)
    .values({
      title: taskData.title,
      description: taskData.description,
      status: taskData.status,
      priority: taskData.priority,
      due_date: taskData.due_date,
    })
    .returning()
    .execute();
  
  return result[0];
};

// Helper function to create a test notification
const createTestNotification = async (notificationData: CreateNotificationInput) => {
  const result = await db.insert(notificationsTable)
    .values({
      title: notificationData.title,
      message: notificationData.message,
      type: notificationData.type,
      entity_type: notificationData.entity_type,
      entity_id: notificationData.entity_id,
    })
    .returning()
    .execute();
  
  return result[0];
};

const testTaskInput: CreateTaskInput = {
  title: 'Test Task for Deletion',
  description: 'A task to be deleted',
  status: 'pending',
  priority: 'medium',
  due_date: new Date('2024-12-31'),
};

describe('deleteTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a task', async () => {
    // Create test task
    const task = await createTestTask(testTaskInput);
    
    const deleteInput: DeleteInput = { id: task.id };
    
    // Delete the task
    await deleteTask(deleteInput);

    // Verify task was deleted
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, task.id))
      .execute();

    expect(tasks).toHaveLength(0);
  });

  it('should delete related notifications when deleting a task', async () => {
    // Create test task
    const task = await createTestTask(testTaskInput);
    
    // Create related notifications
    const notification1: CreateNotificationInput = {
      title: 'Task notification 1',
      message: 'First notification for task',
      type: 'info',
      entity_type: 'task',
      entity_id: task.id,
    };
    
    const notification2: CreateNotificationInput = {
      title: 'Task notification 2',
      message: 'Second notification for task',
      type: 'warning',
      entity_type: 'task',
      entity_id: task.id,
    };
    
    await createTestNotification(notification1);
    await createTestNotification(notification2);
    
    // Verify notifications exist before deletion
    const notificationsBefore = await db.select()
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.entity_type, 'task'),
          eq(notificationsTable.entity_id, task.id)
        )
      )
      .execute();
    
    expect(notificationsBefore).toHaveLength(2);
    
    const deleteInput: DeleteInput = { id: task.id };
    
    // Delete the task
    await deleteTask(deleteInput);

    // Verify task was deleted
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, task.id))
      .execute();

    expect(tasks).toHaveLength(0);
    
    // Verify related notifications were also deleted
    const notificationsAfter = await db.select()
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.entity_type, 'task'),
          eq(notificationsTable.entity_id, task.id)
        )
      )
      .execute();

    expect(notificationsAfter).toHaveLength(0);
  });

  it('should not delete unrelated notifications', async () => {
    // Create test task
    const task = await createTestTask(testTaskInput);
    
    // Create another task
    const otherTask = await createTestTask({
      ...testTaskInput,
      title: 'Other Task',
    });
    
    // Create notification for first task
    const taskNotification: CreateNotificationInput = {
      title: 'Task notification',
      message: 'Notification for first task',
      type: 'info',
      entity_type: 'task',
      entity_id: task.id,
    };
    
    // Create notification for second task
    const otherTaskNotification: CreateNotificationInput = {
      title: 'Other task notification',
      message: 'Notification for second task',
      type: 'info',
      entity_type: 'task',
      entity_id: otherTask.id,
    };
    
    // Create unrelated notification (different entity type)
    const unrelatedNotification: CreateNotificationInput = {
      title: 'Product notification',
      message: 'Notification for a product',
      type: 'info',
      entity_type: 'product',
      entity_id: 1,
    };
    
    await createTestNotification(taskNotification);
    await createTestNotification(otherTaskNotification);
    await createTestNotification(unrelatedNotification);
    
    const deleteInput: DeleteInput = { id: task.id };
    
    // Delete the first task
    await deleteTask(deleteInput);

    // Verify first task was deleted
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, task.id))
      .execute();

    expect(tasks).toHaveLength(0);
    
    // Verify second task still exists
    const otherTasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, otherTask.id))
      .execute();

    expect(otherTasks).toHaveLength(1);
    
    // Verify only the related notification was deleted
    const remainingNotifications = await db.select()
      .from(notificationsTable)
      .execute();

    expect(remainingNotifications).toHaveLength(2);
    
    // Verify the specific notifications that should remain
    const otherTaskNotifications = await db.select()
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.entity_type, 'task'),
          eq(notificationsTable.entity_id, otherTask.id)
        )
      )
      .execute();
      
    const productNotifications = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.entity_type, 'product'))
      .execute();

    expect(otherTaskNotifications).toHaveLength(1);
    expect(productNotifications).toHaveLength(1);
  });

  it('should handle deletion of non-existent task gracefully', async () => {
    const deleteInput: DeleteInput = { id: 99999 };
    
    // Should not throw an error when trying to delete non-existent task
    await expect(deleteTask(deleteInput)).resolves.toBeUndefined();
    
    // Verify no tasks or notifications were affected
    const allTasks = await db.select().from(tasksTable).execute();
    const allNotifications = await db.select().from(notificationsTable).execute();
    
    expect(allTasks).toHaveLength(0);
    expect(allNotifications).toHaveLength(0);
  });

  it('should handle task with no related notifications', async () => {
    // Create test task without any notifications
    const task = await createTestTask(testTaskInput);
    
    const deleteInput: DeleteInput = { id: task.id };
    
    // Delete the task
    await deleteTask(deleteInput);

    // Verify task was deleted
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, task.id))
      .execute();

    expect(tasks).toHaveLength(0);
  });
});