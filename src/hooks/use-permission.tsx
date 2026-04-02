'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

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
    description: '拥有所有权限，包括删除学生、修改课程等',
  },
  planner: {
    role: 'planner',
    label: '规划师',
    description: '只能录入学生信息、签到、报名，无法删除',
  },
};

// 默认管理员账号（实际项目中应该存储在数据库）
export const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin123',
};

interface PermissionContextType {
  role: UserRole;
  roleInfo: UserRoleInfo;
  isLoggedIn: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  setRole: (role: UserRole) => void;
  canDelete: boolean;
  canEditCourse: boolean;
  canViewAll: boolean;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export function PermissionProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<UserRole>('planner');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 不再从 localStorage 读取登录状态，每次访问都需要重新登录

  const login = (username: string, password: string): boolean => {
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
      setIsLoggedIn(true);
      setRoleState('admin');
      return true;
    }
    // 规划师直接登录（无需密码）
    setIsLoggedIn(true);
    setRoleState('planner');
    return true;
  };

  const logout = () => {
    setIsLoggedIn(false);
    setRoleState('planner');
  };

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
  };

  const roleInfo = USER_ROLES[role];
  
  // 权限判断
  const canDelete = role === 'admin';
  const canEditCourse = role === 'admin';
  const canViewAll = true; // 所有角色都可以查看

  return (
    <PermissionContext.Provider value={{
      role,
      roleInfo,
      isLoggedIn,
      login,
      logout,
      setRole,
      canDelete,
      canEditCourse,
      canViewAll,
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
