import { db } from '../db';
import { tasksTable, notificationsTable } from '../db/schema';
import { type UpdateTaskInput, type Task } from '../schema';
import { eq } from 'drizzle-orm';

export async function updateTask(input: UpdateTaskInput): Promise<Task> {
  try {
    // First, check if task exists and get current status
    const existingTasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, input.id))
      .execute();

    if (existingTasks.length === 0) {
      throw new Error(`Task with id ${input.id} not found`);
    }

    const currentTask = existingTasks[0];
    
    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date(),
    };

    if (input.title !== undefined) {
      updateData.title = input.title;
    }
    if (input.description !== undefined) {
      updateData.description = input.description;
    }
    if (input.status !== undefined) {
      updateData.status = input.status;
    }
    if (input.priority !== undefined) {
      updateData.priority = input.priority;
    }
    if (input.due_date !== undefined) {
      updateData.due_date = input.due_date;
    }

    // Update the task
    const result = await db.update(tasksTable)
      .set(updateData)
      .where(eq(tasksTable.id, input.id))
      .returning()
      .execute();

    const updatedTask = result[0];

    // Create notification if status changed to completed
    if (input.status === 'completed' && currentTask.status !== 'completed') {
      await db.insert(notificationsTable)
        .values({
          title: 'Task Completed',
          message: `Task "${updatedTask.title}" has been marked as completed`,
          type: 'success',
          entity_type: 'task',
          entity_id: updatedTask.id,
        })
        .execute();
    }

    return updatedTask;
  } catch (error) {
    console.error('Task update failed:', error);
    throw error;
  }
}