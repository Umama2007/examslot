import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { fetchClient, ApiError } from '../../api/client';
import { DataTable, type Column } from '../../components/DataTable';
import { Modal } from '../../components/Modal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Plus, Edit2, Trash2 } from 'lucide-react';

const branchSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  city: z.string().min(1, 'City is required'),
  address: z.string().min(1, 'Address is required'),
  contact_number: z.string().regex(/^\+?[0-9\-\s]+$/, 'Invalid contact format'),
  status: z.enum(['active', 'inactive']).default('active'),
});
type BranchForm = z.infer<typeof branchSchema>;

interface Branch extends BranchForm {
  id: string;
  created_at: string;
}

export default function Branches() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['branches', page, pageSize, search],
    queryFn: () => fetchClient<any>(`/admin/branches?page=${page}&page_size=${pageSize}${search ? `&q=${encodeURIComponent(search)}` : ''}`)
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<BranchForm>({
    resolver: zodResolver(branchSchema) as any
  });

  const openModal = (branch?: Branch) => {
    setFormError('');
    if (branch) {
      setEditingBranch(branch);
      reset(branch);
    } else {
      setEditingBranch(null);
      reset({ status: 'active' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBranch(null);
  };

  const mutation = useMutation({
    mutationFn: async (formData: BranchForm) => {
      if (editingBranch) {
        return fetchClient(`/admin/branches/${editingBranch.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
      } else {
        return fetchClient('/admin/branches', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      closeModal();
    },
    onError: (error: ApiError) => {
      setFormError(error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetchClient(`/admin/branches/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      setDeleteId(null);
    },
    onError: (error: ApiError) => {
      alert(error.message); // Could use a Toast component here
      setDeleteId(null);
    }
  });

  const onSubmit = (data: BranchForm) => {
    mutation.mutate(data);
  };

  const columns: Column<Branch>[] = [
    { key: 'code', header: 'Code', render: (b) => <span className="font-semibold text-primary bg-primary/10 px-2 py-1 rounded">{b.code}</span> },
    { key: 'name', header: 'Name' },
    { key: 'city', header: 'City' },
    { key: 'contact_number', header: 'Contact' },
    { 
      key: 'status', 
      header: 'Status',
      render: (b) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${b.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
          {b.status}
        </span>
      )
    },
  ];

  const actions = (row: Branch) => (
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
          <h1 className="text-2xl font-bold text-gray-900">Branches</h1>
          <p className="text-sm text-gray-500 mt-1">Manage university campuses and branches.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium flex items-center shadow-sm hover-lift"
        >
          <Plus size={18} className="mr-2" />
          Add Branch
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
        searchPlaceholder="Search branches..."
        actions={actions}
      />

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingBranch ? "Edit Branch" : "Add Branch"}>
        {formError && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm border border-red-200">{formError}</div>}
        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input {...register('name')} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Code</label>
              <input {...register('code')} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none uppercase" />
              {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code.message}</p>}
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">City</label>
              <input {...register('city')} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" />
              {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contact</label>
              <input {...register('contact_number')} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" />
              {errors.contact_number && <p className="text-red-500 text-xs mt-1">{errors.contact_number.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Address</label>
            <input {...register('address')} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" />
            {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>}
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
              {isSubmitting ? 'Saving...' : 'Save Branch'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete Branch"
        message="Are you sure you want to delete this branch? This action cannot be undone unless it is referenced by a student, in which case it will be set to inactive."
        isConfirming={deleteMutation.isPending}
      />
    </div>
  );
}
