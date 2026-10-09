import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { fetchClient, ApiError } from '../../api/client';
import { Modal } from '../../components/Modal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';
import { Plus, XCircle, ChevronDown, ChevronRight } from 'lucide-react';

interface Course { id: string; code: string; title: string; }
interface ExamSlot {
  id: string;
  course_id: string;
  exam_date: string;
  start_time: string;
  end_time: string | null;
  capacity: number | null;
  booked_count: number;
  is_cancelled: boolean;
}

const slotSchema = z.object({
  course_id: z.string().uuid('Select a course'),
  exam_date: z.string().min(1, 'Date required'),
  start_time: z.string().min(1, 'Start time required'),
  end_time: z.string().optional(),
  capacity: z.string().optional(),
});
type SlotFormRaw = z.infer<typeof slotSchema>;

interface SlotForm {
  course_id: string;
  exam_date: string;
  start_time: string;
  end_time?: string;
  capacity?: number;
}

function toSlotPayload(raw: SlotFormRaw): SlotForm {
  return {
    ...raw,
    capacity: raw.capacity ? parseInt(raw.capacity, 10) : undefined,
  };
}

export default function AdminSlots() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);

  const { data: coursesData } = useQuery({
    queryKey: ['courses-all'],
    queryFn: () => fetchClient<{ items: Course[] }>('/admin/courses?page_size=100'),
  });

  const { data: slotsData, isLoading } = useQuery({
    queryKey: ['admin-slots'],
    queryFn: () => fetchClient<{ items: ExamSlot[] }>('/admin/slots?page_size=200'),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<SlotFormRaw>({
    resolver: zodResolver(slotSchema),
  });

  const createMutation = useMutation({
    mutationFn: (data: SlotForm) => fetchClient('/admin/slots', { method: 'POST', body: JSON.stringify(data) }),    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-slots'] });
      toast('Slot created', 'success');
      setIsModalOpen(false);
      reset();
    },
    onError: (e: ApiError) => toast(e.message, 'error'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => fetchClient(`/admin/slots/${id}/cancel`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-slots'] });
      toast('Slot cancelled', 'success');
      setCancelTarget(null);
    },
    onError: (e: ApiError) => {
      toast(e.message, 'error');
      setCancelTarget(null);
    },
  });

  // Group slots by course
  const courses = coursesData?.items ?? [];
  const slots = slotsData?.items ?? [];
  const slotsByCourse = courses.reduce<Record<string, ExamSlot[]>>((acc, c) => {
    acc[c.id] = slots.filter((s) => s.course_id === c.id);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Exam Slots</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage exam slots grouped by course.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover min-h-[44px]"
        >
          <Plus size={16} />
          New Slot
        </button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-gray-400">Loading…</div>
      ) : (
        <div className="space-y-3">
          {courses.map((course) => {
            const courseSlots = slotsByCourse[course.id] ?? [];
            const isExpanded = expandedCourse === course.id;
            return (
              <div
                key={course.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => setExpandedCourse(isExpanded ? null : course.id)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-semibold text-primary">{course.code}</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{course.title}</span>
                    <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">
                      {courseSlots.length} slot{courseSlots.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {isExpanded ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronRight size={18} className="text-gray-400" />}
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100 dark:border-gray-700">
                    {courseSlots.length === 0 ? (
                      <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">No slots yet</p>
                    ) : (
                      <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {courseSlots.map((slot) => (
                          <div key={slot.id} className="px-5 py-3 flex items-center justify-between gap-4 flex-wrap">
                            <div className="flex items-center gap-4 flex-wrap">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">{slot.exam_date}</span>
                              <span className="text-sm text-gray-600 dark:text-gray-300">
                                {slot.start_time}{slot.end_time ? ` – ${slot.end_time}` : ' (60 min)'}
                              </span>
                              {slot.capacity != null && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {slot.booked_count}/{slot.capacity} booked
                                </span>
                              )}
                              {slot.is_cancelled && (
                                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Cancelled</span>
                              )}
                            </div>
                            {!slot.is_cancelled && (
                              <button
                                onClick={() => setCancelTarget(slot.id)}
                                className="flex items-center gap-1.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-2 rounded-lg transition-colors min-h-[44px]"
                              >
                                <XCircle size={14} />
                                Cancel
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create slot modal */}
      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); reset(); }} title="New Exam Slot">
        <form onSubmit={handleSubmit((d) => createMutation.mutate(toSlotPayload(d)))} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Course</label>
            <select {...register('course_id')} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2">
              <option value="">Select course…</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.title}</option>)}
            </select>
            {errors.course_id && <p className="text-xs text-red-600">{errors.course_id.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
              <input type="date" {...register('exam_date')} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2" />
              {errors.exam_date && <p className="text-xs text-red-600">{errors.exam_date.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Capacity</label>
              <input type="number" {...register('capacity')} placeholder="e.g. 50" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Time</label>
              <input type="time" {...register('start_time')} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2" />
              {errors.start_time && <p className="text-xs text-red-600">{errors.start_time.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Time (opt.)</label>
              <input type="time" {...register('end_time')} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setIsModalOpen(false); reset(); }} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg text-sm hover:bg-gray-200">Cancel</button>
            <button type="submit" disabled={isSubmitting || createMutation.isPending} className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-hover disabled:opacity-50">
              {createMutation.isPending ? 'Creating…' : 'Create Slot'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => cancelTarget && cancelMutation.mutate(cancelTarget)}
        title="Cancel Slot"
        message="Cancel this exam slot? Students booked on it will be notified. This cannot be undone."
        isConfirming={cancelMutation.isPending}
        confirmText="Cancel Slot"
      />
    </div>
  );
}
