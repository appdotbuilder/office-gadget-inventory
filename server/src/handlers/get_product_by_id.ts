import { db } from '../db';
import { productsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type Product } from '../schema';

export const getProductById = async (id: number): Promise<Product | null> => {
  try {
    const result = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, id))
      .execute();

    if (result.length === 0) {
      return null;
    }

    // Convert numeric fields back to numbers before returning
    const product = result[0];
    return {
      ...product,
      price: parseFloat(product.price) // Convert string back to number
    };
  } catch (error) {
    console.error('Product retrieval failed:', error);
    throw error;
  }
};