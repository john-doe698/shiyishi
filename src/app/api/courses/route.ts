import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

const client = getSupabaseClient();

// GET - 获取课程列表
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  
  let query = client
    .from('courses')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (status) {
    query = query.eq('status', status);
  }
  
  const { data, error } = await query;
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ data });
}

// POST - 创建课程
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, price } = body;
    
    const { data, error } = await client
      .from('courses')
      .insert({
        name,
        description: description || null,
        price: price || '0',
        status: 'active',
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
