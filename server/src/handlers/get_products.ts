import { db } from '../db';
import { productsTable } from '../db/schema';
import { type Product } from '../schema';
import { eq, ilike, or, and, type SQL } from 'drizzle-orm';

export interface GetProductsFilters {
  category?: string;
  search?: string; // Searches by name or SKU
}

export const getProducts = async (filters?: GetProductsFilters): Promise<Product[]> => {
  try {
    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    // Filter by category if provided
    if (filters?.category) {
      conditions.push(eq(productsTable.category, filters.category));
    }

    // Search by name or SKU if search term provided
    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(productsTable.name, searchTerm),
          ilike(productsTable.sku, searchTerm)
        )!
      );
    }

    // Build and execute query based on whether conditions exist
    const results = conditions.length > 0
      ? await db.select()
          .from(productsTable)
          .where(conditions.length === 1 ? conditions[0] : and(...conditions)!)
          .execute()
      : await db.select()
          .from(productsTable)
          .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(product => ({
      ...product,
      price: parseFloat(product.price) // Convert string back to number
    }));
  } catch (error) {
    console.error('Failed to fetch products:', error);
    throw error;
  }
};