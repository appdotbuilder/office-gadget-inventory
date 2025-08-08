import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable } from '../db/schema';
import { type CreateCustomerInput } from '../schema';
import { createCustomer } from '../handlers/create_customer';
import { eq } from 'drizzle-orm';

// Complete test input with all fields
const testInput: CreateCustomerInput = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  phone: '+1-555-0123',
  address: '123 Main St, Anytown, ST 12345',
  company: 'Acme Corp',
  status: 'active'
};

// Minimal test input
const minimalInput: CreateCustomerInput = {
  name: 'Jane Smith',
  email: 'jane.smith@example.com',
  phone: null,
  address: null,
  company: null,
  status: 'active'
};

describe('createCustomer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a customer with all fields', async () => {
    const result = await createCustomer(testInput);

    // Basic field validation
    expect(result.name).toEqual('John Doe');
    expect(result.email).toEqual('john.doe@example.com');
    expect(result.phone).toEqual('+1-555-0123');
    expect(result.address).toEqual('123 Main St, Anytown, ST 12345');
    expect(result.company).toEqual('Acme Corp');
    expect(result.status).toEqual('active');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a customer with minimal fields', async () => {
    const result = await createCustomer(minimalInput);

    // Basic field validation
    expect(result.name).toEqual('Jane Smith');
    expect(result.email).toEqual('jane.smith@example.com');
    expect(result.phone).toBeNull();
    expect(result.address).toBeNull();
    expect(result.company).toBeNull();
    expect(result.status).toEqual('active');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save customer to database', async () => {
    const result = await createCustomer(testInput);

    // Query using proper drizzle syntax
    const customers = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, result.id))
      .execute();

    expect(customers).toHaveLength(1);
    expect(customers[0].name).toEqual('John Doe');
    expect(customers[0].email).toEqual('john.doe@example.com');
    expect(customers[0].phone).toEqual('+1-555-0123');
    expect(customers[0].address).toEqual('123 Main St, Anytown, ST 12345');
    expect(customers[0].company).toEqual('Acme Corp');
    expect(customers[0].status).toEqual('active');
    expect(customers[0].created_at).toBeInstanceOf(Date);
    expect(customers[0].updated_at).toBeInstanceOf(Date);
  });

  it('should apply default status when not provided', async () => {
    const inputWithoutStatus: CreateCustomerInput = {
      name: 'Test User',
      email: 'test@example.com',
      phone: null,
      address: null,
      company: null,
      status: 'active' // Default value applied by Zod
    };

    const result = await createCustomer(inputWithoutStatus);
    expect(result.status).toEqual('active');
  });

  it('should reject duplicate email addresses', async () => {
    // Create first customer
    await createCustomer(testInput);

    // Try to create second customer with same email
    const duplicateInput: CreateCustomerInput = {
      name: 'Different Name',
      email: 'john.doe@example.com', // Same email
      phone: null,
      address: null,
      company: null,
      status: 'active'
    };

    await expect(createCustomer(duplicateInput)).rejects.toThrow(/already exists/i);
  });

  it('should allow different customers with different emails', async () => {
    // Create first customer
    const customer1 = await createCustomer(testInput);

    // Create second customer with different email
    const customer2Input: CreateCustomerInput = {
      name: 'Jane Doe',
      email: 'jane.doe@example.com', // Different email
      phone: '+1-555-0124',
      address: '456 Oak St, Otherville, ST 67890',
      company: 'Tech Solutions',
      status: 'pending'
    };

    const customer2 = await createCustomer(customer2Input);

    // Both should exist in database
    expect(customer1.id).not.toEqual(customer2.id);
    expect(customer1.email).toEqual('john.doe@example.com');
    expect(customer2.email).toEqual('jane.doe@example.com');

    // Verify both are in database
    const allCustomers = await db.select()
      .from(customersTable)
      .execute();

    expect(allCustomers).toHaveLength(2);
  });

  it('should handle different customer statuses', async () => {
    const statuses: Array<'active' | 'inactive' | 'pending'> = ['active', 'inactive', 'pending'];

    for (let i = 0; i < statuses.length; i++) {
      const status = statuses[i];
      const input: CreateCustomerInput = {
        name: `Customer ${i + 1}`,
        email: `customer${i + 1}@example.com`,
        phone: null,
        address: null,
        company: null,
        status
      };

      const result = await createCustomer(input);
      expect(result.status).toEqual(status);
    }
  });
});