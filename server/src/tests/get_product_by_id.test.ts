import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { getProductById } from '../handlers/get_product_by_id';

describe('getProductById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return product when found', async () => {
    // Create a test product
    const insertResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A product for testing',
        price: '29.99', // Insert as string for numeric column
        sku: 'TEST-SKU-001',
        category: 'Electronics'
      })
      .returning()
      .execute();

    const createdProduct = insertResult[0];
    
    // Retrieve the product by ID
    const result = await getProductById(createdProduct.id);

    // Verify all fields are correct
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdProduct.id);
    expect(result!.name).toEqual('Test Product');
    expect(result!.description).toEqual('A product for testing');
    expect(result!.price).toEqual(29.99);
    expect(typeof result!.price).toBe('number'); // Verify numeric conversion
    expect(result!.sku).toEqual('TEST-SKU-001');
    expect(result!.category).toEqual('Electronics');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when product not found', async () => {
    // Try to get a non-existent product
    const result = await getProductById(99999);

    expect(result).toBeNull();
  });

  it('should handle product with nullable fields', async () => {
    // Create product with nullable fields set to null
    const insertResult = await db.insert(productsTable)
      .values({
        name: 'Minimal Product',
        description: null,
        price: '15.50',
        sku: 'MIN-001',
        category: null
      })
      .returning()
      .execute();

    const createdProduct = insertResult[0];
    
    const result = await getProductById(createdProduct.id);

    expect(result).not.toBeNull();
    expect(result!.name).toEqual('Minimal Product');
    expect(result!.description).toBeNull();
    expect(result!.price).toEqual(15.50);
    expect(typeof result!.price).toBe('number');
    expect(result!.sku).toEqual('MIN-001');
    expect(result!.category).toBeNull();
  });

  it('should handle decimal price precision correctly', async () => {
    // Test with high precision decimal
    const insertResult = await db.insert(productsTable)
      .values({
        name: 'Precision Product',
        description: 'Testing decimal precision',
        price: '123.45', // Two decimal places
        sku: 'PREC-001',
        category: 'Test'
      })
      .returning()
      .execute();

    const createdProduct = insertResult[0];
    
    const result = await getProductById(createdProduct.id);

    expect(result).not.toBeNull();
    expect(result!.price).toEqual(123.45);
    expect(typeof result!.price).toBe('number');
    
    // Verify precision is maintained
    expect(result!.price.toFixed(2)).toEqual('123.45');
  });

  it('should handle zero price correctly', async () => {
    // Test with zero price (edge case)
    const insertResult = await db.insert(productsTable)
      .values({
        name: 'Free Product',
        description: 'Free sample',
        price: '0.00',
        sku: 'FREE-001',
        category: 'Samples'
      })
      .returning()
      .execute();

    const createdProduct = insertResult[0];
    
    const result = await getProductById(createdProduct.id);

    expect(result).not.toBeNull();
    expect(result!.price).toEqual(0);
    expect(typeof result!.price).toBe('number');
  });
});