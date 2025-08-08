import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { inventoryTable, productsTable } from '../db/schema';
import { getInventoryById } from '../handlers/get_inventory_by_id';
import { eq } from 'drizzle-orm';

describe('getInventoryById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return inventory by ID with product relationship', async () => {
    // Create a product first (required for foreign key)
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A test product',
        price: '19.99',
        sku: 'TEST-001',
        category: 'Electronics'
      })
      .returning()
      .execute();

    const productId = productResult[0].id;

    // Create inventory record
    const inventoryResult = await db.insert(inventoryTable)
      .values({
        product_id: productId,
        quantity: 50,
        min_stock_level: 10,
        max_stock_level: 100,
        location: 'Warehouse A'
      })
      .returning()
      .execute();

    const inventoryId = inventoryResult[0].id;

    // Test the handler
    const result = await getInventoryById(inventoryId);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(inventoryId);
    expect(result!.product_id).toBe(productId);
    expect(result!.quantity).toBe(50);
    expect(result!.min_stock_level).toBe(10);
    expect(result!.max_stock_level).toBe(100);
    expect(result!.location).toBe('Warehouse A');
    expect(result!.last_updated).toBeInstanceOf(Date);
  });

  it('should return null when inventory does not exist', async () => {
    const result = await getInventoryById(999);
    expect(result).toBeNull();
  });

  it('should handle inventory with null location', async () => {
    // Create a product first
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product 2',
        description: 'Another test product',
        price: '29.99',
        sku: 'TEST-002',
        category: 'Books'
      })
      .returning()
      .execute();

    const productId = productResult[0].id;

    // Create inventory record with null location
    const inventoryResult = await db.insert(inventoryTable)
      .values({
        product_id: productId,
        quantity: 25,
        min_stock_level: 5,
        max_stock_level: 50,
        location: null
      })
      .returning()
      .execute();

    const inventoryId = inventoryResult[0].id;

    // Test the handler
    const result = await getInventoryById(inventoryId);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(inventoryId);
    expect(result!.product_id).toBe(productId);
    expect(result!.quantity).toBe(25);
    expect(result!.min_stock_level).toBe(5);
    expect(result!.max_stock_level).toBe(50);
    expect(result!.location).toBeNull();
    expect(result!.last_updated).toBeInstanceOf(Date);
  });

  it('should handle minimum and maximum stock levels correctly', async () => {
    // Create a product first
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product 3',
        description: 'Product with edge case stock levels',
        price: '9.99',
        sku: 'TEST-003',
        category: 'Toys'
      })
      .returning()
      .execute();

    const productId = productResult[0].id;

    // Create inventory with edge case values
    const inventoryResult = await db.insert(inventoryTable)
      .values({
        product_id: productId,
        quantity: 0, // Zero quantity
        min_stock_level: 0, // Zero minimum
        max_stock_level: 1, // Minimum possible maximum
        location: 'Storage Room B'
      })
      .returning()
      .execute();

    const inventoryId = inventoryResult[0].id;

    // Test the handler
    const result = await getInventoryById(inventoryId);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(inventoryId);
    expect(result!.product_id).toBe(productId);
    expect(result!.quantity).toBe(0);
    expect(result!.min_stock_level).toBe(0);
    expect(result!.max_stock_level).toBe(1);
    expect(result!.location).toBe('Storage Room B');
    expect(result!.last_updated).toBeInstanceOf(Date);
  });

  it('should verify the inventory is properly linked to the product', async () => {
    // Create a product
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Linked Product',
        description: 'Product to test linking',
        price: '39.99',
        sku: 'LINKED-001',
        category: 'Home'
      })
      .returning()
      .execute();

    const productId = productResult[0].id;

    // Create inventory for this product
    const inventoryResult = await db.insert(inventoryTable)
      .values({
        product_id: productId,
        quantity: 75,
        min_stock_level: 15,
        max_stock_level: 150,
        location: 'Main Warehouse'
      })
      .returning()
      .execute();

    const inventoryId = inventoryResult[0].id;

    // Get inventory through handler
    const result = await getInventoryById(inventoryId);

    // Verify the product relationship
    expect(result).not.toBeNull();
    expect(result!.product_id).toBe(productId);

    // Verify the product actually exists by querying it separately
    const productCheck = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, result!.product_id))
      .execute();

    expect(productCheck).toHaveLength(1);
    expect(productCheck[0].name).toBe('Linked Product');
    expect(productCheck[0].sku).toBe('LINKED-001');
  });
});