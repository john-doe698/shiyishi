import { sql } from "drizzle-orm";
import { pgTable, serial, varchar, timestamp, integer, numeric, text, index, boolean } from "drizzle-orm/pg-core";

// 系统健康检查表（禁止删除）
export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 用户表
export const users = pgTable(
	"users",
	{
		id: serial().primaryKey(),
		username: varchar("username", { length: 50 }).notNull().unique(),
		password: varchar("password", { length: 255 }).notNull(), // 存储加密后的密码
		name: varchar("name", { length: 100 }).notNull(), // 显示名称
		role: varchar("role", { length: 20 }).notNull().default('planner'), // admin: 管理员, planner: 规划师
		status: varchar("status", { length: 20 }).notNull().default('active'), // active: 启用, inactive: 禁用
		permissions: text("permissions"), // 自定义权限（JSON数组字符串）
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updated_at: timestamp("updated_at", { withTimezone: true }),
	},
	(table) => [
		index("users_username_idx").on(table.username),
		index("users_role_idx").on(table.role),
	]
);

// 学生表
export const students = pgTable(
  "students",
  {
    id: serial().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    phone: varchar("phone", { length: 20 }),
    parent_name: varchar("parent_name", { length: 100 }),
    parent_phone: varchar("parent_phone", { length: 20 }),
    status: varchar("status", { length: 20 }).notNull().default('active'), // active: 在读, finished: 已结课
    total_hours: integer("total_hours").notNull().default(0), // 总课时
    remaining_hours: integer("remaining_hours").notNull().default(0), // 剩余课时
    planner_id: integer("planner_id").references(() => users.id, { onDelete: "set null" }), // 关联规划师
    remark: text("remark"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("students_status_idx").on(table.status),
    index("students_name_idx").on(table.name),
    index("students_planner_id_idx").on(table.planner_id),
  ]
);

// 课程表
export const courses = pgTable(
  "courses",
  {
    id: serial().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    price: numeric("price", { precision: 10, scale: 2 }).notNull().default('0'), // 课程价格（总价）
    education_level: varchar("education_level", { length: 20 }).notNull().default('primary'), // primary: 小学, middle: 中学
    class_name: varchar("class_name", { length: 50 }), // 班次名称（自定义，如：周中班、周末季卡等）
    total_hours: integer("total_hours").notNull().default(0), // 班次包含的总课时
    valid_start_date: timestamp("valid_start_date", { withTimezone: true }), // 有效期开始日期
    valid_end_date: timestamp("valid_end_date", { withTimezone: true }), // 有效期结束日期
    status: varchar("status", { length: 20 }).notNull().default('active'), // active: 开课, inactive: 停课
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("courses_status_idx").on(table.status),
    index("courses_education_level_idx").on(table.education_level),
  ]
);

// 报名记录表
export const enrollments = pgTable(
  "enrollments",
  {
    id: serial().primaryKey(),
    student_id: integer("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    course_id: integer("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    total_hours: integer("total_hours").notNull().default(0), // 购买总课时（付费）
    gifted_hours: integer("gifted_hours").notNull().default(0), // 赠送课时（免费）
    remaining_purchased: integer("remaining_purchased").notNull().default(0), // 剩余购买课时
    remaining_gifted: integer("remaining_gifted").notNull().default(0), // 剩余赠送课时
    remaining_hours: integer("remaining_hours").notNull().default(0), // 总剩余课时 = remaining_purchased + remaining_gifted
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull().default('0'), // 报名金额
    start_date: timestamp("start_date", { withTimezone: true }), // 有效期开始日期
    expiry_date: timestamp("expiry_date", { withTimezone: true }), // 到期日期
    status: varchar("status", { length: 20 }).notNull().default('active'), // active: 有效, expired: 已过期
    remark: text("remark"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("enrollments_student_id_idx").on(table.student_id),
    index("enrollments_course_id_idx").on(table.course_id),
    index("enrollments_status_idx").on(table.status),
    index("enrollments_expiry_date_idx").on(table.expiry_date),
  ]
);

// 签到记录表
export const checkIns = pgTable(
  "check_ins",
  {
    id: serial().primaryKey(),
    student_id: integer("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    course_id: integer("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    check_in_time: timestamp("check_in_time", { withTimezone: true }).defaultNow().notNull(),
    hours: integer("hours").notNull().default(1), // 本次签到消耗课时
    status: varchar("status", { length: 20 }).notNull().default('checked_in'), // checked_in: 已签到, leave: 请假, absent: 缺勤
    remark: text("remark"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("check_ins_student_id_idx").on(table.student_id),
    index("check_ins_course_id_idx").on(table.course_id),
    index("check_ins_check_in_time_idx").on(table.check_in_time),
    index("check_ins_status_idx").on(table.status),
  ]
);

// 消课记录表
export const lessonConsumptions = pgTable(
  "lesson_consumptions",
  {
    id: serial().primaryKey(),
    student_id: integer("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    course_id: integer("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    check_in_id: integer("check_in_id").references(() => checkIns.id, { onDelete: "set null" }), // 关联签到记录
    hours: integer("hours").notNull().default(1), // 消耗课时
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull().default('0'), // 消费金额
    remark: text("remark"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("lesson_consumptions_student_id_idx").on(table.student_id),
    index("lesson_consumptions_course_id_idx").on(table.course_id),
    index("lesson_consumptions_check_in_id_idx").on(table.check_in_id),
    index("lesson_consumptions_created_at_idx").on(table.created_at),
  ]
);
