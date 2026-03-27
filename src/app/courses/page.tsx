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
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2, BookOpen } from 'lucide-react';

interface Course {
  id: number;
  name: string;
  description: string | null;
  price: string;
  status: string;
  created_at: string;
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 添加课程弹窗
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newCourse, setNewCourse] = useState({
    name: '',
    description: '',
    price: '0',
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
        }),
      });
      
      const result = await response.json();
      if (result.data) {
        setAddDialogOpen(false);
        setNewCourse({ name: '', description: '', price: '0' });
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">课程管理</h2>
          <p className="text-muted-foreground">管理课程信息和价格</p>
        </div>
        
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              添加课程
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>添加课程</DialogTitle>
              <DialogDescription>创建新课程</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">课程名称 *</Label>
                <Input
                  id="name"
                  value={newCourse.name}
                  onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                  placeholder="请输入课程名称"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="price">课时价格（元）</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={newCourse.price}
                  onChange={(e) => setNewCourse({ ...newCourse, price: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">课程描述</Label>
                <Textarea
                  id="description"
                  value={newCourse.description}
                  onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                  placeholder="课程描述"
                />
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
                  <TableHead>课程描述</TableHead>
                  <TableHead className="text-center">课时价格</TableHead>
                  <TableHead className="text-center">状态</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell className="font-medium">{course.name}</TableCell>
                    <TableCell>{course.description || '-'}</TableCell>
                    <TableCell className="text-center">¥{course.price}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={course.status === 'active' ? 'default' : 'secondary'}>
                        {course.status === 'active' ? '开课中' : '已停课'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(course.created_at).toLocaleDateString('zh-CN')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {course.status === 'active' ? (
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
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(course.id)}
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
    </div>
  );
}
