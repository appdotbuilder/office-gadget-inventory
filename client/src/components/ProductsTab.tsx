import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Package, DollarSign, Hash } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Product, CreateProductInput, UpdateProductInput } from '../../../server/src/schema';

export function ProductsTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [formData, setFormData] = useState<CreateProductInput>({
    name: '',
    description: null,
    price: 0,
    sku: '',
    category: null,
  });

  const loadProducts = useCallback(async () => {
    try {
      const result = await trpc.getProducts.query();
      setProducts(result);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (editingProduct) {
        const updateData: UpdateProductInput = {
          id: editingProduct.id,
          name: formData.name,
          description: formData.description,
          price: formData.price,
          sku: formData.sku,
          category: formData.category,
        };
        const response = await trpc.updateProduct.mutate(updateData);
        setProducts((prev: Product[]) =>
          prev.map((product: Product) => product.id === editingProduct.id ? response : product)
        );
        setEditingProduct(null);
      } else {
        const response = await trpc.createProduct.mutate(formData);
        setProducts((prev: Product[]) => [...prev, response]);
        setShowCreateDialog(false);
      }
      
      // Reset form
      setFormData({
        name: '',
        description: null,
        price: 0,
        sku: '',
        category: null,
      });
    } catch (error) {
      console.error('Failed to save product:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await trpc.deleteProduct.mutate({ id });
      setProducts((prev: Product[]) => prev.filter((product: Product) => product.id !== id));
    } catch (error) {
      console.error('Failed to delete product:', error);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price,
      sku: product.sku,
      category: product.category,
    });
  };

  const ProductForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        placeholder="Product name"
        value={formData.name}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setFormData((prev: CreateProductInput) => ({ ...prev, name: e.target.value }))
        }
        required
      />
      
      <Textarea
        placeholder="Description (optional)"
        value={formData.description || ''}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
          setFormData((prev: CreateProductInput) => ({
            ...prev,
            description: e.target.value || null
          }))
        }
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          type="number"
          placeholder="Price"
          value={formData.price}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: CreateProductInput) => ({ ...prev, price: parseFloat(e.target.value) || 0 }))
          }
          step="0.01"
          min="0"
          required
        />

        <Input
          placeholder="SKU"
          value={formData.sku}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: CreateProductInput) => ({ ...prev, sku: e.target.value }))
          }
          required
        />
      </div>

      <Input
        placeholder="Category (optional)"
        value={formData.category || ''}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setFormData((prev: CreateProductInput) => ({
            ...prev,
            category: e.target.value || null
          }))
        }
      />

      <div className="flex gap-2">
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
        </Button>
        {editingProduct && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setEditingProduct(null);
              setFormData({
                name: '',
                description: null,
                price: 0,
                sku: '',
                category: null,
              });
            }}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Products 📦</h2>
          <p className="text-gray-600">Manage your product catalog</p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Product</DialogTitle>
            </DialogHeader>
            <ProductForm />
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      {editingProduct && (
        <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
            </DialogHeader>
            <ProductForm />
          </DialogContent>
        </Dialog>
      )}

      {/* Products Grid */}
      {products.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="text-4xl mb-4">📦</div>
          <h3 className="text-lg font-semibold mb-2">No products yet</h3>
          <p className="text-gray-600 mb-4">Add your first product to get started!</p>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add First Product
          </Button>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product: Product) => (
            <Card key={product.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-green-600" />
                    <CardTitle className="text-lg">{product.name}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(product)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Product</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{product.name}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(product.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                {product.description && (
                  <p className="text-gray-600 mb-4 text-sm">{product.description}</p>
                )}
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-gray-600">
                      <DollarSign className="h-4 w-4 mr-1" />
                      <span>Price:</span>
                    </div>
                    <Badge variant="outline" className="text-green-700 font-semibold">
                      ${product.price.toFixed(2)}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-gray-600">
                      <Hash className="h-4 w-4 mr-1" />
                      <span>SKU:</span>
                    </div>
                    <Badge variant="outline">
                      {product.sku}
                    </Badge>
                  </div>

                  {product.category && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Category:</span>
                      <Badge variant="secondary">
                        {product.category}
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="text-xs text-gray-400 pt-2 border-t">
                  Created: {product.created_at.toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}