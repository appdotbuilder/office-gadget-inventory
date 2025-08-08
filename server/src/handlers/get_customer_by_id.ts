import { db } from '../db';
import { customersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type Customer } from '../schema';

export async function getCustomerById(id: number): Promise<Customer | null> {
  try {
    const results = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    // Return the first result as Customer type (no numeric conversions needed for customers table)
    return results[0];
  } catch (error) {
    console.error('Get customer by ID failed:', error);
    throw error;
  }
}