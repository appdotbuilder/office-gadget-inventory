import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable } from '../db/schema';
import { type CreateCustomerInput } from '../schema';
import { getCustomerById } from '../handlers/get_customer_by_id';
import { eq } from 'drizzle-orm';

// Test customer data
const testCustomer1: CreateCustomerInput = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  phone: '+1-555-0123',
  address: '123 Main St, Anytown, USA',
  company: 'Acme Corp',
  status: 'active'
};

const testCustomer2: CreateCustomerInput = {
  name: 'Jane Smith',
  email: 'jane.smith@example.com',
  phone: null,
  address: null,
  company: null,
  status: 'pending'
};

describe('getCustomerById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return customer when ID exists', async () => {
    // Create test customer
    const insertResults = await db.insert(customersTable)
      .values(testCustomer1)
      .returning()
      .execute();
    const createdCustomer = insertResults[0];

    // Test the handler
    const result = await getCustomerById(createdCustomer.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdCustomer.id);
    expect(result!.name).toEqual('John Doe');
    expect(result!.email).toEqual('john.doe@example.com');
    expect(result!.phone).toEqual('+1-555-0123');
    expect(result!.address).toEqual('123 Main St, Anytown, USA');
    expect(result!.company).toEqual('Acme Corp');
    expect(result!.status).toEqual('active');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return customer with null fields correctly', async () => {
    // Create test customer with null fields
    const insertResults = await db.insert(customersTable)
      .values(testCustomer2)
      .returning()
      .execute();
    const createdCustomer = insertResults[0];

    // Test the handler
    const result = await getCustomerById(createdCustomer.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdCustomer.id);
    expect(result!.name).toEqual('Jane Smith');
    expect(result!.email).toEqual('jane.smith@example.com');
    expect(result!.phone).toBeNull();
    expect(result!.address).toBeNull();
    expect(result!.company).toBeNull();
    expect(result!.status).toEqual('pending');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when customer ID does not exist', async () => {
    // Test with non-existent ID
    const result = await getCustomerById(99999);

    expect(result).toBeNull();
  });

  it('should return correct customer when multiple customers exist', async () => {
    // Create multiple customers
    const insertResults1 = await db.insert(customersTable)
      .values(testCustomer1)
      .returning()
      .execute();
    const customer1 = insertResults1[0];

    const insertResults2 = await db.insert(customersTable)
      .values(testCustomer2)
      .returning()
      .execute();
    const customer2 = insertResults2[0];

    // Test fetching first customer
    const result1 = await getCustomerById(customer1.id);
    expect(result1).not.toBeNull();
    expect(result1!.id).toEqual(customer1.id);
    expect(result1!.name).toEqual('John Doe');
    expect(result1!.email).toEqual('john.doe@example.com');

    // Test fetching second customer
    const result2 = await getCustomerById(customer2.id);
    expect(result2).not.toBeNull();
    expect(result2!.id).toEqual(customer2.id);
    expect(result2!.name).toEqual('Jane Smith');
    expect(result2!.email).toEqual('jane.smith@example.com');
  });

  it('should query database correctly for existing customer', async () => {
    // Create test customer
    const insertResults = await db.insert(customersTable)
      .values(testCustomer1)
      .returning()
      .execute();
    const createdCustomer = insertResults[0];

    // Call handler
    await getCustomerById(createdCustomer.id);

    // Verify customer still exists in database with correct data
    const dbResults = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, createdCustomer.id))
      .execute();

    expect(dbResults).toHaveLength(1);
    expect(dbResults[0].name).toEqual('John Doe');
    expect(dbResults[0].email).toEqual('john.doe@example.com');
    expect(dbResults[0].status).toEqual('active');
  });

  it('should handle different customer statuses correctly', async () => {
    // Test each status type
    const statuses: Array<'active' | 'inactive' | 'pending'> = ['active', 'inactive', 'pending'];

    for (const status of statuses) {
      const customerData: CreateCustomerInput = {
        name: `Customer ${status}`,
        email: `customer.${status}@example.com`,
        phone: null,
        address: null,
        company: null,
        status: status
      };

      const insertResults = await db.insert(customersTable)
        .values(customerData)
        .returning()
        .execute();
      const createdCustomer = insertResults[0];

      const result = await getCustomerById(createdCustomer.id);
      expect(result).not.toBeNull();
      expect(result!.status).toEqual(status);
      expect(result!.name).toEqual(`Customer ${status}`);
    }
  });
});