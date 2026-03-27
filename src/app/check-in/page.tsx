'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Calendar } from 'lucide-react';

interface Student {
  id: number;
  name: string;
  remaining_hours: number;
  status: string;
}

interface Course {
  id: number;
  name: string;
  price: string;
}

interface CheckIn {
  id: number;
  student_id: number;
  course_id: number;
  check_in_time: string;
  hours: number;
  status: string;
  remark: string | null;
  students: {
    id: number;
    name: string;
  } | null;
  courses: {
    id: number;
    name: string;
  } | null;
}

export default function CheckInPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 筛选条件
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterCourse, setFilterCourse] = useState<string>('all');
  
  // 签到弹窗
  const [checkInDialogOpen, setCheckInDialogOpen] = useState(false);
  const [newCheckIn, setNewCheckIn] = useState({
    student_id: '',
    course_id: '',
    hours: 1,
    status: 'checked_in',
    remark: '',
  });

  useEffect(() => {
    fetchStudents();
    fetchCourses();
    fetchCheckIns();
  }, []);

  useEffect(() => {
    fetchCheckIns();
  }, [filterDate, filterCourse]);

  const fetchStudents = async () => {
    try {
      const response = await fetch('/api/students?status=active');
      const result = await response.json();
      if (result.data) {
        setStudents(result.data);
      }
    } catch (error) {
      console.error('获取学生列表失败:', error);
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

  const fetchCheckIns = async () => {
    setLoading(true);
    try {
      let url = `/api/check-ins?date=${filterDate}`;
      if (filterCourse !== 'all') {
        url += `&course_id=${filterCourse}`;
      }
      
      const response = await fetch(url);
      const result = await response.json();
      if (result.data) {
        setCheckIns(result.data);
      }
    } catch (error) {
      console.error('获取签到记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!newCheckIn.student_id) {
      alert('请选择学生');
      return;
    }
    if (!newCheckIn.course_id) {
      alert('请选择课程');
      return;
    }

    try {
      const response = await fetch('/api/check-ins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: parseInt(newCheckIn.student_id),
          course_id: parseInt(newCheckIn.course_id),
          hours: newCheckIn.hours,
          status: newCheckIn.status,
          remark: newCheckIn.remark || null,
        }),
      });
      
      const result = await response.json();
      if (result.data) {
        setCheckInDialogOpen(false);
        setNewCheckIn({
          student_id: '',
          course_id: '',
          hours: 1,
          status: 'checked_in',
          remark: '',
        });
        fetchCheckIns();
        fetchStudents(); // 刷新学生列表以更新剩余课时
      } else if (result.error) {
        alert(result.error);
      }
    } catch (error) {
      console.error('签到失败:', error);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('zh-CN', {
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

  const getStatusBadgeVariant = (status: string) => {
    if (status === 'checked_in') return 'default';
    if (status === 'leave') return 'secondary';
    return 'destructive';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">签到管理</h2>
          <p className="text-muted-foreground">记录学生上课签到</p>
        </div>
        
        <Dialog open={checkInDialogOpen} onOpenChange={setCheckInDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              学生签到
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>学生签到</DialogTitle>
              <DialogDescription>记录学生上课签到</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>选择学生 *</Label>
                <Select
                  value={newCheckIn.student_id}
                  onValueChange={(value) => setNewCheckIn({ ...newCheckIn, student_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="请选择学生" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id.toString()}>
                        {student.name} (剩余: {student.remaining_hours}课时)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>选择课程 *</Label>
                <Select
                  value={newCheckIn.course_id}
                  onValueChange={(value) => setNewCheckIn({ ...newCheckIn, course_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="请选择课程" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id.toString()}>
                        {course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>消耗课时</Label>
                <Input
                  type="number"
                  min="1"
                  value={newCheckIn.hours}
                  onChange={(e) => setNewCheckIn({ ...newCheckIn, hours: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="grid gap-2">
                <Label>状态</Label>
                <Select
                  value={newCheckIn.status}
                  onValueChange={(value) => setNewCheckIn({ ...newCheckIn, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checked_in">正常签到</SelectItem>
                    <SelectItem value="leave">请假</SelectItem>
                    <SelectItem value="absent">缺勤</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>备注</Label>
                <Textarea
                  value={newCheckIn.remark}
                  onChange={(e) => setNewCheckIn({ ...newCheckIn, remark: e.target.value })}
                  placeholder="备注信息"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCheckInDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleCheckIn}>确认签到</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            签到记录
          </CardTitle>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <Label>日期</Label>
              <Input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label>课程</Label>
              <Select value={filterCourse} onValueChange={setFilterCourse}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="全部课程" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部课程</SelectItem>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id.toString()}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : checkIns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {filterDate} 暂无签到记录
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>学生</TableHead>
                  <TableHead>课程</TableHead>
                  <TableHead className="text-center">签到时间</TableHead>
                  <TableHead className="text-center">课时</TableHead>
                  <TableHead className="text-center">状态</TableHead>
                  <TableHead>备注</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checkIns.map((checkIn) => (
                  <TableRow key={checkIn.id}>
                    <TableCell className="font-medium">
                      {checkIn.students?.name || '-'}
                    </TableCell>
                    <TableCell>{checkIn.courses?.name || '-'}</TableCell>
                    <TableCell className="text-center">
                      {formatTime(checkIn.check_in_time)}
                    </TableCell>
                    <TableCell className="text-center">{checkIn.hours}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={getStatusBadgeVariant(checkIn.status)}>
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
