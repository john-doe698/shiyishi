'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePermission, USER_ROLES } from '@/hooks/use-permission';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PERMISSIONS, PERMISSION_CONFIG, DEFAULT_PERMISSIONS, PermissionKey, getPermissionCategories, getPermissionsByCategory } from '@/lib/permissions';

interface User {
  id: number;
  username: string;
  name: string;
  role: 'admin' | 'manager' | 'planner';
  status: string;
  permissions?: PermissionKey[];
  created_at: string;
}

export default function PermissionsPage() {
  const router = useRouter();
  const { role: currentUserRole, userInfo, hasPermission } = usePermission();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionKey[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // 检查权限：只有超级管理员可以访问
    if (currentUserRole !== 'admin') {
      router.push('/');
      return;
    }
    fetchUsers();
  }, [currentUserRole, router]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users', {
        headers: {
          'x-user-role': currentUserRole,
          'x-user-id': userInfo?.id?.toString() || '',
        },
      });
      const result = await response.json();
      if (result.data) {
        setUsers(result.data);
      }
    } catch (error) {
      console.error('获取用户列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditPermissions = (user: User) => {
    setSelectedUser(user);
    // 如果有自定义权限，使用自定义权限；否则使用默认权限
    const permissions = user.permissions && user.permissions.length > 0
      ? user.permissions
      : DEFAULT_PERMISSIONS[user.role] || [];
    setSelectedPermissions([...permissions]);
    setEditDialogOpen(true);
  };

  const handleTogglePermission = (permission: PermissionKey) => {
    setSelectedPermissions(prev => 
      prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  const handleSelectAll = () => {
    setSelectedPermissions(Object.values(PERMISSIONS));
  };

  const handleClearAll = () => {
    setSelectedPermissions([]);
  };

  const handleUseDefault = () => {
    if (selectedUser) {
      setSelectedPermissions([...(DEFAULT_PERMISSIONS[selectedUser.role] || [])]);
    }
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUserRole,
          'x-user-id': userInfo?.id?.toString() || '',
        },
        body: JSON.stringify({
          permissions: selectedPermissions,
        }),
      });

      const result = await response.json();
      if (result.data) {
        // 更新本地状态
        setUsers(prev => prev.map(u => 
          u.id === selectedUser.id 
            ? { ...u, permissions: selectedPermissions }
            : u
        ));
        setEditDialogOpen(false);
        alert('权限设置已保存');
      } else {
        alert(result.error || '保存失败');
      }
    } catch (error) {
      console.error('保存权限失败:', error);
      alert('保存失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  const categories = getPermissionCategories();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">权限管理</h1>
        <p className="text-muted-foreground mt-1">
          为不同账号自定义分配系统权限
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>用户列表</CardTitle>
          <CardDescription>
            点击编辑按钮为用户分配自定义权限
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map(user => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-muted-foreground">{user.username}</div>
                  </div>
                  <Badge variant={user.role === 'admin' ? 'default' : user.role === 'manager' ? 'secondary' : 'outline'}>
                    {USER_ROLES[user.role].label}
                  </Badge>
                  <Badge variant={user.status === 'active' ? 'default' : 'destructive'}>
                    {user.status === 'active' ? '启用' : '禁用'}
                  </Badge>
                  {user.permissions && user.permissions.length > 0 && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      自定义权限
                    </Badge>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditPermissions(user)}
                  disabled={user.role === 'admin' && user.id === userInfo?.id}
                >
                  编辑权限
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 编辑权限对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              编辑权限 - {selectedUser?.name}
            </DialogTitle>
            <DialogDescription>
              当前角色：{selectedUser ? USER_ROLES[selectedUser.role].label : ''}
              {selectedUser?.permissions && selectedUser.permissions.length > 0 && (
                <span className="ml-2 text-blue-600">（已自定义）</span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2 mb-4">
            <Button variant="outline" size="sm" onClick={handleSelectAll}>
              全选
            </Button>
            <Button variant="outline" size="sm" onClick={handleClearAll}>
              清空
            </Button>
            <Button variant="outline" size="sm" onClick={handleUseDefault}>
              使用默认权限
            </Button>
          </div>

          <Tabs defaultValue={categories[0]}>
            <TabsList className="w-full justify-start">
              {categories.map(category => (
                <TabsTrigger key={category} value={category}>
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>

            {categories.map(category => (
              <TabsContent key={category} value={category} className="space-y-4 mt-4">
                <div className="grid gap-4">
                  {getPermissionsByCategory(category).map(permission => {
                    const config = PERMISSION_CONFIG[permission];
                    const isChecked = selectedPermissions.includes(permission);
                    return (
                      <div
                        key={permission}
                        className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50"
                      >
                        <Checkbox
                          id={permission}
                          checked={isChecked}
                          onCheckedChange={() => handleTogglePermission(permission)}
                        />
                        <div className="flex-1">
                          <Label
                            htmlFor={permission}
                            className="font-medium cursor-pointer"
                          >
                            {config.name}
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            {config.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>
            ))}
          </Tabs>

          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
            >
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
