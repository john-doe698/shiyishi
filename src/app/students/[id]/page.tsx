'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, User, Clock, BookOpen, Calendar, RefreshCw, Pencil } from 'lucide-react';

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
    start_date: string | null;
    expiry_date: string | null;
    status: string;
    remark: string | null;
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

interface Course {
  id: number;
  name: string;
  price: string;
  education_level: string;
  class_name: string | null;
  total_hours: number;
}

const EDUCATION_LEVEL_MAP: Record<string, string> = {
  primary: '小学',
  middle: '中学',
};

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // 修改有效期弹窗
  const [editExpiryDialogOpen, setEditExpiryDialogOpen] = useState(false);
  const [editingEnrollment, setEditingEnrollment] = useState<StudentDetail['enrollments'][0] | null>(null);
  const [editExpiryData, setEditExpiryData] = useState({
    start_date: '',
    expiry_date: '',
  });

  // 续费弹窗
  const [renewDialogOpen, setRenewDialogOpen] = useState(false);
  const [renewingEnrollment, setRenewingEnrollment] = useState<StudentDetail['enrollments'][0] | null>(null);
  const [renewData, setRenewData] = useState({
    course_id: '',
    total_hours: 0,
    amount: '0',
    valid_start_date: '',
    valid_end_date: '',
  });

  useEffect(() => {
    fetchStudent();
    fetchCourses();
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

  const fetchCourses = async () => {
    try {
      const response = await fetch('/api/courses?status=active');
      const result = await response.json();
      if (result.data) {
        setCourses(result.data);
      }
    } catch (error) {
      console.error('获取课程列表失败:', error);
    }
  };

  // 打开修改有效期弹窗
  const openEditExpiryDialog = (enrollment: StudentDetail['enrollments'][0]) => {
    setEditingEnrollment(enrollment);
    setEditExpiryData({
      start_date: enrollment.start_date ? enrollment.start_date.split('T')[0] : '',
      expiry_date: enrollment.expiry_date ? enrollment.expiry_date.split('T')[0] : '',
    });
    setEditExpiryDialogOpen(true);
  };

  // 保存有效期修改
  const handleSaveExpiry = async () => {
    if (!editingEnrollment) return;

    try {
      const response = await fetch(`/api/enrollments/${editingEnrollment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_date: editExpiryData.start_date ? new Date(editExpiryData.start_date).toISOString() : null,
          expiry_date: editExpiryData.expiry_date ? new Date(editExpiryData.expiry_date).toISOString() : null,
        }),
      });

      const result = await response.json();
      if (result.data) {
        setEditExpiryDialogOpen(false);
        fetchStudent();
      } else if (result.error) {
        alert(result.error);
      }
    } catch (error) {
      console.error('修改有效期失败:', error);
    }
  };

  // 打开续费弹窗
  const openRenewDialog = (enrollment: StudentDetail['enrollments'][0]) => {
    setRenewingEnrollment(enrollment);
    // 默认选择相同的课程
    const course = courses.find(c => c.id === enrollment.courses?.id);
    if (course) {
      setRenewData({
        course_id: course.id.toString(),
        total_hours: course.total_hours,
        amount: course.price, // 直接使用课程价格（总价格）
        valid_start_date: new Date().toISOString().split('T')[0],
        valid_end_date: '',
      });
    } else {
      setRenewData({
        course_id: '',
        total_hours: 0,
        amount: '0',
        valid_start_date: new Date().toISOString().split('T')[0],
        valid_end_date: '',
      });
    }
    setRenewDialogOpen(true);
  };

  // 选择续费课程时自动填充参考值
  const handleRenewCourseSelect = (courseId: string) => {
    const course = courses.find(c => c.id.toString() === courseId);
    if (course) {
      setRenewData({
        course_id: courseId,
        total_hours: course.total_hours,
        amount: course.price, // 直接使用课程价格（总价格）
        valid_start_date: new Date().toISOString().split('T')[0],
        valid_end_date: '',
      });
    }
  };

  // 确认续费
  const handleRenew = async () => {
    if (!student || !renewData.course_id) {
      alert('请选择课程');
      return;
    }
    if (renewData.total_hours <= 0) {
      alert('请输入有效的课时数');
      return;
    }
    if (!renewData.valid_start_date || !renewData.valid_end_date) {
      alert('请选择有效期');
      return;
    }

    try {
      const response = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: student.id,
          course_id: parseInt(renewData.course_id),
          total_hours: renewData.total_hours,
          amount: renewData.amount,
          start_date: renewData.valid_start_date,
          expiry_date: renewData.valid_end_date,
        }),
      });

      const result = await response.json();
      if (result.data) {
        setRenewDialogOpen(false);
        fetchStudent();
      } else if (result.error) {
        alert(result.error);
      }
    } catch (error) {
      console.error('续费失败:', error);
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

  const formatDateShort = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/students')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{student.name}</h2>
            <p className="text-muted-foreground">学生详情</p>
          </div>
        </div>
        
        <Button onClick={() => openRenewDialog(student.enrollments[0] || { id: 0, courses: null } as any)}>
          <RefreshCw className="mr-2 h-4 w-4" />
          续费
        </Button>
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
                  <TableHead className="text-center">有效期</TableHead>
                  <TableHead className="text-center">状态</TableHead>
                  <TableHead className="text-center">操作</TableHead>
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
                      <div className="text-xs">
                        {formatDateShort(enrollment.start_date)} 至 {formatDateShort(enrollment.expiry_date)}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={enrollment.status === 'active' ? 'default' : 'secondary'}>
                        {enrollment.status === 'active' ? '有效' : '已过期'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditExpiryDialog(enrollment)}
                          title="修改有效期"
                        >
                          <Calendar className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openRenewDialog(enrollment)}
                          title="续费"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
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

      {/* 修改有效期弹窗 */}
      <Dialog open={editExpiryDialogOpen} onOpenChange={setEditExpiryDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>修改有效期</DialogTitle>
            <DialogDescription>
              修改报名记录的有效期日期范围
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>开始日期</Label>
              <Input
                type="date"
                value={editExpiryData.start_date}
                onChange={(e) => setEditExpiryData({ ...editExpiryData, start_date: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>到期日期</Label>
              <Input
                type="date"
                value={editExpiryData.expiry_date}
                onChange={(e) => setEditExpiryData({ ...editExpiryData, expiry_date: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditExpiryDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveExpiry}>保存</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 续费弹窗 */}
      <Dialog open={renewDialogOpen} onOpenChange={setRenewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>续费课程</DialogTitle>
            <DialogDescription>
              为学生 {student?.name} 续费课程
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>选择课程班次 *</Label>
              <Select
                value={renewData.course_id}
                onValueChange={handleRenewCourseSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择课程班次" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id.toString()}>
                      {course.name} - {EDUCATION_LEVEL_MAP[course.education_level as keyof typeof EDUCATION_LEVEL_MAP] || ''} {course.class_name ? `(${course.class_name})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {renewData.course_id && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="renew_total_hours">课时数</Label>
                    <Input
                      id="renew_total_hours"
                      type="number"
                      min="1"
                      value={renewData.total_hours}
                      onChange={(e) => setRenewData({ ...renewData, total_hours: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="renew_amount">金额（元）</Label>
                    <Input
                      id="renew_amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={renewData.amount}
                      onChange={(e) => setRenewData({ ...renewData, amount: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="renew_start_date">有效期开始</Label>
                    <Input
                      id="renew_start_date"
                      type="date"
                      value={renewData.valid_start_date}
                      onChange={(e) => setRenewData({ ...renewData, valid_start_date: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="renew_end_date">有效期结束</Label>
                    <Input
                      id="renew_end_date"
                      type="date"
                      value={renewData.valid_end_date}
                      onChange={(e) => setRenewData({ ...renewData, valid_end_date: e.target.value })}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRenewDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleRenew}>确认续费</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
