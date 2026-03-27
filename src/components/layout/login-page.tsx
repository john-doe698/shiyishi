'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePermission, ADMIN_CREDENTIALS } from '@/hooks/use-permission';
import { Shield, User } from 'lucide-react';

export function LoginPage() {
  const { login } = usePermission();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(username, password)) {
      // 登录成功
    } else {
      setError('账号或密码错误');
    }
  };

  const handlePlannerLogin = () => {
    login('', ''); // 规划师无需密码
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">教育管理系统</CardTitle>
          <CardDescription>请选择登录方式</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 管理员登录 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-medium">
              <Shield className="h-5 w-5 text-primary" />
              <span>管理员登录</span>
            </div>
            <form onSubmit={handleAdminLogin} className="space-y-3">
              <div className="grid gap-2">
                <Label htmlFor="username">账号</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="请输入管理员账号"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">密码</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full">
                管理员登录
              </Button>
            </form>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">或者</span>
            </div>
          </div>

          {/* 规划师登录 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-medium">
              <User className="h-5 w-5 text-muted-foreground" />
              <span>规划师登录</span>
            </div>
            <Button variant="outline" className="w-full" onClick={handlePlannerLogin}>
              规划师快速登录
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              规划师无需密码，可直接登录使用系统
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
