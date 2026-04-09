import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET - 获取单个报名记录详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await getSupabaseClient();
  const { id } = await params;
  
  const { data, error } = await client
    .from('enrollments')
    .select(`
      *,
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
        price,
        education_level,
        class_name,
        total_hours,
        valid_months
      )
    `)
    .eq('id', id)
    .single();
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ data });
}

// PUT - 更新报名记录（修改有效期、课时等）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await getSupabaseClient();
  try {
    const { id } = await params;
    const body = await request.json();
    
    // 先获取当前报名记录
    const { data: currentEnrollment, error: fetchError } = await client
      .from('enrollments')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    
    // 支持修改的字段
    if (body.expiry_date !== undefined) {
      updateData.expiry_date = body.expiry_date;
    }
    if (body.start_date !== undefined) {
      updateData.start_date = body.start_date;
    }
    if (body.total_hours !== undefined) {
      // 计算课时变化
      const hoursDiff = body.total_hours - currentEnrollment.total_hours;
      updateData.total_hours = body.total_hours;
      updateData.remaining_hours = currentEnrollment.remaining_hours + hoursDiff;
      
      // 更新学生的总课时
      if (hoursDiff !== 0) {
        const { data: student } = await client
          .from('students')
          .select('total_hours, remaining_hours')
          .eq('id', currentEnrollment.student_id)
          .single();
        
        if (student) {
          await client
            .from('students')
            .update({
              total_hours: student.total_hours + hoursDiff,
              remaining_hours: student.remaining_hours + hoursDiff,
              updated_at: new Date().toISOString(),
            })
            .eq('id', currentEnrollment.student_id);
        }
      }
    }
    if (body.status !== undefined) {
      updateData.status = body.status;
    }
    if (body.remark !== undefined) {
      updateData.remark = body.remark;
    }
    
    const { data, error } = await client
      .from('enrollments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }
}

// DELETE - 删除报名记录
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await getSupabaseClient();
  const { id } = await params;
  
  // 获取报名记录信息
  const { data: enrollment, error: fetchError } = await client
    .from('enrollments')
    .select('*')
    .eq('id', id)
    .single();
  
  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  
  // 更新学生课时（减去该报名的剩余课时）
  const { data: student } = await client
    .from('students')
    .select('total_hours, remaining_hours')
    .eq('id', enrollment.student_id)
    .single();
  
  if (student) {
    const hoursToRemove = enrollment.remaining_hours;
    await client
      .from('students')
      .update({
        total_hours: Math.max(0, student.total_hours - enrollment.total_hours),
        remaining_hours: Math.max(0, student.remaining_hours - hoursToRemove),
        updated_at: new Date().toISOString(),
      })
      .eq('id', enrollment.student_id);
  }
  
  // 删除报名记录
  const { error } = await client
    .from('enrollments')
    .delete()
    .eq('id', id);
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ success: true });
}
