import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

const supabase = getSupabaseClient();

// 简单的密码加密函数（生产环境应使用 bcrypt）
function simpleHash(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

// 检查是否有管理用户的权限
function canManageUsers(role: string | null): boolean {
  return role === 'admin' || role === 'manager';
}

// 获取用户列表（admin和manager可访问）
export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role');
    
    if (!canManageUsers(role)) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    // 获取查询参数中的 role 过滤
    const { searchParams } = new URL(request.url);
    const roleFilter = searchParams.get('role');

    let query = supabase
      .from('users')
      .select('id, username, name, role, status, permissions, created_at, updated_at')
      .order('created_at', { ascending: false });

    // 如果有 role 参数，进行过滤
    if (roleFilter) {
      query = query.eq('role', roleFilter);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    return NextResponse.json({ error: '获取用户列表失败' }, { status: 500 });
  }
}

// 创建用户（admin和manager可创建）
export async function POST(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role');
    
    if (!canManageUsers(role)) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const body = await request.json();
    const { username, password, name, role: userRole = 'planner' } = body;

    if (!username || !password || !name) {
      return NextResponse.json({ error: '用户名、密码和显示名称不能为空' }, { status: 400 });
    }

    // manager只能创建planner
    if (role === 'manager' && userRole !== 'planner') {
      return NextResponse.json({ error: '权限不足：只能创建规划师账号' }, { status: 403 });
    }

    // 检查用户名是否已存在
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUser) {
      return NextResponse.json({ error: '用户名已存在' }, { status: 400 });
    }

    // 加密密码
    const hashedPassword = simpleHash(password);

    const { data, error } = await supabase
      .from('users')
      .insert({
        username,
        password: hashedPassword,
        name,
        role: userRole,
        status: 'active',
      })
      .select('id, username, name, role, status, created_at')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('创建用户失败:', error);
    return NextResponse.json({ error: '创建用户失败' }, { status: 500 });
  }
}
