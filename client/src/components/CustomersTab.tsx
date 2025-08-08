import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Users, Mail, Phone, MapPin, Building } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Customer, CreateCustomerInput, UpdateCustomerInput } from '../../../server/src/schema';

export function CustomersTab() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [formData, setFormData] = useState<CreateCustomerInput>({
    name: '',
    email: '',
    phone: null,
    address: null,
    company: null,
    status: 'active',
  });

  const loadCustomers = useCallback(async () => {
    try {
      const result = await trpc.getCustomers.query();
      setCustomers(result);
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (editingCustomer) {
        const updateData: UpdateCustomerInput = {
          id: editingCustomer.id,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          company: formData.company,
          status: formData.status,
        };
        const response = await trpc.updateCustomer.mutate(updateData);
        setCustomers((prev: Customer[]) =>
          prev.map((customer: Customer) => customer.id === editingCustomer.id ? response : customer)
        );
        setEditingCustomer(null);
      } else {
        const response = await trpc.createCustomer.mutate(formData);
        setCustomers((prev: Customer[]) => [...prev, response]);
        setShowCreateDialog(false);
      }
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: null,
        address: null,
        company: null,
        status: 'active',
      });
    } catch (error) {
      console.error('Failed to save customer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await trpc.deleteCustomer.mutate({ id });
      setCustomers((prev: Customer[]) => prev.filter((customer: Customer) => customer.id !== id));
    } catch (error) {
      console.error('Failed to delete customer:', error);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      company: customer.company,
      status: customer.status,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case 'active':
        return '✅';
      case 'inactive':
        return '⭕';
      case 'pending':
        return '⏳';
      default:
        return '❓';
    }
  };

  const CustomerForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        placeholder="Customer name"
        value={formData.name}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setFormData((prev: CreateCustomerInput) => ({ ...prev, name: e.target.value }))
        }
        required
      />
      
      <Input
        type="email"
        placeholder="Email"
        value={formData.email}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setFormData((prev: CreateCustomerInput) => ({ ...prev, email: e.target.value }))
        }
        required
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          placeholder="Phone (optional)"
          value={formData.phone || ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: CreateCustomerInput) => ({
              ...prev,
              phone: e.target.value || null
            }))
          }
        />

        <Input
          placeholder="Company (optional)"
          value={formData.company || ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: CreateCustomerInput) => ({
              ...prev,
              company: e.target.value || null
            }))
          }
        />
      </div>

      <Textarea
        placeholder="Address (optional)"
        value={formData.address || ''}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
          setFormData((prev: CreateCustomerInput) => ({
            ...prev,
            address: e.target.value || null
          }))
        }
      />

      <div>
        <label className="text-sm font-medium mb-2 block">Status</label>
        <Select
          value={formData.status}
          onValueChange={(value: 'active' | 'inactive' | 'pending') =>
            setFormData((prev: CreateCustomerInput) => ({ ...prev, status: value }))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">✅ Active</SelectItem>
            <SelectItem value="inactive">⭕ Inactive</SelectItem>
            <SelectItem value="pending">⏳ Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? 'Saving...' : editingCustomer ? 'Update Customer' : 'Add Customer'}
        </Button>
        {editingCustomer && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setEditingCustomer(null);
              setFormData({
                name: '',
                email: '',
                phone: null,
                address: null,
                company: null,
                status: 'active',
              });
            }}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );

  const activeCustomers = customers.filter((c: Customer) => c.status === 'active');
  const inactiveCustomers = customers.filter((c: Customer) => c.status === 'inactive');
  const pendingCustomers = customers.filter((c: Customer) => c.status === 'pending');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Customers 👥</h2>
          <p className="text-gray-600">Manage your customer relationships</p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-purple-600 hover:bg-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
            </DialogHeader>
            <CustomerForm />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      {customers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active</p>
                  <p className="text-2xl font-bold text-green-600">{activeCustomers.length}</p>
                </div>
                <div className="text-2xl">✅</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{pendingCustomers.length}</p>
                </div>
                <div className="text-2xl">⏳</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Inactive</p>
                  <p className="text-2xl font-bold text-gray-600">{inactiveCustomers.length}</p>
                </div>
                <div className="text-2xl">⭕</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Dialog */}
      {editingCustomer && (
        <Dialog open={!!editingCustomer} onOpenChange={() => setEditingCustomer(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Customer</DialogTitle>
            </DialogHeader>
            <CustomerForm />
          </DialogContent>
        </Dialog>
      )}

      {/* Customers Grid */}
      {customers.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="text-4xl mb-4">👥</div>
          <h3 className="text-lg font-semibold mb-2">No customers yet</h3>
          <p className="text-gray-600 mb-4">Add your first customer to get started!</p>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add First Customer
          </Button>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {customers.map((customer: Customer) => (
            <Card key={customer.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-purple-600" />
                    <CardTitle className="text-lg">{customer.name}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(customer)}
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
                          <AlertDialogTitle>Delete Customer</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{customer.name}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(customer.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                
                <Badge className={getStatusColor(customer.status)}>
                  {getStatusEmoji(customer.status)} {customer.status}
                </Badge>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="h-4 w-4 mr-2" />
                    <a href={`mailto:${customer.email}`} className="hover:text-blue-600 transition-colors">
                      {customer.email}
                    </a>
                  </div>
                  
                  {customer.phone && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="h-4 w-4 mr-2" />
                      <a href={`tel:${customer.phone}`} className="hover:text-blue-600 transition-colors">
                        {customer.phone}
                      </a>
                    </div>
                  )}

                  {customer.company && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Building className="h-4 w-4 mr-2" />
                      <span>{customer.company}</span>
                    </div>
                  )}

                  {customer.address && (
                    <div className="flex items-start text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="break-words">{customer.address}</span>
                    </div>
                  )}
                </div>

                <div className="text-xs text-gray-400 pt-2 border-t">
                  Added: {customer.created_at.toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}