'use client'

import { useState, useEffect } from 'react'
import { useStore } from '@/contexts/store-context'
import { createClient } from '@/lib/supabase/client'
import { useStaff } from '@/hooks/use-staff'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { 
  Users,
  Plus,
  Edit,
  Trash2,
  Shield,
  ShieldCheck,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Search,
  Filter,
  MoreVertical,
  UserCheck,
  UserX,
  Settings,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const staffSchema = z.object({
  email: z.string().email('Valid email is required'),
  role: z.enum(['owner', 'manager', 'cashier', 'viewer']),
  hourly_rate: z.number().min(0).optional(),
})

type StaffForm = z.infer<typeof staffSchema>

const roleConfig = {
  owner: {
    label: 'Owner',
    description: 'Full access to all features',
    color: 'bg-purple-100 text-purple-800',
    icon: ShieldCheck
  },
  manager: {
    label: 'Manager',
    description: 'Manage products, view reports, limited settings',
    color: 'bg-blue-100 text-blue-800',
    icon: Shield
  },
  cashier: {
    label: 'Cashier',
    description: 'Process sales, view products',
    color: 'bg-green-100 text-green-800',
    icon: User
  },
  viewer: {
    label: 'Viewer',
    description: 'Read-only access to reports',
    color: 'bg-gray-100 text-gray-800',
    icon: User
  }
}

export default function StaffPage() {
  const { currentStore } = useStore()
  const { 
    staff, 
    loading, 
    error: staffError, 
    addStaffMember, 
    updateStaffMember, 
    toggleStaffStatus 
  } = useStaff()
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingStaff, setEditingStaff] = useState<any>(null)
  const supabase = createClient()

  const form = useForm<StaffForm>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      email: '',
      role: 'cashier',
      hourly_rate: 0,
    }
  })

  const filteredStaff = staff.filter(member => {
    const matchesSearch = 
      (member.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesRole = roleFilter === 'all' || member.role === roleFilter
    
    return matchesSearch && matchesRole
  })



  const onSubmit = async (data: StaffForm) => {
    if (!currentStore) return
    
    try {
      if (editingStaff) {
        // Update existing staff member
        await updateStaffMember(editingStaff.id, {
          role: data.role,
          permissions: {
            ...editingStaff.permissions,
            hourly_rate: data.hourly_rate
          }
        })
      } else {
        // Add new staff member
        await addStaffMember({
          email: data.email,
          role: data.role,
          permissions: {
            hourly_rate: data.hourly_rate
          }
        })
      }
      
      setShowCreateDialog(false)
      setEditingStaff(null)
      form.reset()
    } catch (error) {
      console.error('Failed to save staff member:', error)
      // You might want to show an error toast here
    }
  }

  const handleEdit = (staffMember: any) => {
    setEditingStaff(staffMember)
    form.reset({
      email: staffMember.email,
      role: staffMember.role,
      hourly_rate: staffMember.hourly_rate || 0,
    })
    setShowCreateDialog(true)
  }

  const handleCreateNew = () => {
    setEditingStaff(null)
    form.reset()
    setShowCreateDialog(true)
  }

  const handleToggleStatus = async (staffMember: any) => {
    try {
      await toggleStaffStatus(staffMember.id, !staffMember.is_active)
    } catch (error) {
      console.error('Failed to toggle staff status:', error)
    }
  }

  if (!currentStore) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p>No store selected</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 md:h-8 md:w-8" />
              Staff Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your store staff and their permissions
            </p>
          </div>
          
          <Button onClick={handleCreateNew} className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Staff Member</span>
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search staff members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="all">All Roles</option>
            <option value="owner">Owner</option>
            <option value="manager">Manager</option>
            <option value="cashier">Cashier</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        {staffError && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error Loading Staff</h3>
            <p className="text-muted-foreground mb-4">
              {staffError}
            </p>
          </div>
        )}
        
        {!staffError && filteredStaff.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No staff members found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || roleFilter !== 'all' 
                ? 'Try adjusting your search terms or filters' 
                : 'Add your first staff member to get started'}
            </p>
            {!searchQuery && roleFilter === 'all' && (
              <Button onClick={handleCreateNew} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Staff Member
              </Button>
            )}
          </div>
        ) : !staffError && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStaff.map((member) => {
              const roleInfo = roleConfig[member.role as keyof typeof roleConfig]
              const RoleIcon = roleInfo.icon
              
              return (
                <Card key={member.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <RoleIcon className="h-5 w-5" />
                          {member.full_name || 'Unknown User'}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {member.email}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={member.is_active ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {member.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(member)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge className={roleInfo.color}>
                        {roleInfo.label}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      {roleInfo.description}
                    </p>
                    
                    {member.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{member.phone}</span>
                      </div>
                    )}
                    
                    {member.hourly_rate && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          ${member.hourly_rate}/hour
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="text-sm text-muted-foreground">
                        Joined {new Date(member.created_at).toLocaleDateString()}
                      </div>
                      
                      {member.role !== 'owner' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(member)}
                          className="text-xs"
                        >
                          {member.is_active ? (
                            <>
                              <UserX className="h-3 w-3 mr-1" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-3 w-3 mr-1" />
                              Activate
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Staff Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Staff Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Staff Information</h3>
              
              {!editingStaff && (
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    {...form.register('email')}
                    placeholder="staff@example.com"
                  />
                  <p className="text-sm text-muted-foreground">
                    The user must already have an account with this email address.
                  </p>
                  {form.formState.errors.email && (
                    <p className="text-sm text-red-600">{form.formState.errors.email.message}</p>
                  )}
                </div>
              )}
              
              {editingStaff && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">{editingStaff.full_name || 'Unknown User'}</p>
                  <p className="text-sm text-muted-foreground">{editingStaff.email}</p>
                </div>
              )}
            </div>

            {/* Role and Permissions */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Role and Permissions</h3>
              
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  {...form.register('role')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {Object.entries(roleConfig).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label} - {config.description}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-muted-foreground">
                  Role determines what features and data this staff member can access.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="hourly_rate">Hourly Rate (optional)</Label>
                <Input
                  id="hourly_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register('hourly_rate', { valueAsNumber: true })}
                  placeholder="25.00"
                />
                <p className="text-sm text-muted-foreground">
                  Used for payroll calculations and commission tracking.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
              
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editingStaff ? 'Updating...' : 'Adding...'}
                  </>
                ) : (
                  editingStaff ? 'Update Staff Member' : 'Add Staff Member'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}