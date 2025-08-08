import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { inventoryTable, productsTable, notificationsTable } from '../db/schema';
import { type UpdateInventoryInput } from '../schema';
import { updateInventory } from '../handlers/update_inventory';
import { eq, and } from 'drizzle-orm';

describe('updateInventory', () => {
  let testProductId: number;
  let testInventoryId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create a test product first
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A product for testing',
        price: '19.99',
        sku: 'TEST-001',
        category: 'Test Category',
      })
      .returning()
      .execute();
    
    testProductId = productResult[0].id;

    // Create a test inventory entry
    const inventoryResult = await db.insert(inventoryTable)
      .values({
        product_id: testProductId,
        quantity: 50,
        min_stock_level: 10,
        max_stock_level: 100,
        location: 'Warehouse A',
      })
      .returning()
      .execute();
    
    testInventoryId = inventoryResult[0].id;
  });

  afterEach(resetDB);

  it('should update inventory quantity', async () => {
    const input: UpdateInventoryInput = {
      id: testInventoryId,
      quantity: 75,
    };

    const result = await updateInventory(input);

    expect(result.id).toBe(testInventoryId);
    expect(result.quantity).toBe(75);
    expect(result.product_id).toBe(testProductId);
    expect(result.min_stock_level).toBe(10); // Should remain unchanged
    expect(result.max_stock_level).toBe(100); // Should remain unchanged
    expect(result.location).toBe('Warehouse A'); // Should remain unchanged
    expect(result.last_updated).toBeInstanceOf(Date);
  });

  it('should update multiple fields at once', async () => {
    const input: UpdateInventoryInput = {
      id: testInventoryId,
      quantity: 30,
      min_stock_level: 5,
      max_stock_level: 150,
      location: 'Warehouse B',
    };

    const result = await updateInventory(input);

    expect(result.id).toBe(testInventoryId);
    expect(result.quantity).toBe(30);
    expect(result.min_stock_level).toBe(5);
    expect(result.max_stock_level).toBe(150);
    expect(result.location).toBe('Warehouse B');
    expect(result.product_id).toBe(testProductId); // Should remain unchanged
    expect(result.last_updated).toBeInstanceOf(Date);
  });

  it('should update location to null', async () => {
    const input: UpdateInventoryInput = {
      id: testInventoryId,
      location: null,
    };

    const result = await updateInventory(input);

    expect(result.location).toBeNull();
    expect(result.quantity).toBe(50); // Should remain unchanged
  });

  it('should save updated inventory to database', async () => {
    const input: UpdateInventoryInput = {
      id: testInventoryId,
      quantity: 25,
      location: 'Updated Location',
    };

    await updateInventory(input);

    const savedInventory = await db.select()
      .from(inventoryTable)
      .where(eq(inventoryTable.id, testInventoryId))
      .execute();

    expect(savedInventory).toHaveLength(1);
    expect(savedInventory[0].quantity).toBe(25);
    expect(savedInventory[0].location).toBe('Updated Location');
    expect(savedInventory[0].last_updated).toBeInstanceOf(Date);
  });

  it('should create low stock notification when quantity falls below minimum', async () => {
    const input: UpdateInventoryInput = {
      id: testInventoryId,
      quantity: 5, // Below min_stock_level of 10
    };

    await updateInventory(input);

    // Check that a notification was created
    const notifications = await db.select()
      .from(notificationsTable)
      .where(and(
        eq(notificationsTable.entity_type, 'inventory'),
        eq(notificationsTable.entity_id, testInventoryId)
      ))
      .execute();

    expect(notifications).toHaveLength(1);
    expect(notifications[0].title).toBe('Low Stock Alert');
    expect(notifications[0].message).toContain('Test Product');
    expect(notifications[0].message).toContain('Current: 5');
    expect(notifications[0].message).toContain('Minimum: 10');
    expect(notifications[0].type).toBe('warning');
    expect(notifications[0].entity_type).toBe('inventory');
    expect(notifications[0].entity_id).toBe(testInventoryId);
  });

  it('should create notification when min_stock_level is updated above current quantity', async () => {
    const input: UpdateInventoryInput = {
      id: testInventoryId,
      min_stock_level: 60, // Above current quantity of 50
    };

    await updateInventory(input);

    // Check that a notification was created
    const notifications = await db.select()
      .from(notificationsTable)
      .where(and(
        eq(notificationsTable.entity_type, 'inventory'),
        eq(notificationsTable.entity_id, testInventoryId)
      ))
      .execute();

    expect(notifications).toHaveLength(1);
    expect(notifications[0].message).toContain('Current: 50');
    expect(notifications[0].message).toContain('Minimum: 60');
    expect(notifications[0].type).toBe('warning');
  });

  it('should not create notification when quantity is above minimum stock level', async () => {
    const input: UpdateInventoryInput = {
      id: testInventoryId,
      quantity: 25, // Above min_stock_level of 10
    };

    await updateInventory(input);

    // Check that no notification was created
    const notifications = await db.select()
      .from(notificationsTable)
      .where(and(
        eq(notificationsTable.entity_type, 'inventory'),
        eq(notificationsTable.entity_id, testInventoryId)
      ))
      .execute();

    expect(notifications).toHaveLength(0);
  });

  it('should update product_id and verify foreign key constraint', async () => {
    // Create another product
    const anotherProductResult = await db.insert(productsTable)
      .values({
        name: 'Another Product',
        description: 'Another test product',
        price: '29.99',
        sku: 'TEST-002',
        category: 'Test Category',
      })
      .returning()
      .execute();

    const anotherProductId = anotherProductResult[0].id;

    const input: UpdateInventoryInput = {
      id: testInventoryId,
      product_id: anotherProductId,
    };

    const result = await updateInventory(input);

    expect(result.product_id).toBe(anotherProductId);
    expect(result.quantity).toBe(50); // Should remain unchanged
  });

  it('should throw error when inventory item does not exist', async () => {
    const input: UpdateInventoryInput = {
      id: 999999, // Non-existent ID
      quantity: 50,
    };

    await expect(updateInventory(input)).rejects.toThrow(/not found/i);
  });

  it('should always update last_updated timestamp', async () => {
    // Get current timestamp
    const beforeUpdate = new Date();
    
    // Small delay to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: UpdateInventoryInput = {
      id: testInventoryId,
      quantity: 50, // Same as current value
    };

    const result = await updateInventory(input);

    expect(result.last_updated).toBeInstanceOf(Date);
    expect(result.last_updated.getTime()).toBeGreaterThan(beforeUpdate.getTime());
  });

  it('should handle notification creation when product name is not found', async () => {
    // Create inventory with non-existent product_id
    const inventoryWithBadProduct = await db.insert(inventoryTable)
      .values({
        product_id: 999999, // Non-existent product
        quantity: 50,
        min_stock_level: 10,
        max_stock_level: 100,
        location: 'Test Location',
      })
      .returning()
      .execute();

    const input: UpdateInventoryInput = {
      id: inventoryWithBadProduct[0].id,
      quantity: 5, // Below minimum
    };

    const result = await updateInventory(input);

    // Check that notification was still created with default product name
    const notifications = await db.select()
      .from(notificationsTable)
      .where(and(
        eq(notificationsTable.entity_type, 'inventory'),
        eq(notificationsTable.entity_id, inventoryWithBadProduct[0].id)
      ))
      .execute();

    expect(notifications).toHaveLength(1);
    expect(notifications[0].message).toContain('Unknown Product');
  });
});