import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type Task } from '../schema';
import { eq, gte, lte, and, desc, type SQL } from 'drizzle-orm';

export interface GetTasksFilters {
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  due_date_from?: Date;
  due_date_to?: Date;
}

export async function getTasks(filters?: GetTasksFilters): Promise<Task[]> {
  try {
    // Collect conditions
    const conditions: SQL<unknown>[] = [];

    if (filters?.status) {
      conditions.push(eq(tasksTable.status, filters.status));
    }

    if (filters?.priority) {
      conditions.push(eq(tasksTable.priority, filters.priority));
    }

    if (filters?.due_date_from) {
      conditions.push(gte(tasksTable.due_date, filters.due_date_from));
    }

    if (filters?.due_date_to) {
      conditions.push(lte(tasksTable.due_date, filters.due_date_to));
    }

    // Build and execute the query in one chain
    const baseQuery = db.select().from(tasksTable);
    
    const results = conditions.length > 0
      ? await baseQuery
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .orderBy(desc(tasksTable.created_at))
          .execute()
      : await baseQuery
          .orderBy(desc(tasksTable.created_at))
          .execute();

    return results.map(task => ({
      ...task,
      due_date: task.due_date,
      created_at: task.created_at,
      updated_at: task.updated_at
    }));
  } catch (error) {
    console.error('Get tasks failed:', error);
    throw error;
  }
}