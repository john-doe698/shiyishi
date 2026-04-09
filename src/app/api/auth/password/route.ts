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

// 修改密码
export async function PUT(request: NextRequest) {
  const supabase = await getSupabaseClient();
  try {
    const body = await request.json();
    const { user_id, old_password, new_password } = body;

    if (!user_id || !old_password || !new_password) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 });
    }

    if (new_password.length < 6) {
      return NextResponse.json({ error: '新密码长度不能少于6位' }, { status: 400 });
    }

    // 验证旧密码
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('id, password')
      .eq('id', user_id)
      .single();

    if (fetchError || !user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    const hashedOldPassword = simpleHash(old_password);
    if (user.password !== hashedOldPassword) {
      return NextResponse.json({ error: '旧密码错误' }, { status: 400 });
    }

    // 更新密码
    const hashedNewPassword = simpleHash(new_password);
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password: hashedNewPassword,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user_id);

    if (updateError) {
      return NextResponse.json({ error: '修改密码失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: '密码修改成功' });
  } catch (error) {
    console.error('修改密码失败:', error);
    return NextResponse.json({ error: '修改密码失败' }, { status: 500 });
  }
}
