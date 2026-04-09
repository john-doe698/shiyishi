'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { PERMISSIONS, DEFAULT_PERMISSIONS, PermissionKey } from '@/lib/permissions';

export type UserRole = 'admin' | 'manager' | 'planner';

interface UserRoleInfo {
  role: UserRole;
  label: string;
}

export const USER_ROLES: Record<UserRole, UserRoleInfo> = {
  admin: {
    role: 'admin',
    label: '超级管理员',
  },
  manager: {
    role: 'manager',
    label: '管理员',
  },
  planner: {
    role: 'planner',
    label: '规划师',
  },
};

interface UserInfo {
  id: number;
  username: string;
  name: string;
  role: UserRole;
  permissions?: PermissionKey[];
}

interface PermissionContextType {
  role: UserRole;
  roleInfo: UserRoleInfo;
  userInfo: UserInfo | null;
  isLoggedIn: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  canDelete: boolean;
  canEditCourse: boolean;
  canManageUsers: boolean;
  hasPermission: (permission: PermissionKey) => boolean;
  refreshUserInfo: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export function PermissionProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<UserRole>('planner');
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // 从 sessionStorage 读取登录状态（关闭浏览器后自动清除）
    const savedLogin = sessionStorage.getItem('is_logged_in');
    const savedUserInfo = sessionStorage.getItem('user_info');
    
    if (savedLogin === 'true' && savedUserInfo) {
      try {
        const info = JSON.parse(savedUserInfo);
        // 直接在 effect 中设置状态，因为这是初始化操作
        setIsLoggedIn(true);
        setUserInfo(info);
        setRoleState(info.role);
      } catch {
        // 解析失败，清除状态
        sessionStorage.removeItem('is_logged_in');
        sessionStorage.removeItem('user_info');
      }
    }
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (result.data) {
        setIsLoggedIn(true);
        setUserInfo(result.data);
        setRoleState(result.data.role);
        sessionStorage.setItem('is_logged_in', 'true');
        sessionStorage.setItem('user_info', JSON.stringify(result.data));
        return { success: true };
      } else {
        return { success: false, error: result.error || '登录失败' };
      }
    } catch (error) {
      console.error('登录失败:', error);
      return { success: false, error: '登录失败，请稍后重试' };
    }
  };

  const logout = () => {
    setIsLoggedIn(false);
    setUserInfo(null);
    setRoleState('planner');
    sessionStorage.removeItem('is_logged_in');
    sessionStorage.removeItem('user_info');
  };

  const refreshUserInfo = async () => {
    if (!userInfo) return;
    
    try {
      const response = await fetch(`/api/users/${userInfo.id}`, {
        headers: {
          'x-user-role': role,
          'x-user-id': userInfo.id.toString(),
        },
      });

      const result = await response.json();
      if (result.data) {
        setUserInfo(result.data);
        setRoleState(result.data.role);
        sessionStorage.setItem('user_info', JSON.stringify(result.data));
      }
    } catch (error) {
      console.error('刷新用户信息失败:', error);
    }
  };

  // 检查用户是否有某个权限
  const hasPermission = (permission: PermissionKey): boolean => {
    // 如果有自定义权限，使用自定义权限
    if (userInfo?.permissions && Array.isArray(userInfo.permissions)) {
      return userInfo.permissions.includes(permission);
    }
    // 否则使用角色默认权限
    const defaultPerms = DEFAULT_PERMISSIONS[role] || [];
    return defaultPerms.includes(permission);
  };

  const roleInfo = USER_ROLES[role];
  
  // 权限判断（使用新的权限系统）
  const canDelete = hasPermission(PERMISSIONS.DELETE_STUDENT) || 
                    hasPermission(PERMISSIONS.DELETE_COURSE) || 
                    hasPermission(PERMISSIONS.DELETE_USER);
  const canEditCourse = hasPermission(PERMISSIONS.EDIT_COURSE);
  const canManageUsers = hasPermission(PERMISSIONS.MANAGE_USERS);

  return (
    <PermissionContext.Provider value={{
      role,
      roleInfo,
      userInfo,
      isLoggedIn,
      login,
      logout,
      canDelete,
      canEditCourse,
      canManageUsers,
      hasPermission,
      refreshUserInfo,
    }}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermission() {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermission must be used within a PermissionProvider');
  }
  return context;
}
