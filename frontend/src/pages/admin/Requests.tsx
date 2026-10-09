import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { fetchClient, ApiError } from '../../api/client';
import { DataTable, type Column } from '../../components/DataTable';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { CheckCircle, XCircle } from 'lucide-react';

interface ChangeRequest {
  id: string;
  student_id: string;
  student_name: string;
  registration_no: string;
  request_type: string;
  reason: string;
  status: string;
  admin_remark: string | null;
  created_at: string;
  reviewed_at: string | null;
}

const rejectSchema = z.object({
  admin_remark: z.string().min(1, 'Remark is required when rejecting'),
});
type RejectForm = z.infer<typeof rejectSchema>;

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function AdminRequests() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [rejectTarget, setRejectTarget] = useState<ChangeRequest | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-requests', page, pageSize, statusFilter, typeFilter],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
      });
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('request_type', typeFilter);
      return fetchClient<{ items: ChangeRequest[]; total: number }>(
        `/admin/requests?${params}`
      );
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => fetchClient(`/admin/requests/${id}/approve`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-requests'] });
      toast('Request approved', 'success');
    },
    onError: (e: ApiError) => toast(e.message, 'error'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, remark }: { id: string; remark: string }) =>
      fetchClient(`/admin/requests/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ admin_remark: remark }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-requests'] });
      toast('Request rejected', 'success');
      setRejectTarget(null);
      rejectForm.reset();
    },
    onError: (e: ApiError) => toast(e.message, 'error'),
  });

  const rejectForm = useForm<RejectForm>({ resolver: zodResolver(rejectSchema) });

  const columns: Column<ChangeRequest>[] = [
    {
      key: 'student_name',
      header: 'Student',
      render: (r) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{r.student_name}</p>
          <p className="text-xs text-gray-500">{r.registration_no}</p>
        </div>
      ),
    },
    {
      key: 'request_type',
      header: 'Type',
      render: (r) => (
        <span className="text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded-full">
          {r.request_type.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (r) => (
        <span className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 max-w-xs">
          {r.reason}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_STYLES[r.status] ?? ''}`}>
          {r.status}
        </span>
      ),
    },
    {
      key: 'admin_remark',
      header: 'Remark',
      render: (r) => (
        <span className="text-xs text-gray-500 dark:text-gray-400">{r.admin_remark ?? '—'}</span>
      ),
    },
    {
      key: 'created_at',
      header: 'Date',
      render: (r) => (
        <span className="text-xs text-gray-500">{new Date(r.created_at).toLocaleDateString()}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Change Requests</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Review and action student change requests.
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none min-h-[44px]"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none min-h-[44px]"
        >
          <option value="">All Types</option>
          <option value="change_branch">Branch Change</option>
          <option value="change_datesheet">Datesheet Change</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        total={data?.total ?? 0}
        page={page}
        pageSize={pageSize}
        isLoading={isLoading}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        searchable={false}
        keyExtractor={(r) => r.id}
        actions={(row) =>
          row.status === 'pending' ? (
            <div className="flex gap-2">
              <button
                onClick={() => approveMutation.mutate(row.id)}
                disabled={approveMutation.isPending}
                title="Approve"
                className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors min-w-[44px] min-h-[44px]"
              >
                <CheckCircle size={18} />
              </button>
              <button
                onClick={() => setRejectTarget(row)}
                title="Reject"
                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors min-w-[44px] min-h-[44px]"
              >
                <XCircle size={18} />
              </button>
            </div>
          ) : null
        }
      />

      {/* Reject modal */}
      <Modal
        isOpen={!!rejectTarget}
        onClose={() => { setRejectTarget(null); rejectForm.reset(); }}
        title="Reject Request"
      >
        <form
          onSubmit={rejectForm.handleSubmit((d) => {
            if (!rejectTarget) return;
            rejectMutation.mutate({ id: rejectTarget.id, remark: d.admin_remark });
          })}
          className="space-y-4"
        >
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Rejecting request from <strong>{rejectTarget?.student_name}</strong> for{' '}
            <em>{rejectTarget?.request_type.replace(/_/g, ' ')}</em>.
          </p>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Remark (required)
            </label>
            <textarea
              {...rejectForm.register('admin_remark')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 resize-none"
              placeholder="Explain why the request is rejected…"
            />
            {rejectForm.formState.errors.admin_remark && (
              <p className="text-xs text-red-600">{rejectForm.formState.errors.admin_remark.message}</p>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => { setRejectTarget(null); rejectForm.reset(); }}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={rejectMutation.isPending}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm disabled:opacity-50"
            >
              {rejectMutation.isPending ? 'Rejecting…' : 'Reject'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
