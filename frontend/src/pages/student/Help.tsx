import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { fetchClient, ApiError } from '../../api/client';
import { useToast } from '../../components/Toast';
import { GitBranch, FileText } from 'lucide-react';

interface ChangeRequest {
  id: string;
  request_type: string;
  reason: string;
  status: string;
  admin_remark: string | null;
  created_at: string;
}

const requestSchema = z.object({
  request_type: z.enum(['change_branch', 'change_datesheet']),
  reason: z
    .string()
    .min(20, 'Reason must be at least 20 characters')
    .max(1000, 'Reason must be at most 1000 characters'),
});
type RequestForm = z.infer<typeof requestSchema>;

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function StudentHelp() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedType, setSelectedType] = useState<'change_branch' | 'change_datesheet' | null>(null);

  const { data: history = [] } = useQuery<ChangeRequest[]>({
    queryKey: ['change-requests'],
    queryFn: () => fetchClient<ChangeRequest[]>('/student/requests'),
  });

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<RequestForm>({
    resolver: zodResolver(requestSchema),
    defaultValues: { request_type: 'change_branch' },
  });

  const reason = watch('reason') ?? '';

  const mutation = useMutation({
    mutationFn: (data: RequestForm) =>
      fetchClient('/student/requests', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['change-requests'] });
      toast('Request submitted!', 'success');
      reset();
      setSelectedType(null);
    },
    onError: (e: ApiError) => toast(e.message, 'error'),
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Need Help?</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Submit a change request. Our team will review it as soon as possible.
        </p>
      </div>

      {/* Type selection cards */}
      {!selectedType ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => setSelectedType('change_branch')}
            className="text-left p-5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-primary/50 hover:shadow-sm transition-all min-h-[44px]"
          >
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-3">
              <GitBranch size={20} className="text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Change Branch</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Request to move to a different campus branch.
            </p>
          </button>
          <button
            onClick={() => setSelectedType('change_datesheet')}
            className="text-left p-5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-primary/50 hover:shadow-sm transition-all min-h-[44px]"
          >
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-3">
              <FileText size={20} className="text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Change Date Sheet</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Request to modify your exam slot selections.
            </p>
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">
              {selectedType === 'change_branch' ? 'Change Branch Request' : 'Change Date Sheet Request'}
            </h2>
            <button
              onClick={() => { setSelectedType(null); reset(); }}
              className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              ← Back
            </button>
          </div>

          <form onSubmit={handleSubmit((d) => mutation.mutate({ ...d, request_type: selectedType }))} className="space-y-4">
            <input type="hidden" value={selectedType} {...register('request_type')} />
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Reason
                <span className="text-xs text-gray-400 ml-2">({reason.length}/1000, min 20)</span>
              </label>
              <textarea
                {...register('reason')}
                rows={5}
                maxLength={1000}
                placeholder="Explain your reason clearly…"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 resize-none"
              />
              {errors.reason && (
                <p className="text-xs text-red-600" role="alert">{errors.reason.message}</p>
              )}
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => { setSelectedType(null); reset(); }}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="px-5 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover disabled:opacity-50 min-h-[44px]"
              >
                {mutation.isPending ? 'Submitting…' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Request history */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">Request History</h2>
        </div>
        {history.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">No requests yet.</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {history.map((req) => (
              <div key={req.id} className="px-5 py-4">
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                      {req.request_type.replace(/_/g, ' ')}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[req.status] ?? ''}`}>
                      {req.status}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(req.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">{req.reason}</p>
                {req.admin_remark && (
                  <div className="mt-2 bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      <strong>Admin:</strong> {req.admin_remark}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
