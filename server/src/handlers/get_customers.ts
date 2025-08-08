import { db } from '../db';
import { customersTable } from '../db/schema';
import { type Customer } from '../schema';
import { eq, or, ilike, and, type SQL } from 'drizzle-orm';
import { z } from 'zod';

// Input schema for filtering customers
export const getCustomersInputSchema = z.object({
  status: z.enum(['active', 'inactive', 'pending']).optional(),
  search: z.string().optional(),
});

export type GetCustomersInput = z.infer<typeof getCustomersInputSchema>;

export const getCustomers = async (input: GetCustomersInput = {}): Promise<Customer[]> => {
  try {
    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    // Filter by status if provided
    if (input.status) {
      conditions.push(eq(customersTable.status, input.status));
    }

    // Search across name, email, and company if search term provided
    if (input.search && input.search.trim().length > 0) {
      const searchTerm = `%${input.search.trim()}%`;
      const searchCondition = or(
        ilike(customersTable.name, searchTerm),
        ilike(customersTable.email, searchTerm),
        ilike(customersTable.company, searchTerm)
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    // Build and execute query based on whether conditions exist
    const results = conditions.length > 0
      ? await db.select()
          .from(customersTable)
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .execute()
      : await db.select()
          .from(customersTable)
          .execute();
    
    return results;
  } catch (error) {
    console.error('Failed to fetch customers:', error);
    throw error;
  }
};