# 项目上下文

## 项目概述

这是一个教育机构学生管理系统，用于记录学生报名、签到、消课等核心业务。

### 核心功能

1. **学生管理**：录入学生信息、查看学生详情、管理学生状态（在读/已结课）
2. **课程管理**：创建课程、设置课时价格、管理课程状态、自定义班次名称/课时/有效期（仅管理员）
3. **签到管理**：学生签到、请假、缺勤记录，自动扣减课时，消课记录查看（签到与消课合并管理）
4. **消课记录**：查看课时消耗明细和消费金额统计
5. **续费提醒**：即将到期提醒、已过期提醒、课时不足提醒（阈值：≤6课时）
6. **有效期管理**：支持设置有效期日期范围（开始日期至到期日期）
7. **续费功能**：学生可对课程进行续费，自动计算课时和有效期
8. **权限管理**：支持管理员和规划师两种角色，规划师无删除权限
9. **用户管理**：管理员可创建/编辑/删除用户账号，管理规划师信息（仅管理员）
10. **修改密码**：所有用户可修改自己的登录密码

### 版本技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4
- **Database**: Supabase (PostgreSQL)
- **ORM**: Drizzle ORM (仅用于 Schema 定义)

## 目录结构

```
├── public/                 # 静态资源
├── scripts/                # 构建与启动脚本
├── src/
│   ├── app/                # 页面路由与布局
│   │   ├── api/            # API 接口
│   │   │   ├── auth/       # 认证接口（登录、修改密码）
│   │   │   ├── check-ins/  # 签到接口
│   │   │   ├── consumptions/ # 消课记录接口
│   │   │   ├── courses/    # 课程接口
│   │   │   ├── enrollments/ # 报名接口
│   │   │   ├── stats/      # 统计数据接口
│   │   │   ├── students/   # 学生接口
│   │   │   └── users/      # 用户管理接口
│   │   ├── check-in/       # 签到页面
│   │   ├── consumptions/   # 消课记录页面
│   │   ├── courses/        # 课程管理页面
│   │   ├── students/       # 学生管理页面
│   │   └── users/          # 用户管理页面（仅管理员）
│   ├── components/
│   │   ├── layout/         # 布局组件
│   │   └── ui/             # Shadcn UI 组件库
│   ├── hooks/              # 自定义 Hooks
│   ├── lib/                # 工具库
│   └── storage/
│       └── database/       # 数据库配置
│           ├── shared/
│           │   └── schema.ts  # 数据库表结构定义
│           └── supabase-client.ts # Supabase 客户端
├── next.config.ts          # Next.js 配置
├── package.json            # 项目依赖管理
└── tsconfig.json           # TypeScript 配置
```

## 数据库表结构

| 表名 | 说明 | 主要字段 |
|------|------|---------|
| users | 用户表 | id, username, password, name, role, status |
| students | 学生表 | id, name, phone, parent_name, parent_phone, status, total_hours, remaining_hours, planner_id |
| courses | 课程表 | id, name, description, price, education_level, class_name, total_hours, valid_months, status |
| enrollments | 报名记录表 | id, student_id, course_id, total_hours, remaining_hours, amount, start_date, expiry_date, status |
| check_ins | 签到记录表 | id, student_id, course_id, check_in_time, hours, status |
| lesson_consumptions | 消课记录表 | id, student_id, course_id, check_in_id, hours, amount |

## 权限管理

系统支持两种用户角色，所有用户必须使用账号密码登录：

| 角色 | 默认账号 | 权限说明 |
|------|---------|---------|
| 管理员 (admin) | 系统预设 | 拥有所有权限：添加/编辑/删除学生、添加/编辑/删除课程、管理用户、签到、报名等 |
| 规划师 (planner) | 管理员创建 | 只能管理自己的学生、签到、报名、续费，**无删除权限** |

**权限控制说明**：
- 所有用户必须使用账号密码登录，登录状态使用 sessionStorage 存储
- 关闭浏览器后需重新登录，刷新页面保持登录状态
- 规划师只能看到和管理自己创建的学生
- 规划师登录后，删除操作栏自动隐藏
- 规划师无法添加/编辑/删除课程
- 规划师无法访问用户管理页面
- 学生结课时自动清除该学生的续费提醒

## API 接口清单

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/auth/login | POST | 用户登录验证 |
| /api/auth/password | PUT | 修改密码 |
| /api/users | GET, POST | 获取用户列表/创建用户（仅管理员） |
| /api/users/[id] | GET, PUT, DELETE | 用户详情/更新/删除 |
| /api/students | GET, POST | 获取学生列表/创建学生 |
| /api/students/[id] | GET, PUT, DELETE | 学生详情/更新/删除（删除需管理员权限） |
| /api/courses | GET, POST | 获取课程列表/创建课程（创建需管理员权限） |
| /api/courses/[id] | PUT, DELETE | 更新/删除课程（需管理员权限） |
| /api/enrollments | GET, POST | 获取报名记录/学生报名 |
| /api/enrollments/[id] | GET, PUT, DELETE | 报名详情/修改有效期/删除 |
| /api/check-ins | GET, POST | 获取签到记录/学生签到 |
| /api/consumptions | GET | 获取消课记录 |
| /api/reminders | GET | 获取续费提醒（即将到期/已过期/课时不足） |
| /api/stats | GET | 获取统计数据 |

## 包管理规范

**仅允许使用 pnpm** 作为包管理器，**严禁使用 npm 或 yarn**。
**常用命令**：
- 安装依赖：`pnpm add <package>`
- 安装开发依赖：`pnpm add -D <package>`
- 安装所有依赖：`pnpm install`
- 移除依赖：`pnpm remove <package>`

## 开发规范

- **项目理解加速**：初始可以依赖项目下`package.json`文件理解项目类型，如果没有或无法理解退化成阅读其他文件。
- **Hydration 错误预防**：严禁在 JSX 渲染逻辑中直接使用 typeof window、Date.now()、Math.random() 等动态数据。必须使用 'use client' 并配合 useEffect + useState 确保动态内容仅在客户端挂载后渲染；同时严禁非法 HTML 嵌套（如 <p> 嵌套 <div>）。

## UI 设计与组件规范

- 模板默认预装核心组件库 `shadcn/ui`，位于`src/components/ui/`目录下
- Next.js 项目**必须默认**采用 shadcn/ui 组件、风格和规范，**除非用户指定用其他的组件和规范。**

## 数据库操作规范

- **Schema 定义**：使用 Drizzle ORM 在 `src/storage/database/shared/schema.ts` 中定义表结构
- **CRUD 操作**：使用 Supabase SDK 进行数据操作，不要使用 Drizzle 的查询方法
- **字段命名**：必须使用 snake_case（如 `student_id`，不是 `studentId`）
- **错误处理**：每次数据库操作都必须检查 `{ data, error }`，遇到错误必须处理

## 常用命令

```bash
# 开发环境启动
pnpm dev

# 构建检查
npx tsc --noEmit

# 数据库模型同步
coze-coding-ai db generate-models

# 数据库结构升级
coze-coding-ai db upgrade
```
