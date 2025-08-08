import { db } from '../db';
import { tasksTable, notificationsTable } from '../db/schema';
import { type CreateTaskInput, type Task } from '../schema';

export async function createTask(input: CreateTaskInput): Promise<Task> {
  try {
    // Insert task record
    const result = await db.insert(tasksTable)
      .values({
        title: input.title,
        description: input.description,
        status: input.status,
        priority: input.priority,
        due_date: input.due_date
      })
      .returning()
      .execute();

    const task = result[0];

    // Create notification for high priority or urgent tasks
    if (task.priority === 'high' || task.priority === 'urgent') {
      await db.insert(notificationsTable)
        .values({
          title: `New ${task.priority} priority task created`,
          message: `Task "${task.title}" has been created with ${task.priority} priority`,
          type: 'info',
          entity_type: 'task',
          entity_id: task.id
        })
        .execute();
    }

    return task;
  } catch (error) {
    console.error('Task creation failed:', error);
    throw error;
  }
}