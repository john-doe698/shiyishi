import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET - 获取报名记录
export async function GET(request: NextRequest) {
  const client = getSupabaseClient();
  const { searchParams } = new URL(request.url);
  const student_id = searchParams.get('student_id');
  const course_id = searchParams.get('course_id');
  
  let query = client
    .from('enrollments')
    .select(`
      *,
      students (
        id,
        name,
        phone
      ),
      courses (
        id,
        name,
        price
      )
    `)
    .order('created_at', { ascending: false });
  
  if (student_id) {
    query = query.eq('student_id', student_id);
  }
  
  if (course_id) {
    query = query.eq('course_id', course_id);
  }
  
  const { data, error } = await query;
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ data });
}

// POST - 学生报名课程
export async function POST(request: NextRequest) {
  const client = getSupabaseClient();
  try {
    const body = await request.json();
    const { student_id, course_id, total_hours, gifted_hours, amount, start_date, expiry_date, remark } = body;
    
    const purchaseHours = total_hours || 0;
    const giftHours = gifted_hours || 0;
    const totalHoursAll = purchaseHours + giftHours;
    
    // 1. 创建报名记录
    const { data: enrollment, error: enrollmentError } = await client
      .from('enrollments')
      .insert({
        student_id,
        course_id,
        total_hours: purchaseHours,           // 购买课时
        gifted_hours: giftHours,              // 赠送课时
        remaining_purchased: purchaseHours,   // 剩余购买课时
        remaining_gifted: giftHours,          // 剩余赠送课时
        remaining_hours: totalHoursAll,       // 总剩余课时
        amount: amount || '0',
        start_date: start_date || new Date().toISOString(),
        expiry_date: expiry_date || null,
        remark: remark || null,
        status: 'active',
      })
      .select()
      .single();
    
    if (enrollmentError) {
      return NextResponse.json({ error: enrollmentError.message }, { status: 500 });
    }
    
    // 2. 更新学生的总课时和剩余课时
    const { data: student, error: studentError } = await client
      .from('students')
      .select('total_hours, remaining_hours')
      .eq('id', student_id)
      .single();
    
    if (studentError) {
      return NextResponse.json({ error: studentError.message }, { status: 500 });
    }
    
    // 学生总课时 = 购买课时 + 赠送课时
    const newTotalHours = (student.total_hours || 0) + totalHoursAll;
    const newRemainingHours = (student.remaining_hours || 0) + totalHoursAll;
    
    const { error: updateError } = await client
      .from('students')
      .update({
        total_hours: newTotalHours,
        remaining_hours: newRemainingHours,
        updated_at: new Date().toISOString(),
      })
      .eq('id', student_id);
    
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    
    return NextResponse.json({ data: enrollment });
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }
}
