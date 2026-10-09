import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchClient, ApiError } from '../../api/client';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';
import { MapPin, Phone, Building2, CheckCircle } from 'lucide-react';

interface Branch {
  id: string;
  name: string;
  code: string;
  city: string;
  address: string;
  contact_number: string;
  status: string;
}

export default function SelectBranch() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Branch | null>(null);
  const [confirming, setConfirming] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['branches-active'],
    queryFn: () => fetchClient<{ items: Branch[] }>('/admin/branches?page_size=100&status=active'),
  });

  const mutation = useMutation({
    mutationFn: (branchId: string) =>
      fetchClient<{ message: string }>(`/student/branch/${branchId}`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-profile'] });
      toast('Branch selected! Welcome aboard.', 'success');
      navigate('/student');
    },
    onError: (e: ApiError) => {
      toast(e.message, 'error');
      setConfirming(false);
    },
  });

  const activeBranches = (data?.items ?? []).filter((b) => b.status === 'active');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Select Your Branch</h1>
        <p className="text-sm text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg px-4 py-3 mt-3">
          ⚠️ You can only select your branch <strong>once</strong>. This action cannot be undone unless you raise a change request.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeBranches.map((branch) => (
            <button
              key={branch.id}
              onClick={() => setSelected(branch)}
              className={`text-left p-5 rounded-xl border-2 transition-all ${
                selected?.id === branch.id
                  ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-md'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-primary/50 hover:shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Building2 size={20} className="text-primary" />
                </div>
                {selected?.id === branch.id && (
                  <CheckCircle size={20} className="text-primary" />
                )}
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{branch.name}</h3>
              <p className="text-xs font-mono text-primary mb-3">{branch.code}</p>
              <div className="space-y-1.5">
                <div className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <MapPin size={13} className="mt-0.5 shrink-0" />
                  <span>{branch.city} — {branch.address}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Phone size={13} className="shrink-0" />
                  {branch.contact_number}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="flex justify-end">
          <button
            onClick={() => setConfirming(true)}
            className="px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-hover transition-colors min-h-[44px]"
          >
            Confirm — {selected.name}
          </button>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => selected && mutation.mutate(selected.id)}
        title="Confirm Branch Selection"
        message={`You are about to select "${selected?.name}" as your branch. This can only be done once. Are you sure?`}
        isConfirming={mutation.isPending}
        confirmText="Yes, select this branch"
        danger={false}
      />
    </div>
  );
}
