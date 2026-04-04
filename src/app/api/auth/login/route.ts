import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

const supabase = getSupabaseClient();

// 简单的密码加密函数
function simpleHash(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

// 初始化默认账号
async function initDefaultUsers() {
  // 检查是否已初始化
  const { data: existingUsers } = await supabase
    .from('users')
    .select('username')
    .in('username', ['admin', 'manager']);

  const existingUsernames = existingUsers?.map(u => u.username) || [];

  // 创建超级管理员
  if (!existingUsernames.includes('admin')) {
    await supabase
      .from('users')
      .insert({
        username: 'admin',
        password: simpleHash('admin123'),
        name: '超级管理员',
        role: 'admin',
        status: 'active',
      });
  }

  // 创建管理员（无删除权限）
  if (!existingUsernames.includes('manager')) {
    await supabase
      .from('users')
      .insert({
        username: 'manager',
        password: simpleHash('manager123'),
        name: '管理员',
        role: 'manager',
        status: 'active',
      });
  }
}

// 登录验证
export async function POST(request: NextRequest) {
  try {
    // 确保默认账号存在
    await initDefaultUsers();

    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: '用户名和密码不能为空' }, { status: 400 });
    }

    const hashedPassword = simpleHash(password);

    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, name, role, status, permissions')
      .eq('username', username)
      .eq('password', hashedPassword)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
    }

    if (user.status !== 'active') {
      return NextResponse.json({ error: '账号已被禁用' }, { status: 403 });
    }

    // 返回用户信息（不包含密码）
    return NextResponse.json({
      data: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        permissions: user.permissions || null,
      },
    });
  } catch (error) {
    console.error('登录失败:', error);
    return NextResponse.json({ error: '登录失败' }, { status: 500 });
  }
}
