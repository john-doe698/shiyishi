'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Calendar,
  BookOpen,
  Menu,
  Shield,
  User,
  LogOut,
  Key,
  UserCog,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePermission, USER_ROLES } from '@/hooks/use-permission';

const baseNavigation = [
  { name: '控制台', href: '/', icon: LayoutDashboard },
  { name: '学生管理', href: '/students', icon: Users },
  { name: '签到与消课', href: '/check-in', icon: Calendar },
  { name: '课程管理', href: '/courses', icon: BookOpen },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { role, roleInfo, logout, canManageUsers, userInfo } = usePermission();
  
  // 修改密码弹窗
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // 根据权限过滤导航
  const navigation = canManageUsers
    ? [...baseNavigation, { name: '用户管理', href: '/users', icon: UserCog }]
    : baseNavigation;

  const handleChangePassword = async () => {
    setPasswordError('');
    
    if (!passwordData.oldPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError('请填写所有字段');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      setPasswordError('新密码长度不能少于6位');
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('两次输入的新密码不一致');
      return;
    }

    setPasswordLoading(true);
    
    try {
      const response = await fetch('/api/auth/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userInfo?.id,
          old_password: passwordData.oldPassword,
          new_password: passwordData.newPassword,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setPasswordDialogOpen(false);
        setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
        alert('密码修改成功');
      } else {
        setPasswordError(result.error || '修改失败');
      }
    } catch (error) {
      setPasswordError('修改密码失败');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <>
      <div
        className={cn(
          'flex flex-col border-r bg-background transition-all duration-300',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-4">
          {!collapsed && (
            <h1 className="text-lg font-semibold text-primary">教育管理系统</h1>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
        <nav className="flex-1 space-y-1 p-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>
        
        {/* 用户信息区域 */}
        <div className="border-t p-3">
          {!collapsed ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                {role === 'admin' ? (
                  <Shield className="h-4 w-4 text-primary" />
                ) : (
                  <User className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="font-medium">{userInfo?.name || '未知用户'}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{USER_ROLES[role]?.label || role}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {roleInfo.description}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setPasswordDialogOpen(true)}
                >
                  <Key className="h-4 w-4 mr-1" />
                  改密
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={logout}
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  退出
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              {role === 'admin' ? (
                <Shield className="h-5 w-5 text-primary" />
              ) : (
                <User className="h-5 w-5 text-muted-foreground" />
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPasswordDialogOpen(true)}
                title="修改密码"
              >
                <Key className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                title="退出登录"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 修改密码弹窗 */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>修改密码</DialogTitle>
            <DialogDescription>
              为账号 {userInfo?.username} 修改登录密码
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>旧密码</Label>
              <Input
                type="password"
                value={passwordData.oldPassword}
                onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                placeholder="请输入旧密码"
              />
            </div>
            <div className="grid gap-2">
              <Label>新密码</Label>
              <Input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                placeholder="请输入新密码（至少6位）"
              />
            </div>
            <div className="grid gap-2">
              <Label>确认新密码</Label>
              <Input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                placeholder="请再次输入新密码"
              />
            </div>
            {passwordError && (
              <p className="text-sm text-red-500">{passwordError}</p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleChangePassword} disabled={passwordLoading}>
              {passwordLoading ? '修改中...' : '确认修改'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
