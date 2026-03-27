'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Eye, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface Student {
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
}

interface Course {
  id: number;
  name: string;
  price: string;
  education_level: string;
  class_name: string | null;
  total_hours: number;
  valid_months: number;
}

const EDUCATION_LEVEL_MAP: Record<string, string> = {
  primary: '小学',
  middle: '中学',
};

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // 添加学生弹窗
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newStudent, setNewStudent] = useState({
    name: '',
    phone: '',
    parent_name: '',
    parent_phone: '',
    total_hours: 0,
    remark: '',
  });
  
  // 报名弹窗
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [enrollingStudent, setEnrollingStudent] = useState<Student | null>(null);
  const [enrollment, setEnrollment] = useState({
    course_id: '',
    total_hours: 0,
    amount: '0',
    start_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
  });

  useEffect(() => {
    fetchStudents();
    fetchCourses();
    
    // 检查 URL 参数，是否打开添加弹窗
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'add') {
      setAddDialogOpen(true);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [statusFilter]);

  const fetchStudents = async () => {
    try {
      let url = '/api/students?';
      if (statusFilter !== 'all') {
        url += `status=${statusFilter}`;
      }
      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }
      
      const response = await fetch(url);
      const result = await response.json();
      if (result.data) {
        setStudents(result.data);
      }
    } catch (error) {
      console.error('获取学生列表失败:', error);
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

  // 计算到期日期
  const calculateExpiryDate = (months: number): string => {
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    return date.toISOString().split('T')[0];
  };

  // 选择课程时自动计算课时和到期日期
  const handleCourseSelect = (courseId: string) => {
    const course = courses.find(c => c.id.toString() === courseId);
    if (!course) return;
    
    // 使用课程自定义的课时和有效期
    const hours = course.total_hours;
    const amount = (Number(course.price) * hours).toFixed(2);
    const expiryDate = calculateExpiryDate(course.valid_months);
    const startDate = new Date().toISOString().split('T')[0];
    
    setEnrollment({
      course_id: courseId,
      total_hours: hours,
      amount,
      start_date: startDate,
      expiry_date: expiryDate,
    });
  };

  const handleAddStudent = async () => {
    if (!newStudent.name.trim()) {
      alert('请输入学生姓名');
      return;
    }

    try {
      const response = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStudent),
      });
      
      const result = await response.json();
      if (result.data) {
        setAddDialogOpen(false);
        setNewStudent({
          name: '',
          phone: '',
          parent_name: '',
          parent_phone: '',
          total_hours: 0,
          remark: '',
        });
        fetchStudents();
      } else if (result.error) {
        alert(result.error);
      }
    } catch (error) {
      console.error('添加学生失败:', error);
    }
  };

  const handleEnroll = async () => {
    if (!enrollment.course_id) {
      alert('请选择课程');
      return;
    }
    if (enrollment.total_hours <= 0) {
      alert('请输入有效的课时数');
      return;
    }

    try {
      const response = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: enrollingStudent?.id,
          ...enrollment,
        }),
      });
      
      const result = await response.json();
      if (result.data) {
        setEnrollDialogOpen(false);
        setEnrollingStudent(null);
        setEnrollment({ course_id: '', total_hours: 0, amount: '0', start_date: new Date().toISOString().split('T')[0], expiry_date: '' });
        fetchStudents();
      } else if (result.error) {
        alert(result.error);
      }
    } catch (error) {
      console.error('报名失败:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个学生吗？此操作不可恢复。')) {
      return;
    }

    try {
      const response = await fetch(`/api/students/${id}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      if (result.success) {
        fetchStudents();
      } else if (result.error) {
        alert(result.error);
      }
    } catch (error) {
      console.error('删除学生失败:', error);
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      const response = await fetch(`/api/students/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      
      const result = await response.json();
      if (result.data) {
        fetchStudents();
      } else if (result.error) {
        alert(result.error);
      }
    } catch (error) {
      console.error('更新状态失败:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">学生管理</h2>
          <p className="text-muted-foreground">管理学生信息、报名和课时</p>
        </div>
        
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              添加学生
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>添加学生</DialogTitle>
              <DialogDescription>录入新学生信息</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">学生姓名 *</Label>
                <Input
                  id="name"
                  value={newStudent.name}
                  onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                  placeholder="请输入学生姓名"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">联系电话</Label>
                <Input
                  id="phone"
                  value={newStudent.phone}
                  onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })}
                  placeholder="请输入联系电话"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="parent_name">家长姓名</Label>
                <Input
                  id="parent_name"
                  value={newStudent.parent_name}
                  onChange={(e) => setNewStudent({ ...newStudent, parent_name: e.target.value })}
                  placeholder="请输入家长姓名"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="parent_phone">家长电话</Label>
                <Input
                  id="parent_phone"
                  value={newStudent.parent_phone}
                  onChange={(e) => setNewStudent({ ...newStudent, parent_phone: e.target.value })}
                  placeholder="请输入家长电话"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="total_hours">初始课时</Label>
                <Input
                  id="total_hours"
                  type="number"
                  min="0"
                  value={newStudent.total_hours}
                  onChange={(e) => setNewStudent({ ...newStudent, total_hours: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="remark">备注</Label>
                <Textarea
                  id="remark"
                  value={newStudent.remark}
                  onChange={(e) => setNewStudent({ ...newStudent, remark: e.target.value })}
                  placeholder="备注信息"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleAddStudent}>确认添加</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索学生姓名、电话..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchStudents()}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="状态筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="active">在读</SelectItem>
                <SelectItem value="finished">已结课</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchStudents}>
              搜索
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : students.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">暂无学生数据</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>姓名</TableHead>
                  <TableHead>联系电话</TableHead>
                  <TableHead>家长姓名</TableHead>
                  <TableHead>家长电话</TableHead>
                  <TableHead className="text-center">总课时</TableHead>
                  <TableHead className="text-center">剩余课时</TableHead>
                  <TableHead className="text-center">状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>{student.phone || '-'}</TableCell>
                    <TableCell>{student.parent_name || '-'}</TableCell>
                    <TableCell>{student.parent_phone || '-'}</TableCell>
                    <TableCell className="text-center">{student.total_hours}</TableCell>
                    <TableCell className="text-center">
                      <span className={student.remaining_hours <= 6 ? 'text-red-500 font-bold' : ''}>
                        {student.remaining_hours}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={student.status === 'active' ? 'default' : 'secondary'}>
                        {student.status === 'active' ? '在读' : '已结课'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/students/${student.id}`}>
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEnrollingStudent(student);
                            setEnrollDialogOpen(true);
                          }}
                          title="报名课程"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        {student.status === 'active' ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleUpdateStatus(student.id, 'finished')}
                            title="标记结课"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleUpdateStatus(student.id, 'active')}
                            title="恢复在读"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(student.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
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

      {/* 报名弹窗 */}
      <Dialog open={enrollDialogOpen} onOpenChange={setEnrollDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>课程报名</DialogTitle>
            <DialogDescription>
              为学生 {enrollingStudent?.name} 报名课程（课时和到期日期自动计算）
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>选择课程班次 *</Label>
              <Select
                value={enrollment.course_id}
                onValueChange={handleCourseSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择课程班次" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id.toString()}>
                      {course.name} - {EDUCATION_LEVEL_MAP[course.education_level] || ''} {course.class_name ? `(${course.class_name})` : ''} ({course.total_hours}课时/{course.valid_months}个月)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {enrollment.course_id && (
              <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
                <p><strong>课时数量：</strong>{enrollment.total_hours} 课时</p>
                <p><strong>有效期：</strong>{enrollment.start_date} 至 {enrollment.expiry_date}</p>
                <p><strong>课时价格：</strong>¥{courses.find(c => c.id.toString() === enrollment.course_id)?.price}/课时</p>
              </div>
            )}
            
            <div className="grid gap-2">
              <Label>金额（元）</Label>
              <Input value={enrollment.amount} disabled />
            </div>
            
            <div className="grid gap-2">
              <Label>备注</Label>
              <Textarea
                placeholder="备注信息（可选）"
                onChange={(e) => {
                  // 可以扩展添加备注功能
                }}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEnrollDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleEnroll}>确认报名</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
