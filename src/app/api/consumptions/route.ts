import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

const client = getSupabaseClient();

// GET - 获取消课记录
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const student_id = searchParams.get('student_id');
  const course_id = searchParams.get('course_id');
  
  let query = client
    .from('lesson_consumptions')
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
      ),
      check_ins (
        id,
        check_in_time,
        status
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
