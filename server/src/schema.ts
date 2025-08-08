import { z } from 'zod';

// Task schemas
export const taskSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  due_date: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type Task = z.infer<typeof taskSchema>;

export const createTaskInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).default('pending'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  due_date: z.coerce.date().nullable(),
});

export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;

export const updateTaskInputSchema = z.object({
  id: z.number(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  due_date: z.coerce.date().nullable().optional(),
});

export type UpdateTaskInput = z.infer<typeof updateTaskInputSchema>;

// Product schemas
export const productSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.number(),
  sku: z.string(),
  category: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type Product = z.infer<typeof productSchema>;

export const createProductInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable(),
  price: z.number().positive(),
  sku: z.string().min(1),
  category: z.string().nullable(),
});

export type CreateProductInput = z.infer<typeof createProductInputSchema>;

export const updateProductInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  price: z.number().positive().optional(),
  sku: z.string().min(1).optional(),
  category: z.string().nullable().optional(),
});

export type UpdateProductInput = z.infer<typeof updateProductInputSchema>;

// Inventory schemas
export const inventorySchema = z.object({
  id: z.number(),
  product_id: z.number(),
  quantity: z.number().int(),
  min_stock_level: z.number().int(),
  max_stock_level: z.number().int(),
  location: z.string().nullable(),
  last_updated: z.coerce.date(),
});

export type Inventory = z.infer<typeof inventorySchema>;

export const createInventoryInputSchema = z.object({
  product_id: z.number(),
  quantity: z.number().int().nonnegative(),
  min_stock_level: z.number().int().nonnegative(),
  max_stock_level: z.number().int().positive(),
  location: z.string().nullable(),
});

export type CreateInventoryInput = z.infer<typeof createInventoryInputSchema>;

export const updateInventoryInputSchema = z.object({
  id: z.number(),
  product_id: z.number().optional(),
  quantity: z.number().int().nonnegative().optional(),
  min_stock_level: z.number().int().nonnegative().optional(),
  max_stock_level: z.number().int().positive().optional(),
  location: z.string().nullable().optional(),
});

export type UpdateInventoryInput = z.infer<typeof updateInventoryInputSchema>;

// Customer schemas
export const customerSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  company: z.string().nullable(),
  status: z.enum(['active', 'inactive', 'pending']),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type Customer = z.infer<typeof customerSchema>;

export const createCustomerInputSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  company: z.string().nullable(),
  status: z.enum(['active', 'inactive', 'pending']).default('active'),
});

export type CreateCustomerInput = z.infer<typeof createCustomerInputSchema>;

export const updateCustomerInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  status: z.enum(['active', 'inactive', 'pending']).optional(),
});

export type UpdateCustomerInput = z.infer<typeof updateCustomerInputSchema>;

// Notification schemas
export const notificationSchema = z.object({
  id: z.number(),
  title: z.string(),
  message: z.string(),
  type: z.enum(['info', 'warning', 'error', 'success']),
  read: z.boolean(),
  entity_type: z.enum(['task', 'product', 'inventory', 'customer']).nullable(),
  entity_id: z.number().nullable(),
  created_at: z.coerce.date(),
});

export type Notification = z.infer<typeof notificationSchema>;

export const createNotificationInputSchema = z.object({
  title: z.string().min(1),
  message: z.string().min(1),
  type: z.enum(['info', 'warning', 'error', 'success']),
  entity_type: z.enum(['task', 'product', 'inventory', 'customer']).nullable(),
  entity_id: z.number().nullable(),
});

export type CreateNotificationInput = z.infer<typeof createNotificationInputSchema>;

export const markNotificationReadInputSchema = z.object({
  id: z.number(),
});

export type MarkNotificationReadInput = z.infer<typeof markNotificationReadInputSchema>;

// Delete input schemas
export const deleteInputSchema = z.object({
  id: z.number(),
});

export type DeleteInput = z.infer<typeof deleteInputSchema>;