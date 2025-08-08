import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type UpdateProductInput, type CreateProductInput } from '../schema';
import { updateProduct } from '../handlers/update_product';
import { eq } from 'drizzle-orm';

// Helper function to create a test product
const createTestProduct = async (productData: CreateProductInput) => {
  const result = await db.insert(productsTable)
    .values({
      name: productData.name,
      description: productData.description,
      price: productData.price.toString(),
      sku: productData.sku,
      category: productData.category
    })
    .returning()
    .execute();

  return {
    ...result[0],
    price: parseFloat(result[0].price)
  };
};

const testProductData: CreateProductInput = {
  name: 'Original Product',
  description: 'Original description',
  price: 99.99,
  sku: 'ORIG-001',
  category: 'Electronics'
};

describe('updateProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update all product fields', async () => {
    // Create test product
    const originalProduct = await createTestProduct(testProductData);

    const updateInput: UpdateProductInput = {
      id: originalProduct.id,
      name: 'Updated Product Name',
      description: 'Updated description',
      price: 149.99,
      sku: 'UPD-001',
      category: 'Updated Category'
    };

    const result = await updateProduct(updateInput);

    // Verify updated fields
    expect(result.id).toEqual(originalProduct.id);
    expect(result.name).toEqual('Updated Product Name');
    expect(result.description).toEqual('Updated description');
    expect(result.price).toEqual(149.99);
    expect(typeof result.price).toEqual('number');
    expect(result.sku).toEqual('UPD-001');
    expect(result.category).toEqual('Updated Category');
    expect(result.created_at).toEqual(originalProduct.created_at);
    expect(result.updated_at).not.toEqual(originalProduct.updated_at);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update only specified fields', async () => {
    const originalProduct = await createTestProduct(testProductData);

    const updateInput: UpdateProductInput = {
      id: originalProduct.id,
      name: 'Partially Updated Name',
      price: 199.99
    };

    const result = await updateProduct(updateInput);

    // Updated fields
    expect(result.name).toEqual('Partially Updated Name');
    expect(result.price).toEqual(199.99);
    expect(typeof result.price).toEqual('number');

    // Unchanged fields
    expect(result.description).toEqual(originalProduct.description);
    expect(result.sku).toEqual(originalProduct.sku);
    expect(result.category).toEqual(originalProduct.category);
    expect(result.created_at).toEqual(originalProduct.created_at);

    // updated_at should change
    expect(result.updated_at).not.toEqual(originalProduct.updated_at);
  });

  it('should update nullable fields to null', async () => {
    const originalProduct = await createTestProduct(testProductData);

    const updateInput: UpdateProductInput = {
      id: originalProduct.id,
      description: null,
      category: null
    };

    const result = await updateProduct(updateInput);

    expect(result.description).toBeNull();
    expect(result.category).toBeNull();
    expect(result.name).toEqual(originalProduct.name); // Should remain unchanged
  });

  it('should persist changes to database', async () => {
    const originalProduct = await createTestProduct(testProductData);

    const updateInput: UpdateProductInput = {
      id: originalProduct.id,
      name: 'Database Test Product',
      price: 299.99
    };

    await updateProduct(updateInput);

    // Verify in database
    const dbProducts = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, originalProduct.id))
      .execute();

    expect(dbProducts).toHaveLength(1);
    const dbProduct = dbProducts[0];
    expect(dbProduct.name).toEqual('Database Test Product');
    expect(parseFloat(dbProduct.price)).toEqual(299.99);
    expect(dbProduct.updated_at).not.toEqual(originalProduct.updated_at);
  });

  it('should throw error when product not found', async () => {
    const updateInput: UpdateProductInput = {
      id: 99999,
      name: 'Non-existent Product'
    };

    await expect(updateProduct(updateInput)).rejects.toThrow(/Product with id 99999 not found/i);
  });

  it('should throw error when SKU conflicts with existing product', async () => {
    // Create two test products
    const product1 = await createTestProduct({
      ...testProductData,
      sku: 'SKU-001'
    });

    const product2 = await createTestProduct({
      ...testProductData,
      name: 'Second Product',
      sku: 'SKU-002'
    });

    // Try to update product2 with product1's SKU
    const updateInput: UpdateProductInput = {
      id: product2.id,
      sku: 'SKU-001' // This should conflict
    };

    await expect(updateProduct(updateInput)).rejects.toThrow(/SKU 'SKU-001' already exists for another product/i);
  });

  it('should allow updating SKU to same value', async () => {
    const originalProduct = await createTestProduct(testProductData);

    const updateInput: UpdateProductInput = {
      id: originalProduct.id,
      sku: originalProduct.sku, // Same SKU
      name: 'Updated Name'
    };

    const result = await updateProduct(updateInput);

    expect(result.sku).toEqual(originalProduct.sku);
    expect(result.name).toEqual('Updated Name');
  });

  it('should update price with correct numeric conversion', async () => {
    const originalProduct = await createTestProduct(testProductData);

    const updateInput: UpdateProductInput = {
      id: originalProduct.id,
      price: 12.34
    };

    const result = await updateProduct(updateInput);

    expect(result.price).toEqual(12.34);
    expect(typeof result.price).toEqual('number');

    // Verify in database - stored as string but retrieved correctly
    const dbProducts = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, originalProduct.id))
      .execute();

    expect(parseFloat(dbProducts[0].price)).toEqual(12.34);
  });
});