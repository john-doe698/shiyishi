import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

const client = getSupabaseClient();

// GET - 获取统计数据
export async function GET() {
  try {
    // 获取学生总数
    const { count: totalStudents, error: studentError } = await client
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');
    
    if (studentError) {
      return NextResponse.json({ error: studentError.message }, { status: 500 });
    }
    
    // 获取今日签到数
    const today = new Date().toISOString().split('T')[0];
    const { count: todayCheckIns, error: checkInError } = await client
      .from('check_ins')
      .select('*', { count: 'exact', head: true })
      .gte('check_in_time', `${today}T00:00:00`)
      .lte('check_in_time', `${today}T23:59:59`);
    
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
    
    const { data: monthConsumptions, error: consumptionError } = await client
      .from('lesson_consumptions')
      .select('hours, amount')
      .gte('created_at', monthStart.toISOString());
    
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
