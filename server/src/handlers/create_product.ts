import { db } from '../db';
import { productsTable } from '../db/schema';
import { type CreateProductInput, type Product } from '../schema';
import { eq } from 'drizzle-orm';

export const createProduct = async (input: CreateProductInput): Promise<Product> => {
  try {
    // Validate that SKU is unique across all products
    const existingProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.sku, input.sku))
      .execute();

    if (existingProduct.length > 0) {
      throw new Error(`Product with SKU '${input.sku}' already exists`);
    }

    // Insert product record
    const result = await db.insert(productsTable)
      .values({
        name: input.name,
        description: input.description,
        price: input.price.toString(), // Convert number to string for numeric column
        sku: input.sku,
        category: input.category
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const product = result[0];
    return {
      ...product,
      price: parseFloat(product.price) // Convert string back to number
    };
  } catch (error) {
    console.error('Product creation failed:', error);
    throw error;
  }
};