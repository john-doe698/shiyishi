import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET - 获取签到记录
export async function GET(request: NextRequest) {
  const client = getSupabaseClient();
  const { searchParams } = new URL(request.url);
  const student_id = searchParams.get('student_id');
  const course_id = searchParams.get('course_id');
  const date = searchParams.get('date'); // YYYY-MM-DD
  
  // 获取当前用户信息
  const userRole = request.headers.get('x-user-role');
  const userId = request.headers.get('x-user-id');
  
  let query = client
    .from('check_ins')
    .select(`
      *,
      students (
        id,
        name,
        phone,
        planner_id
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
  
  // 权限过滤：规划师只能看到自己学生的签到记录
  let filteredData = data;
  if (userRole === 'planner' && userId && data) {
    filteredData = data.filter((item: { students: { planner_id: number | null } | null }) => {
      const student = item.students;
      return student && student.planner_id === parseInt(userId);
    });
  }
  
  return NextResponse.json({ data: filteredData });
}

// POST - 学生签到
export async function POST(request: NextRequest) {
  const client = getSupabaseClient();
  try {
    const body = await request.json();
    const { student_id, course_id, hours, status, remark } = body;
    
    // 获取当前用户信息
    const userRole = request.headers.get('x-user-role');
    const userId = request.headers.get('x-user-id');
    
    // 权限验证：规划师只能给自己的学生签到
    if (userRole === 'planner' && userId) {
      const { data: student } = await client
        .from('students')
        .select('planner_id')
        .eq('id', student_id)
        .single();
      
      if (!student || student.planner_id !== parseInt(userId)) {
        return NextResponse.json({ error: '权限不足：只能为自己的学生签到' }, { status: 403 });
      }
    }
    
    const consumeHours = hours || 1;
    
    // 1. 检查学生是否有该课程的有效报名记录
    const { data: enrollment, error: enrollmentError } = await client
      .from('enrollments')
      .select('id, remaining_hours, remaining_purchased, remaining_gifted, total_hours, gifted_hours, amount')
      .eq('student_id', student_id)
      .eq('course_id', course_id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (enrollmentError) {
      return NextResponse.json({ error: enrollmentError.message }, { status: 500 });
    }
    
    if (!enrollment) {
      return NextResponse.json({ error: '该学生未报名此课程，请先报名或选择正确的课程' }, { status: 400 });
    }
    
    // 2. 检查报名记录的剩余课时
    const totalRemaining = (enrollment.remaining_purchased || 0) + (enrollment.remaining_gifted || 0);
    if (totalRemaining < consumeHours) {
      return NextResponse.json({ error: '该课程剩余课时不足' }, { status: 400 });
    }
    
    // 3. 创建签到记录
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
    
    // 4. 如果是正常签到，扣除课时并创建消课记录
    if (status !== 'leave' && status !== 'absent') {
      // 计算消耗的购买课时和赠送课时
      // 规则：先消耗购买课时，再消耗赠送课时
      let consumePurchased = 0;
      let consumeGifted = 0;
      const currentPurchased = enrollment.remaining_purchased || 0;
      const currentGifted = enrollment.remaining_gifted || 0;
      
      if (consumeHours <= currentPurchased) {
        // 购买课时足够，全部从购买课时扣
        consumePurchased = consumeHours;
        consumeGifted = 0;
      } else {
        // 购买课时不足，先扣完购买课时，剩余从赠送课时扣
        consumePurchased = currentPurchased;
        consumeGifted = consumeHours - currentPurchased;
      }
      
      // 更新报名记录的剩余课时
      const { error: updateEnrollmentError } = await client
        .from('enrollments')
        .update({
          remaining_purchased: currentPurchased - consumePurchased,
          remaining_gifted: currentGifted - consumeGifted,
          remaining_hours: totalRemaining - consumeHours,
          updated_at: new Date().toISOString(),
        })
        .eq('id', enrollment.id);
      
      if (updateEnrollmentError) {
        return NextResponse.json({ error: updateEnrollmentError.message }, { status: 500 });
      }
      
      // 扣除学生的总剩余课时
      const { data: student } = await client
        .from('students')
        .select('remaining_hours')
        .eq('id', student_id)
        .single();
      
      if (student) {
        await client
          .from('students')
          .update({
            remaining_hours: Math.max(0, (student.remaining_hours || 0) - consumeHours),
            updated_at: new Date().toISOString(),
          })
          .eq('id', student_id);
      }
      
      // 计算消费金额：只有消耗购买课时才产生金额
      // 单价 = 报名金额 ÷ 购买课时数
      // 保留小数点后两位，不四舍五入（向下截断）
      let amount = '0';
      if (consumePurchased > 0 && Number(enrollment.total_hours) > 0) {
        const unitPrice = Number(enrollment.amount) / Number(enrollment.total_hours);
        const totalAmount = unitPrice * consumePurchased;
        // 向下取整到两位小数
        amount = (Math.floor(totalAmount * 100) / 100).toFixed(2);
      }
      
      // 创建消课记录
      const remarkText = consumeGifted > 0 
        ? `签到消课（含赠送课时${consumeGifted}节）` 
        : '签到自动消课';
      
      await client
        .from('lesson_consumptions')
        .insert({
          student_id,
          course_id,
          check_in_id: checkIn.id,
          hours: consumeHours,
          amount,
          remark: remarkText,
        });
    }
    
    return NextResponse.json({ data: checkIn });
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }
}
