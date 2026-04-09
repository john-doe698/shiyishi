import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

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

// 检查是否有管理用户的权限
function canManageUsers(role: string | null): boolean {
  return role === 'admin' || role === 'manager';
}

// 获取用户详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await getSupabaseClient();
  try {
    const { id } = await params;
    const role = request.headers.get('x-user-role');
    const currentUserId = request.headers.get('x-user-id');
    
    // admin/manager可以查看其他用户，或者用户可以查看自己
    if (!canManageUsers(role) && currentUserId !== id) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('users')
      .select('id, username, name, role, status, permissions, created_at, updated_at')
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('获取用户详情失败:', error);
    return NextResponse.json({ error: '获取用户详情失败' }, { status: 500 });
  }
}

// 更新用户
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await getSupabaseClient();
  try {
    const { id } = await params;
    const role = request.headers.get('x-user-role');
    const currentUserId = request.headers.get('x-user-id');
    const body = await request.json();
    const { name, password, status, role: newRole, permissions } = body;

    // 获取目标用户信息
    const { data: targetUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', id)
      .single();

    // 构建更新对象
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    // 权限检查
    const isSelf = currentUserId === id;
    const isAdmin = role === 'admin';
    const isManager = role === 'manager';
    const targetIsPlanner = targetUser?.role === 'planner';

    // 修改名字：用户自己可以改，admin可以改任何人，manager只能改planner
    if (name !== undefined) {
      if (isSelf || isAdmin || (isManager && targetIsPlanner)) {
        updateData.name = name;
      } else {
        return NextResponse.json({ error: '权限不足' }, { status: 403 });
      }
    }

    // 修改密码：用户自己可以改（通过密码修改功能），admin可以重置任何人，manager只能重置planner
    if (password) {
      if (isSelf || isAdmin || (isManager && targetIsPlanner)) {
        updateData.password = simpleHash(password);
      } else {
        return NextResponse.json({ error: '权限不足：无法修改此用户的密码' }, { status: 403 });
      }
    }

    // 修改状态：只有admin可以修改
    if (status !== undefined && isAdmin) {
      updateData.status = status;
    }

    // 修改角色：只有admin可以修改
    if (newRole !== undefined && isAdmin) {
      updateData.role = newRole;
    }

    // 修改权限：只有admin可以修改
    if (permissions !== undefined && isAdmin) {
      updateData.permissions = permissions;
    }

    // 如果没有任何更新，返回错误
    if (Object.keys(updateData).length <= 1) {
      return NextResponse.json({ error: '没有可更新的内容' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select('id, username, name, role, status, permissions, created_at, updated_at')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('更新用户失败:', error);
    return NextResponse.json({ error: '更新用户失败' }, { status: 500 });
  }
}

// 删除用户（仅admin）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await getSupabaseClient();
  try {
    const { id } = await params;
    const role = request.headers.get('x-user-role');
    const currentUserId = request.headers.get('x-user-id');
    
    if (role !== 'admin') {
      return NextResponse.json({ error: '权限不足：只有超级管理员可以删除用户' }, { status: 403 });
    }

    // 不能删除自己
    if (currentUserId === id) {
      return NextResponse.json({ error: '不能删除自己的账号' }, { status: 400 });
    }

    // 检查是否是最后一个admin
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', id)
      .single();

    if (user?.role === 'admin') {
      const { count } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin');

      if (count && count <= 1) {
        return NextResponse.json({ error: '不能删除最后一个超级管理员账号' }, { status: 400 });
      }
    }

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除用户失败:', error);
    return NextResponse.json({ error: '删除用户失败' }, { status: 500 });
  }
}
