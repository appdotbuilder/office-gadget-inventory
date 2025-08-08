import { db } from '../db';
import { tasksTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type Task } from '../schema';

export const getTaskById = async (id: number): Promise<Task | null> => {
  try {
    // Query task by ID
    const results = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, id))
      .execute();

    // Return null if task not found
    if (results.length === 0) {
      return null;
    }

    // Return the task (dates are already Date objects from database)
    return results[0];
  } catch (error) {
    console.error('Task retrieval failed:', error);
    throw error;
  }
};