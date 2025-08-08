import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, inventoryTable } from '../db/schema';
import { getInventory, type GetInventoryFilters } from '../handlers/get_inventory';

// Test data setup
const testProduct = {
  name: 'Test Widget',
  description: 'A widget for testing',
  price: '25.99',
  sku: 'TWD-001',
  category: 'Electronics',
};

const testInventory = {
  product_id: 1, // Will be set after product creation
  quantity: 100,
  min_stock_level: 10,
  max_stock_level: 500,
  location: 'Warehouse A',
};

const lowStockInventory = {
  product_id: 2, // Will be set after product creation
  quantity: 5, // Below min_stock_level
  min_stock_level: 10,
  max_stock_level: 200,
  location: 'Warehouse B',
};

describe('getInventory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all inventory entries with product information', async () => {
    // Create test product
    const productResult = await db.insert(productsTable)
      .values(testProduct)
      .returning()
      .execute();
    
    const productId = productResult[0].id;

    // Create inventory entry
    await db.insert(inventoryTable)
      .values({
        ...testInventory,
        product_id: productId,
      })
      .execute();

    const results = await getInventory();

    expect(results).toHaveLength(1);
    
    const inventory = results[0];
    expect(inventory.id).toBeDefined();
    expect(inventory.product_id).toEqual(productId);
    expect(inventory.quantity).toEqual(100);
    expect(inventory.min_stock_level).toEqual(10);
    expect(inventory.max_stock_level).toEqual(500);
    expect(inventory.location).toEqual('Warehouse A');
    expect(inventory.last_updated).toBeInstanceOf(Date);
    
    // Verify product information is included
    expect((inventory as any).product_name).toEqual('Test Widget');
    expect((inventory as any).product_sku).toEqual('TWD-001');
    expect((inventory as any).product_category).toEqual('Electronics');
  });

  it('should filter inventory by location', async () => {
    // Create two products
    const product1Result = await db.insert(productsTable)
      .values({ ...testProduct, sku: 'TWD-001' })
      .returning()
      .execute();
    
    const product2Result = await db.insert(productsTable)
      .values({ ...testProduct, name: 'Another Widget', sku: 'TWD-002' })
      .returning()
      .execute();

    // Create inventory entries in different locations
    await db.insert(inventoryTable)
      .values([
        {
          ...testInventory,
          product_id: product1Result[0].id,
          location: 'Warehouse A',
        },
        {
          ...testInventory,
          product_id: product2Result[0].id,
          location: 'Warehouse B',
          quantity: 75,
        },
      ])
      .execute();

    // Filter by location
    const filters: GetInventoryFilters = { location: 'Warehouse A' };
    const results = await getInventory(filters);

    expect(results).toHaveLength(1);
    expect(results[0].location).toEqual('Warehouse A');
    expect(results[0].quantity).toEqual(100);
    expect((results[0] as any).product_name).toEqual('Test Widget');
  });

  it('should filter inventory by low stock alerts', async () => {
    // Create two products
    const product1Result = await db.insert(productsTable)
      .values({ ...testProduct, sku: 'TWD-001' })
      .returning()
      .execute();
    
    const product2Result = await db.insert(productsTable)
      .values({ ...testProduct, name: 'Low Stock Widget', sku: 'TWD-002' })
      .returning()
      .execute();

    // Create inventory entries - one normal stock, one low stock
    await db.insert(inventoryTable)
      .values([
        {
          ...testInventory,
          product_id: product1Result[0].id,
          quantity: 100, // Above min_stock_level (10)
        },
        {
          ...lowStockInventory,
          product_id: product2Result[0].id,
          quantity: 8, // Below min_stock_level (10)
        },
      ])
      .execute();

    // Filter for low stock only
    const filters: GetInventoryFilters = { lowStockOnly: true };
    const results = await getInventory(filters);

    expect(results).toHaveLength(1);
    expect(results[0].quantity).toEqual(8);
    expect(results[0].min_stock_level).toEqual(10);
    expect((results[0] as any).product_name).toEqual('Low Stock Widget');
  });

  it('should filter by both location and low stock', async () => {
    // Create test products
    const product1Result = await db.insert(productsTable)
      .values({ ...testProduct, sku: 'TWD-001' })
      .returning()
      .execute();
    
    const product2Result = await db.insert(productsTable)
      .values({ ...testProduct, name: 'Low Stock Widget', sku: 'TWD-002' })
      .returning()
      .execute();

    const product3Result = await db.insert(productsTable)
      .values({ ...testProduct, name: 'Another Low Stock', sku: 'TWD-003' })
      .returning()
      .execute();

    // Create inventory entries
    await db.insert(inventoryTable)
      .values([
        {
          ...testInventory,
          product_id: product1Result[0].id,
          location: 'Warehouse A',
          quantity: 100, // Normal stock
        },
        {
          ...lowStockInventory,
          product_id: product2Result[0].id,
          location: 'Warehouse A',
          quantity: 8, // Low stock in Warehouse A
        },
        {
          ...lowStockInventory,
          product_id: product3Result[0].id,
          location: 'Warehouse B',
          quantity: 5, // Low stock in Warehouse B
        },
      ])
      .execute();

    // Filter for low stock in Warehouse A only
    const filters: GetInventoryFilters = { 
      location: 'Warehouse A', 
      lowStockOnly: true 
    };
    const results = await getInventory(filters);

    expect(results).toHaveLength(1);
    expect(results[0].location).toEqual('Warehouse A');
    expect(results[0].quantity).toEqual(8);
    expect((results[0] as any).product_name).toEqual('Low Stock Widget');
  });

  it('should return empty array when no inventory exists', async () => {
    const results = await getInventory();
    expect(results).toHaveLength(0);
  });

  it('should return empty array when filters match no records', async () => {
    // Create test product and inventory
    const productResult = await db.insert(productsTable)
      .values(testProduct)
      .returning()
      .execute();

    await db.insert(inventoryTable)
      .values({
        ...testInventory,
        product_id: productResult[0].id,
        location: 'Warehouse A',
      })
      .execute();

    // Filter by non-existent location
    const filters: GetInventoryFilters = { location: 'Non-existent Warehouse' };
    const results = await getInventory(filters);

    expect(results).toHaveLength(0);
  });

  it('should handle inventory with null location', async () => {
    // Create test product
    const productResult = await db.insert(productsTable)
      .values(testProduct)
      .returning()
      .execute();

    // Create inventory with null location
    await db.insert(inventoryTable)
      .values({
        ...testInventory,
        product_id: productResult[0].id,
        location: null,
      })
      .execute();

    const results = await getInventory();

    expect(results).toHaveLength(1);
    expect(results[0].location).toBeNull();
    expect((results[0] as any).product_name).toEqual('Test Widget');
  });

  it('should include correct timestamp types', async () => {
    // Create test product
    const productResult = await db.insert(productsTable)
      .values(testProduct)
      .returning()
      .execute();

    await db.insert(inventoryTable)
      .values({
        ...testInventory,
        product_id: productResult[0].id,
      })
      .execute();

    const results = await getInventory();

    expect(results).toHaveLength(1);
    expect(results[0].last_updated).toBeInstanceOf(Date);
  });
});