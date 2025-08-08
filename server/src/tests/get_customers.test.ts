import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable } from '../db/schema';
import { type CreateCustomerInput } from '../schema';
import { getCustomers, type GetCustomersInput } from '../handlers/get_customers';

// Helper function to create test customers
const createTestCustomer = async (customerData: CreateCustomerInput) => {
  const result = await db.insert(customersTable)
    .values(customerData)
    .returning()
    .execute();
  
  return result[0];
};

// Test customer data
const activeCustomer1: CreateCustomerInput = {
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+1234567890',
  address: '123 Main St',
  company: 'Tech Corp',
  status: 'active'
};

const activeCustomer2: CreateCustomerInput = {
  name: 'Jane Smith',
  email: 'jane@techcorp.com',
  phone: null,
  address: null,
  company: 'Tech Corp',
  status: 'active'
};

const inactiveCustomer: CreateCustomerInput = {
  name: 'Bob Wilson',
  email: 'bob@oldcompany.com',
  phone: '+9876543210',
  address: '456 Oak Ave',
  company: 'Old Company',
  status: 'inactive'
};

const pendingCustomer: CreateCustomerInput = {
  name: 'Alice Johnson',
  email: 'alice@newstart.com',
  phone: null,
  address: null,
  company: null,
  status: 'pending'
};

