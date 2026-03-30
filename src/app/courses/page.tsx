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
import { Plus, Pencil, Trash2, BookOpen, Users } from 'lucide-react';
import { usePermission } from '@/hooks/use-permission';

interface Course {
  id: number;
  name: string;
  description: string | null;
  price: string;
  education_level: string;
  class_name: string | null;
  total_hours: number;
  valid_start_date: string | null;
  valid_end_date: string | null;
  status: string;
  created_at: string;
  student_names?: string[];
  student_count?: number;
}

const EDUCATION_LEVEL_MAP: Record<string, string> = {
  primary: '小学',
  middle: '中学',
};

export default function CoursesPage() {
  const { canEditCourse, canDelete } = usePermission();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 添加课程弹窗
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newCourse, setNewCourse] = useState({
    name: '',
    description: '',
    price: '0',
    education_level: 'primary',
    class_name: '',
    total_hours: 22,
    valid_start_date: '',
    valid_end_date: '',
  });

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await fetch('/api/courses');
      const result = await response.json();
      if (result.data) {
        setCourses(result.data);
      }
    } catch (error) {
      console.error('获取课程列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCourse = async () => {
    if (!newCourse.name.trim()) {
      alert('请输入课程名称');
      return;
    }

    try {
      const response = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCourse.name,
          description: newCourse.description || null,
          price: newCourse.price || '0',
          education_level: newCourse.education_level,
          class_name: newCourse.class_name || null,
          total_hours: newCourse.total_hours || 0,
          valid_start_date: newCourse.valid_start_date || null,
          valid_end_date: newCourse.valid_end_date || null,
        }),
      });
      
      const result = await response.json();
      if (result.data) {
        setAddDialogOpen(false);
        setNewCourse({
          name: '',
          description: '',
          price: '0',
          education_level: 'primary',
          class_name: '',
          total_hours: 22,
          valid_start_date: '',
          valid_end_date: '',
        });
        fetchCourses();
      } else if (result.error) {
        alert(result.error);
      }
    } catch (error) {
      console.error('添加课程失败:', error);
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      const response = await fetch(`/api/courses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      
      const result = await response.json();
      if (result.data) {
        fetchCourses();
      } else if (result.error) {
        alert(result.error);
      }
    } catch (error) {
      console.error('更新状态失败:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个课程吗？此操作不可恢复。')) {
      return;
    }

    try {
      const response = await fetch(`/api/courses/${id}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      if (result.success) {
        fetchCourses();
      } else if (result.error) {
        alert(result.error);
      }
    } catch (error) {
      console.error('删除课程失败:', error);
    }
  };

  // 格式化日期显示
  const formatValidDate = (startDate: string | null, endDate: string | null) => {
    if (!startDate && !endDate) return '-';
    const start = startDate ? new Date(startDate).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '';
    const end = endDate ? new Date(endDate).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '';
    if (start && end) return `${start} 至 ${end}`;
    if (start) return `${start} 起`;
    if (end) return `至 ${end}`;
    return '-';
  };

  // 判断是否显示操作列
  const showActions = canEditCourse || canDelete;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">课程管理</h2>
          <p className="text-muted-foreground">管理课程信息和班次设置</p>
        </div>
        
        {canEditCourse && (
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                添加课程
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>添加课程</DialogTitle>
                <DialogDescription>创建新课程，自定义班次名称、课时和有效期</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">课程名称 *</Label>
                  <Input
                    id="name"
                    value={newCourse.name}
                    onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                    placeholder="如：数学、英语、全科"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>学段</Label>
                    <Select
                      value={newCourse.education_level}
                      onValueChange={(value) => setNewCourse({ ...newCourse, education_level: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="primary">小学</SelectItem>
                        <SelectItem value="middle">中学</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="class_name">班次名称</Label>
                    <Input
                      id="class_name"
                      value={newCourse.class_name}
                      onChange={(e) => setNewCourse({ ...newCourse, class_name: e.target.value })}
                      placeholder="如：周中班、周末季卡"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="total_hours">课时数</Label>
                    <Input
                      id="total_hours"
                      type="number"
                      min="1"
                      value={newCourse.total_hours}
                      onChange={(e) => setNewCourse({ ...newCourse, total_hours: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="price">价格（元）</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={newCourse.price}
                      onChange={(e) => setNewCourse({ ...newCourse, price: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="valid_start_date">有效期开始</Label>
                    <Input
                      id="valid_start_date"
                      type="date"
                      value={newCourse.valid_start_date}
                      onChange={(e) => setNewCourse({ ...newCourse, valid_start_date: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="valid_end_date">有效期结束</Label>
                    <Input
                      id="valid_end_date"
                      type="date"
                      value={newCourse.valid_end_date}
                      onChange={(e) => setNewCourse({ ...newCourse, valid_end_date: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="description">课程描述</Label>
                  <Textarea
                    id="description"
                    value={newCourse.description}
                    onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                    placeholder="课程描述（可选）"
                  />
                </div>
                
                {/* 预览 */}
                <div className="p-3 bg-muted rounded-lg text-sm">
                  <p className="font-medium mb-2">报名时将自动填充：</p>
                  <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                    <p>课时：{newCourse.total_hours} 课时</p>
                    <p>价格：¥{newCourse.price}</p>
                    <p className="col-span-2">有效期：{formatValidDate(newCourse.valid_start_date, newCourse.valid_end_date)}</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleAddCourse}>确认添加</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            课程列表
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : courses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">暂无课程数据</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>课程名称</TableHead>
                  <TableHead className="text-center">学段</TableHead>
                  <TableHead className="text-center">班次名称</TableHead>
                  <TableHead className="text-center">课时</TableHead>
                  <TableHead className="text-center">价格</TableHead>
                  <TableHead>有效期</TableHead>
                  <TableHead className="text-center">在读学生</TableHead>
                  <TableHead className="text-center">状态</TableHead>
                  {showActions && <TableHead className="text-right">操作</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell className="font-medium">{course.name}</TableCell>
                    <TableCell className="text-center">
                      {EDUCATION_LEVEL_MAP[course.education_level as keyof typeof EDUCATION_LEVEL_MAP] || course.education_level}
                    </TableCell>
                    <TableCell className="text-center">
                      {course.class_name ? (
                        <Badge variant="outline">{course.class_name}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">{course.total_hours}</TableCell>
                    <TableCell className="text-center">¥{course.price}</TableCell>
                    <TableCell className="text-sm">
                      {formatValidDate(course.valid_start_date, course.valid_end_date)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>{course.student_count || 0}</span>
                        </div>
                        {course.student_names && course.student_names.length > 0 && (
                          <div className="text-xs text-muted-foreground max-w-32 truncate" title={course.student_names.join('、')}>
                            {course.student_names.slice(0, 3).join('、')}
                            {course.student_names.length > 3 && ` +${course.student_names.length - 3}`}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={course.status === 'active' ? 'default' : 'secondary'}>
                        {course.status === 'active' ? '开课中' : '已停课'}
                      </Badge>
                    </TableCell>
                    {showActions && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {canEditCourse && (
                            course.status === 'active' ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleUpdateStatus(course.id, 'inactive')}
                                title="停课"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleUpdateStatus(course.id, 'active')}
                                title="恢复开课"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(course.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
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
    </div>
  );
}
