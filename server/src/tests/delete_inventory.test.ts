import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { inventoryTable, productsTable, notificationsTable } from '../db/schema';
import { type DeleteInput, type CreateProductInput, type CreateInventoryInput, type CreateNotificationInput } from '../schema';
import { deleteInventory } from '../handlers/delete_inventory';
import { eq, and } from 'drizzle-orm';

describe('deleteInventory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an inventory record', async () => {
    // Create prerequisite product
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A test product',
        price: '19.99',
        sku: 'TEST001',
        category: 'Electronics'
      })
      .returning()
      .execute();

    const productId = productResult[0].id;

    // Create test inventory
    const inventoryResult = await db.insert(inventoryTable)
      .values({
        product_id: productId,
        quantity: 100,
        min_stock_level: 10,
        max_stock_level: 500,
        location: 'Warehouse A'
      })
      .returning()
      .execute();

    const inventoryId = inventoryResult[0].id;

    const deleteInput: DeleteInput = {
      id: inventoryId
    };

    // Delete the inventory
    await deleteInventory(deleteInput);

    // Verify inventory is deleted
    const inventoryRecords = await db.select()
      .from(inventoryTable)
      .where(eq(inventoryTable.id, inventoryId))
      .execute();

    expect(inventoryRecords).toHaveLength(0);
  });

  it('should delete related notifications when deleting inventory', async () => {
    // Create prerequisite product
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A test product',
        price: '19.99',
        sku: 'TEST002',
        category: 'Electronics'
      })
      .returning()
      .execute();

    const productId = productResult[0].id;

    // Create test inventory
    const inventoryResult = await db.insert(inventoryTable)
      .values({
        product_id: productId,
        quantity: 5,
        min_stock_level: 10,
        max_stock_level: 500,
        location: 'Warehouse B'
      })
      .returning()
      .execute();

    const inventoryId = inventoryResult[0].id;

    // Create related notifications
    await db.insert(notificationsTable)
      .values([
        {
          title: 'Low Stock Alert',
          message: 'Inventory is below minimum level',
          type: 'warning',
          entity_type: 'inventory',
          entity_id: inventoryId
        },
        {
          title: 'Stock Update',
          message: 'Inventory quantity updated',
          type: 'info',
          entity_type: 'inventory',
          entity_id: inventoryId
        }
      ])
      .execute();

    // Create unrelated notification (should not be deleted)
    await db.insert(notificationsTable)
      .values({
        title: 'System Notification',
        message: 'General system update',
        type: 'info',
        entity_type: null,
        entity_id: null
      })
      .execute();

    const deleteInput: DeleteInput = {
      id: inventoryId
    };

    // Delete the inventory
    await deleteInventory(deleteInput);

    // Verify inventory is deleted
    const inventoryRecords = await db.select()
      .from(inventoryTable)
      .where(eq(inventoryTable.id, inventoryId))
      .execute();

    expect(inventoryRecords).toHaveLength(0);

    // Verify related notifications are deleted
    const relatedNotifications = await db.select()
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.entity_type, 'inventory'),
          eq(notificationsTable.entity_id, inventoryId)
        )
      )
      .execute();

    expect(relatedNotifications).toHaveLength(0);

    // Verify unrelated notifications are preserved
    const allNotifications = await db.select()
      .from(notificationsTable)
      .execute();

    expect(allNotifications).toHaveLength(1);
    expect(allNotifications[0].title).toEqual('System Notification');
  });

  it('should handle deletion of non-existent inventory gracefully', async () => {
    const deleteInput: DeleteInput = {
      id: 999999 // Non-existent ID
    };

    // Should not throw error even if inventory doesn't exist
    await expect(deleteInventory(deleteInput)).resolves.toBeUndefined();

    // Verify no records were affected
    const allInventory = await db.select().from(inventoryTable).execute();
    expect(allInventory).toHaveLength(0);
  });

  it('should only delete notifications with matching entity type and id', async () => {
    // Create prerequisite product
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A test product',
        price: '29.99',
        sku: 'TEST003',
        category: 'Books'
      })
      .returning()
      .execute();

    const productId = productResult[0].id;

    // Create test inventory
    const inventoryResult = await db.insert(inventoryTable)
      .values({
        product_id: productId,
        quantity: 50,
        min_stock_level: 5,
        max_stock_level: 200,
        location: 'Warehouse C'
      })
      .returning()
      .execute();

    const inventoryId = inventoryResult[0].id;

    // Create various notifications
    await db.insert(notificationsTable)
      .values([
        {
          title: 'Inventory Alert',
          message: 'Related to our inventory',
          type: 'warning',
          entity_type: 'inventory',
          entity_id: inventoryId
        },
        {
          title: 'Product Alert',
          message: 'Same ID but different entity type',
          type: 'info',
          entity_type: 'product',
          entity_id: inventoryId // Same ID but different entity type
        },
        {
          title: 'Other Inventory Alert',
          message: 'Different inventory ID',
          type: 'error',
          entity_type: 'inventory',
          entity_id: inventoryId + 1 // Different inventory ID
        }
      ])
      .execute();

    const deleteInput: DeleteInput = {
      id: inventoryId
    };

    // Delete the inventory
    await deleteInventory(deleteInput);

    // Verify only the correct notification was deleted
    const remainingNotifications = await db.select()
      .from(notificationsTable)
      .execute();

    expect(remainingNotifications).toHaveLength(2);

    // Verify the correct notifications remain
    const productNotification = remainingNotifications.find(n => n.entity_type === 'product');
    const otherInventoryNotification = remainingNotifications.find(n => n.entity_id === inventoryId + 1);

    expect(productNotification).toBeDefined();
    expect(productNotification?.title).toEqual('Product Alert');

    expect(otherInventoryNotification).toBeDefined();
    expect(otherInventoryNotification?.title).toEqual('Other Inventory Alert');
  });
});