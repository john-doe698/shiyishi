'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, UserPlus, Key } from 'lucide-react';
import { usePermission } from '@/hooks/use-permission';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  username: string;
  name: string;
  role: string;
  status: string;
  created_at: string;
}

const ROLE_MAP: Record<string, string> = {
  admin: '超级管理员',
  manager: '管理员',
  planner: '规划师',
};

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  active: { label: '启用', variant: 'default' },
  inactive: { label: '禁用', variant: 'secondary' },
};

export default function UsersPage() {
  const { canManageUsers, canDelete, role: currentRole, userInfo } = usePermission();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // 添加用户弹窗
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    name: '',
    role: 'planner',
  });

  // 编辑用户弹窗
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editData, setEditData] = useState({
    name: '',
    role: '',
    status: '',
  });

  // 重置密码弹窗
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [resettingUser, setResettingUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (!canManageUsers) {
      router.push('/');
      return;
    }
    fetchUsers();
  }, [canManageUsers, router]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users', {
        headers: {
          'x-user-role': currentRole,
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

  const handleAddUser = async () => {
    if (!newUser.username || !newUser.password || !newUser.name) {
      alert('请填写完整信息');
      return;
    }
    if (newUser.password.length < 6) {
      alert('密码长度不能少于6位');
      return;
    }

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentRole,
        },
        body: JSON.stringify(newUser),
      });

      const result = await response.json();
      if (result.data) {
        setAddDialogOpen(false);
        setNewUser({ username: '', password: '', name: '', role: 'planner' });
        fetchUsers();
      } else {
        alert(result.error || '添加失败');
      }
    } catch (error) {
      console.error('添加用户失败:', error);
      alert('添加用户失败');
    }
  };

  const handleEditUser = async () => {
    if (!editingUser) return;

    try {
      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentRole,
          'x-user-id': userInfo?.id.toString() || '',
        },
        body: JSON.stringify(editData),
      });

      const result = await response.json();
      if (result.data) {
        setEditDialogOpen(false);
        setEditingUser(null);
        fetchUsers();
      } else {
        alert(result.error || '修改失败');
      }
    } catch (error) {
      console.error('修改用户失败:', error);
      alert('修改用户失败');
    }
  };

  const handleResetPassword = async () => {
    if (!resettingUser) return;
    if (!newPassword || newPassword.length < 6) {
      alert('密码长度不能少于6位');
      return;
    }

    try {
      const response = await fetch(`/api/users/${resettingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentRole,
          'x-user-id': userInfo?.id.toString() || '',
        },
        body: JSON.stringify({ password: newPassword }),
      });

      const result = await response.json();
      if (result.data) {
        setResetPasswordDialogOpen(false);
        setResettingUser(null);
        setNewPassword('');
        alert('密码重置成功');
      } else {
        alert(result.error || '重置失败');
      }
    } catch (error) {
      console.error('重置密码失败:', error);
      alert('重置密码失败');
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (user.role === 'admin') {
      // 检查是否是最后一个管理员
      const adminCount = users.filter(u => u.role === 'admin').length;
      if (adminCount <= 1) {
        alert('不能删除最后一个管理员账号');
        return;
      }
    }

    if (!confirm(`确定要删除用户 ${user.name} 吗？此操作不可恢复。`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': currentRole,
        },
      });

      const result = await response.json();
      if (result.success) {
        fetchUsers();
      } else {
        alert(result.error || '删除失败');
      }
    } catch (error) {
      console.error('删除用户失败:', error);
      alert('删除用户失败');
    }
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setEditData({
      name: user.name,
      role: user.role,
      status: user.status,
    });
    setEditDialogOpen(true);
  };

  const openResetPasswordDialog = (user: User) => {
    setResettingUser(user);
    setNewPassword('');
    setResetPasswordDialogOpen(true);
  };

  if (!canManageUsers) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">用户管理</h2>
          <p className="text-muted-foreground">管理系统用户账号和权限</p>
        </div>

        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              添加用户
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>添加用户</DialogTitle>
              <DialogDescription>创建新的系统用户</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="username">账号 *</Label>
                <Input
                  id="username"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  placeholder="请输入账号"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">密码 *</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="请输入密码（至少6位）"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">显示名称 *</Label>
                <Input
                  id="name"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="请输入显示名称"
                />
              </div>
              <div className="grid gap-2">
                <Label>角色</Label>
                <Select
                  value={newUser.role}
                  onValueChange={(value) => setNewUser({ ...newUser, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planner">规划师</SelectItem>
                    {currentRole === 'admin' && (
                      <>
                        <SelectItem value="manager">管理员</SelectItem>
                        <SelectItem value="admin">超级管理员</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleAddUser}>
                添加
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">暂无用户数据</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>账号</TableHead>
                  <TableHead>显示名称</TableHead>
                  <TableHead className="text-center">角色</TableHead>
                  <TableHead className="text-center">状态</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>{user.name}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        {ROLE_MAP[user.role] || user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={STATUS_MAP[user.status]?.variant || 'default'}>
                        {STATUS_MAP[user.status]?.label || user.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString('zh-CN')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* admin可以编辑所有人，manager只能编辑planner */}
                        {(currentRole === 'admin' || (currentRole === 'manager' && user.role === 'planner')) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(user)}
                            title="编辑"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {/* admin可以重置所有人密码，manager只能重置planner密码 */}
                        {(currentRole === 'admin' || (currentRole === 'manager' && user.role === 'planner')) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openResetPasswordDialog(user)}
                            title="重置密码"
                          >
                            <Key className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteUser(user)}
                            title="删除"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 编辑用户弹窗 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>编辑用户</DialogTitle>
            <DialogDescription>修改用户信息</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>显示名称</Label>
              <Input
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                placeholder="请输入显示名称"
              />
            </div>
            {currentRole === 'admin' && (
              <div className="grid gap-2">
                <Label>角色</Label>
                <Select
                  value={editData.role}
                  onValueChange={(value) => setEditData({ ...editData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planner">规划师</SelectItem>
                    <SelectItem value="manager">管理员</SelectItem>
                    <SelectItem value="admin">超级管理员</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-2">
              <Label>状态</Label>
              <Select
                value={editData.status}
                onValueChange={(value) => setEditData({ ...editData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">启用</SelectItem>
                  <SelectItem value="inactive">禁用</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleEditUser}>
              保存
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 重置密码弹窗 */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>重置密码</DialogTitle>
            <DialogDescription>
              为用户 {resettingUser?.name} 设置新密码
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>新密码</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="请输入新密码（至少6位）"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setResetPasswordDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleResetPassword}>
              确认重置
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
