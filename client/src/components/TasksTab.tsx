import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, Edit, Trash2, Clock, Flag } from 'lucide-react';
import { format } from 'date-fns';
import { trpc } from '@/utils/trpc';
import type { Task, CreateTaskInput, UpdateTaskInput } from '../../../server/src/schema';

export function TasksTab() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [formData, setFormData] = useState<CreateTaskInput>({
    title: '',
    description: null,
    status: 'pending',
    priority: 'medium',
    due_date: null,
  });

  const loadTasks = useCallback(async () => {
    try {
      const result = await trpc.getTasks.query();
      setTasks(result);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (editingTask) {
        const updateData: UpdateTaskInput = {
          id: editingTask.id,
          title: formData.title,
          description: formData.description,
          status: formData.status,
          priority: formData.priority,
          due_date: formData.due_date,
        };
        const response = await trpc.updateTask.mutate(updateData);
        setTasks((prev: Task[]) =>
          prev.map((task: Task) => task.id === editingTask.id ? response : task)
        );
        setEditingTask(null);
      } else {
        const response = await trpc.createTask.mutate(formData);
        setTasks((prev: Task[]) => [...prev, response]);
        setShowCreateDialog(false);
      }
      
      // Reset form
      setFormData({
        title: '',
        description: null,
        status: 'pending',
        priority: 'medium',
        due_date: null,
      });
    } catch (error) {
      console.error('Failed to save task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await trpc.deleteTask.mutate({ id });
      setTasks((prev: Task[]) => prev.filter((task: Task) => task.id !== id));
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      due_date: task.due_date,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'urgent':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const TaskForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        placeholder="Task title"
        value={formData.title}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setFormData((prev: CreateTaskInput) => ({ ...prev, title: e.target.value }))
        }
        required
      />
      
      <Textarea
        placeholder="Description (optional)"
        value={formData.description || ''}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
          setFormData((prev: CreateTaskInput) => ({
            ...prev,
            description: e.target.value || null
          }))
        }
      />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Status</label>
          <Select
            value={formData.status}
            onValueChange={(value: 'pending' | 'in_progress' | 'completed' | 'cancelled') =>
              setFormData((prev: CreateTaskInput) => ({ ...prev, status: value }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">⏳ Pending</SelectItem>
              <SelectItem value="in_progress">🔄 In Progress</SelectItem>
              <SelectItem value="completed">✅ Completed</SelectItem>
              <SelectItem value="cancelled">❌ Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Priority</label>
          <Select
            value={formData.priority}
            onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') =>
              setFormData((prev: CreateTaskInput) => ({ ...prev, priority: value }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">🟢 Low</SelectItem>
              <SelectItem value="medium">🟡 Medium</SelectItem>
              <SelectItem value="high">🟠 High</SelectItem>
              <SelectItem value="urgent">🔴 Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Due Date (optional)</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formData.due_date ? format(formData.due_date, 'PPP') : 'Select date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={formData.due_date || undefined}
              onSelect={(date: Date | undefined) =>
                setFormData((prev: CreateTaskInput) => ({ ...prev, due_date: date || null }))
              }
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? 'Saving...' : editingTask ? 'Update Task' : 'Create Task'}
        </Button>
        {editingTask && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setEditingTask(null);
              setFormData({
                title: '',
                description: null,
                status: 'pending',
                priority: 'medium',
                due_date: null,
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
          <h2 className="text-2xl font-bold text-gray-900">Tasks ✅</h2>
          <p className="text-gray-600">Manage your tasks and track progress</p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
            </DialogHeader>
            <TaskForm />
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      {editingTask && (
        <Dialog open={!!editingTask} onOpenChange={() => setEditingTask(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Task</DialogTitle>
            </DialogHeader>
            <TaskForm />
          </DialogContent>
        </Dialog>
      )}

      {/* Tasks Grid */}
      {tasks.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="text-4xl mb-4">📝</div>
          <h3 className="text-lg font-semibold mb-2">No tasks yet</h3>
          <p className="text-gray-600 mb-4">Create your first task to get started!</p>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create First Task
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {tasks.map((task: Task) => (
            <Card key={task.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{task.title}</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(task)}
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
                          <AlertDialogTitle>Delete Task</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{task.title}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(task.id)}
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
                {task.description && (
                  <p className="text-gray-600 mb-4">{task.description}</p>
                )}
                
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge className={getStatusColor(task.status)}>
                    {task.status.replace('_', ' ')}
                  </Badge>
                  <Badge className={getPriorityColor(task.priority)}>
                    <Flag className="h-3 w-3 mr-1" />
                    {task.priority}
                  </Badge>
                </div>

                <div className="flex justify-between text-sm text-gray-500">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {task.due_date ? (
                      <span>Due: {task.due_date.toLocaleDateString()}</span>
                    ) : (
                      <span>No due date</span>
                    )}
                  </div>
                  <span>Created: {task.created_at.toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}