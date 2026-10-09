import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { fetchClient, ApiError } from '../../api/client';
import { DataTable, Column } from '../../components/DataTable';
import { Modal } from '../../components/Modal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Plus, Edit2, Trash2, Mail } from 'lucide-react';

const studentSchema = z.object({
  personal: z.object({
    full_name: z.string().min(1, 'Name required'),
    email: z.string().email('Invalid email'),
    phone: z.string().min(1, 'Phone required'),
    cnic_or_bform: z.string().min(1, 'CNIC/B-Form required'),
    date_of_birth: z.string().min(1, 'Date of birth required'),
    gender: z.enum(['male', 'female', 'other']),
    address: z.string().min(1, 'Address required'),
  }),
  guardian: z.object({
    father_or_guardian_name: z.string().min(1, 'Name required'),
    guardian_cnic: z.string().min(1, 'CNIC required'),
    guardian_occupation: z.string().min(1, 'Occupation required'),
    guardian_contact: z.string().min(1, 'Contact required'),
    emergency_contact: z.string().min(1, 'Emergency contact required'),
  }),
  academic: z.object({
    registration_no: z.string().min(1, 'Registration No required'),
    program: z.string().min(1, 'Program required'),
    semester: z.coerce.number().min(1).max(12),
    session_batch: z.string().min(1, 'Session Batch required'),
    previous_qualification: z.string().min(1, 'Previous qualification required'),
    previous_institute: z.string().min(1, 'Previous institute required'),
    marks_or_cgpa: z.coerce.number().min(0),
    branch_id: z.string().uuid().nullable().optional(),
  })
});
type StudentForm = z.infer<typeof studentSchema>;

