import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { inventoryTable, productsTable, notificationsTable } from '../db/schema';
import { type CreateInventoryInput } from '../schema';
import { createInventory } from '../handlers/create_inventory';
import { eq, and } from 'drizzle-orm';

// Test product data - required for inventory creation
const testProduct = {
  name: 'Test Product',
  description: 'A product for testing inventory',
  price: '19.99',
  sku: 'TEST-001',
  category: 'Electronics'
};

// Basic inventory test input
const testInput: CreateInventoryInput = {
  product_id: 1, // Will be set after creating test product
  quantity: 100,
  min_stock_level: 10,
  max_stock_level: 1000,
  location: 'Warehouse A'
};

// Low stock test input
const lowStockInput: CreateInventoryInput = {
  product_id: 1,
  quantity: 5,
  min_stock_level: 10,
  max_stock_level: 1000,
  location: 'Warehouse B'
};

describe('createInventory', () => {
  let productId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create a test product first
    const productResult = await db.insert(productsTable)
      .values(testProduct)
      .returning()
      .execute();
    
    productId = productResult[0].id;
    
    // Update test inputs with the actual product ID
    testInput.product_id = productId;
    lowStockInput.product_id = productId;
  });

  afterEach(resetDB);

  it('should create inventory entry successfully', async () => {
    const result = await createInventory(testInput);

    // Verify return values
    expect(result.product_id).toEqual(productId);
    expect(result.quantity).toEqual(100);
    expect(result.min_stock_level).toEqual(10);
    expect(result.max_stock_level).toEqual(1000);
    expect(result.location).toEqual('Warehouse A');
    expect(result.id).toBeDefined();
    expect(result.last_updated).toBeInstanceOf(Date);
  });

  it('should save inventory to database', async () => {
    const result = await createInventory(testInput);

    // Verify database record
    const inventory = await db.select()
      .from(inventoryTable)
      .where(eq(inventoryTable.id, result.id))
      .execute();

    expect(inventory).toHaveLength(1);
    expect(inventory[0].product_id).toEqual(productId);
    expect(inventory[0].quantity).toEqual(100);
    expect(inventory[0].min_stock_level).toEqual(10);
    expect(inventory[0].max_stock_level).toEqual(1000);
    expect(inventory[0].location).toEqual('Warehouse A');
    expect(inventory[0].last_updated).toBeInstanceOf(Date);
  });

  it('should throw error when product does not exist', async () => {
    const invalidInput = {
      ...testInput,
      product_id: 9999 // Non-existent product ID
    };

    await expect(createInventory(invalidInput)).rejects.toThrow(/Product with ID 9999 does not exist/);
  });

  it('should create notification when quantity is below minimum stock level', async () => {
    const result = await createInventory(lowStockInput);

    // Check that inventory was created
    expect(result.quantity).toEqual(5);
    expect(result.min_stock_level).toEqual(10);

    // Check that notification was created
    const notifications = await db.select()
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.entity_type, 'inventory'),
          eq(notificationsTable.entity_id, result.id)
        )
      )
      .execute();

    expect(notifications).toHaveLength(1);
    expect(notifications[0].title).toEqual('Low Stock Alert');
    expect(notifications[0].message).toContain('Test Product');
    expect(notifications[0].message).toContain('TEST-001');
    expect(notifications[0].message).toContain('quantity 5');
    expect(notifications[0].message).toContain('minimum stock level of 10');
    expect(notifications[0].type).toEqual('warning');
    expect(notifications[0].entity_type).toEqual('inventory');
    expect(notifications[0].entity_id).toEqual(result.id);
    expect(notifications[0].read).toEqual(false);
  });

  it('should not create notification when quantity meets minimum stock level', async () => {
    const result = await createInventory(testInput);

    // Check that no notification was created
    const notifications = await db.select()
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.entity_type, 'inventory'),
          eq(notificationsTable.entity_id, result.id)
        )
      )
      .execute();

    expect(notifications).toHaveLength(0);
  });

  it('should handle inventory with null location', async () => {
    const inputWithNullLocation = {
      ...testInput,
      location: null
    };

    const result = await createInventory(inputWithNullLocation);

    expect(result.location).toBeNull();
    expect(result.product_id).toEqual(productId);
    expect(result.quantity).toEqual(100);

    // Verify in database
    const inventory = await db.select()
      .from(inventoryTable)
      .where(eq(inventoryTable.id, result.id))
      .execute();

    expect(inventory[0].location).toBeNull();
  });

  it('should create notification when quantity equals minimum stock level', async () => {
    const atMinimumInput = {
      ...testInput,
      quantity: 10, // Equals min_stock_level
      min_stock_level: 10
    };

    const result = await createInventory(atMinimumInput);

    // Should not create notification when quantity equals minimum
    const notifications = await db.select()
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.entity_type, 'inventory'),
          eq(notificationsTable.entity_id, result.id)
        )
      )
      .execute();

    expect(notifications).toHaveLength(0);
  });
});