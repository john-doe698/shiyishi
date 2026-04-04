import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

const client = getSupabaseClient();

// GET - 获取消课记录
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const student_id = searchParams.get('student_id');
  const course_id = searchParams.get('course_id');
  
  // 获取当前用户信息
  const userRole = request.headers.get('x-user-role');
  const userId = request.headers.get('x-user-id');
  
  let query = client
    .from('lesson_consumptions')
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
  
  // 权限过滤：规划师只能看到自己学生的消课记录
  let filteredData = data;
  if (userRole === 'planner' && userId && data) {
    filteredData = data.filter((item: { students: { planner_id: number | null } | null }) => {
      const student = item.students;
      return student && student.planner_id === parseInt(userId);
    });
  }
  
  return NextResponse.json({ data: filteredData });
}
