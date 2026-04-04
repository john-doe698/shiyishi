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
import { Plus, Search, Eye, Pencil, Trash2, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { usePermission } from '@/hooks/use-permission';

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
  planner_id?: number | null;
}

interface Planner {
  id: number;
  name: string;
  username: string;
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

// 格式化日期，只保留年月日
const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '-';
  return dateStr.split('T')[0];
};

export default function StudentsPage() {
  const { canDelete, role, userInfo } = usePermission();
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
    remark: '',
    // 课程报名相关字段
    course_id: '',
    course_total_hours: 0,  // 自定义课时数
    course_gifted_hours: 0,  // 赠送课时
    course_amount: '0',      // 自定义金额
    valid_start_date: '',    // 有效期开始日期
    valid_end_date: '',      // 有效期结束日期
  });
  
  // 报名弹窗
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [enrollingStudent, setEnrollingStudent] = useState<Student | null>(null);
  const [enrollment, setEnrollment] = useState({
    course_id: '',
    total_hours: 0,
    gifted_hours: 0,  // 赠送课时
    amount: '0',
    start_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
  });
  
  // 分配规划师弹窗
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assigningStudent, setAssigningStudent] = useState<Student | null>(null);
  const [planners, setPlanners] = useState<Planner[]>([]);
  const [selectedPlannerId, setSelectedPlannerId] = useState<string>('');

  useEffect(() => {
    fetchStudents();
    fetchCourses();
    
    // 如果是超级管理员，获取规划师列表
    if (role === 'admin') {
      fetchPlanners();
    }
    
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
      
      const response = await fetch(url, {
        headers: {
          'x-user-role': role,
          'x-user-id': userInfo?.id?.toString() || '',
        },
      });
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

  // 获取规划师列表（超级管理员使用）
  const fetchPlanners = async () => {
    try {
      const response = await fetch('/api/users?role=planner', {
        headers: {
          'x-user-role': role,
          'x-user-id': userInfo?.id?.toString() || '',
        },
      });
      const result = await response.json();
      if (result.data) {
        setPlanners(result.data);
      }
    } catch (error) {
      console.error('获取规划师列表失败:', error);
    }
  };

  // 分配规划师
  const handleAssignPlanner = async () => {
    if (!assigningStudent || !selectedPlannerId) {
      alert('请选择规划师');
      return;
    }
    
    try {
      const response = await fetch(`/api/students/${assigningStudent.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': role,
          'x-user-id': userInfo?.id?.toString() || '',
        },
        body: JSON.stringify({ 
          planner_id: parseInt(selectedPlannerId),
        }),
      });
      
      const result = await response.json();
      if (result.data) {
        setAssignDialogOpen(false);
        setAssigningStudent(null);
        setSelectedPlannerId('');
        fetchStudents();
      } else if (result.error) {
        alert(result.error);
      }
    } catch (error) {
      console.error('分配规划师失败:', error);
    }
  };

  // 选择课程时自动填充课时、价格（报名弹窗）
  const handleCourseSelect = (courseId: string) => {
    const course = courses.find(c => c.id.toString() === courseId);
    if (!course) return;
    
    // 使用课程的课时和价格作为参考值，有效期需要手动输入
    setEnrollment({
      course_id: courseId,
      total_hours: course.total_hours,
      gifted_hours: 0,
      amount: course.price,
      start_date: new Date().toISOString().split('T')[0],
      expiry_date: '',
    });
  };

  // 新学生选择课程时自动填充参考值
  const handleNewStudentCourseSelect = (courseId: string) => {
    if (!courseId) {
      // 清空课程相关字段
      setNewStudent({
        ...newStudent,
        course_id: '',
        course_total_hours: 0,
        course_gifted_hours: 0,
        course_amount: '0',
        valid_start_date: '',
        valid_end_date: '',
      });
      return;
    }
    
    const course = courses.find(c => c.id.toString() === courseId);
    if (!course) return;
    
    // 自动填充课时和价格作为参考值，有效期默认为今天开始
    setNewStudent({
      ...newStudent,
      course_id: courseId,
      course_total_hours: course.total_hours,
      course_gifted_hours: 0,
      course_amount: course.price,
      valid_start_date: new Date().toISOString().split('T')[0],
      valid_end_date: '',
    });
  };

  const handleAddStudent = async () => {
    if (!newStudent.name.trim()) {
      alert('请输入学生姓名');
      return;
    }
    if (!newStudent.course_id) {
      alert('请选择课程班次');
      return;
    }
    if (newStudent.course_total_hours <= 0) {
      alert('请输入有效的课时数');
      return;
    }
    if (!newStudent.valid_start_date || !newStudent.valid_end_date) {
      alert('请选择有效期');
      return;
    }

    try {
      // 1. 添加学生（课时由报名记录管理，初始为0）
      const response = await fetch('/api/students', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': role,
          'x-user-id': userInfo?.id?.toString() || '',
        },
        body: JSON.stringify({
          name: newStudent.name,
          phone: newStudent.phone,
          parent_name: newStudent.parent_name,
          parent_phone: newStudent.parent_phone,
          total_hours: 0, // 初始课时为0，由报名记录累加
          remark: newStudent.remark,
        }),
      });
      
      const result = await response.json();
      if (result.data) {
        const studentId = result.data.id;
        
        // 2. 创建报名记录（报名API会自动更新学生课时）
        if (newStudent.course_id && newStudent.course_total_hours > 0) {
          const enrollResponse = await fetch('/api/enrollments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              student_id: studentId,
              course_id: newStudent.course_id,
              total_hours: newStudent.course_total_hours,
              gifted_hours: newStudent.course_gifted_hours || 0,
              amount: newStudent.course_amount,
              start_date: newStudent.valid_start_date,
              expiry_date: newStudent.valid_end_date,
            }),
          });
          
          const enrollResult = await enrollResponse.json();
          if (enrollResult.error) {
            alert('学生添加成功，但报名失败：' + enrollResult.error);
          }
        }
        
        setAddDialogOpen(false);
        setNewStudent({
          name: '',
          phone: '',
          parent_name: '',
          parent_phone: '',
          remark: '',
          course_id: '',
          course_total_hours: 0,
          course_gifted_hours: 0,
          course_amount: '0',
          valid_start_date: '',
          valid_end_date: '',
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
        setEnrollment({ 
          course_id: '', 
          total_hours: 0, 
          gifted_hours: 0, 
          amount: '0', 
          start_date: new Date().toISOString().split('T')[0], 
          expiry_date: '' 
        });
        fetchStudents();
      } else if (result.error) {
        alert(result.error);
      }
    } catch (error) {
      console.error('报名失败:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!canDelete) {
      alert('权限不足：只有管理员可以删除学生');
      return;
    }
    
    if (!confirm('确定要删除这个学生吗？此操作不可恢复。')) {
      return;
    }

    try {
      const response = await fetch(`/api/students/${id}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': role,
        },
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

  const renderActions = (student: Student) => {
    // 规划师不显示操作栏
    if (!canDelete) {
      return (
        <Link href={`/students/${student.id}`}>
          <Button variant="ghost" size="icon">
            <Eye className="h-4 w-4" />
          </Button>
        </Link>
      );
    }
    
    return (
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
        {/* 超级管理员才能分配规划师 */}
        {role === 'admin' && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setAssigningStudent(student);
              setSelectedPlannerId(student.planner_id?.toString() || '');
              setAssignDialogOpen(true);
            }}
            title="分配规划师"
          >
            <UserPlus className="h-4 w-4" />
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
    );
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      const response = await fetch(`/api/students/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status,
          // 结课时清除续费提醒
          clear_reminders: status === 'finished',
        }),
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
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>添加学生</DialogTitle>
              <DialogDescription>录入新学生信息，可选择同时报名课程</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
              {/* 基本信息 */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">基本信息</h4>
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
              </div>
              
              {/* 课程报名 */}
              <div className="space-y-3 pt-2 border-t">
                <h4 className="text-sm font-medium text-muted-foreground">课程报名</h4>
                <div className="grid gap-2">
                  <Label>选择课程班次 *</Label>
                  <Select
                    value={newStudent.course_id}
                    onValueChange={handleNewStudentCourseSelect}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择课程班次" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* 小学课程 */}
                      <SelectItem value="_primary_header" disabled className="font-bold text-primary">
                        —— 小学课程 ——
                      </SelectItem>
                      {courses.filter(c => c.education_level === 'primary').map((course) => (
                        <SelectItem key={course.id} value={course.id.toString()}>
                          {course.name} {course.class_name ? `(${course.class_name})` : ''} - ¥{course.price}
                        </SelectItem>
                      ))}
                      
                      {/* 中学课程 */}
                      <SelectItem value="_middle_header" disabled className="font-bold text-primary">
                        —— 中学课程 ——
                      </SelectItem>
                      {courses.filter(c => c.education_level === 'middle').map((course) => (
                        <SelectItem key={course.id} value={course.id.toString()}>
                          {course.name} {course.class_name ? `(${course.class_name})` : ''} - ¥{course.price}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {newStudent.course_id && (
                  <>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="course_total_hours">购买课时</Label>
                        <Input
                          id="course_total_hours"
                          type="number"
                          min="1"
                          value={newStudent.course_total_hours}
                          onChange={(e) => setNewStudent({ ...newStudent, course_total_hours: parseInt(e.target.value) || 0 })}
                          placeholder="购买课时"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="course_gifted_hours">赠送课时</Label>
                        <Input
                          id="course_gifted_hours"
                          type="number"
                          min="0"
                          value={newStudent.course_gifted_hours}
                          onChange={(e) => setNewStudent({ ...newStudent, course_gifted_hours: parseInt(e.target.value) || 0 })}
                          placeholder="赠送课时"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="course_amount">金额（元）</Label>
                        <Input
                          id="course_amount"
                          type="number"
                          min="0"
                          step="0.01"
                          value={newStudent.course_amount}
                          onChange={(e) => setNewStudent({ ...newStudent, course_amount: e.target.value })}
                          placeholder="报名金额"
                        />
                      </div>
                    </div>
                    
                    {/* 显示单价计算 */}
                    {newStudent.course_total_hours > 0 && (
                      <div className="text-sm text-muted-foreground">
                        单价：¥{(Number(newStudent.course_amount) / newStudent.course_total_hours).toFixed(2)}/课时
                        {newStudent.course_gifted_hours > 0 && (
                          <span className="ml-2 text-green-600">
                            （含赠送 {newStudent.course_gifted_hours} 课时）
                          </span>
                        )}
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="valid_start_date">有效期开始</Label>
                        <Input
                          id="valid_start_date"
                          type="date"
                          value={newStudent.valid_start_date}
                          onChange={(e) => setNewStudent({ ...newStudent, valid_start_date: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="valid_end_date">有效期结束</Label>
                        <Input
                          id="valid_end_date"
                          type="date"
                          value={newStudent.valid_end_date}
                          onChange={(e) => setNewStudent({ ...newStudent, valid_end_date: e.target.value })}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              {/* 备注 */}
              <div className="grid gap-2 pt-2 border-t">
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
              <Button onClick={handleAddStudent}>
                添加并报名
              </Button>
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
                      {renderActions(student)}
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
              为学生 {enrollingStudent?.name} 报名课程
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
                  {/* 小学课程 */}
                  <SelectItem value="_primary_header" disabled className="font-bold text-primary">
                    —— 小学课程 ——
                  </SelectItem>
                  {courses.filter(c => c.education_level === 'primary').map((course) => (
                    <SelectItem key={course.id} value={course.id.toString()}>
                      {course.name} {course.class_name ? `(${course.class_name})` : ''} - ¥{course.price}
                    </SelectItem>
                  ))}
                  
                  {/* 中学课程 */}
                  <SelectItem value="_middle_header" disabled className="font-bold text-primary">
                    —— 中学课程 ——
                  </SelectItem>
                  {courses.filter(c => c.education_level === 'middle').map((course) => (
                    <SelectItem key={course.id} value={course.id.toString()}>
                      {course.name} {course.class_name ? `(${course.class_name})` : ''} - ¥{course.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {enrollment.course_id && (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="enroll_total_hours">购买课时</Label>
                    <Input
                      id="enroll_total_hours"
                      type="number"
                      min="1"
                      value={enrollment.total_hours}
                      onChange={(e) => setEnrollment({ ...enrollment, total_hours: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="enroll_gifted_hours">赠送课时</Label>
                    <Input
                      id="enroll_gifted_hours"
                      type="number"
                      min="0"
                      value={enrollment.gifted_hours}
                      onChange={(e) => setEnrollment({ ...enrollment, gifted_hours: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="enroll_amount">金额（元）</Label>
                    <Input
                      id="enroll_amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={enrollment.amount}
                      onChange={(e) => setEnrollment({ ...enrollment, amount: e.target.value })}
                    />
                  </div>
                </div>
                
                {/* 显示单价计算 */}
                {enrollment.total_hours > 0 && (
                  <div className="text-sm text-muted-foreground">
                    单价：¥{(Number(enrollment.amount) / enrollment.total_hours).toFixed(2)}/课时
                    {enrollment.gifted_hours > 0 && (
                      <span className="ml-2 text-green-600">
                        （含赠送 {enrollment.gifted_hours} 课时）
                      </span>
                    )}
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="enroll_start_date">有效期开始</Label>
                    <Input
                      id="enroll_start_date"
                      type="date"
                      value={enrollment.start_date}
                      onChange={(e) => setEnrollment({ ...enrollment, start_date: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="enroll_expiry_date">有效期结束</Label>
                    <Input
                      id="enroll_expiry_date"
                      type="date"
                      value={enrollment.expiry_date}
                      onChange={(e) => setEnrollment({ ...enrollment, expiry_date: e.target.value })}
                    />
                  </div>
                </div>
              </>
            )}
            
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

      {/* 分配规划师弹窗 */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>分配规划师</DialogTitle>
            <DialogDescription>
              将学生「{assigningStudent?.name}」分配给指定规划师
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>选择规划师</Label>
            <Select value={selectedPlannerId} onValueChange={setSelectedPlannerId}>
              <SelectTrigger>
                <SelectValue placeholder="请选择规划师" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">未分配</SelectItem>
                {planners.map((planner) => (
                  <SelectItem key={planner.id} value={planner.id.toString()}>
                    {planner.name} ({planner.username})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleAssignPlanner}>确认分配</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
