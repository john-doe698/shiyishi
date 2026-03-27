import { sql } from "drizzle-orm";
import { pgTable, serial, varchar, timestamp, integer, numeric, text, index } from "drizzle-orm/pg-core";

// 系统健康检查表（禁止删除）
export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

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
    remark: text("remark"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("students_status_idx").on(table.status),
    index("students_name_idx").on(table.name),
  ]
);

// 课程表
export const courses = pgTable(
  "courses",
  {
    id: serial().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    price: numeric("price", { precision: 10, scale: 2 }).notNull().default('0'), // 单课时价格
    status: varchar("status", { length: 20 }).notNull().default('active'), // active: 开课, inactive: 停课
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("courses_status_idx").on(table.status),
  ]
);

// 报名记录表
export const enrollments = pgTable(
  "enrollments",
  {
    id: serial().primaryKey(),
    student_id: integer("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    course_id: integer("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    total_hours: integer("total_hours").notNull().default(0), // 购买总课时
    remaining_hours: integer("remaining_hours").notNull().default(0), // 剩余课时
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull().default('0'), // 报名金额
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
