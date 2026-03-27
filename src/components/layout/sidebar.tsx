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
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePermission, USER_ROLES, UserRole } from '@/hooks/use-permission';

const navigation = [
  { name: '控制台', href: '/', icon: LayoutDashboard },
  { name: '学生管理', href: '/students', icon: Users },
  { name: '签到与消课', href: '/check-in', icon: Calendar },
  { name: '课程管理', href: '/courses', icon: BookOpen },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { role, setRole, roleInfo, logout } = usePermission();

  return (
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
      
      {/* 角色切换和退出区域 */}
      <div className="border-t p-3">
        {!collapsed ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {role === 'admin' ? (
                <Shield className="h-4 w-4 text-primary" />
              ) : (
                <User className="h-4 w-4" />
              )}
              <span>当前角色</span>
            </div>
            <Select
              value={role}
              onValueChange={(value) => setRole(value as UserRole)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    <span>{USER_ROLES.admin.label}</span>
                  </div>
                </SelectItem>
                <SelectItem value="planner">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>{USER_ROLES.planner.label}</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {roleInfo.description}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={logout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              退出登录
            </Button>
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
              onClick={logout}
              title="退出登录"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
