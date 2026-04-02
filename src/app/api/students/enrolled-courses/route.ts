import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

const client = getSupabaseClient();

// GET - 获取学生已报名的课程列表
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const student_id = searchParams.get('student_id');
  
  if (!student_id) {
    return NextResponse.json({ error: '缺少学生ID' }, { status: 400 });
  }
  
  const { data, error } = await client
    .from('enrollments')
    .select(`
      id,
      remaining_hours,
      total_hours,
      amount,
      expiry_date,
      courses (
        id,
        name,
        price
      )
    `)
    .eq('student_id', student_id)
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ data });
}
