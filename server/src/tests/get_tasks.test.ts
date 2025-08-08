import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { getTasks, type GetTasksFilters } from '../handlers/get_tasks';

describe('getTasks', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no tasks exist', async () => {
    const result = await getTasks();
    expect(result).toEqual([]);
  });

  it('should return all tasks when no filters provided', async () => {
    // Create first task
    await db.insert(tasksTable).values({
      title: 'Task 1',
      description: 'First task',
      status: 'pending',
      priority: 'high'
    }).execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    // Create second task
    await db.insert(tasksTable).values({
      title: 'Task 2',
      description: 'Second task',
      status: 'completed',
      priority: 'low'
    }).execute();

    const result = await getTasks();
    
    expect(result).toHaveLength(2);
    expect(result[0].title).toEqual('Task 2'); // Newest first due to desc ordering
    expect(result[1].title).toEqual('Task 1');
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should filter by status correctly', async () => {
    // Create tasks with different statuses
    await db.insert(tasksTable).values([
      {
        title: 'Pending Task',
        status: 'pending',
        priority: 'medium'
      },
      {
        title: 'Completed Task',
        status: 'completed',
        priority: 'medium'
      },
      {
        title: 'In Progress Task',
        status: 'in_progress',
        priority: 'medium'
      }
    ]).execute();

    const filters: GetTasksFilters = { status: 'completed' };
    const result = await getTasks(filters);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Completed Task');
    expect(result[0].status).toEqual('completed');
  });

  it('should filter by priority correctly', async () => {
    // Create tasks with different priorities
    await db.insert(tasksTable).values([
      {
        title: 'High Priority Task',
        status: 'pending',
        priority: 'high'
      },
      {
        title: 'Low Priority Task',
        status: 'pending',
        priority: 'low'
      },
      {
        title: 'Urgent Task',
        status: 'pending',
        priority: 'urgent'
      }
    ]).execute();

    const filters: GetTasksFilters = { priority: 'urgent' };
    const result = await getTasks(filters);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Urgent Task');
    expect(result[0].priority).toEqual('urgent');
  });

  it('should filter by due date range correctly', async () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    // Create tasks with different due dates
    await db.insert(tasksTable).values([
      {
        title: 'Past Task',
        status: 'pending',
        priority: 'medium',
        due_date: yesterday
      },
      {
        title: 'Today Task',
        status: 'pending',
        priority: 'medium',
        due_date: today
      },
      {
        title: 'Future Task',
        status: 'pending',
        priority: 'medium',
        due_date: nextWeek
      }
    ]).execute();

    // Filter for tasks due from today onwards
    const filters: GetTasksFilters = { due_date_from: today };
    const result = await getTasks(filters);

    expect(result).toHaveLength(2);
    const titles = result.map(task => task.title);
    expect(titles).toContain('Today Task');
    expect(titles).toContain('Future Task');
    expect(titles).not.toContain('Past Task');
  });

  it('should filter by date range (from and to) correctly', async () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

    // Create tasks with different due dates
    await db.insert(tasksTable).values([
      {
        title: 'Before Range',
        status: 'pending',
        priority: 'medium',
        due_date: yesterday
      },
      {
        title: 'In Range Today',
        status: 'pending',
        priority: 'medium',
        due_date: today
      },
      {
        title: 'In Range Tomorrow',
        status: 'pending',
        priority: 'medium',
        due_date: tomorrow
      },
      {
        title: 'After Range',
        status: 'pending',
        priority: 'medium',
        due_date: dayAfterTomorrow
      }
    ]).execute();

    // Filter for tasks due between today and tomorrow
    const filters: GetTasksFilters = { 
      due_date_from: today,
      due_date_to: tomorrow
    };
    const result = await getTasks(filters);

    expect(result).toHaveLength(2);
    const titles = result.map(task => task.title);
    expect(titles).toContain('In Range Today');
    expect(titles).toContain('In Range Tomorrow');
    expect(titles).not.toContain('Before Range');
    expect(titles).not.toContain('After Range');
  });

  it('should apply multiple filters correctly', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Create tasks with various combinations
    await db.insert(tasksTable).values([
      {
        title: 'Pending High Tomorrow',
        status: 'pending',
        priority: 'high',
        due_date: tomorrow
      },
      {
        title: 'Completed High Tomorrow',
        status: 'completed',
        priority: 'high',
        due_date: tomorrow
      },
      {
        title: 'Pending Low Tomorrow',
        status: 'pending',
        priority: 'low',
        due_date: tomorrow
      }
    ]).execute();

    // Filter for pending AND high priority tasks
    const filters: GetTasksFilters = { 
      status: 'pending',
      priority: 'high'
    };
    const result = await getTasks(filters);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Pending High Tomorrow');
    expect(result[0].status).toEqual('pending');
    expect(result[0].priority).toEqual('high');
  });

  it('should return tasks in descending order by created_at', async () => {
    // Create tasks with slight delay to ensure different timestamps
    await db.insert(tasksTable).values({
      title: 'First Task',
      status: 'pending',
      priority: 'medium'
    }).execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(tasksTable).values({
      title: 'Second Task',
      status: 'pending',
      priority: 'medium'
    }).execute();

    const result = await getTasks();

    expect(result).toHaveLength(2);
    expect(result[0].title).toEqual('Second Task'); // Newest first
    expect(result[1].title).toEqual('First Task');
    expect(result[0].created_at >= result[1].created_at).toBe(true);
  });

  it('should handle tasks with null due dates', async () => {
    // Create tasks with and without due dates
    await db.insert(tasksTable).values([
      {
        title: 'Task with due date',
        status: 'pending',
        priority: 'medium',
        due_date: new Date()
      },
      {
        title: 'Task without due date',
        status: 'pending',
        priority: 'medium',
        due_date: null
      }
    ]).execute();

    const result = await getTasks();

    expect(result).toHaveLength(2);
    const taskWithoutDueDate = result.find(task => task.title === 'Task without due date');
    const taskWithDueDate = result.find(task => task.title === 'Task with due date');
    
    expect(taskWithoutDueDate?.due_date).toBeNull();
    expect(taskWithDueDate?.due_date).toBeInstanceOf(Date);
  });
});