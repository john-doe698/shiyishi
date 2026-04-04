// 权限定义
export const PERMISSIONS = {
  // 数据删除权限
  DELETE_STUDENT: 'delete_student',
  DELETE_COURSE: 'delete_course',
  DELETE_USER: 'delete_user',
  
  // 数据编辑权限
  EDIT_COURSE: 'edit_course',
  EDIT_STUDENT: 'edit_student',
  
  // 管理权限
  MANAGE_USERS: 'manage_users',
  ASSIGN_STUDENT: 'assign_student',
  
  // 查看权限
  VIEW_ALL_STUDENTS: 'view_all_students',
  VIEW_PLANNER_STATS: 'view_planner_stats',
  VIEW_SYSTEM_INFO: 'view_system_info',
  
  // 操作权限
  CHECK_IN: 'check_in',
  VIEW_CONSUMPTIONS: 'view_consumptions',
  VIEW_REMINDERS: 'view_reminders',
  ADD_STUDENT: 'add_student',
  ADD_COURSE: 'add_course',
} as const;

export type PermissionKey = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// 权限显示名称和描述
export const PERMISSION_CONFIG: Record<PermissionKey, { name: string; description: string; category: string }> = {
  // 数据删除权限
  [PERMISSIONS.DELETE_STUDENT]: {
    name: '删除学生',
    description: '可以删除学生记录',
    category: '删除权限',
  },
  [PERMISSIONS.DELETE_COURSE]: {
    name: '删除课程',
    description: '可以删除课程记录',
    category: '删除权限',
  },
  [PERMISSIONS.DELETE_USER]: {
    name: '删除用户',
    description: '可以删除用户账号',
    category: '删除权限',
  },
  
  // 数据编辑权限
  [PERMISSIONS.EDIT_COURSE]: {
    name: '编辑课程',
    description: '可以编辑课程信息和状态',
    category: '编辑权限',
  },
  [PERMISSIONS.EDIT_STUDENT]: {
    name: '编辑学生',
    description: '可以编辑学生信息',
    category: '编辑权限',
  },
  
  // 管理权限
  [PERMISSIONS.MANAGE_USERS]: {
    name: '管理用户',
    description: '可以创建和管理用户账号',
    category: '管理权限',
  },
  [PERMISSIONS.ASSIGN_STUDENT]: {
    name: '分配学员',
    description: '可以将学员分配给规划师',
    category: '管理权限',
  },
  
  // 查看权限
  [PERMISSIONS.VIEW_ALL_STUDENTS]: {
    name: '查看所有学生',
    description: '可以查看所有学生（非仅自己的学生）',
    category: '查看权限',
  },
  [PERMISSIONS.VIEW_PLANNER_STATS]: {
    name: '查看规划师统计',
    description: '可以查看规划师数据统计看板',
    category: '查看权限',
  },
  [PERMISSIONS.VIEW_SYSTEM_INFO]: {
    name: '查看系统说明',
    description: '可以查看系统功能说明',
    category: '查看权限',
  },
  
  // 操作权限
  [PERMISSIONS.CHECK_IN]: {
    name: '签到管理',
    description: '可以为学生签到和消课',
    category: '操作权限',
  },
  [PERMISSIONS.VIEW_CONSUMPTIONS]: {
    name: '查看消课记录',
    description: '可以查看消课记录',
    category: '操作权限',
  },
  [PERMISSIONS.VIEW_REMINDERS]: {
    name: '查看续费提醒',
    description: '可以查看续费提醒',
    category: '操作权限',
  },
  [PERMISSIONS.ADD_STUDENT]: {
    name: '添加学生',
    description: '可以添加新学生',
    category: '操作权限',
  },
  [PERMISSIONS.ADD_COURSE]: {
    name: '添加课程',
    description: '可以添加新课程',
    category: '操作权限',
  },
};

// 按角色分组的默认权限
export const DEFAULT_PERMISSIONS: Record<string, PermissionKey[]> = {
  admin: Object.values(PERMISSIONS), // 超级管理员拥有所有权限
  manager: [
    PERMISSIONS.EDIT_COURSE,
    PERMISSIONS.EDIT_STUDENT,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.VIEW_ALL_STUDENTS,
    PERMISSIONS.CHECK_IN,
    PERMISSIONS.VIEW_CONSUMPTIONS,
    PERMISSIONS.VIEW_REMINDERS,
    PERMISSIONS.ADD_STUDENT,
    PERMISSIONS.ADD_COURSE,
  ],
  planner: [
    PERMISSIONS.EDIT_STUDENT,
    PERMISSIONS.CHECK_IN,
    PERMISSIONS.VIEW_CONSUMPTIONS,
    PERMISSIONS.VIEW_REMINDERS,
    PERMISSIONS.ADD_STUDENT,
  ],
};

// 获取权限分类
export function getPermissionCategories(): string[] {
  return [...new Set(Object.values(PERMISSION_CONFIG).map(p => p.category))];
}

// 按分类获取权限
export function getPermissionsByCategory(category: string): PermissionKey[] {
  return Object.entries(PERMISSION_CONFIG)
    .filter(([, config]) => config.category === category)
    .map(([key]) => key as PermissionKey);
}