describe('getCustomers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should fetch all customers when no filters provided', async () => {
    // Create test customers
    await createTestCustomer(activeCustomer1);
    await createTestCustomer(inactiveCustomer);
    await createTestCustomer(pendingCustomer);

    const result = await getCustomers();

    expect(result).toHaveLength(3);
    expect(result.map(c => c.name)).toContain('John Doe');
    expect(result.map(c => c.name)).toContain('Bob Wilson');
    expect(result.map(c => c.name)).toContain('Alice Johnson');
  });

  it('should return empty array when no customers exist', async () => {
    const result = await getCustomers();
    expect(result).toHaveLength(0);
  });

  it('should filter customers by status', async () => {
    // Create customers with different statuses
    await createTestCustomer(activeCustomer1);
    await createTestCustomer(activeCustomer2);
    await createTestCustomer(inactiveCustomer);
    await createTestCustomer(pendingCustomer);

    // Filter by active status
    const activeResults = await getCustomers({ status: 'active' });
    expect(activeResults).toHaveLength(2);
    expect(activeResults.every(c => c.status === 'active')).toBe(true);
    expect(activeResults.map(c => c.name)).toContain('John Doe');
    expect(activeResults.map(c => c.name)).toContain('Jane Smith');

    // Filter by inactive status
    const inactiveResults = await getCustomers({ status: 'inactive' });
    expect(inactiveResults).toHaveLength(1);
    expect(inactiveResults[0].name).toEqual('Bob Wilson');
    expect(inactiveResults[0].status).toEqual('inactive');

    // Filter by pending status
    const pendingResults = await getCustomers({ status: 'pending' });
    expect(pendingResults).toHaveLength(1);
    expect(pendingResults[0].name).toEqual('Alice Johnson');
    expect(pendingResults[0].status).toEqual('pending');
  });

  it('should search customers by name', async () => {
    // Create test customers
    await createTestCustomer(activeCustomer1);
    await createTestCustomer(activeCustomer2);
    await createTestCustomer(inactiveCustomer);
    await createTestCustomer(pendingCustomer); // Alice Johnson contains "john"

    // Search by partial name - should find John Doe and Alice Johnson
    const johnResults = await getCustomers({ search: 'john' });
    expect(johnResults).toHaveLength(2); // John Doe and Alice Johnson
    expect(johnResults.some(c => c.name === 'John Doe')).toBe(true);

    // Search by exact name
    const janeResults = await getCustomers({ search: 'Jane Smith' });
    expect(janeResults).toHaveLength(1);
    expect(janeResults[0].name).toEqual('Jane Smith');

    // Case insensitive search
    const bobResults = await getCustomers({ search: 'BOB' });
    expect(bobResults).toHaveLength(1);
    expect(bobResults[0].name).toEqual('Bob Wilson');
  });

  it('should search customers by email', async () => {
    // Create test customers
    await createTestCustomer(activeCustomer1);
    await createTestCustomer(activeCustomer2);
    await createTestCustomer(inactiveCustomer);

    // Search by partial email - should find both Tech Corp customers
    const techResults = await getCustomers({ search: 'tech' });
    expect(techResults).toHaveLength(2); // Both activeCustomer2 (jane@techcorp.com) and activeCustomer1 (company: Tech Corp)
    expect(techResults.some(c => c.email.includes('techcorp.com'))).toBe(true);

    // Search by domain
    const exampleResults = await getCustomers({ search: 'example.com' });
    expect(exampleResults).toHaveLength(1);
    expect(exampleResults[0].email).toEqual('john@example.com');

    // Case insensitive email search
    const oldResults = await getCustomers({ search: 'OLDCOMPANY' });
    expect(oldResults).toHaveLength(1);
    expect(oldResults[0].email).toEqual('bob@oldcompany.com');
  });

  it('should search customers by company', async () => {
    // Create test customers
    await createTestCustomer(activeCustomer1);
    await createTestCustomer(activeCustomer2);
    await createTestCustomer(inactiveCustomer);

    // Search by company name
    const techResults = await getCustomers({ search: 'Tech Corp' });
    expect(techResults).toHaveLength(2);
    expect(techResults.every(c => c.company === 'Tech Corp')).toBe(true);

    // Search by partial company name
    const oldResults = await getCustomers({ search: 'Old' });
    expect(oldResults).toHaveLength(1);
    expect(oldResults[0].company).toEqual('Old Company');

    // Case insensitive company search
    const corpResults = await getCustomers({ search: 'CORP' });
    expect(corpResults.length).toBeGreaterThan(0);
    expect(corpResults.some(c => c.company?.toLowerCase().includes('corp'))).toBe(true);
  });

  it('should combine status filter with search', async () => {
    // Create test customers
    await createTestCustomer(activeCustomer1);
    await createTestCustomer(activeCustomer2);
    await createTestCustomer(inactiveCustomer);

    // Search for active customers with "Tech Corp"
    const activeCorpResults = await getCustomers({ 
      status: 'active', 
      search: 'Tech Corp' 
    });
    expect(activeCorpResults).toHaveLength(2);
    expect(activeCorpResults.every(c => c.status === 'active')).toBe(true);
    expect(activeCorpResults.every(c => c.company === 'Tech Corp')).toBe(true);

    // Search for inactive customers with "Bob"
    const inactiveBobResults = await getCustomers({ 
      status: 'inactive', 
      search: 'Bob' 
    });
    expect(inactiveBobResults).toHaveLength(1);
    expect(inactiveBobResults[0].status).toEqual('inactive');
    expect(inactiveBobResults[0].name).toEqual('Bob Wilson');

    // Search that should return no results
    const noResults = await getCustomers({ 
      status: 'active', 
      search: 'Old Company' 
    });
    expect(noResults).toHaveLength(0);
  });

  it('should handle empty search string', async () => {
    // Create test customers
    await createTestCustomer(activeCustomer1);
    await createTestCustomer(inactiveCustomer);

    // Empty string should return all customers
    const emptyResults = await getCustomers({ search: '' });
    expect(emptyResults).toHaveLength(2);

    // Whitespace only should also return all customers
    const whitespaceResults = await getCustomers({ search: '   ' });
    expect(whitespaceResults).toHaveLength(2);
  });

  it('should return customers with correct field types', async () => {
    // Create a test customer
    const created = await createTestCustomer(activeCustomer1);

    const result = await getCustomers();
    expect(result).toHaveLength(1);

    const customer = result[0];
    expect(typeof customer.id).toBe('number');
    expect(typeof customer.name).toBe('string');
    expect(typeof customer.email).toBe('string');
    expect(customer.phone === null || typeof customer.phone === 'string').toBe(true);
    expect(customer.address === null || typeof customer.address === 'string').toBe(true);
    expect(customer.company === null || typeof customer.company === 'string').toBe(true);
    expect(['active', 'inactive', 'pending']).toContain(customer.status);
    expect(customer.created_at).toBeInstanceOf(Date);
    expect(customer.updated_at).toBeInstanceOf(Date);

    // Verify the customer matches what we created
    expect(customer.name).toEqual(activeCustomer1.name);
    expect(customer.email).toEqual(activeCustomer1.email);
    expect(customer.status).toEqual(activeCustomer1.status);
  });

  it('should handle search with no matches', async () => {
    // Create test customers
    await createTestCustomer(activeCustomer1);
    await createTestCustomer(inactiveCustomer);

    // Search for non-existent customer
    const noResults = await getCustomers({ search: 'nonexistent customer' });
    expect(noResults).toHaveLength(0);

    // Search with status that has no matches for the search term
    const noStatusResults = await getCustomers({ 
      status: 'pending', 
      search: 'John' 
    });
    expect(noStatusResults).toHaveLength(0);
  });
});