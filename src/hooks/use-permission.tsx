'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserRole = 'admin' | 'planner';

interface UserRoleInfo {
  role: UserRole;
  label: string;
  description: string;
}

export const USER_ROLES: Record<UserRole, UserRoleInfo> = {
  admin: {
    role: 'admin',
    label: '管理员',
    description: '拥有所有权限，包括删除学生、修改课程、管理规划师等',
  },
  planner: {
    role: 'planner',
    label: '规划师',
    description: '只能管理自己的学生、签到、报名，无法删除',
  },
};

interface UserInfo {
  id: number;
  username: string;
  name: string;
  role: UserRole;
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

  const roleInfo = USER_ROLES[role];
  
  // 权限判断
  const canDelete = role === 'admin';
  const canEditCourse = role === 'admin';
  const canManageUsers = role === 'admin';

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
