import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, inventoryTable, notificationsTable } from '../db/schema';
import { type DeleteInput } from '../schema';
import { deleteProduct } from '../handlers/delete_product';
import { eq } from 'drizzle-orm';

const testProduct = {
  name: 'Test Product',
  description: 'A product for testing deletion',
  price: '29.99',
  sku: 'TEST-001',
  category: 'Electronics'
};

const testInventory = {
  quantity: 50,
  min_stock_level: 10,
  max_stock_level: 100,
  location: 'Warehouse A'
};

const testNotification = {
  title: 'Product Low Stock',
  message: 'Product is running low on stock',
  type: 'warning' as const,
  read: false,
  entity_type: 'product' as const
};

describe('deleteProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a product', async () => {
    // Create test product
    const [product] = await db.insert(productsTable)
      .values(testProduct)
      .returning()
      .execute();

    const deleteInput: DeleteInput = { id: product.id };

    // Delete the product
    await deleteProduct(deleteInput);

    // Verify product is deleted
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, product.id))
      .execute();

    expect(products).toHaveLength(0);
  });

  it('should delete related inventory entries', async () => {
    // Create test product
    const [product] = await db.insert(productsTable)
      .values(testProduct)
      .returning()
      .execute();

    // Create inventory for the product
    await db.insert(inventoryTable)
      .values({
        ...testInventory,
        product_id: product.id
      })
      .execute();

    const deleteInput: DeleteInput = { id: product.id };

    // Delete the product
    await deleteProduct(deleteInput);

    // Verify inventory is deleted
    const inventoryItems = await db.select()
      .from(inventoryTable)
      .where(eq(inventoryTable.product_id, product.id))
      .execute();

    expect(inventoryItems).toHaveLength(0);
  });

  it('should delete related notifications', async () => {
    // Create test product
    const [product] = await db.insert(productsTable)
      .values(testProduct)
      .returning()
      .execute();

    // Create notification for the product
    await db.insert(notificationsTable)
      .values({
        ...testNotification,
        entity_id: product.id
      })
      .execute();

    const deleteInput: DeleteInput = { id: product.id };

    // Delete the product
    await deleteProduct(deleteInput);

    // Verify notification is deleted
    const notifications = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.entity_id, product.id))
      .execute();

    expect(notifications).toHaveLength(0);
  });

  it('should handle product with multiple inventory and notification records', async () => {
    // Create test product
    const [product] = await db.insert(productsTable)
      .values(testProduct)
      .returning()
      .execute();

    // Create multiple inventory records
    await db.insert(inventoryTable)
      .values([
        {
          ...testInventory,
          product_id: product.id,
          location: 'Warehouse A'
        },
        {
          ...testInventory,
          product_id: product.id,
          location: 'Warehouse B',
          quantity: 25
        }
      ])
      .execute();

    // Create multiple notifications
    await db.insert(notificationsTable)
      .values([
        {
          ...testNotification,
          entity_id: product.id,
          title: 'Low Stock Alert'
        },
        {
          ...testNotification,
          entity_id: product.id,
          title: 'Reorder Required',
          type: 'error' as const
        }
      ])
      .execute();

    const deleteInput: DeleteInput = { id: product.id };

    // Delete the product
    await deleteProduct(deleteInput);

    // Verify all related records are deleted
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, product.id))
      .execute();

    const inventoryItems = await db.select()
      .from(inventoryTable)
      .where(eq(inventoryTable.product_id, product.id))
      .execute();

    const notifications = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.entity_id, product.id))
      .execute();

    expect(products).toHaveLength(0);
    expect(inventoryItems).toHaveLength(0);
    expect(notifications).toHaveLength(0);
  });

  it('should handle deleting non-existent product gracefully', async () => {
    const deleteInput: DeleteInput = { id: 999 };

    // Should not throw error when deleting non-existent product
    await expect(deleteProduct(deleteInput)).resolves.toBeUndefined();
  });

  it('should not affect other products inventory and notifications', async () => {
    // Create two test products
    const [product1] = await db.insert(productsTable)
      .values({
        ...testProduct,
        name: 'Product 1',
        sku: 'TEST-001'
      })
      .returning()
      .execute();

    const [product2] = await db.insert(productsTable)
      .values({
        ...testProduct,
        name: 'Product 2',
        sku: 'TEST-002'
      })
      .returning()
      .execute();

    // Create inventory for both products
    await db.insert(inventoryTable)
      .values([
        {
          ...testInventory,
          product_id: product1.id
        },
        {
          ...testInventory,
          product_id: product2.id
        }
      ])
      .execute();

    // Create notifications for both products
    await db.insert(notificationsTable)
      .values([
        {
          ...testNotification,
          entity_id: product1.id
        },
        {
          ...testNotification,
          entity_id: product2.id
        }
      ])
      .execute();

    const deleteInput: DeleteInput = { id: product1.id };

    // Delete only product1
    await deleteProduct(deleteInput);

    // Verify product1 and its relations are deleted
    const product1Records = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, product1.id))
      .execute();

    const product1Inventory = await db.select()
      .from(inventoryTable)
      .where(eq(inventoryTable.product_id, product1.id))
      .execute();

    const product1Notifications = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.entity_id, product1.id))
      .execute();

    expect(product1Records).toHaveLength(0);
    expect(product1Inventory).toHaveLength(0);
    expect(product1Notifications).toHaveLength(0);

    // Verify product2 and its relations still exist
    const product2Records = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, product2.id))
      .execute();

    const product2Inventory = await db.select()
      .from(inventoryTable)
      .where(eq(inventoryTable.product_id, product2.id))
      .execute();

    const product2Notifications = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.entity_id, product2.id))
      .execute();

    expect(product2Records).toHaveLength(1);
    expect(product2Inventory).toHaveLength(1);
    expect(product2Notifications).toHaveLength(1);
  });
});