import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable } from '../db/schema';
import { type UpdateCustomerInput, type CreateCustomerInput } from '../schema';
import { updateCustomer } from '../handlers/update_customer';
import { eq } from 'drizzle-orm';

// Helper function to create a test customer
const createTestCustomer = async (customerData: CreateCustomerInput) => {
  const result = await db.insert(customersTable)
    .values({
      name: customerData.name,
      email: customerData.email,
      phone: customerData.phone,
      address: customerData.address,
      company: customerData.company,
      status: customerData.status || 'active'
    })
    .returning()
    .execute();
  return result[0];
};

const testCustomerInput: CreateCustomerInput = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  phone: '+1234567890',
  address: '123 Main St, City, State 12345',
  company: 'Tech Corp',
  status: 'active'
};

const anotherCustomerInput: CreateCustomerInput = {
  name: 'Jane Smith',
  email: 'jane.smith@example.com',
  phone: '+0987654321',
  address: '456 Oak Ave, Town, State 67890',
  company: 'Design Studio',
  status: 'active'
};

describe('updateCustomer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update all customer fields', async () => {
    // Create test customer first
    const existingCustomer = await createTestCustomer(testCustomerInput);

    const updateInput: UpdateCustomerInput = {
      id: existingCustomer.id,
      name: 'John Updated',
      email: 'john.updated@example.com',
      phone: '+1111111111',
      address: '789 New St, Updated City, State 54321',
      company: 'Updated Corp',
      status: 'inactive'
    };

    const result = await updateCustomer(updateInput);

    // Verify all fields were updated
    expect(result.id).toEqual(existingCustomer.id);
    expect(result.name).toEqual('John Updated');
    expect(result.email).toEqual('john.updated@example.com');
    expect(result.phone).toEqual('+1111111111');
    expect(result.address).toEqual('789 New St, Updated City, State 54321');
    expect(result.company).toEqual('Updated Corp');
    expect(result.status).toEqual('inactive');
    expect(result.created_at).toEqual(existingCustomer.created_at);
    expect(result.updated_at).not.toEqual(existingCustomer.updated_at);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update only specified fields', async () => {
    // Create test customer first
    const existingCustomer = await createTestCustomer(testCustomerInput);

    const updateInput: UpdateCustomerInput = {
      id: existingCustomer.id,
      name: 'John Partial Update',
      status: 'pending'
    };

    const result = await updateCustomer(updateInput);

    // Verify only specified fields were updated
    expect(result.id).toEqual(existingCustomer.id);
    expect(result.name).toEqual('John Partial Update');
    expect(result.email).toEqual(existingCustomer.email);
    expect(result.phone).toEqual(existingCustomer.phone);
    expect(result.address).toEqual(existingCustomer.address);
    expect(result.company).toEqual(existingCustomer.company);
    expect(result.status).toEqual('pending');
    expect(result.created_at).toEqual(existingCustomer.created_at);
    expect(result.updated_at).not.toEqual(existingCustomer.updated_at);
  });

  it('should handle nullable fields being set to null', async () => {
    // Create test customer first
    const existingCustomer = await createTestCustomer(testCustomerInput);

    const updateInput: UpdateCustomerInput = {
      id: existingCustomer.id,
      phone: null,
      address: null,
      company: null
    };

    const result = await updateCustomer(updateInput);

    // Verify nullable fields were set to null
    expect(result.phone).toBeNull();
    expect(result.address).toBeNull();
    expect(result.company).toBeNull();
    expect(result.name).toEqual(existingCustomer.name); // Unchanged
    expect(result.email).toEqual(existingCustomer.email); // Unchanged
  });

  it('should save updated customer to database', async () => {
    // Create test customer first
    const existingCustomer = await createTestCustomer(testCustomerInput);

    const updateInput: UpdateCustomerInput = {
      id: existingCustomer.id,
      name: 'Database Updated Name',
      email: 'database.updated@example.com'
    };

    await updateCustomer(updateInput);

    // Verify changes were persisted to database
    const customers = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, existingCustomer.id))
      .execute();

    expect(customers).toHaveLength(1);
    expect(customers[0].name).toEqual('Database Updated Name');
    expect(customers[0].email).toEqual('database.updated@example.com');
    expect(customers[0].updated_at).not.toEqual(existingCustomer.updated_at);
  });

  it('should throw error when customer does not exist', async () => {
    const updateInput: UpdateCustomerInput = {
      id: 999,
      name: 'Non-existent Customer'
    };

    await expect(updateCustomer(updateInput)).rejects.toThrow(/Customer with id 999 not found/i);
  });

  it('should throw error when email conflicts with another customer', async () => {
    // Create two test customers
    const customer1 = await createTestCustomer(testCustomerInput);
    const customer2 = await createTestCustomer(anotherCustomerInput);

    const updateInput: UpdateCustomerInput = {
      id: customer1.id,
      email: customer2.email // Try to use customer2's email
    };

    await expect(updateCustomer(updateInput)).rejects.toThrow(/Email .* is already in use by another customer/i);
  });

  it('should allow updating customer email to same value', async () => {
    // Create test customer
    const existingCustomer = await createTestCustomer(testCustomerInput);

    const updateInput: UpdateCustomerInput = {
      id: existingCustomer.id,
      name: 'Same Email Update',
      email: existingCustomer.email // Same email should be allowed
    };

    const result = await updateCustomer(updateInput);

    expect(result.name).toEqual('Same Email Update');
    expect(result.email).toEqual(existingCustomer.email);
  });

  it('should handle all status enum values', async () => {
    // Create test customer
    const existingCustomer = await createTestCustomer(testCustomerInput);

    // Test each status value
    const statusValues: Array<'active' | 'inactive' | 'pending'> = ['active', 'inactive', 'pending'];

    for (const status of statusValues) {
      const updateInput: UpdateCustomerInput = {
        id: existingCustomer.id,
        status: status
      };

      const result = await updateCustomer(updateInput);
      expect(result.status).toEqual(status);
    }
  });

  it('should update timestamp automatically', async () => {
    // Create test customer
    const existingCustomer = await createTestCustomer(testCustomerInput);
    
    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateCustomerInput = {
      id: existingCustomer.id,
      name: 'Timestamp Test'
    };

    const result = await updateCustomer(updateInput);

    expect(result.updated_at.getTime()).toBeGreaterThan(existingCustomer.updated_at.getTime());
    expect(result.created_at).toEqual(existingCustomer.created_at);
  });
});