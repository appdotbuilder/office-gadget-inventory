import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Schema imports
import {
  createTaskInputSchema,
  updateTaskInputSchema,
  createProductInputSchema,
  updateProductInputSchema,
  createInventoryInputSchema,
  updateInventoryInputSchema,
  createCustomerInputSchema,
  updateCustomerInputSchema,
  createNotificationInputSchema,
  markNotificationReadInputSchema,
  deleteInputSchema,
} from './schema';

// Task handler imports
import { createTask } from './handlers/create_task';
import { getTasks } from './handlers/get_tasks';
import { getTaskById } from './handlers/get_task_by_id';
import { updateTask } from './handlers/update_task';
import { deleteTask } from './handlers/delete_task';

// Product handler imports
import { createProduct } from './handlers/create_product';
import { getProducts } from './handlers/get_products';
import { getProductById } from './handlers/get_product_by_id';
import { updateProduct } from './handlers/update_product';
import { deleteProduct } from './handlers/delete_product';

// Inventory handler imports
import { createInventory } from './handlers/create_inventory';
import { getInventory } from './handlers/get_inventory';
import { getInventoryById } from './handlers/get_inventory_by_id';
import { updateInventory } from './handlers/update_inventory';
import { deleteInventory } from './handlers/delete_inventory';

// Customer handler imports
import { createCustomer } from './handlers/create_customer';
import { getCustomers } from './handlers/get_customers';
import { getCustomerById } from './handlers/get_customer_by_id';
import { updateCustomer } from './handlers/update_customer';
import { deleteCustomer } from './handlers/delete_customer';

// Notification handler imports
import { createNotification } from './handlers/create_notification';
import { getNotifications } from './handlers/get_notifications';
import { getUnreadNotificationsCount } from './handlers/get_unread_notifications_count';
import { markNotificationRead } from './handlers/mark_notification_read';
import { markAllNotificationsRead } from './handlers/mark_all_notifications_read';

import { z } from 'zod';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Task routes
  createTask: publicProcedure
    .input(createTaskInputSchema)
    .mutation(({ input }) => createTask(input)),
  
  getTasks: publicProcedure
    .query(() => getTasks()),
  
  getTaskById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getTaskById(input.id)),
  
  updateTask: publicProcedure
    .input(updateTaskInputSchema)
    .mutation(({ input }) => updateTask(input)),
  
  deleteTask: publicProcedure
    .input(deleteInputSchema)
    .mutation(({ input }) => deleteTask(input)),

  // Product routes
  createProduct: publicProcedure
    .input(createProductInputSchema)
    .mutation(({ input }) => createProduct(input)),
  
  getProducts: publicProcedure
    .query(() => getProducts()),
  
  getProductById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getProductById(input.id)),
  
  updateProduct: publicProcedure
    .input(updateProductInputSchema)
    .mutation(({ input }) => updateProduct(input)),
  
  deleteProduct: publicProcedure
    .input(deleteInputSchema)
    .mutation(({ input }) => deleteProduct(input)),

  // Inventory routes
  createInventory: publicProcedure
    .input(createInventoryInputSchema)
    .mutation(({ input }) => createInventory(input)),
  
  getInventory: publicProcedure
    .query(() => getInventory()),
  
  getInventoryById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getInventoryById(input.id)),
  
  updateInventory: publicProcedure
    .input(updateInventoryInputSchema)
    .mutation(({ input }) => updateInventory(input)),
  
  deleteInventory: publicProcedure
    .input(deleteInputSchema)
    .mutation(({ input }) => deleteInventory(input)),

  // Customer routes
  createCustomer: publicProcedure
    .input(createCustomerInputSchema)
    .mutation(({ input }) => createCustomer(input)),
  
  getCustomers: publicProcedure
    .query(() => getCustomers()),
  
  getCustomerById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getCustomerById(input.id)),
  
  updateCustomer: publicProcedure
    .input(updateCustomerInputSchema)
    .mutation(({ input }) => updateCustomer(input)),
  
  deleteCustomer: publicProcedure
    .input(deleteInputSchema)
    .mutation(({ input }) => deleteCustomer(input)),

  // Notification routes
  createNotification: publicProcedure
    .input(createNotificationInputSchema)
    .mutation(({ input }) => createNotification(input)),
  
  getNotifications: publicProcedure
    .query(() => getNotifications()),
  
  getUnreadNotificationsCount: publicProcedure
    .query(() => getUnreadNotificationsCount()),
  
  markNotificationRead: publicProcedure
    .input(markNotificationReadInputSchema)
    .mutation(({ input }) => markNotificationRead(input)),
  
  markAllNotificationsRead: publicProcedure
    .mutation(() => markAllNotificationsRead()),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();