import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { fetchClient, ApiError } from '../../api/client';
import { DataTable, Column } from '../../components/DataTable';
import { Modal } from '../../components/Modal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Plus, Edit2, Trash2 } from 'lucide-react';

const courseSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  title: z.string().min(1, 'Title is required'),
  credit_hours: z.coerce.number().min(1).max(6),
  department: z.string().min(1, 'Department is required'),
  status: z.enum(['active', 'inactive']).default('active'),
});
type CourseForm = z.infer<typeof courseSchema>;

interface Course extends CourseForm {
  id: string;
  created_at: string;
}

export default function Courses() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['courses', page, pageSize, search],
    queryFn: () => fetchClient<any>(`/admin/courses?page=${page}&page_size=${pageSize}${search ? `&q=${encodeURIComponent(search)}` : ''}`)
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CourseForm>({
    resolver: zodResolver(courseSchema)
  });

  const openModal = (course?: Course) => {
    setFormError('');
    if (course) {
      setEditingCourse(course);
      reset(course);
    } else {
      setEditingCourse(null);
      reset({ status: 'active', credit_hours: 3 });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCourse(null);
  };

  const mutation = useMutation({
    mutationFn: async (formData: CourseForm) => {
      if (editingCourse) {
        return fetchClient(`/admin/courses/${editingCourse.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
      } else {
        return fetchClient('/admin/courses', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      closeModal();
    },
    onError: (error: ApiError) => {
      setFormError(error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetchClient(`/admin/courses/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      setDeleteId(null);
    },
    onError: (error: ApiError) => {
      alert(error.message);
      setDeleteId(null);
    }
  });

  const onSubmit = (data: CourseForm) => {
    mutation.mutate(data);
  };

  const columns: Column<Course>[] = [
    { key: 'code', header: 'Code', render: (c) => <span className="font-semibold text-primary bg-primary/10 px-2 py-1 rounded">{c.code}</span> },
    { key: 'title', header: 'Title' },
    { key: 'department', header: 'Department' },
    { key: 'credit_hours', header: 'CH', render: (c) => <span className="text-gray-600 bg-gray-100 px-2 py-1 rounded-full text-xs font-semibold">{c.credit_hours}</span> },
    { 
      key: 'status', 
      header: 'Status',
      render: (c) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
          {c.status}
        </span>
      )
    },
  ];

  const actions = (row: Course) => (
    <div className="flex justify-end gap-2">
      <button onClick={() => openModal(row)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
        <Edit2 size={18} />
      </button>
      <button onClick={() => setDeleteId(row.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
        <Trash2 size={18} />
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Courses</h1>
          <p className="text-sm text-gray-500 mt-1">Manage academic courses.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium flex items-center shadow-sm hover-lift"
        >
          <Plus size={18} className="mr-2" />
          Add Course
        </button>
      </div>

      <DataTable
        columns={columns}
        data={data?.items || []}
        total={data?.total || 0}
        page={page}
        pageSize={pageSize}
        isLoading={isLoading || isFetching}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onSearch={setSearch}
        searchPlaceholder="Search courses..."
        actions={actions}
      />

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingCourse ? "Edit Course" : "Add Course"}>
        {formError && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm border border-red-200">{formError}</div>}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Code</label>
              <input {...register('code')} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none uppercase" />
              {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input {...register('title')} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" />
              {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Department</label>
              <input {...register('department')} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" />
              {errors.department && <p className="text-red-500 text-xs mt-1">{errors.department.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Credit Hours (1-6)</label>
              <input type="number" {...register('credit_hours')} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" />
              {errors.credit_hours && <p className="text-red-500 text-xs mt-1">{errors.credit_hours.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select {...register('status')} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex justify-end pt-4 gap-3">
            <button type="button" onClick={closeModal} className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50">
              {isSubmitting ? 'Saving...' : 'Save Course'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete Course"
        message="Are you sure you want to delete this course? This action is permanent and will only succeed if the course is not assigned to students or exam slots."
        isConfirming={deleteMutation.isPending}
      />
    </div>
  );
}
