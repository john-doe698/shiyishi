'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserRole = 'admin' | 'staff';

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
  staff: {
    role: 'staff',
    label: '工作人员',
    description: '只能录入学生信息、签到、报名，无法删除',
  },
};

interface PermissionContextType {
  role: UserRole;
  roleInfo: UserRoleInfo;
  setRole: (role: UserRole) => void;
  canDelete: boolean;
  canEditCourse: boolean;
  canViewAll: boolean;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export function PermissionProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<UserRole>('admin');

  useEffect(() => {
    // 从 localStorage 读取角色设置
    const savedRole = localStorage.getItem('user_role') as UserRole;
    if (savedRole && (savedRole === 'admin' || savedRole === 'staff')) {
      setRoleState(savedRole);
    }
  }, []);

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    localStorage.setItem('user_role', newRole);
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
