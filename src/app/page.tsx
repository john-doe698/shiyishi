'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Calendar, BookOpen, Clock, TrendingUp } from 'lucide-react';

interface Stats {
  totalStudents: number;
  todayCheckIns: number;
  totalCourses: number;
  monthTotalHours: number;
  monthTotalAmount: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats');
      const result = await response.json();
      if (result.data) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('获取统计数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">控制台</h2>
        <p className="text-muted-foreground">欢迎使用教育管理系统</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">在籍学生</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalStudents || 0}</div>
            <p className="text-xs text-muted-foreground">当前在读学生数量</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今日签到</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.todayCheckIns || 0}</div>
            <p className="text-xs text-muted-foreground">今日签到人次</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">开设课程</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalCourses || 0}</div>
            <p className="text-xs text-muted-foreground">当前开设课程数量</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">本月消课</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.monthTotalHours || 0}</div>
            <p className="text-xs text-muted-foreground">课时 / {stats?.monthTotalAmount || 0} 元</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              快捷操作
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <a
              href="/students?action=add"
              className="block p-3 rounded-lg border hover:bg-muted transition-colors"
            >
              <div className="font-medium">学生报名</div>
              <div className="text-sm text-muted-foreground">录入新学生信息并选择课程</div>
            </a>
            <a
              href="/check-in"
              className="block p-3 rounded-lg border hover:bg-muted transition-colors"
            >
              <div className="font-medium">学生签到</div>
              <div className="text-sm text-muted-foreground">记录学生上课签到</div>
            </a>
            <a
              href="/courses"
              className="block p-3 rounded-lg border hover:bg-muted transition-colors"
            >
              <div className="font-medium">课程管理</div>
              <div className="text-sm text-muted-foreground">管理课程信息和价格</div>
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>系统说明</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>本系统支持以下功能：</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>学生管理</strong>：录入学生信息、查看学生详情、管理学生状态</li>
              <li><strong>课程管理</strong>：创建课程、设置课时价格</li>
              <li><strong>签到管理</strong>：学生签到、自动扣减课时</li>
              <li><strong>消课记录</strong>：查看课时消耗明细和消费金额</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
