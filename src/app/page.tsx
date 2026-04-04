'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Calendar, BookOpen, Clock, TrendingUp, AlertTriangle, BellRing } from 'lucide-react';
import Link from 'next/link';
import { usePermission } from '@/hooks/use-permission';

interface Stats {
  totalStudents: number;
  todayCheckIns: number;
  totalCourses: number;
  monthTotalHours: number;
  monthTotalAmount: number;
}

interface ExpiringEnrollment {
  id: number;
  total_hours: number;
  remaining_hours: number;
  amount: string;
  expiry_date: string;
  students: {
    id: number;
    name: string;
    phone: string | null;
    parent_name: string | null;
    parent_phone: string | null;
  } | null;
  courses: {
    id: number;
    name: string;
    price: string;
  } | null;
}

interface LowHoursStudent {
  id: number;
  name: string;
  phone: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  remaining_hours: number;
}

interface ExpiredEnrollment {
  id: number;
  total_hours: number;
  remaining_hours: number;
  expiry_date: string;
  students: {
    id: number;
    name: string;
    phone: string | null;
  } | null;
  courses: {
    id: number;
    name: string;
  } | null;
}

export default function DashboardPage() {
  const { role, userInfo } = usePermission();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  
  // 续费提醒
  const [expiringEnrollments, setExpiringEnrollments] = useState<ExpiringEnrollment[]>([]);
  const [lowHoursStudents, setLowHoursStudents] = useState<LowHoursStudent[]>([]);
  const [expiredEnrollments, setExpiredEnrollments] = useState<ExpiredEnrollment[]>([]);

  useEffect(() => {
    fetchStats();
    fetchReminders();
  }, [role, userInfo]);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats', {
        headers: {
          'x-user-role': role,
          'x-user-id': userInfo?.id?.toString() || '',
        },
      });
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

  const fetchReminders = async () => {
    try {
      const response = await fetch('/api/reminders?days=7', {
        headers: {
          'x-user-role': role,
          'x-user-id': userInfo?.id?.toString() || '',
        },
      });
      const result = await response.json();
      if (result.data) {
        setExpiringEnrollments(result.data.expiringEnrollments || []);
        setLowHoursStudents(result.data.lowHoursStudents || []);
        setExpiredEnrollments(result.data.expiredEnrollments || []);
      }
    } catch (error) {
      console.error('获取续费提醒失败:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const getDaysUntilExpiry = (expiryDate: string) => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  const hasReminders = expiringEnrollments.length > 0 || lowHoursStudents.length > 0 || expiredEnrollments.length > 0;

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

      {/* 续费提醒模块 */}
      {hasReminders && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <BellRing className="h-5 w-5" />
              续费提醒
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 已过期 */}
            {expiredEnrollments.length > 0 && (
              <div>
                <h4 className="font-medium text-red-600 mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  已过期 ({expiredEnrollments.length})
                </h4>
                <div className="space-y-2">
                  {expiredEnrollments.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2 bg-red-50 rounded border border-red-200">
                      <div>
                        <span className="font-medium">{item.students?.name || '-'}</span>
                        <span className="text-muted-foreground mx-2">|</span>
                        <span>{item.courses?.name || '-'}</span>
                        <span className="text-muted-foreground mx-2">|</span>
                        <span className="text-red-600">剩余 {item.remaining_hours} 课时已过期</span>
                      </div>
                      <Link href={`/students/${item.students?.id}`}>
                        <Button variant="outline" size="sm">查看</Button>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 即将到期 */}
            {expiringEnrollments.length > 0 && (
              <div>
                <h4 className="font-medium text-orange-600 mb-2">即将到期 ({expiringEnrollments.length})</h4>
                <div className="space-y-2">
                  {expiringEnrollments.slice(0, 5).map((item) => {
                    const daysLeft = getDaysUntilExpiry(item.expiry_date);
                    return (
                      <div key={item.id} className="flex items-center justify-between p-2 bg-orange-50 rounded border border-orange-200">
                        <div>
                          <span className="font-medium">{item.students?.name || '-'}</span>
                          <span className="text-muted-foreground mx-2">|</span>
                          <span>{item.courses?.name || '-'}</span>
                          <span className="text-muted-foreground mx-2">|</span>
                          <span className="text-orange-600">{daysLeft} 天后到期</span>
                          <span className="text-muted-foreground mx-2">|</span>
                          <span>剩余 {item.remaining_hours} 课时</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.students?.parent_phone && (
                            <a href={`tel:${item.students.parent_phone}`} className="text-sm text-blue-600 hover:underline">
                              联系家长
                            </a>
                          )}
                          <Link href={`/students/${item.students?.id}`}>
                            <Button variant="outline" size="sm">查看</Button>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 课时不足 */}
            {lowHoursStudents.length > 0 && (
              <div>
                <h4 className="font-medium text-yellow-600 mb-2">课时不足（≤6课时）({lowHoursStudents.length})</h4>
                <div className="space-y-2">
                  {lowHoursStudents.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2 bg-yellow-50 rounded border border-yellow-200">
                      <div>
                        <span className="font-medium">{item.name}</span>
                        <span className="text-muted-foreground mx-2">|</span>
                        <Badge variant="destructive">剩余 {item.remaining_hours} 课时</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.parent_phone && (
                          <a href={`tel:${item.parent_phone}`} className="text-sm text-blue-600 hover:underline">
                            联系家长
                          </a>
                        )}
                        <Link href={`/students/${item.id}`}>
                          <Button variant="outline" size="sm">续费</Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
              <li><strong>续费提醒</strong>：即将到期、已过期、课时不足提醒</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
