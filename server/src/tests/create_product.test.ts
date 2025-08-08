import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type CreateProductInput } from '../schema';
import { createProduct } from '../handlers/create_product';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateProductInput = {
  name: 'Test Product',
  description: 'A product for testing purposes',
  price: 29.99,
  sku: 'TEST-001',
  category: 'Electronics'
};

// Minimal test input with nullable fields
const minimalInput: CreateProductInput = {
  name: 'Minimal Product',
  description: null,
  price: 15.50,
  sku: 'MIN-001',
  category: null
};

describe('createProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a product with all fields', async () => {
    const result = await createProduct(testInput);

    // Validate all fields are correctly set
    expect(result.name).toEqual('Test Product');
    expect(result.description).toEqual('A product for testing purposes');
    expect(result.price).toEqual(29.99);
    expect(typeof result.price).toBe('number');
    expect(result.sku).toEqual('TEST-001');
    expect(result.category).toEqual('Electronics');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a product with nullable fields', async () => {
    const result = await createProduct(minimalInput);

    expect(result.name).toEqual('Minimal Product');
    expect(result.description).toBeNull();
    expect(result.price).toEqual(15.50);
    expect(typeof result.price).toBe('number');
    expect(result.sku).toEqual('MIN-001');
    expect(result.category).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save product to database correctly', async () => {
    const result = await createProduct(testInput);

    // Query database directly to verify data persistence
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, result.id))
      .execute();

    expect(products).toHaveLength(1);
    
    const savedProduct = products[0];
    expect(savedProduct.name).toEqual('Test Product');
    expect(savedProduct.description).toEqual('A product for testing purposes');
    expect(parseFloat(savedProduct.price)).toEqual(29.99);
    expect(savedProduct.sku).toEqual('TEST-001');
    expect(savedProduct.category).toEqual('Electronics');
    expect(savedProduct.created_at).toBeInstanceOf(Date);
    expect(savedProduct.updated_at).toBeInstanceOf(Date);
  });

  it('should handle numeric price conversion correctly', async () => {
    const priceTestInput: CreateProductInput = {
      name: 'Price Test',
      description: 'Testing price conversion',
      price: 123.456, // Test with multiple decimal places
      sku: 'PRICE-001',
      category: 'Test'
    };

    const result = await createProduct(priceTestInput);

    // Verify price is returned as number with proper precision
    expect(typeof result.price).toBe('number');
    expect(result.price).toBeCloseTo(123.456, 2);

    // Verify database stores price correctly
    const dbProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, result.id))
      .execute();

    expect(parseFloat(dbProduct[0].price)).toBeCloseTo(123.456, 2);
  });

  it('should enforce SKU uniqueness', async () => {
    // Create first product
    await createProduct(testInput);

    // Attempt to create another product with same SKU
    const duplicateSkuInput: CreateProductInput = {
      name: 'Duplicate SKU Product',
      description: 'This should fail',
      price: 50.00,
      sku: 'TEST-001', // Same SKU as testInput
      category: 'Should Fail'
    };

    await expect(createProduct(duplicateSkuInput)).rejects.toThrow(/already exists/i);
  });

  it('should allow different SKUs for different products', async () => {
    // Create first product
    const result1 = await createProduct(testInput);

    // Create second product with different SKU
    const differentSkuInput: CreateProductInput = {
      name: 'Different Product',
      description: 'Different SKU should work',
      price: 45.00,
      sku: 'DIFF-001',
      category: 'Different'
    };

    const result2 = await createProduct(differentSkuInput);

    // Both products should exist
    expect(result1.id).not.toEqual(result2.id);
    expect(result1.sku).toEqual('TEST-001');
    expect(result2.sku).toEqual('DIFF-001');

    // Verify both exist in database
    const allProducts = await db.select()
      .from(productsTable)
      .execute();

    expect(allProducts).toHaveLength(2);
  });

  it('should handle special characters in product data', async () => {
    const specialCharsInput: CreateProductInput = {
      name: 'Product with "Quotes" & Symbols',
      description: 'Description with émojis 🚀 and symbols: @#$%',
      price: 99.99,
      sku: 'SPEC-001',
      category: 'Special/Category-Name'
    };

    const result = await createProduct(specialCharsInput);

    expect(result.name).toEqual('Product with "Quotes" & Symbols');
    expect(result.description).toEqual('Description with émojis 🚀 and symbols: @#$%');
    expect(result.category).toEqual('Special/Category-Name');
  });
});