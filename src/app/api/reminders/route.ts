import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET - 获取续费提醒
export async function GET(request: NextRequest) {
  const client = await getSupabaseClient();
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') || '7'); // 默认查询7天内到期的
  
  // 获取当前用户信息
  const userRole = request.headers.get('x-user-role');
  const userId = request.headers.get('x-user-id');
  
  try {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    
    // 获取规划师的学生ID列表
    let plannerStudentIds: number[] = [];
    if (userRole === 'planner' && userId) {
      const { data: studentsData } = await client
        .from('students')
        .select('id')
        .eq('planner_id', userId);
      plannerStudentIds = studentsData?.map(s => s.id) || [];
    }
    
    // 1. 查询即将到期的报名记录
    let expiringQuery = client
      .from('enrollments')
      .select(`
        id,
        total_hours,
        remaining_hours,
        amount,
        expiry_date,
        status,
        student_id,
        students (
          id,
          name,
          phone,
          parent_name,
          parent_phone,
          planner_id
        ),
        courses (
          id,
          name,
          price
        )
      `)
      .eq('status', 'active')
      .not('expiry_date', 'is', null)
      .gte('expiry_date', now.toISOString())
      .lte('expiry_date', futureDate.toISOString());
    
    // 规划师只能看到自己学生的提醒
    if (plannerStudentIds.length > 0) {
      expiringQuery = expiringQuery.in('student_id', plannerStudentIds);
    } else if (userRole === 'planner') {
      // 规划师没有学生
      return NextResponse.json({
        data: {
          expiringEnrollments: [],
          lowHoursStudents: [],
          expiredEnrollments: [],
        },
      });
    }
    
    const { data: expiringEnrollments, error: enrollmentError } = await expiringQuery.order('expiry_date', { ascending: true });
    
    if (enrollmentError) {
      return NextResponse.json({ error: enrollmentError.message }, { status: 500 });
    }
    
    // 2. 查询课时不足的学生（剩余课时 <= 6）
    let lowHoursQuery = client
      .from('students')
      .select(`
        id,
        name,
        phone,
        parent_name,
        parent_phone,
        remaining_hours,
        enrollments (
          id,
          remaining_hours,
          expiry_date,
          courses (
            id,
            name
          )
        )
      `)
      .eq('status', 'active')
      .lte('remaining_hours', 6)
      .gt('remaining_hours', 0);
    
    // 规划师只能看到自己学生
    if (plannerStudentIds.length > 0) {
      lowHoursQuery = lowHoursQuery.in('id', plannerStudentIds);
    }
    
    const { data: lowHoursStudents, error: lowHoursError } = await lowHoursQuery.order('remaining_hours', { ascending: true });
    
    if (lowHoursError) {
      return NextResponse.json({ error: lowHoursError.message }, { status: 500 });
    }
    
    // 3. 查询已过期的报名记录
    let expiredQuery = client
      .from('enrollments')
      .select(`
        id,
        total_hours,
        remaining_hours,
        amount,
        expiry_date,
        status,
        student_id,
        students (
          id,
          name,
          phone,
          parent_name,
          parent_phone,
          planner_id
        ),
        courses (
          id,
          name
        )
      `)
      .eq('status', 'active')
      .not('expiry_date', 'is', null)
      .lt('expiry_date', now.toISOString())
      .gt('remaining_hours', 0);
    
    // 规划师只能看到自己学生的提醒
    if (plannerStudentIds.length > 0) {
      expiredQuery = expiredQuery.in('student_id', plannerStudentIds);
    }
    
    const { data: expiredEnrollments, error: expiredError } = await expiredQuery.order('expiry_date', { ascending: true });
    
    if (expiredError) {
      return NextResponse.json({ error: expiredError.message }, { status: 500 });
    }
    
    return NextResponse.json({
      data: {
        expiringEnrollments: expiringEnrollments || [],
        lowHoursStudents: lowHoursStudents || [],
        expiredEnrollments: expiredEnrollments || [],
      },
    });
  } catch {
    return NextResponse.json({ error: '获取续费提醒失败' }, { status: 500 });
  }
}
