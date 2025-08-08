import { db } from '../db';
import { productsTable } from '../db/schema';
import { type UpdateProductInput, type Product } from '../schema';
import { eq, and, ne } from 'drizzle-orm';

export const updateProduct = async (input: UpdateProductInput): Promise<Product> => {
  try {
    // First, check if the product exists
    const existingProducts = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, input.id))
      .execute();

    if (existingProducts.length === 0) {
      throw new Error(`Product with id ${input.id} not found`);
    }

    // If SKU is being updated, check for uniqueness
    if (input.sku) {
      const skuConflicts = await db.select()
        .from(productsTable)
        .where(and(
          eq(productsTable.sku, input.sku),
          ne(productsTable.id, input.id)
        ))
        .execute();

      if (skuConflicts.length > 0) {
        throw new Error(`SKU '${input.sku}' already exists for another product`);
      }
    }

    // Build the update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.price !== undefined) updateData.price = input.price.toString(); // Convert to string for numeric column
    if (input.sku !== undefined) updateData.sku = input.sku;
    if (input.category !== undefined) updateData.category = input.category;

    // Update the product
    const result = await db.update(productsTable)
      .set(updateData)
      .where(eq(productsTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const product = result[0];
    return {
      ...product,
      price: parseFloat(product.price) // Convert string back to number
    };
  } catch (error) {
    console.error('Product update failed:', error);
    throw error;
  }
};