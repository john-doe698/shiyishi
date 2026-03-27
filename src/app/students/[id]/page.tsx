'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, User, Clock, BookOpen } from 'lucide-react';

interface StudentDetail {
  id: number;
  name: string;
  phone: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  status: string;
  total_hours: number;
  remaining_hours: number;
  remark: string | null;
  created_at: string;
  enrollments: Array<{
    id: number;
    total_hours: number;
    remaining_hours: number;
    amount: string;
    status: string;
    expiry_date: string | null;
    created_at: string;
    courses: {
      id: number;
      name: string;
      price: string;
      education_level: string;
      class_name: string | null;
    } | null;
  }>;
  check_ins: Array<{
    id: number;
    check_in_time: string;
    hours: number;
    status: string;
    remark: string | null;
    courses: {
      id: number;
      name: string;
    } | null;
  }>;
}

const EDUCATION_LEVEL_MAP: Record<string, string> = {
  primary: '小学',
  middle: '中学',
};

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudent();
  }, [params.id]);

  const fetchStudent = async () => {
    try {
      const response = await fetch(`/api/students/${params.id}`);
      const result = await response.json();
      if (result.data) {
        setStudent(result.data);
      }
    } catch (error) {
      console.error('获取学生详情失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusText = (status: string) => {
    const map: Record<string, string> = {
      checked_in: '已签到',
      leave: '请假',
      absent: '缺勤',
    };
    return map[status] || status;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">学生不存在</p>
        <Button className="mt-4" onClick={() => router.push('/students')}>
          返回列表
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/students')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{student.name}</h2>
          <p className="text-muted-foreground">学生详情</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总课时</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{student.total_hours}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">剩余课时</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{student.remaining_hours}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">状态</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge variant={student.status === 'active' ? 'default' : 'secondary'}>
              {student.status === 'active' ? '在读' : '已结课'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            基本信息
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm text-muted-foreground">学生姓名</label>
              <p className="font-medium">{student.name}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">联系电话</label>
              <p className="font-medium">{student.phone || '-'}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">家长姓名</label>
              <p className="font-medium">{student.parent_name || '-'}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">家长电话</label>
              <p className="font-medium">{student.parent_phone || '-'}</p>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-muted-foreground">备注</label>
              <p className="font-medium">{student.remark || '-'}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">注册时间</label>
              <p className="font-medium">{formatDate(student.created_at)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            报名记录
          </CardTitle>
        </CardHeader>
        <CardContent>
          {student.enrollments.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">暂无报名记录</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>课程</TableHead>
                  <TableHead className="text-center">班次名称</TableHead>
                  <TableHead className="text-center">购买课时</TableHead>
                  <TableHead className="text-center">剩余课时</TableHead>
                  <TableHead className="text-center">金额</TableHead>
                  <TableHead className="text-center">到期日期</TableHead>
                  <TableHead className="text-center">状态</TableHead>
                  <TableHead>报名时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {student.enrollments.map((enrollment) => (
                  <TableRow key={enrollment.id}>
                    <TableCell className="font-medium">
                      {enrollment.courses?.name || '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">
                        {EDUCATION_LEVEL_MAP[enrollment.courses?.education_level as keyof typeof EDUCATION_LEVEL_MAP] || ''} 
                        {enrollment.courses?.class_name ? ` ${enrollment.courses.class_name}` : ''}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{enrollment.total_hours}</TableCell>
                    <TableCell className="text-center">{enrollment.remaining_hours}</TableCell>
                    <TableCell className="text-center">¥{enrollment.amount}</TableCell>
                    <TableCell className="text-center">
                      {enrollment.expiry_date ? formatDate(enrollment.expiry_date).split(' ')[0] : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={enrollment.status === 'active' ? 'default' : 'secondary'}>
                        {enrollment.status === 'active' ? '有效' : '已过期'}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(enrollment.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            签到记录
          </CardTitle>
        </CardHeader>
        <CardContent>
          {student.check_ins.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">暂无签到记录</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>课程</TableHead>
                  <TableHead className="text-center">签到时间</TableHead>
                  <TableHead className="text-center">课时</TableHead>
                  <TableHead className="text-center">状态</TableHead>
                  <TableHead>备注</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {student.check_ins.slice(0, 20).map((checkIn) => (
                  <TableRow key={checkIn.id}>
                    <TableCell className="font-medium">
                      {checkIn.courses?.name || '-'}
                    </TableCell>
                    <TableCell className="text-center">{formatDate(checkIn.check_in_time)}</TableCell>
                    <TableCell className="text-center">{checkIn.hours}</TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={
                          checkIn.status === 'checked_in'
                            ? 'default'
                            : checkIn.status === 'leave'
                            ? 'secondary'
                            : 'destructive'
                        }
                      >
                        {getStatusText(checkIn.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>{checkIn.remark || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
