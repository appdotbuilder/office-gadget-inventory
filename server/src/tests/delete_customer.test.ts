import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, notificationsTable } from '../db/schema';
import { type DeleteInput, type CreateCustomerInput, type CreateNotificationInput } from '../schema';
import { deleteCustomer } from '../handlers/delete_customer';
import { eq, and } from 'drizzle-orm';

const testCustomerInput: CreateCustomerInput = {
  name: 'Test Customer',
  email: 'test@example.com',
  phone: '+1234567890',
  address: '123 Test St',
  company: 'Test Company',
  status: 'active'
};

const testNotificationInput: CreateNotificationInput = {
  title: 'Customer Notification',
  message: 'Test notification for customer',
  type: 'info',
  entity_type: 'customer',
  entity_id: 1 // Will be updated with actual customer ID
};

describe('deleteCustomer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a customer', async () => {
    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values(testCustomerInput)
      .returning()
      .execute();
    
    const customerId = customerResult[0].id;
    const deleteInput: DeleteInput = { id: customerId };

    // Delete the customer
    await deleteCustomer(deleteInput);

    // Verify customer was deleted
    const customers = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, customerId))
      .execute();

    expect(customers).toHaveLength(0);
  });

  it('should delete related notifications when deleting customer', async () => {
    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values(testCustomerInput)
      .returning()
      .execute();
    
    const customerId = customerResult[0].id;

    // Create related notifications
    const notification1 = {
      ...testNotificationInput,
      entity_id: customerId,
      title: 'First Customer Notification'
    };
    
    const notification2 = {
      ...testNotificationInput,
      entity_id: customerId,
      title: 'Second Customer Notification'
    };

    await db.insert(notificationsTable)
      .values([notification1, notification2])
      .execute();

    // Create unrelated notification (different entity_type)
    const unrelatedNotification = {
      ...testNotificationInput,
      entity_type: 'task' as const,
      entity_id: customerId,
      title: 'Unrelated Notification'
    };

    await db.insert(notificationsTable)
      .values(unrelatedNotification)
      .execute();

    const deleteInput: DeleteInput = { id: customerId };

    // Delete the customer
    await deleteCustomer(deleteInput);

    // Verify customer was deleted
    const customers = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, customerId))
      .execute();

    expect(customers).toHaveLength(0);

    // Verify related customer notifications were deleted
    const customerNotifications = await db.select()
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.entity_type, 'customer'),
          eq(notificationsTable.entity_id, customerId)
        )
      )
      .execute();

    expect(customerNotifications).toHaveLength(0);

    // Verify unrelated notification still exists
    const unrelatedNotifications = await db.select()
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.entity_type, 'task'),
          eq(notificationsTable.entity_id, customerId)
        )
      )
      .execute();

    expect(unrelatedNotifications).toHaveLength(1);
    expect(unrelatedNotifications[0].title).toEqual('Unrelated Notification');
  });

  it('should handle deleting non-existent customer gracefully', async () => {
    const deleteInput: DeleteInput = { id: 999999 };

    // Should not throw error when deleting non-existent customer
    await expect(deleteCustomer(deleteInput)).resolves.toBeUndefined();
  });

  it('should delete customer without related notifications', async () => {
    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values(testCustomerInput)
      .returning()
      .execute();
    
    const customerId = customerResult[0].id;
    const deleteInput: DeleteInput = { id: customerId };

    // Delete the customer (no related notifications)
    await deleteCustomer(deleteInput);

    // Verify customer was deleted
    const customers = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, customerId))
      .execute();

    expect(customers).toHaveLength(0);
  });

  it('should only delete notifications specifically related to the customer', async () => {
    // Create two test customers
    const customer1Result = await db.insert(customersTable)
      .values({
        ...testCustomerInput,
        name: 'Customer 1',
        email: 'customer1@example.com'
      })
      .returning()
      .execute();
    
    const customer2Result = await db.insert(customersTable)
      .values({
        ...testCustomerInput,
        name: 'Customer 2', 
        email: 'customer2@example.com'
      })
      .returning()
      .execute();
    
    const customer1Id = customer1Result[0].id;
    const customer2Id = customer2Result[0].id;

    // Create notifications for both customers
    await db.insert(notificationsTable)
      .values([
        {
          ...testNotificationInput,
          entity_id: customer1Id,
          title: 'Customer 1 Notification'
        },
        {
          ...testNotificationInput,
          entity_id: customer2Id,
          title: 'Customer 2 Notification'
        }
      ])
      .execute();

    const deleteInput: DeleteInput = { id: customer1Id };

    // Delete customer 1
    await deleteCustomer(deleteInput);

    // Verify customer 1 was deleted
    const customer1Records = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, customer1Id))
      .execute();

    expect(customer1Records).toHaveLength(0);

    // Verify customer 2 still exists
    const customer2Records = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, customer2Id))
      .execute();

    expect(customer2Records).toHaveLength(1);

    // Verify only customer 1's notifications were deleted
    const customer1Notifications = await db.select()
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.entity_type, 'customer'),
          eq(notificationsTable.entity_id, customer1Id)
        )
      )
      .execute();

    expect(customer1Notifications).toHaveLength(0);

    // Verify customer 2's notifications still exist
    const customer2Notifications = await db.select()
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.entity_type, 'customer'),
          eq(notificationsTable.entity_id, customer2Id)
        )
      )
      .execute();

    expect(customer2Notifications).toHaveLength(1);
    expect(customer2Notifications[0].title).toEqual('Customer 2 Notification');
  });
});