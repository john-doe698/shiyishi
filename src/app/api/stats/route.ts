import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET - 获取统计数据
export async function GET(request: NextRequest) {
  const client = getSupabaseClient();
  try {
    const { searchParams } = new URL(request.url);
    const byPlanner = searchParams.get('by_planner') === 'true';
    
    // 获取当前用户信息
    const userRole = request.headers.get('x-user-role');
    const userId = request.headers.get('x-user-id');
    
    // 如果请求按规划师分组统计，只有管理员可以访问
    if (byPlanner && userRole !== 'admin') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }
    
    // 按规划师分组统计（仅管理员）
    if (byPlanner) {
      return await getPlannerStats();
    }
    
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

// 获取按规划师分组的统计数据（仅管理员）
async function getPlannerStats() {
  const client = getSupabaseClient();
  const today = new Date().toISOString().split('T')[0];
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  
  // 1. 获取所有规划师
  const { data: planners, error: plannersError } = await client
    .from('users')
    .select('id, name, username')
    .eq('role', 'planner')
    .eq('status', 'active');
  
  if (plannersError) {
    return NextResponse.json({ error: plannersError.message }, { status: 500 });
  }
  
  // 获取所有规划师的 ID 集合
  const plannerIds = new Set(planners?.map(p => p.id) || []);
  
  // 2. 获取所有学生的 planner_id 映射
  const { data: allStudents, error: studentsError } = await client
    .from('students')
    .select('id, planner_id, status');
  
  if (studentsError) {
    return NextResponse.json({ error: studentsError.message }, { status: 500 });
  }
  
  // 3. 获取今日签到记录
  const { data: todayCheckIns, error: checkInsError } = await client
    .from('check_ins')
    .select('student_id')
    .gte('check_in_time', `${today}T00:00:00`)
    .lte('check_in_time', `${today}T23:59:59`);
  
  if (checkInsError) {
    return NextResponse.json({ error: checkInsError.message }, { status: 500 });
  }
  
  // 4. 获取本月消课记录
  const { data: monthConsumptions, error: consumptionsError } = await client
    .from('lesson_consumptions')
    .select('student_id, hours, amount')
    .gte('created_at', monthStart.toISOString());
  
  if (consumptionsError) {
    return NextResponse.json({ error: consumptionsError.message }, { status: 500 });
  }
  
  // 5. 构建学生到规划师的映射（只映射真正的规划师）
  const studentToPlanner: Record<number, number | null> = {};
  allStudents?.forEach(s => {
    // 只有当 planner_id 是真正的规划师时才映射，否则视为未分配
    studentToPlanner[s.id] = (s.planner_id && plannerIds.has(s.planner_id)) ? s.planner_id : null;
  });
  
  // 6. 统计每个规划师的数据
  const plannerStatsMap: Record<number, {
    plannerId: number;
    plannerName: string;
    plannerUsername: string;
    totalStudents: number;
    todayCheckIns: number;
    monthHours: number;
    monthAmount: number;
  }> = {};
  
  // 初始化规划师数据
  planners?.forEach(p => {
    plannerStatsMap[p.id] = {
      plannerId: p.id,
      plannerName: p.name,
      plannerUsername: p.username,
      totalStudents: 0,
      todayCheckIns: 0,
      monthHours: 0,
      monthAmount: 0,
    };
  });
  
  // 统计在籍学生数（只统计分配给真正规划师的学生）
  allStudents?.filter(s => s.status === 'active').forEach(s => {
    const plannerId = studentToPlanner[s.id];
    if (plannerId && plannerStatsMap[plannerId]) {
      plannerStatsMap[plannerId].totalStudents++;
    }
  });
  
  // 统计今日签到
  todayCheckIns?.forEach(c => {
    const plannerId = studentToPlanner[c.student_id];
    if (plannerId && plannerStatsMap[plannerId]) {
      plannerStatsMap[plannerId].todayCheckIns++;
    }
  });
  
  // 统计本月消课
  monthConsumptions?.forEach(c => {
    const plannerId = studentToPlanner[c.student_id];
    if (plannerId && plannerStatsMap[plannerId]) {
      plannerStatsMap[plannerId].monthHours += c.hours || 0;
      plannerStatsMap[plannerId].monthAmount += Number(c.amount) || 0;
    }
  });
  
  // 7. 统计未分配学生（planner_id 为 null 或指向非规划师用户的学生）
  const unassignedStudents = allStudents?.filter(s => s.status === 'active' && !studentToPlanner[s.id]).length || 0;
  const unassignedTodayCheckIns = todayCheckIns?.filter(c => !studentToPlanner[c.student_id]).length || 0;
  const unassignedMonthHours = monthConsumptions
    ?.filter(c => !studentToPlanner[c.student_id])
    .reduce((sum, c) => sum + (c.hours || 0), 0) || 0;
  const unassignedMonthAmount = monthConsumptions
    ?.filter(c => !studentToPlanner[c.student_id])
    .reduce((sum, c) => sum + (Number(c.amount) || 0), 0) || 0;
  
  const result = Object.values(plannerStatsMap);
  
  // 添加未分配学生统计
  if (unassignedStudents > 0 || unassignedTodayCheckIns > 0 || unassignedMonthHours > 0) {
    result.push({
      plannerId: 0,
      plannerName: '未分配',
      plannerUsername: '-',
      totalStudents: unassignedStudents,
      todayCheckIns: unassignedTodayCheckIns,
      monthHours: unassignedMonthHours,
      monthAmount: unassignedMonthAmount,
    });
  }
  
  return NextResponse.json({ data: result });
}
