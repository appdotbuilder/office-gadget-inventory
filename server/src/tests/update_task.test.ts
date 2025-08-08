import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable, notificationsTable } from '../db/schema';
import { type UpdateTaskInput } from '../schema';
import { updateTask } from '../handlers/update_task';
import { eq } from 'drizzle-orm';

// Test input for updates
const testUpdateInput: UpdateTaskInput = {
  id: 1,
  title: 'Updated Task Title',
  description: 'Updated task description',
  status: 'in_progress',
  priority: 'high',
  due_date: new Date('2024-12-31'),
};

describe('updateTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update a task with all fields', async () => {
    // Create a task first
    await db.insert(tasksTable)
      .values({
        title: 'Original Task',
        description: 'Original description',
        status: 'pending',
        priority: 'medium',
        due_date: new Date('2024-01-01'),
      })
      .execute();

    const result = await updateTask(testUpdateInput);

    // Verify all fields were updated
    expect(result.id).toBe(1);
    expect(result.title).toBe('Updated Task Title');
    expect(result.description).toBe('Updated task description');
    expect(result.status).toBe('in_progress');
    expect(result.priority).toBe('high');
    expect(result.due_date).toEqual(new Date('2024-12-31'));
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update only provided fields', async () => {
    // Create a task first
    await db.insert(tasksTable)
      .values({
        title: 'Original Task',
        description: 'Original description',
        status: 'pending',
        priority: 'medium',
        due_date: new Date('2024-01-01'),
      })
      .execute();

    // Update only title and status
    const partialInput: UpdateTaskInput = {
      id: 1,
      title: 'New Title Only',
      status: 'in_progress',
    };

    const result = await updateTask(partialInput);

    // Verify only specified fields were updated
    expect(result.title).toBe('New Title Only');
    expect(result.status).toBe('in_progress');
    // Other fields should remain unchanged
    expect(result.description).toBe('Original description');
    expect(result.priority).toBe('medium');
    expect(result.due_date).toEqual(new Date('2024-01-01'));
  });

  it('should save updates to database', async () => {
    // Create a task first
    await db.insert(tasksTable)
      .values({
        title: 'Original Task',
        description: 'Original description',
        status: 'pending',
        priority: 'medium',
      })
      .execute();

    await updateTask(testUpdateInput);

    // Verify changes were saved to database
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, 1))
      .execute();

    expect(tasks).toHaveLength(1);
    const task = tasks[0];
    expect(task.title).toBe('Updated Task Title');
    expect(task.description).toBe('Updated task description');
    expect(task.status).toBe('in_progress');
    expect(task.priority).toBe('high');
    expect(task.due_date).toEqual(new Date('2024-12-31'));
    expect(task.updated_at).toBeInstanceOf(Date);
  });

  it('should create notification when task status changes to completed', async () => {
    // Create a task first
    await db.insert(tasksTable)
      .values({
        title: 'Test Task',
        description: 'Test description',
        status: 'in_progress',
        priority: 'medium',
      })
      .execute();

    // Update task to completed status
    const completedInput: UpdateTaskInput = {
      id: 1,
      status: 'completed',
    };

    await updateTask(completedInput);

    // Verify notification was created
    const notifications = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.entity_id, 1))
      .execute();

    expect(notifications).toHaveLength(1);
    const notification = notifications[0];
    expect(notification.title).toBe('Task Completed');
    expect(notification.message).toBe('Task "Test Task" has been marked as completed');
    expect(notification.type).toBe('success');
    expect(notification.entity_type).toBe('task');
    expect(notification.entity_id).toBe(1);
    expect(notification.read).toBe(false);
  });

  it('should not create notification when task was already completed', async () => {
    // Create a task that's already completed
    await db.insert(tasksTable)
      .values({
        title: 'Already Completed Task',
        description: 'Test description',
        status: 'completed',
        priority: 'medium',
      })
      .execute();

    // Update other fields but keep status as completed
    const input: UpdateTaskInput = {
      id: 1,
      title: 'Updated Title',
      status: 'completed',
    };

    await updateTask(input);

    // Verify no notification was created
    const notifications = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.entity_id, 1))
      .execute();

    expect(notifications).toHaveLength(0);
  });

  it('should not create notification when status changes from completed to something else', async () => {
    // Create a completed task
    await db.insert(tasksTable)
      .values({
        title: 'Completed Task',
        description: 'Test description',
        status: 'completed',
        priority: 'medium',
      })
      .execute();

    // Change status from completed to in_progress
    const input: UpdateTaskInput = {
      id: 1,
      status: 'in_progress',
    };

    await updateTask(input);

    // Verify no notification was created
    const notifications = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.entity_id, 1))
      .execute();

    expect(notifications).toHaveLength(0);
  });

  it('should handle nullable fields correctly', async () => {
    // Create a task with non-null values
    await db.insert(tasksTable)
      .values({
        title: 'Test Task',
        description: 'Has description',
        status: 'pending',
        priority: 'medium',
        due_date: new Date('2024-01-01'),
      })
      .execute();

    // Update to set fields to null
    const nullInput: UpdateTaskInput = {
      id: 1,
      description: null,
      due_date: null,
    };

    const result = await updateTask(nullInput);

    expect(result.description).toBeNull();
    expect(result.due_date).toBeNull();
    // Non-updated fields should remain
    expect(result.title).toBe('Test Task');
    expect(result.status).toBe('pending');
  });

  it('should throw error when task does not exist', async () => {
    const nonExistentInput: UpdateTaskInput = {
      id: 999,
      title: 'Non-existent task',
    };

    await expect(updateTask(nonExistentInput)).rejects.toThrow(/Task with id 999 not found/i);
  });

  it('should update the updated_at timestamp', async () => {
    // Create a task
    const beforeUpdate = new Date();
    await db.insert(tasksTable)
      .values({
        title: 'Test Task',
        description: 'Test description',
        status: 'pending',
        priority: 'medium',
      })
      .execute();

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: UpdateTaskInput = {
      id: 1,
      title: 'Updated Title',
    };

    const result = await updateTask(input);

    // Verify updated_at was changed
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(beforeUpdate.getTime());
  });
});