import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Archive, MapPin, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Inventory, Product, CreateInventoryInput, UpdateInventoryInput } from '../../../server/src/schema';

export function InventoryTab() {
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingInventory, setEditingInventory] = useState<Inventory | null>(null);

  const [formData, setFormData] = useState<CreateInventoryInput>({
    product_id: 0,
    quantity: 0,
    min_stock_level: 0,
    max_stock_level: 100,
    location: null,
  });

  const loadData = useCallback(async () => {
    try {
      const [inventoryData, productsData] = await Promise.all([
        trpc.getInventory.query(),
        trpc.getProducts.query()
      ]);
      setInventory(inventoryData);
      setProducts(productsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (editingInventory) {
        const updateData: UpdateInventoryInput = {
          id: editingInventory.id,
          product_id: formData.product_id,
          quantity: formData.quantity,
          min_stock_level: formData.min_stock_level,
          max_stock_level: formData.max_stock_level,
          location: formData.location,
        };
        const response = await trpc.updateInventory.mutate(updateData);
        setInventory((prev: Inventory[]) =>
          prev.map((item: Inventory) => item.id === editingInventory.id ? response : item)
        );
        setEditingInventory(null);
      } else {
        const response = await trpc.createInventory.mutate(formData);
        setInventory((prev: Inventory[]) => [...prev, response]);
        setShowCreateDialog(false);
      }
      
      // Reset form
      setFormData({
        product_id: 0,
        quantity: 0,
        min_stock_level: 0,
        max_stock_level: 100,
        location: null,
      });
    } catch (error) {
      console.error('Failed to save inventory:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await trpc.deleteInventory.mutate({ id });
      setInventory((prev: Inventory[]) => prev.filter((item: Inventory) => item.id !== id));
    } catch (error) {
      console.error('Failed to delete inventory:', error);
    }
  };

  const handleEdit = (item: Inventory) => {
    setEditingInventory(item);
    setFormData({
      product_id: item.product_id,
      quantity: item.quantity,
      min_stock_level: item.min_stock_level,
      max_stock_level: item.max_stock_level,
      location: item.location,
    });
  };

  const getStockStatus = (quantity: number, minLevel: number, maxLevel: number) => {
    if (quantity <= minLevel) {
      return { status: 'low', color: 'bg-red-100 text-red-800', icon: TrendingDown };
    } else if (quantity >= maxLevel) {
      return { status: 'overstocked', color: 'bg-yellow-100 text-yellow-800', icon: TrendingUp };
    } else {
      return { status: 'normal', color: 'bg-green-100 text-green-800', icon: TrendingUp };
    }
  };

  const getProductName = (productId: number) => {
    const product = products.find((p: Product) => p.id === productId);
    return product ? product.name : `Product ${productId}`;
  };

  const InventoryForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">Product</label>
        <Select
          value={formData.product_id.toString()}
          onValueChange={(value: string) =>
            setFormData((prev: CreateInventoryInput) => ({ ...prev, product_id: parseInt(value) }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select product" />
          </SelectTrigger>
          <SelectContent>
            {products.map((product: Product) => (
              <SelectItem key={product.id} value={product.id.toString()}>
                {product.name} (SKU: {product.sku})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <Input
          type="number"
          placeholder="Quantity"
          value={formData.quantity}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: CreateInventoryInput) => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))
          }
          min="0"
          required
        />

        <Input
          type="number"
          placeholder="Min Level"
          value={formData.min_stock_level}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: CreateInventoryInput) => ({ ...prev, min_stock_level: parseInt(e.target.value) || 0 }))
          }
          min="0"
          required
        />

        <Input
          type="number"
          placeholder="Max Level"
          value={formData.max_stock_level}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: CreateInventoryInput) => ({ ...prev, max_stock_level: parseInt(e.target.value) || 100 }))
          }
          min="1"
          required
        />
      </div>

      <Input
        placeholder="Location (optional)"
        value={formData.location || ''}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setFormData((prev: CreateInventoryInput) => ({
            ...prev,
            location: e.target.value || null
          }))
        }
      />

      <div className="flex gap-2">
        <Button type="submit" disabled={isLoading || formData.product_id === 0} className="flex-1">
          {isLoading ? 'Saving...' : editingInventory ? 'Update Inventory' : 'Add to Inventory'}
        </Button>
        {editingInventory && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setEditingInventory(null);
              setFormData({
                product_id: 0,
                quantity: 0,
                min_stock_level: 0,
                max_stock_level: 100,
                location: null,
              });
            }}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );

  const lowStockItems = inventory.filter((item: Inventory) => item.quantity <= item.min_stock_level);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Inventory 📊</h2>
          <p className="text-gray-600">Track stock levels and manage inventory</p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-orange-600 hover:bg-orange-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Inventory
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Inventory Item</DialogTitle>
            </DialogHeader>
            <InventoryForm />
          </DialogContent>
        </Dialog>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <CardTitle className="text-red-800">Low Stock Alert!</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-red-700 mb-2">
              {lowStockItems.length} item{lowStockItems.length > 1 ? 's' : ''} running low on stock:
            </p>
            <div className="flex flex-wrap gap-2">
              {lowStockItems.map((item: Inventory) => (
                <Badge key={item.id} variant="destructive">
                  {getProductName(item.product_id)} ({item.quantity} left)
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      {editingInventory && (
        <Dialog open={!!editingInventory} onOpenChange={() => setEditingInventory(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Inventory</DialogTitle>
            </DialogHeader>
            <InventoryForm />
          </DialogContent>
        </Dialog>
      )}

      {/* Inventory Grid */}
      {inventory.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-lg font-semibold mb-2">No inventory items yet</h3>
          <p className="text-gray-600 mb-4">Add your first inventory item to start tracking!</p>
          <Button onClick={() => setShowCreateDialog(true)} disabled={products.length === 0}>
            <Plus className="h-4 w-4 mr-2" />
            {products.length === 0 ? 'Add Products First' : 'Add First Inventory Item'}
          </Button>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {inventory.map((item: Inventory) => {
            const stockStatus = getStockStatus(item.quantity, item.min_stock_level, item.max_stock_level);
            const StatusIcon = stockStatus.icon;
            
            return (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <Archive className="h-5 w-5 text-orange-600" />
                      <CardTitle className="text-lg">{getProductName(item.product_id)}</CardTitle>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(item)}
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
                            <AlertDialogTitle>Delete Inventory</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this inventory item for "{getProductName(item.product_id)}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(item.id)}
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
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Current Stock:</span>
                      <div className="flex items-center gap-2">
                        <Badge className={stockStatus.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {item.quantity}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Stock Range:</span>
                      <Badge variant="outline" className="text-xs">
                        {item.min_stock_level} - {item.max_stock_level}
                      </Badge>
                    </div>

                    {item.location && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="h-4 w-4 mr-1" />
                          <span>Location:</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {item.location}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Stock Level Visualization */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Stock Level</span>
                      <span>{Math.round((item.quantity / item.max_stock_level) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          item.quantity <= item.min_stock_level
                            ? 'bg-red-500'
                            : item.quantity >= item.max_stock_level
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                        style={{
                          width: `${Math.min((item.quantity / item.max_stock_level) * 100, 100)}%`
                        }}
                      />
                    </div>
                  </div>

                  <div className="text-xs text-gray-400 pt-2 mt-4 border-t">
                    Updated: {item.last_updated.toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}