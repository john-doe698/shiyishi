import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

const client = getSupabaseClient();

// GET - 获取学生列表
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const search = searchParams.get('search');
  
  // 获取当前用户信息
  const userRole = request.headers.get('x-user-role');
  const userId = request.headers.get('x-user-id');
  
  let query = client
    .from('students')
    .select('*')
    .order('created_at', { ascending: false });
  
  // 规划师只能看到自己的学生
  if (userRole === 'planner' && userId) {
    query = query.eq('planner_id', userId);
  }
  
  if (status) {
    query = query.eq('status', status);
  }
  
  if (search) {
    query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,parent_name.ilike.%${search}%`);
  }
  
  const { data, error } = await query;
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ data });
}

// POST - 创建学生（报名）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, parent_name, parent_phone, total_hours, remark } = body;
    
    // 获取当前用户信息
    const userId = request.headers.get('x-user-id');
    
    const { data, error } = await client
      .from('students')
      .insert({
        name,
        phone: phone || null,
        parent_name: parent_name || null,
        parent_phone: parent_phone || null,
        total_hours: total_hours || 0,
        remaining_hours: total_hours || 0,
        remark: remark || null,
        status: 'active',
        planner_id: userId ? parseInt(userId) : null, // 关联当前规划师
      })
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
