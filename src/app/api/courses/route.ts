import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

const client = getSupabaseClient();

// GET - 获取课程列表（包含学生信息）
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const education_level = searchParams.get('education_level');
  
  let query = client
    .from('courses')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (status) {
    query = query.eq('status', status);
  }
  if (education_level) {
    query = query.eq('education_level', education_level);
  }
  
  const { data: courses, error } = await query;
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 获取每个课程的学生信息
  if (courses && courses.length > 0) {
    const courseIds = courses.map((c: { id: number }) => c.id);
    
    // 获取所有报名记录，关联学生信息
    const { data: enrollments } = await client
      .from('enrollments')
      .select(`
        course_id,
        status,
        students (
          id,
          name,
          status
        )
      `)
      .in('course_id', courseIds);
    
    // 统计每个课程的学生
    const courseStudents: Record<number, { names: string[]; count: number }> = {};
    
    if (enrollments) {
      for (const enrollment of enrollments) {
        const courseId = enrollment.course_id;
        if (!courseStudents[courseId]) {
          courseStudents[courseId] = { names: [], count: 0 };
        }
        
        // students 可能是对象或数组，需要处理
        const student = Array.isArray(enrollment.students) ? enrollment.students[0] : enrollment.students;
        
        // 只统计有效的、在读的学生
        if (enrollment.status === 'active' && student && student.status === 'active') {
          if (!courseStudents[courseId].names.includes(student.name)) {
            courseStudents[courseId].names.push(student.name);
            courseStudents[courseId].count++;
          }
        }
      }
    }
    
    // 添加学生信息到课程数据
    const coursesWithStudents = courses.map((course: { id: number }) => ({
      ...course,
      student_names: courseStudents[course.id]?.names || [],
      student_count: courseStudents[course.id]?.count || 0,
    }));
    
    return NextResponse.json({ data: coursesWithStudents });
  }
  
  return NextResponse.json({ data: courses });
}

// POST - 创建课程
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, price, education_level, class_name, total_hours, valid_start_date, valid_end_date } = body;
    
    const { data, error } = await client
      .from('courses')
      .insert({
        name,
        description: description || null,
        price: price || '0',
        education_level: education_level || 'primary',
        class_name: class_name || null,
        total_hours: total_hours || 0,
        valid_start_date: valid_start_date || null,
        valid_end_date: valid_end_date || null,
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
