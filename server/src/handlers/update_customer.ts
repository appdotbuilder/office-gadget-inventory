import { db } from '../db';
import { customersTable } from '../db/schema';
import { type UpdateCustomerInput, type Customer } from '../schema';
import { eq, and, ne } from 'drizzle-orm';

export const updateCustomer = async (input: UpdateCustomerInput): Promise<Customer> => {
  try {
    // First verify the customer exists
    const existingCustomers = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, input.id))
      .execute();

    if (existingCustomers.length === 0) {
      throw new Error(`Customer with id ${input.id} not found`);
    }

    // If email is being updated, check for uniqueness
    if (input.email !== undefined) {
      const emailConflicts = await db.select()
        .from(customersTable)
        .where(
          and(
            eq(customersTable.email, input.email),
            ne(customersTable.id, input.id)
          )
        )
        .execute();

      if (emailConflicts.length > 0) {
        throw new Error(`Email ${input.email} is already in use by another customer`);
      }
    }

    // Prepare update data - only include fields that are defined
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.address !== undefined) updateData.address = input.address;
    if (input.company !== undefined) updateData.company = input.company;
    if (input.status !== undefined) updateData.status = input.status;

    // Update the customer record
    const result = await db.update(customersTable)
      .set(updateData)
      .where(eq(customersTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Customer update failed:', error);
    throw error;
  }
};