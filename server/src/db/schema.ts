import { serial, text, pgTable, timestamp, numeric, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enum definitions
export const taskStatusEnum = pgEnum('task_status', ['pending', 'in_progress', 'completed', 'cancelled']);
export const taskPriorityEnum = pgEnum('task_priority', ['low', 'medium', 'high', 'urgent']);
export const customerStatusEnum = pgEnum('customer_status', ['active', 'inactive', 'pending']);
export const notificationTypeEnum = pgEnum('notification_type', ['info', 'warning', 'error', 'success']);
export const entityTypeEnum = pgEnum('entity_type', ['task', 'product', 'inventory', 'customer']);

// Tasks table
export const tasksTable = pgTable('tasks', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'), // Nullable by default
  status: taskStatusEnum('status').notNull().default('pending'),
  priority: taskPriorityEnum('priority').notNull().default('medium'),
  due_date: timestamp('due_date'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Products table
export const productsTable = pgTable('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'), // Nullable by default
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  sku: text('sku').notNull(),
  category: text('category'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Inventory table
export const inventoryTable = pgTable('inventory', {
  id: serial('id').primaryKey(),
  product_id: integer('product_id').notNull(),
  quantity: integer('quantity').notNull(),
  min_stock_level: integer('min_stock_level').notNull(),
  max_stock_level: integer('max_stock_level').notNull(),
  location: text('location'), // Nullable by default
  last_updated: timestamp('last_updated').defaultNow().notNull(),
});

// Customers table
export const customersTable = pgTable('customers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'), // Nullable by default
  address: text('address'), // Nullable by default
  company: text('company'), // Nullable by default
  status: customerStatusEnum('status').notNull().default('active'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Notifications table
export const notificationsTable = pgTable('notifications', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: notificationTypeEnum('type').notNull(),
  read: boolean('read').notNull().default(false),
  entity_type: entityTypeEnum('entity_type'), // Nullable by default
  entity_id: integer('entity_id'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const productsRelations = relations(productsTable, ({ one }) => ({
  inventory: one(inventoryTable, {
    fields: [productsTable.id],
    references: [inventoryTable.product_id],
  }),
}));

export const inventoryRelations = relations(inventoryTable, ({ one }) => ({
  product: one(productsTable, {
    fields: [inventoryTable.product_id],
    references: [productsTable.id],
  }),
}));

// TypeScript types for the table schemas
export type Task = typeof tasksTable.$inferSelect;
export type NewTask = typeof tasksTable.$inferInsert;

export type Product = typeof productsTable.$inferSelect;
export type NewProduct = typeof productsTable.$inferInsert;

export type Inventory = typeof inventoryTable.$inferSelect;
export type NewInventory = typeof inventoryTable.$inferInsert;

export type Customer = typeof customersTable.$inferSelect;
export type NewCustomer = typeof customersTable.$inferInsert;

export type Notification = typeof notificationsTable.$inferSelect;
export type NewNotification = typeof notificationsTable.$inferInsert;

// Export all tables for proper query building
export const tables = {
  tasks: tasksTable,
  products: productsTable,
  inventory: inventoryTable,
  customers: customersTable,
  notifications: notificationsTable,
};