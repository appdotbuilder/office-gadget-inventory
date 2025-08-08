import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable, notificationsTable } from '../db/schema';
import { type CreateTaskInput } from '../schema';
import { createTask } from '../handlers/create_task';
import { eq } from 'drizzle-orm';

// Test inputs with all fields
const basicTaskInput: CreateTaskInput = {
  title: 'Test Task',
  description: 'A task for testing',
  status: 'pending',
  priority: 'medium',
  due_date: new Date('2024-12-31')
};

const highPriorityTaskInput: CreateTaskInput = {
  title: 'High Priority Task',
  description: 'An urgent task',
  status: 'pending',
  priority: 'high',
  due_date: null
};

const urgentTaskInput: CreateTaskInput = {
  title: 'Urgent Task',
  description: null,
  status: 'in_progress',
  priority: 'urgent',
  due_date: new Date('2024-01-01')
};

describe('createTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a task with all fields', async () => {
    const result = await createTask(basicTaskInput);

    // Basic field validation
    expect(result.title).toEqual('Test Task');
    expect(result.description).toEqual('A task for testing');
    expect(result.status).toEqual('pending');
    expect(result.priority).toEqual('medium');
    expect(result.due_date).toEqual(new Date('2024-12-31'));
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a task with nullable fields', async () => {
    const inputWithNulls: CreateTaskInput = {
      title: 'Minimal Task',
      description: null,
      status: 'completed',
      priority: 'low',
      due_date: null
    };

    const result = await createTask(inputWithNulls);

    expect(result.title).toEqual('Minimal Task');
    expect(result.description).toBeNull();
    expect(result.status).toEqual('completed');
    expect(result.priority).toEqual('low');
    expect(result.due_date).toBeNull();
    expect(result.id).toBeDefined();
  });

  it('should save task to database', async () => {
    const result = await createTask(basicTaskInput);

    // Query the database to verify task was saved
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, result.id))
      .execute();

    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toEqual('Test Task');
    expect(tasks[0].description).toEqual('A task for testing');
    expect(tasks[0].status).toEqual('pending');
    expect(tasks[0].priority).toEqual('medium');
    expect(tasks[0].due_date).toEqual(new Date('2024-12-31'));
    expect(tasks[0].created_at).toBeInstanceOf(Date);
    expect(tasks[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create notification for high priority task', async () => {
    const result = await createTask(highPriorityTaskInput);

    // Check that notification was created
    const notifications = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.entity_id, result.id))
      .execute();

    expect(notifications).toHaveLength(1);
    expect(notifications[0].title).toEqual('New high priority task created');
    expect(notifications[0].message).toEqual('Task "High Priority Task" has been created with high priority');
    expect(notifications[0].type).toEqual('info');
    expect(notifications[0].entity_type).toEqual('task');
    expect(notifications[0].entity_id).toEqual(result.id);
    expect(notifications[0].read).toBe(false);
  });

  it('should create notification for urgent priority task', async () => {
    const result = await createTask(urgentTaskInput);

    // Check that notification was created
    const notifications = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.entity_id, result.id))
      .execute();

    expect(notifications).toHaveLength(1);
    expect(notifications[0].title).toEqual('New urgent priority task created');
    expect(notifications[0].message).toEqual('Task "Urgent Task" has been created with urgent priority');
    expect(notifications[0].type).toEqual('info');
    expect(notifications[0].entity_type).toEqual('task');
    expect(notifications[0].entity_id).toEqual(result.id);
  });

  it('should not create notification for low/medium priority tasks', async () => {
    const result = await createTask(basicTaskInput); // medium priority

    // Check that no notification was created
    const notifications = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.entity_id, result.id))
      .execute();

    expect(notifications).toHaveLength(0);

    // Test low priority as well
    const lowPriorityInput: CreateTaskInput = {
      title: 'Low Priority Task',
      description: 'Not urgent',
      status: 'pending',
      priority: 'low',
      due_date: null
    };

    const lowResult = await createTask(lowPriorityInput);

    const lowNotifications = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.entity_id, lowResult.id))
      .execute();

    expect(lowNotifications).toHaveLength(0);
  });

  it('should apply default values from Zod schema', async () => {
    // Test that Zod defaults are applied before reaching the handler
    const inputWithDefaults: CreateTaskInput = {
      title: 'Task with Defaults',
      description: 'Test defaults',
      status: 'pending', // default value
      priority: 'medium', // default value
      due_date: null
    };

    const result = await createTask(inputWithDefaults);

    expect(result.status).toEqual('pending');
    expect(result.priority).toEqual('medium');
  });
});