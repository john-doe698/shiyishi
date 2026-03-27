'use client';

import { useEffect, useState } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { History, TrendingUp } from 'lucide-react';

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

interface Course {
  id: number;
  name: string;
}

interface Student {
  id: number;
  name: string;
}

export default function ConsumptionsPage() {
  const [consumptions, setConsumptions] = useState<Consumption[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 筛选条件
  const [filterStudent, setFilterStudent] = useState<string>('all');
  const [filterCourse, setFilterCourse] = useState<string>('all');
  
  // 统计数据
  const [totalHours, setTotalHours] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    fetchCourses();
    fetchStudents();
    fetchConsumptions();
  }, []);

  useEffect(() => {
    fetchConsumptions();
  }, [filterStudent, filterCourse]);

  const fetchCourses = async () => {
    try {
      const response = await fetch('/api/courses');
      const result = await response.json();
      if (result.data) {
        setCourses(result.data);
      }
    } catch (error) {
      console.error('获取课程列表失败:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await fetch('/api/students');
      const result = await response.json();
      if (result.data) {
        setStudents(result.data);
      }
    } catch (error) {
      console.error('获取学生列表失败:', error);
    }
  };

  const fetchConsumptions = async () => {
    setLoading(true);
    try {
      let url = '/api/consumptions?';
      if (filterStudent !== 'all') {
        url += `student_id=${filterStudent}&`;
      }
      if (filterCourse !== 'all') {
        url += `course_id=${filterCourse}`;
      }
      
      const response = await fetch(url);
      const result = await response.json();
      if (result.data) {
        setConsumptions(result.data);
        
        // 计算统计
        const hours = result.data.reduce((sum: number, item: Consumption) => sum + item.hours, 0);
        const amount = result.data.reduce((sum: number, item: Consumption) => sum + Number(item.amount), 0);
        setTotalHours(hours);
        setTotalAmount(amount);
      }
    } catch (error) {
      console.error('获取消课记录失败:', error);
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">消课记录</h2>
        <p className="text-muted-foreground">查看课时消耗明细和消费金额</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总消耗课时</CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHours}</div>
            <p className="text-xs text-muted-foreground">
              共 {consumptions.length} 条消课记录
            </p>
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
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            消课明细
          </CardTitle>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2">
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
        </CardContent>
      </Card>
    </div>
  );
}
