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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Calendar, History, TrendingUp, Clock } from 'lucide-react';

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

interface EnrolledCourse {
  id: number;
  remaining_hours: number;
  remaining_purchased: number;
  remaining_gifted: number;
  total_hours: number;
  gifted_hours: number;
  amount: string;
  expiry_date: string | null;
  courses: {
    id: number;
    name: string;
    price: string;
  } | null;
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
    price: string;
  } | null;
}

interface Consumption {
  id: number;
  student_id: number;
  course_id: number;
  check_in_id: number | null;
  hours: number;
  amount: string;
  remark: string | null;
  created_at: string;
  students: {
    id: number;
    name: string;
  } | null;
  courses: {
    id: number;
    name: string;
    price: string;
  } | null;
}

export default function CheckInPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [consumptions, setConsumptions] = useState<Consumption[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 筛选条件
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterCourse, setFilterCourse] = useState<string>('all');
  const [filterStudent, setFilterStudent] = useState<string>('all');
  
  // 签到弹窗
  const [checkInDialogOpen, setCheckInDialogOpen] = useState(false);
  const [newCheckIn, setNewCheckIn] = useState({
    student_id: '',
    course_id: '',
    hours: 1,
    status: 'checked_in',
    remark: '',
  });
  
  // 统计数据
  const [totalHours, setTotalHours] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    fetchStudents();
    fetchCourses();
    fetchData();
  }, []);

  useEffect(() => {
    fetchData();
  }, [filterDate, filterCourse, filterStudent]);

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

  // 获取学生已报名的课程
  const fetchEnrolledCourses = async (studentId: string) => {
    if (!studentId) {
      setEnrolledCourses([]);
      return;
    }
    try {
      const response = await fetch(`/api/students/enrolled-courses?student_id=${studentId}`);
      const result = await response.json();
      if (result.data) {
        setEnrolledCourses(result.data);
      } else {
        setEnrolledCourses([]);
      }
    } catch (error) {
      console.error('获取已报名课程失败:', error);
      setEnrolledCourses([]);
    }
  };

  // 选择学生时获取已报名课程
  const handleStudentSelect = async (studentId: string) => {
    setNewCheckIn({
      ...newCheckIn,
      student_id: studentId,
      course_id: '', // 清空课程选择
    });
    await fetchEnrolledCourses(studentId);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // 获取签到记录
      let checkInUrl = `/api/check-ins?date=${filterDate}`;
      if (filterCourse !== 'all') {
        checkInUrl += `&course_id=${filterCourse}`;
      }
      
      const checkInResponse = await fetch(checkInUrl);
      const checkInResult = await checkInResponse.json();
      if (checkInResult.data) {
        setCheckIns(checkInResult.data);
      }

      // 获取消课记录
      let consumptionUrl = '/api/consumptions?';
      if (filterStudent !== 'all') {
        consumptionUrl += `student_id=${filterStudent}&`;
      }
      if (filterCourse !== 'all') {
        consumptionUrl += `course_id=${filterCourse}`;
      }
      
      const consumptionResponse = await fetch(consumptionUrl);
      const consumptionResult = await consumptionResponse.json();
      if (consumptionResult.data) {
        setConsumptions(consumptionResult.data);
        
        // 计算统计
        const hours = consumptionResult.data.reduce((sum: number, item: Consumption) => sum + item.hours, 0);
        const amount = consumptionResult.data.reduce((sum: number, item: Consumption) => sum + Number(item.amount), 0);
        setTotalHours(hours);
        setTotalAmount(amount);
      }
    } catch (error) {
      console.error('获取数据失败:', error);
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
        setEnrolledCourses([]);
        fetchData();
        fetchStudents();
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

  const formatDateTime = (dateString: string) => {
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

  const getStatusBadgeVariant = (status: string) => {
    if (status === 'checked_in') return 'default';
    if (status === 'leave') return 'secondary';
    return 'destructive';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">签到与消课管理</h2>
          <p className="text-muted-foreground">记录学生上课签到，查看课时消耗明细</p>
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
              <DialogDescription>记录学生上课签到，签到后自动扣减课时并生成消课记录</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>选择学生 *</Label>
                <Select
                  value={newCheckIn.student_id}
                  onValueChange={handleStudentSelect}
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
                  disabled={!newCheckIn.student_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={newCheckIn.student_id ? "请选择课程" : "请先选择学生"} />
                  </SelectTrigger>
                  <SelectContent>
                    {enrolledCourses.length > 0 ? (
                      enrolledCourses
                        .filter((enrollment) => enrollment.courses?.id)
                        .map((enrollment) => (
                          <SelectItem key={enrollment.courses!.id} value={enrollment.courses!.id.toString()}>
                            {enrollment.courses!.name} 
                            (剩余: {enrollment.remaining_hours}课时
                            {enrollment.remaining_gifted > 0 && ` [含赠送${enrollment.remaining_gifted}课时]`})
                          </SelectItem>
                        ))
                    ) : (
                      <div className="px-2 py-4 text-center text-muted-foreground text-sm">
                        该学生暂无已报名的课程
                      </div>
                    )}
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

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今日签到</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{checkIns.length}</div>
            <p className="text-xs text-muted-foreground">{filterDate}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今日消耗课时</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {checkIns.filter(c => c.status === 'checked_in').reduce((sum, c) => sum + c.hours, 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总消耗课时</CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHours}</div>
            <p className="text-xs text-muted-foreground">按筛选条件统计</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总消费金额</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{totalAmount.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">按筛选条件统计</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
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
          <Tabs defaultValue="checkin">
            <TabsList className="mb-4">
              <TabsTrigger value="checkin">签到记录</TabsTrigger>
              <TabsTrigger value="consumption">消课记录</TabsTrigger>
            </TabsList>
            
            <TabsContent value="checkin">
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
            </TabsContent>
            
            <TabsContent value="consumption">
              <div className="flex items-center gap-2 mb-4">
                <Label>学生</Label>
                <Select value={filterStudent} onValueChange={setFilterStudent}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="全部学生" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部学生</SelectItem>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id.toString()}>
                        {student.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">加载中...</div>
              ) : consumptions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">暂无消课记录</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>学生</TableHead>
                      <TableHead>课程</TableHead>
                      <TableHead className="text-center">消耗课时</TableHead>
                      <TableHead className="text-center">消费金额</TableHead>
                      <TableHead>备注</TableHead>
                      <TableHead>消课时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consumptions.slice(0, 100).map((consumption) => (
                      <TableRow key={consumption.id}>
                        <TableCell className="font-medium">
                          {consumption.students?.name || '-'}
                        </TableCell>
                        <TableCell>{consumption.courses?.name || '-'}</TableCell>
                        <TableCell className="text-center">{consumption.hours}</TableCell>
                        <TableCell className="text-center">¥{consumption.amount}</TableCell>
                        <TableCell>{consumption.remark || '-'}</TableCell>
                        <TableCell>{formatDateTime(consumption.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