export default function Students() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');

  const { data: branchesData } = useQuery({
    queryKey: ['branches', 1, 100, ''],
    queryFn: () => fetchClient<any>(`/admin/branches?page=1&page_size=100`)
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['students', page, pageSize, search],
    queryFn: () => fetchClient<any>(`/admin/students?page=${page}&page_size=${pageSize}${search ? `&q=${encodeURIComponent(search)}` : ''}`)
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<StudentForm>({
    resolver: zodResolver(studentSchema)
  });

  const openModal = (student?: any) => {
    setFormError('');
    if (student) {
      setEditingStudent(student);
      reset({
        personal: {
          full_name: student.full_name,
          email: student.email,
          phone: student.phone,
          cnic_or_bform: student.cnic_or_bform,
          date_of_birth: student.date_of_birth,
          gender: student.gender,
          address: student.address,
        },
        guardian: {
          father_or_guardian_name: student.father_or_guardian_name,
          guardian_cnic: student.guardian_cnic,
          guardian_occupation: student.guardian_occupation,
          guardian_contact: student.guardian_contact,
          emergency_contact: student.emergency_contact,
        },
        academic: {
          registration_no: student.registration_no,
          program: student.program,
          semester: student.semester,
          session_batch: student.session_batch,
          previous_qualification: student.previous_qualification,
          previous_institute: student.previous_institute,
          marks_or_cgpa: student.marks_or_cgpa,
          branch_id: student.branch_id,
        }
      });
    } else {
      setEditingStudent(null);
      reset({ personal: { gender: 'male' }, academic: { semester: 1 } });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingStudent(null);
  };

  const mutation = useMutation({
    mutationFn: async (formData: StudentForm) => {
      if (editingStudent) {
        // Flatten for update according to our API spec
        const updateData = {
          ...formData.personal,
          ...formData.guardian,
          ...formData.academic
        };
        return fetchClient(`/admin/students/${editingStudent.id}`, {
          method: 'PUT',
          body: JSON.stringify(updateData)
        });
      } else {
        return fetchClient('/admin/students', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      closeModal();
    },
    onError: (error: ApiError) => {
      setFormError(error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetchClient(`/admin/students/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setDeleteId(null);
    },
    onError: (error: ApiError) => {
      alert(error.message);
      setDeleteId(null);
    }
  });

  const resendEmailMutation = useMutation({
    mutationFn: (id: string) => fetchClient(`/admin/students/${id}/resend-setup-email`, { method: 'POST' }),
    onSuccess: () => alert("Setup email resent successfully!"),
    onError: (error: ApiError) => alert(error.message)
  });

  const onSubmit = (data: StudentForm) => {
    mutation.mutate(data);
  };

  const columns: Column<any>[] = [
    { key: 'registration_no', header: 'Reg No', render: (s) => <span className="font-semibold text-primary">{s.registration_no}</span> },
    { key: 'full_name', header: 'Name' },
    { key: 'email', header: 'Email' },
    { key: 'program', header: 'Program', render: (s) => <span className="bg-gray-100 px-2 py-1 rounded text-xs">{s.program} - Sem {s.semester}</span> },
  ];

  const actions = (row: any) => (
    <div className="flex justify-end gap-2">
      <button onClick={() => resendEmailMutation.mutate(row.id)} title="Resend setup email" className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors">
        <Mail size={18} />
      </button>
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
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-sm text-gray-500 mt-1">Manage university students.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium flex items-center shadow-sm hover-lift"
        >
          <Plus size={18} className="mr-2" />
          Add Student
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
        searchPlaceholder="Search students..."
        actions={actions}
      />

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingStudent ? "Edit Student" : "Add Student"} maxWidth="max-w-4xl">
        {formError && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm border border-red-200">{formError}</div>}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Personal Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700 border-b pb-2">Personal</h3>
              <div>
                <label className="block text-xs font-medium mb-1">Full Name</label>
                <input {...register('personal.full_name')} className="w-full p-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Email</label>
                <input type="email" {...register('personal.email')} className="w-full p-2 border rounded-lg text-sm" disabled={!!editingStudent} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Phone</label>
                <input {...register('personal.phone')} className="w-full p-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">CNIC/B-Form</label>
                <input {...register('personal.cnic_or_bform')} className="w-full p-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">DOB (YYYY-MM-DD)</label>
                <input type="date" {...register('personal.date_of_birth')} className="w-full p-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Gender</label>
                <select {...register('personal.gender')} className="w-full p-2 border rounded-lg text-sm">
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Address</label>
                <input {...register('personal.address')} className="w-full p-2 border rounded-lg text-sm" />
              </div>
            </div>

            {/* Guardian Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700 border-b pb-2">Guardian</h3>
              <div>
                <label className="block text-xs font-medium mb-1">Guardian Name</label>
                <input {...register('guardian.father_or_guardian_name')} className="w-full p-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Guardian CNIC</label>
                <input {...register('guardian.guardian_cnic')} className="w-full p-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Occupation</label>
                <input {...register('guardian.guardian_occupation')} className="w-full p-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Contact</label>
                <input {...register('guardian.guardian_contact')} className="w-full p-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Emergency Contact</label>
                <input {...register('guardian.emergency_contact')} className="w-full p-2 border rounded-lg text-sm" />
              </div>
            </div>

            {/* Academic Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700 border-b pb-2">Academic</h3>
              <div>
                <label className="block text-xs font-medium mb-1">Registration No</label>
                <input {...register('academic.registration_no')} className="w-full p-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Program</label>
                <input {...register('academic.program')} className="w-full p-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Semester (1-12)</label>
                <input type="number" {...register('academic.semester')} className="w-full p-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Session Batch</label>
                <input {...register('academic.session_batch')} className="w-full p-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Prev Qualification</label>
                <input {...register('academic.previous_qualification')} className="w-full p-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Prev Institute</label>
                <input {...register('academic.previous_institute')} className="w-full p-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Marks/CGPA</label>
                <input type="number" step="0.01" {...register('academic.marks_or_cgpa')} className="w-full p-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Branch</label>
                <select {...register('academic.branch_id')} className="w-full p-2 border rounded-lg text-sm">
                  <option value="">Select Branch</option>
                  {branchesData?.items?.map((b: any) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
          </div>

          <div className="flex justify-end pt-4 gap-3 border-t">
            <button type="button" onClick={closeModal} className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50">
              {isSubmitting ? 'Saving...' : 'Save Student'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete Student"
        message="Are you sure you want to delete this student? This action is permanent and will only succeed if the student does not have a locked datesheet."
        isConfirming={deleteMutation.isPending}
      />
    </div>
  );
}
