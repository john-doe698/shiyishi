import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

const client = getSupabaseClient();

// PUT - 修改签到记录
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { student_id, course_id, hours, remark } = body;
    
    // 获取当前用户信息
    const userRole = request.headers.get('x-user-role');
    const userId = request.headers.get('x-user-id');
    
    // 获取原始签到记录
    const { data: originalCheckIn, error: fetchError } = await client
      .from('check_ins')
      .select(`
        *,
        students (
          id,
          name,
          planner_id
        )
      `)
      .eq('id', id)
      .single();
    
    if (fetchError || !originalCheckIn) {
      return NextResponse.json({ error: '签到记录不存在' }, { status: 404 });
    }
    
    // 权限验证：规划师只能修改自己学生的签到记录
    if (userRole === 'planner' && userId) {
      if (!originalCheckIn.students || originalCheckIn.students.planner_id !== parseInt(userId)) {
        return NextResponse.json({ error: '权限不足：只能修改自己学生的签到记录' }, { status: 403 });
      }
    }
    
    const originalHours = originalCheckIn.hours;
    const originalStatus = originalCheckIn.status;
    const newHours = hours || 1;
    const newStudentId = student_id || originalCheckIn.student_id;
    const newCourseId = course_id || originalCheckIn.course_id;
    
    // 如果是请假或缺勤状态，只更新备注信息
    if (originalStatus === 'leave' || originalStatus === 'absent') {
      const { data, error } = await client
        .from('check_ins')
        .update({
          remark: remark || originalCheckIn.remark,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
      return NextResponse.json({ data });
    }
    
    // 正常签到记录的修改逻辑
    // 1. 获取原始消课记录
    const { data: originalConsumption } = await client
      .from('lesson_consumptions')
      .select('*')
      .eq('check_in_id', id)
      .single();
    
    // 2. 获取原始报名记录
    const { data: originalEnrollment } = await client
      .from('enrollments')
      .select('*')
      .eq('student_id', originalCheckIn.student_id)
      .eq('course_id', originalCheckIn.course_id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    // 3. 回退原始课时
    if (originalConsumption && originalEnrollment) {
      const originalConsumePurchased = originalConsumption.remark?.includes('赠送课时') 
        ? originalHours - parseInt(originalConsumption.remark.match(/赠送课时(\d+)节/)?.[1] || '0')
        : originalHours;
      const originalConsumeGifted = originalConsumption.remark?.includes('赠送课时')
        ? parseInt(originalConsumption.remark.match(/赠送课时(\d+)节/)?.[1] || '0')
        : 0;
      
      await client
        .from('enrollments')
        .update({
          remaining_purchased: (originalEnrollment.remaining_purchased || 0) + originalConsumePurchased,
          remaining_gifted: (originalEnrollment.remaining_gifted || 0) + originalConsumeGifted,
          remaining_hours: (originalEnrollment.remaining_hours || 0) + originalHours,
          updated_at: new Date().toISOString(),
        })
        .eq('id', originalEnrollment.id);
      
      // 回退学生总课时
      await client
        .from('students')
        .update({
          remaining_hours: client.rpc('increment_remaining_hours', { 
            student_id: originalCheckIn.student_id, 
            hours: originalHours 
          }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', originalCheckIn.student_id);
    }
    
    // 4. 检查新的学生课程报名记录
    const { data: newEnrollment, error: enrollmentError } = await client
      .from('enrollments')
      .select('id, remaining_hours, remaining_purchased, remaining_gifted, total_hours, gifted_hours, amount')
      .eq('student_id', newStudentId)
      .eq('course_id', newCourseId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (enrollmentError) {
      return NextResponse.json({ error: enrollmentError.message }, { status: 500 });
    }
    
    if (!newEnrollment) {
      return NextResponse.json({ error: '该学生未报名此课程，请先报名或选择正确的课程' }, { status: 400 });
    }
    
    const totalRemaining = (newEnrollment.remaining_purchased || 0) + (newEnrollment.remaining_gifted || 0);
    if (totalRemaining < newHours) {
      return NextResponse.json({ error: '该课程剩余课时不足' }, { status: 400 });
    }
    
    // 5. 更新签到记录
    const { data: updatedCheckIn, error: updateError } = await client
      .from('check_ins')
      .update({
        student_id: newStudentId,
        course_id: newCourseId,
        hours: newHours,
        remark: remark || originalCheckIn.remark,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    
    // 6. 扣除新的课时
    let consumePurchased = 0;
    let consumeGifted = 0;
    const currentPurchased = newEnrollment.remaining_purchased || 0;
    const currentGifted = newEnrollment.remaining_gifted || 0;
    
    if (newHours <= currentPurchased) {
      consumePurchased = newHours;
      consumeGifted = 0;
    } else {
      consumePurchased = currentPurchased;
      consumeGifted = newHours - currentPurchased;
    }
    
    await client
      .from('enrollments')
      .update({
        remaining_purchased: currentPurchased - consumePurchased,
        remaining_gifted: currentGifted - consumeGifted,
        remaining_hours: totalRemaining - newHours,
        updated_at: new Date().toISOString(),
      })
      .eq('id', newEnrollment.id);
    
    // 扣除学生总课时
    const { data: student } = await client
      .from('students')
      .select('remaining_hours')
      .eq('id', newStudentId)
      .single();
    
    if (student) {
      await client
        .from('students')
        .update({
          remaining_hours: Math.max(0, (student.remaining_hours || 0) - newHours),
          updated_at: new Date().toISOString(),
        })
        .eq('id', newStudentId);
    }
    
    // 7. 计算新的消费金额
    let amount = '0';
    if (consumePurchased > 0 && Number(newEnrollment.total_hours) > 0) {
      const unitPrice = Number(newEnrollment.amount) / Number(newEnrollment.total_hours);
      amount = (unitPrice * consumePurchased).toFixed(2);
    }
    
    // 8. 更新消课记录
    const remarkText = consumeGifted > 0 
      ? `签到消课（含赠送课时${consumeGifted}节）` 
      : '签到自动消课';
    
    if (originalConsumption) {
      await client
        .from('lesson_consumptions')
        .update({
          student_id: newStudentId,
          course_id: newCourseId,
          hours: newHours,
          amount,
          remark: remarkText,
          updated_at: new Date().toISOString(),
        })
        .eq('id', originalConsumption.id);
    }
    
    return NextResponse.json({ data: updatedCheckIn });
  } catch (error) {
    console.error('修改签到记录失败:', error);
    return NextResponse.json({ error: '修改签到记录失败' }, { status: 500 });
  }
}

// DELETE - 删除签到记录（撤销签到）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // 获取当前用户信息
    const userRole = request.headers.get('x-user-role');
    const userId = request.headers.get('x-user-id');
    
    // 获取签到记录
    const { data: checkIn, error: fetchError } = await client
      .from('check_ins')
      .select(`
        *,
        students (
          id,
          name,
          planner_id
        )
      `)
      .eq('id', id)
      .single();
    
    if (fetchError || !checkIn) {
      return NextResponse.json({ error: '签到记录不存在' }, { status: 404 });
    }
    
    // 权限验证：规划师只能删除自己学生的签到记录
    if (userRole === 'planner' && userId) {
      if (!checkIn.students || checkIn.students.planner_id !== parseInt(userId)) {
        return NextResponse.json({ error: '权限不足：只能删除自己学生的签到记录' }, { status: 403 });
      }
    }
    
    // 如果是正常签到，回退课时
    if (checkIn.status !== 'leave' && checkIn.status !== 'absent') {
      // 获取消课记录
      const { data: consumption } = await client
        .from('lesson_consumptions')
        .select('*')
        .eq('check_in_id', id)
        .single();
      
      if (consumption) {
        // 获取报名记录
        const { data: enrollment } = await client
          .from('enrollments')
          .select('*')
          .eq('student_id', checkIn.student_id)
          .eq('course_id', checkIn.course_id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (enrollment) {
          // 回退课时
          const consumePurchased = consumption.remark?.includes('赠送课时') 
            ? checkIn.hours - parseInt(consumption.remark.match(/赠送课时(\d+)节/)?.[1] || '0')
            : checkIn.hours;
          const consumeGifted = consumption.remark?.includes('赠送课时')
            ? parseInt(consumption.remark.match(/赠送课时(\d+)节/)?.[1] || '0')
            : 0;
          
          await client
            .from('enrollments')
            .update({
              remaining_purchased: (enrollment.remaining_purchased || 0) + consumePurchased,
              remaining_gifted: (enrollment.remaining_gifted || 0) + consumeGifted,
              remaining_hours: (enrollment.remaining_hours || 0) + checkIn.hours,
              updated_at: new Date().toISOString(),
            })
            .eq('id', enrollment.id);
          
          // 回退学生总课时
          const { data: student } = await client
            .from('students')
            .select('remaining_hours')
            .eq('id', checkIn.student_id)
            .single();
          
          if (student) {
            await client
              .from('students')
              .update({
                remaining_hours: (student.remaining_hours || 0) + checkIn.hours,
                updated_at: new Date().toISOString(),
              })
              .eq('id', checkIn.student_id);
          }
        }
        
        // 删除消课记录
        await client
          .from('lesson_consumptions')
          .delete()
          .eq('id', consumption.id);
      }
    }
    
    // 删除签到记录
    const { error } = await client
      .from('check_ins')
      .delete()
      .eq('id', id);
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除签到记录失败:', error);
    return NextResponse.json({ error: '删除签到记录失败' }, { status: 500 });
  }
}
