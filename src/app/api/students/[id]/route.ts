import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

const client = getSupabaseClient();

// GET - 获取学生详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const { data, error } = await client
    .from('students')
    .select(`
      *,
      enrollments (
        id,
        total_hours,
        remaining_hours,
        amount,
        status,
        created_at,
        courses (
          id,
          name,
          price
        )
      ),
      check_ins (
        id,
        check_in_time,
        hours,
        status,
        remark,
        courses (
          id,
          name
        )
      )
    `)
    .eq('id', id)
    .single();
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ data });
}

// PUT - 更新学生信息
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, phone, parent_name, parent_phone, status, remark } = body;
    
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone || null;
    if (parent_name !== undefined) updateData.parent_name = parent_name || null;
    if (parent_phone !== undefined) updateData.parent_phone = parent_phone || null;
    if (status !== undefined) updateData.status = status;
    if (remark !== undefined) updateData.remark = remark || null;
    
    const { data, error } = await client
      .from('students')
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

// DELETE - 删除学生
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const { error } = await client
    .from('students')
    .delete()
    .eq('id', id);
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ success: true });
}
