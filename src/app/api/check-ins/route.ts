import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

const client = getSupabaseClient();

// GET - 获取签到记录
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const student_id = searchParams.get('student_id');
  const course_id = searchParams.get('course_id');
  const date = searchParams.get('date'); // YYYY-MM-DD
  
  let query = client
    .from('check_ins')
    .select(`
      *,
      students (
        id,
        name,
        phone
      ),
      courses (
        id,
        name
      )
    `)
    .order('check_in_time', { ascending: false });
  
  if (student_id) {
    query = query.eq('student_id', student_id);
  }
  
  if (course_id) {
    query = query.eq('course_id', course_id);
  }
  
  if (date) {
    query = query.gte('check_in_time', `${date}T00:00:00`).lte('check_in_time', `${date}T23:59:59`);
  }
  
  const { data, error } = await query;
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ data });
}

// POST - 学生签到
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { student_id, course_id, hours, status, remark } = body;
    
    const consumeHours = hours || 1;
    
    // 1. 检查学生剩余课时
    const { data: student, error: studentError } = await client
      .from('students')
      .select('remaining_hours')
      .eq('id', student_id)
      .single();
    
    if (studentError) {
      return NextResponse.json({ error: studentError.message }, { status: 500 });
    }
    
    if ((student.remaining_hours || 0) < consumeHours) {
      return NextResponse.json({ error: '剩余课时不足' }, { status: 400 });
    }
    
    // 2. 创建签到记录
    const { data: checkIn, error: checkInError } = await client
      .from('check_ins')
      .insert({
        student_id,
        course_id,
        hours: consumeHours,
        status: status || 'checked_in',
        remark: remark || null,
      })
      .select()
      .single();
    
    if (checkInError) {
      return NextResponse.json({ error: checkInError.message }, { status: 500 });
    }
    
    // 3. 如果是正常签到，扣除课时并创建消课记录
    if (status !== 'leave' && status !== 'absent') {
      // 扣除学生课时
      const { error: updateError } = await client
        .from('students')
        .update({
          remaining_hours: student.remaining_hours - consumeHours,
          updated_at: new Date().toISOString(),
        })
        .eq('id', student_id);
      
      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
      
      // 从报名记录获取价格信息计算消费金额
      // 消费金额 = 报名金额 ÷ 购买总课时 × 消耗课时数
      const { data: enrollment } = await client
        .from('enrollments')
        .select('amount, total_hours')
        .eq('student_id', student_id)
        .eq('course_id', course_id)
        .eq('status', 'active')
        .single();
      
      let amount = '0';
      if (enrollment && Number(enrollment.total_hours) > 0) {
        const unitPrice = Number(enrollment.amount) / Number(enrollment.total_hours);
        amount = (unitPrice * consumeHours).toFixed(2);
      }
      
      // 创建消课记录
      await client
        .from('lesson_consumptions')
        .insert({
          student_id,
          course_id,
          check_in_id: checkIn.id,
          hours: consumeHours,
          amount,
          remark: '签到自动消课',
        });
    }
    
    return NextResponse.json({ data: checkIn });
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }
}
