import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

const client = getSupabaseClient();

// GET - 获取统计数据
export async function GET(request: NextRequest) {
  try {
    // 获取当前用户信息
    const userRole = request.headers.get('x-user-role');
    const userId = request.headers.get('x-user-id');
    
    // 基础查询条件：规划师只能看到自己的学生
    const studentFilter = userRole === 'planner' && userId 
      ? `planner_id.eq.${userId}` 
      : undefined;
    
    // 获取学生总数
    let studentQuery = client
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');
    
    if (studentFilter) {
      studentQuery = studentQuery.eq('planner_id', userId);
    }
    
    const { count: totalStudents, error: studentError } = await studentQuery;
    
    if (studentError) {
      return NextResponse.json({ error: studentError.message }, { status: 500 });
    }
    
    // 获取规划师的学生ID列表（用于过滤签到和消课记录）
    let plannerStudentIds: number[] = [];
    if (userRole === 'planner' && userId) {
      const { data: studentsData } = await client
        .from('students')
        .select('id')
        .eq('planner_id', userId);
      plannerStudentIds = studentsData?.map(s => s.id) || [];
    }
    
    // 获取今日签到数
    const today = new Date().toISOString().split('T')[0];
    let checkInQuery = client
      .from('check_ins')
      .select('*', { count: 'exact', head: true })
      .gte('check_in_time', `${today}T00:00:00`)
      .lte('check_in_time', `${today}T23:59:59`);
    
    // 规划师只能看到自己学生的签到
    if (plannerStudentIds.length > 0) {
      checkInQuery = checkInQuery.in('student_id', plannerStudentIds);
    } else if (userRole === 'planner') {
      // 规划师没有学生，返回0
      return NextResponse.json({
        data: {
          totalStudents: 0,
          todayCheckIns: 0,
          totalCourses: 0,
          monthTotalHours: 0,
          monthTotalAmount: 0,
        },
      });
    }
    
    const { count: todayCheckIns, error: checkInError } = await checkInQuery;
    
    if (checkInError) {
      return NextResponse.json({ error: checkInError.message }, { status: 500 });
    }
    
    // 获取课程总数
    const { count: totalCourses, error: courseError } = await client
      .from('courses')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');
    
    if (courseError) {
      return NextResponse.json({ error: courseError.message }, { status: 500 });
    }
    
    // 获取本月消课总数
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    
    let consumptionQuery = client
      .from('lesson_consumptions')
      .select('hours, amount')
      .gte('created_at', monthStart.toISOString());
    
    // 规划师只能看到自己学生的消课
    if (plannerStudentIds.length > 0) {
      consumptionQuery = consumptionQuery.in('student_id', plannerStudentIds);
    }
    
    const { data: monthConsumptions, error: consumptionError } = await consumptionQuery;
    
    if (consumptionError) {
      return NextResponse.json({ error: consumptionError.message }, { status: 500 });
    }
    
    const monthTotalHours = monthConsumptions?.reduce((sum, item) => sum + (item.hours || 0), 0) || 0;
    const monthTotalAmount = monthConsumptions?.reduce((sum, item) => sum + Number(item.amount || 0), 0) || 0;
    
    return NextResponse.json({
      data: {
        totalStudents: totalStudents || 0,
        todayCheckIns: todayCheckIns || 0,
        totalCourses: totalCourses || 0,
        monthTotalHours,
        monthTotalAmount,
      },
    });
  } catch {
    return NextResponse.json({ error: '获取统计数据失败' }, { status: 500 });
  }
}
