import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type CreateTaskInput } from '../schema';
import { getTaskById } from '../handlers/get_task_by_id';

// Test task input
const testTask: CreateTaskInput = {
  title: 'Test Task',
  description: 'A task for testing',
  status: 'pending',
  priority: 'high',
  due_date: new Date('2024-12-31')
};

describe('getTaskById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return a task by ID', async () => {
    // Create a task first
    const createResult = await db.insert(tasksTable)
      .values({
        title: testTask.title,
        description: testTask.description,
        status: testTask.status,
        priority: testTask.priority,
        due_date: testTask.due_date
      })
      .returning()
      .execute();

    const taskId = createResult[0].id;

    // Retrieve the task
    const result = await getTaskById(taskId);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(taskId);
    expect(result!.title).toBe('Test Task');
    expect(result!.description).toBe('A task for testing');
    expect(result!.status).toBe('pending');
    expect(result!.priority).toBe('high');
    expect(result!.due_date).toBeInstanceOf(Date);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent task ID', async () => {
    const result = await getTaskById(999);
    expect(result).toBeNull();
  });

  it('should handle task with null description and due_date', async () => {
    // Create task with null optional fields
    const createResult = await db.insert(tasksTable)
      .values({
        title: 'Minimal Task',
        description: null,
        status: 'in_progress',
        priority: 'medium',
        due_date: null
      })
      .returning()
      .execute();

    const taskId = createResult[0].id;

    const result = await getTaskById(taskId);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(taskId);
    expect(result!.title).toBe('Minimal Task');
    expect(result!.description).toBeNull();
    expect(result!.status).toBe('in_progress');
    expect(result!.priority).toBe('medium');
    expect(result!.due_date).toBeNull();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should handle all status values correctly', async () => {
    const statuses = ['pending', 'in_progress', 'completed', 'cancelled'] as const;

    for (const status of statuses) {
      const createResult = await db.insert(tasksTable)
        .values({
          title: `Task with ${status} status`,
          status: status,
          priority: 'low'
        })
        .returning()
        .execute();

      const taskId = createResult[0].id;
      const result = await getTaskById(taskId);

      expect(result).not.toBeNull();
      expect(result!.status).toBe(status);
    }
  });

  it('should handle all priority values correctly', async () => {
    const priorities = ['low', 'medium', 'high', 'urgent'] as const;

    for (const priority of priorities) {
      const createResult = await db.insert(tasksTable)
        .values({
          title: `Task with ${priority} priority`,
          status: 'pending',
          priority: priority
        })
        .returning()
        .execute();

      const taskId = createResult[0].id;
      const result = await getTaskById(taskId);

      expect(result).not.toBeNull();
      expect(result!.priority).toBe(priority);
    }
  });

  it('should return the exact task when multiple tasks exist', async () => {
    // Create multiple tasks
    const tasks = await db.insert(tasksTable)
      .values([
        {
          title: 'First Task',
          status: 'pending',
          priority: 'low'
        },
        {
          title: 'Second Task',
          status: 'completed',
          priority: 'high'
        },
        {
          title: 'Third Task',
          status: 'in_progress',
          priority: 'medium'
        }
      ])
      .returning()
      .execute();

    // Get the second task specifically
    const targetTask = tasks[1];
    const result = await getTaskById(targetTask.id);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(targetTask.id);
    expect(result!.title).toBe('Second Task');
    expect(result!.status).toBe('completed');
    expect(result!.priority).toBe('high');
  });
});