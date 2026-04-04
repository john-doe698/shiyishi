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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { History, TrendingUp, Pencil, Trash2 } from 'lucide-react';
import { usePermission } from '@/hooks/use-permission';

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
  const { role, userInfo, isLoggedIn } = usePermission();
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
  
  // 编辑弹窗
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editConsumption, setEditConsumption] = useState<Consumption | null>(null);
  const [editData, setEditData] = useState({
    student_id: '',
    course_id: '',
    hours: 1,
    remark: '',
  });
  const [saving, setSaving] = useState(false);
  
  // 删除确认弹窗
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConsumption, setDeleteConsumption] = useState<Consumption | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 通用请求头
  const getAuthHeaders = () => ({
    'x-user-role': role,
    'x-user-id': userInfo?.id?.toString() || '',
  });

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
      const response = await fetch('/api/courses', {
        headers: getAuthHeaders(),
      });
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
      const response = await fetch('/api/students', {
        headers: getAuthHeaders(),
      });
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
      
      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });
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

  const handleEdit = (consumption: Consumption) => {
    if (!consumption.check_in_id) {
      alert('该消课记录没有关联的签到记录，无法修改');
      return;
    }
    
    setEditConsumption(consumption);
    setEditData({
      student_id: consumption.student_id.toString(),
      course_id: consumption.course_id.toString(),
      hours: consumption.hours,
      remark: consumption.remark || '',
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editConsumption || !editConsumption.check_in_id) return;
    
    if (!editData.student_id || !editData.course_id || editData.hours < 1) {
      alert('请填写完整信息');
      return;
    }
    
    setSaving(true);
    try {
      const response = await fetch(`/api/check-ins/${editConsumption.check_in_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          student_id: parseInt(editData.student_id),
          course_id: parseInt(editData.course_id),
          hours: editData.hours,
          remark: editData.remark,
        }),
      });
      
      const result = await response.json();
      
      if (result.data) {
        setEditDialogOpen(false);
        fetchConsumptions();
        alert('修改成功');
      } else {
        alert(result.error || '修改失败');
      }
    } catch (error) {
      console.error('修改失败:', error);
      alert('修改失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (consumption: Consumption) => {
    if (!consumption.check_in_id) {
      alert('该消课记录没有关联的签到记录，无法删除');
      return;
    }
    
    setDeleteConsumption(consumption);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConsumption || !deleteConsumption.check_in_id) return;
    
    setDeleting(true);
    try {
      const response = await fetch(`/api/check-ins/${deleteConsumption.check_in_id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setDeleteDialogOpen(false);
        fetchConsumptions();
        alert('删除成功，已恢复课时');
      } else {
        alert(result.error || '删除失败');
      }
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败');
    } finally {
      setDeleting(false);
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

  // 检查是否有编辑或删除权限（登录用户都有权限）
  const canEdit = isLoggedIn && (role === 'admin' || role === 'manager' || role === 'planner');

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
                  {canEdit && <TableHead className="text-center">操作</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {consumptions.slice(0, 100).map((consumption) => (
                  <TableRow key={consumption.id}>
                    <TableCell className="font-medium">
                      {canEdit ? (
                        <button
                          className="text-primary hover:underline cursor-pointer"
                          onClick={() => handleEdit(consumption)}
                          title="点击修改签到消课记录"
                        >
                          {consumption.students?.name || '-'}
                        </button>
                      ) : (
                        <span>{consumption.students?.name || '-'}</span>
                      )}
                    </TableCell>
                    <TableCell>{consumption.courses?.name || '-'}</TableCell>
                    <TableCell className="text-center">{consumption.hours}</TableCell>
                    <TableCell className="text-center">¥{consumption.amount}</TableCell>
                    <TableCell>{consumption.remark || '-'}</TableCell>
                    <TableCell>{formatDateTime(consumption.created_at)}</TableCell>
                    {canEdit && (
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(consumption)}
                            title="修改"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(consumption)}
                            title="撤销签到（恢复课时）"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 编辑弹窗 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>修改签到消课记录</DialogTitle>
            <DialogDescription>
              修改学生、课程或课时数，系统会自动重新计算课时和金额
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>学生</Label>
              <Select
                value={editData.student_id}
                onValueChange={(value) => setEditData({ ...editData, student_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择学生" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id.toString()}>
                      {student.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label>课程</Label>
              <Select
                value={editData.course_id}
                onValueChange={(value) => setEditData({ ...editData, course_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择课程" />
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
                min={1}
                value={editData.hours}
                onChange={(e) => setEditData({ ...editData, hours: parseInt(e.target.value) || 1 })}
              />
            </div>
            
            <div className="grid gap-2">
              <Label>备注</Label>
              <Textarea
                value={editData.remark}
                onChange={(e) => setEditData({ ...editData, remark: e.target.value })}
                placeholder="可选"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>撤销签到</DialogTitle>
            <DialogDescription>
              确定要撤销此签到记录吗？系统将自动恢复学生的课时。
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">学生：</span>
                <span className="font-medium">{deleteConsumption?.students?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">课程：</span>
                <span className="font-medium">{deleteConsumption?.courses?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">消耗课时：</span>
                <span className="font-medium">{deleteConsumption?.hours} 节</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">消费金额：</span>
                <span className="font-medium">¥{deleteConsumption?.amount}</span>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleting}>
              {deleting ? '删除中...' : '确认撤销'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
