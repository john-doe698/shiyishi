import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

const client = getSupabaseClient();

// GET - 获取续费提醒
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') || '7'); // 默认查询7天内到期的
  
  try {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    
    // 1. 查询即将到期的报名记录
    const { data: expiringEnrollments, error: enrollmentError } = await client
      .from('enrollments')
      .select(`
        id,
        total_hours,
        remaining_hours,
        amount,
        expiry_date,
        status,
        students (
          id,
          name,
          phone,
          parent_name,
          parent_phone
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
      .lte('expiry_date', futureDate.toISOString())
      .order('expiry_date', { ascending: true });
    
    if (enrollmentError) {
      return NextResponse.json({ error: enrollmentError.message }, { status: 500 });
    }
    
    // 2. 查询课时不足的学生（剩余课时 <= 3）
    const { data: lowHoursStudents, error: lowHoursError } = await client
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
      .lte('remaining_hours', 3)
      .gt('remaining_hours', 0)
      .order('remaining_hours', { ascending: true });
    
    if (lowHoursError) {
      return NextResponse.json({ error: lowHoursError.message }, { status: 500 });
    }
    
    // 3. 查询已过期的报名记录
    const { data: expiredEnrollments, error: expiredError } = await client
      .from('enrollments')
      .select(`
        id,
        total_hours,
        remaining_hours,
        amount,
        expiry_date,
        status,
        students (
          id,
          name,
          phone,
          parent_name,
          parent_phone
        ),
        courses (
          id,
          name
        )
      `)
      .eq('status', 'active')
      .not('expiry_date', 'is', null)
      .lt('expiry_date', now.toISOString())
      .gt('remaining_hours', 0)
      .order('expiry_date', { ascending: true });
    
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
