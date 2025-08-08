import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type CreateProductInput } from '../schema';
import { getProducts, type GetProductsFilters } from '../handlers/get_products';

// Test data setup
const createTestProducts = async () => {
  const testProducts: CreateProductInput[] = [
    {
      name: 'Laptop Computer',
      description: 'High-performance laptop',
      price: 999.99,
      sku: 'LAP001',
      category: 'Electronics'
    },
    {
      name: 'Wireless Mouse',
      description: 'Bluetooth wireless mouse',
      price: 29.99,
      sku: 'MOU001',
      category: 'Electronics'
    },
    {
      name: 'Office Chair',
      description: 'Ergonomic office chair',
      price: 199.99,
      sku: 'CHR001',
      category: 'Furniture'
    },
    {
      name: 'Gaming Laptop',
      description: 'High-end gaming laptop',
      price: 1599.99,
      sku: 'LAP002',
      category: 'Electronics'
    },
    {
      name: 'Desk Lamp',
      description: 'LED desk lamp',
      price: 39.99,
      sku: 'LMP001',
      category: null
    }
  ];

  // Insert test products into database
  for (const product of testProducts) {
    await db.insert(productsTable)
      .values({
        name: product.name,
        description: product.description,
        price: product.price.toString(), // Convert number to string for numeric column
        sku: product.sku,
        category: product.category
      })
      .execute();
  }
};

describe('getProducts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all products when no filters are provided', async () => {
    await createTestProducts();

    const result = await getProducts();

    expect(result).toHaveLength(5);
    
    // Verify all products are returned with correct data types
    result.forEach(product => {
      expect(product.id).toBeDefined();
      expect(typeof product.name).toBe('string');
      expect(typeof product.price).toBe('number'); // Should be converted from string
      expect(typeof product.sku).toBe('string');
      expect(product.created_at).toBeInstanceOf(Date);
      expect(product.updated_at).toBeInstanceOf(Date);
    });

    // Check specific products are included
    const productNames = result.map(p => p.name);
    expect(productNames).toContain('Laptop Computer');
    expect(productNames).toContain('Wireless Mouse');
    expect(productNames).toContain('Office Chair');
    expect(productNames).toContain('Gaming Laptop');
    expect(productNames).toContain('Desk Lamp');
  });

  it('should return empty array when no products exist', async () => {
    const result = await getProducts();
    expect(result).toHaveLength(0);
  });

  it('should filter products by category', async () => {
    await createTestProducts();

    const filters: GetProductsFilters = { category: 'Electronics' };
    const result = await getProducts(filters);

    expect(result).toHaveLength(3);
    result.forEach(product => {
      expect(product.category).toBe('Electronics');
    });

    const productNames = result.map(p => p.name);
    expect(productNames).toContain('Laptop Computer');
    expect(productNames).toContain('Wireless Mouse');
    expect(productNames).toContain('Gaming Laptop');
    expect(productNames).not.toContain('Office Chair');
    expect(productNames).not.toContain('Desk Lamp');
  });

  it('should filter products by category - furniture', async () => {
    await createTestProducts();

    const filters: GetProductsFilters = { category: 'Furniture' };
    const result = await getProducts(filters);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Office Chair');
    expect(result[0].category).toBe('Furniture');
    expect(result[0].price).toBe(199.99);
  });

  it('should return empty array for non-existent category', async () => {
    await createTestProducts();

    const filters: GetProductsFilters = { category: 'NonExistent' };
    const result = await getProducts(filters);

    expect(result).toHaveLength(0);
  });

  it('should search products by name', async () => {
    await createTestProducts();

    const filters: GetProductsFilters = { search: 'laptop' };
    const result = await getProducts(filters);

    expect(result).toHaveLength(2);
    const productNames = result.map(p => p.name);
    expect(productNames).toContain('Laptop Computer');
    expect(productNames).toContain('Gaming Laptop');
  });

  it('should search products by SKU', async () => {
    await createTestProducts();

    const filters: GetProductsFilters = { search: 'LAP001' };
    const result = await getProducts(filters);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Laptop Computer');
    expect(result[0].sku).toBe('LAP001');
  });

  it('should search products case-insensitively', async () => {
    await createTestProducts();

    const filters: GetProductsFilters = { search: 'MOUSE' };
    const result = await getProducts(filters);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Wireless Mouse');
  });

  it('should search products with partial matches', async () => {
    await createTestProducts();

    const filters: GetProductsFilters = { search: 'lap' };
    const result = await getProducts(filters);

    expect(result).toHaveLength(2); // Should match "Laptop Computer" and "Gaming Laptop" (both by name and SKU)
    
    const productNames = result.map(p => p.name);
    expect(productNames).toContain('Laptop Computer');
    expect(productNames).toContain('Gaming Laptop');
    
    // Should also match SKU LAP001 and LAP002
    const skus = result.map(p => p.sku);
    expect(skus.some(sku => sku.includes('LAP'))).toBe(true);
  });

  it('should combine category filter and search', async () => {
    await createTestProducts();

    const filters: GetProductsFilters = { 
      category: 'Electronics',
      search: 'laptop' 
    };
    const result = await getProducts(filters);

    expect(result).toHaveLength(2);
    result.forEach(product => {
      expect(product.category).toBe('Electronics');
      expect(product.name.toLowerCase()).toContain('laptop');
    });
  });

  it('should return empty array when combined filters match nothing', async () => {
    await createTestProducts();

    const filters: GetProductsFilters = { 
      category: 'Furniture',
      search: 'laptop' 
    };
    const result = await getProducts(filters);

    expect(result).toHaveLength(0);
  });

  it('should handle products with null category', async () => {
    await createTestProducts();

    // Search for product with null category
    const filters: GetProductsFilters = { search: 'Desk Lamp' };
    const result = await getProducts(filters);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Desk Lamp');
    expect(result[0].category).toBeNull();
  });

  it('should verify numeric price conversion', async () => {
    await createTestProducts();

    const result = await getProducts();
    const laptopProduct = result.find(p => p.name === 'Laptop Computer');
    
    expect(laptopProduct).toBeDefined();
    expect(typeof laptopProduct!.price).toBe('number');
    expect(laptopProduct!.price).toBe(999.99);
  });
});