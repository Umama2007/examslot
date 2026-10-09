import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchClient, ApiError } from '../../api/client';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';
import { AlertTriangle, CheckCircle, Save, Eye } from 'lucide-react';
import { findConflicts, courseCountStatus, type SlotInterval } from '../../lib/slotConflict';

interface ExamSlot {
  id: string;
  exam_date: string;
  start_time: string;
  end_time: string | null;
  capacity: number | null;
  remaining: number | null;
  is_cancelled: boolean;
}

interface Course {
  id: string;
  code: string;
  title: string;
  slots: ExamSlot[];
}

interface StudentCourse {
  course_id: string;
  selected_slot_id: string | null;
}

export default function DatesheetDesign() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();

  // Map courseId -> selectedSlotId
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: courses = [], isLoading } = useQuery<Course[]>({
    queryKey: ['student-courses-with-slots'],
    queryFn: () => fetchClient<Course[]>('/student/datesheet/courses'),
  });

  const { data: existing } = useQuery<StudentCourse[]>({
    queryKey: ['student-selections'],
    queryFn: () => fetchClient<StudentCourse[]>('/student/datesheet/selections'),
  });

  // Pre-fill existing selections
  useEffect(() => {
    if (existing) {
      const init: Record<string, string> = {};
      existing.forEach((sc) => {
        if (sc.selected_slot_id) init[sc.course_id] = sc.selected_slot_id;
      });
      setSelections(init);
    }
  }, [existing]);

  // Build SlotInterval list for conflict detection
  const selectedIntervals: SlotInterval[] = Object.entries(selections).flatMap(
    ([courseId, slotId]) => {
      const course = courses.find((c) => c.id === courseId);
      const slot = course?.slots.find((s) => s.id === slotId);
      if (!slot) return [];
      return [
        {
          id: slotId,
          courseId,
          date: slot.exam_date,
          startTime: slot.start_time.slice(0, 5),
          endTime: slot.end_time ? slot.end_time.slice(0, 5) : null,
        },
      ];
    }
  );

  const conflicts = findConflicts(selectedIntervals);
  const countStatus = courseCountStatus(Object.keys(selections).length);
  const hasConflict = conflicts.length > 0;
  const canSave = !hasConflict && countStatus === 'ok';

  const saveMutation = useMutation({
    mutationFn: () =>
      fetchClient('/student/datesheet/submit', {
        method: 'POST',
        body: JSON.stringify({ slot_selections: selections }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-profile'] });
      toast('Date sheet saved and locked!', 'success');
      navigate('/student/datesheet/view');
    },
    onError: (e: ApiError) => {
      toast(e.message, 'error');
      setShowConfirm(false);
    },
  });

  // Debounced autosave (just a draft save, not submit)
  const autosave = useCallback(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      fetchClient('/student/datesheet/draft', {
        method: 'PUT',
        body: JSON.stringify({ slot_selections: selections }),
      }).catch(() => {/* silent */});
    }, 1500);
  }, [selections]);

  useEffect(() => {
    autosave();
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [autosave]);

  if (isLoading) {
    return <div className="py-20 text-center text-gray-400">Loading courses…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Design Your Date Sheet</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Select one exam slot per course. You need exactly 4–6 courses.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/student/datesheet/view')}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 min-h-[44px]"
          >
            <Eye size={16} /> View
          </button>
          <button
            onClick={() => setShowConfirm(true)}
            disabled={!canSave}
            className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
          >
            <Save size={16} /> Save &amp; Lock
          </button>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-start gap-3 flex-wrap">
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
            countStatus === 'ok'
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700'
              : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700'
          }`}
        >
          {countStatus === 'ok' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          {Object.keys(selections).length} of {courses.length} courses selected
          {countStatus === 'too_few' && ' — need at least 4'}
          {countStatus === 'too_many' && ' — maximum 6'}
        </div>

        {hasConflict && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-50 dark:bg-red-900/20 text-red-700">
            <AlertTriangle size={16} />
            {conflicts.length} time conflict{conflicts.length !== 1 ? 's' : ''} — resolve to save
          </div>
        )}
      </div>

      {/* Course cards */}
      <div className="space-y-4">
        {courses.map((course) => {
          const selectedId = selections[course.id];
          const courseConflicts = conflicts.filter(
            ([a, b]) => a.courseId === course.id || b.courseId === course.id
          );

          return (
            <div
              key={course.id}
              className={`bg-white dark:bg-gray-800 rounded-xl border-2 shadow-sm ${
                courseConflicts.length > 0
                  ? 'border-red-300 dark:border-red-700'
                  : selectedId
                  ? 'border-primary/40 dark:border-primary/30'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <span className="font-mono text-sm font-semibold text-primary">{course.code}</span>
                  <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">{course.title}</span>
                </div>
                {selectedId && (
                  <CheckCircle size={18} className="text-primary shrink-0" />
                )}
              </div>

              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* No selection option */}
                <button
                  onClick={() => {
                    const next = { ...selections };
                    delete next[course.id];
                    setSelections(next);
                  }}
                  className={`text-left p-3 rounded-lg border-2 text-sm transition-all min-h-[44px] ${
                    !selectedId
                      ? 'border-gray-400 bg-gray-50 dark:bg-gray-700'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="text-gray-500 dark:text-gray-400 italic">— None selected —</span>
                </button>

                {course.slots
                  .filter((s) => !s.is_cancelled)
                  .map((slot) => {
                    const slotInterval: SlotInterval = {
                      id: slot.id,
                      courseId: course.id,
                      date: slot.exam_date,
                      startTime: slot.start_time.slice(0, 5),
                      endTime: slot.end_time ? slot.end_time.slice(0, 5) : null,
                    };
                    const isConflicting = conflicts.some(
                      ([a, b]) => a.id === slot.id || b.id === slot.id
                    );
                    const isFull = slot.remaining != null && slot.remaining <= 0;

                    return (
                      <button
                        key={slot.id}
                        disabled={isFull && selectedId !== slot.id}
                        onClick={() => setSelections((s) => ({ ...s, [course.id]: slot.id }))}
                        className={`text-left p-3 rounded-lg border-2 text-sm transition-all min-h-[44px] ${
                          selectedId === slot.id
                            ? isConflicting
                              ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                              : 'border-primary bg-primary/5 dark:bg-primary/10'
                            : isConflicting
                            ? 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10'
                            : isFull
                            ? 'border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'
                            : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                        }`}
                      >
                        <p className="font-medium text-gray-900 dark:text-white">
                          {new Date(slot.exam_date + 'T12:00:00').toLocaleDateString('en-PK', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                          })}
                        </p>
                        <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                          {slot.start_time.slice(0, 5)}
                          {slot.end_time ? ` – ${slot.end_time.slice(0, 5)}` : ' (60 min)'}
                        </p>
                        {isFull && (
                          <span className="text-xs text-red-600 font-medium">Full</span>
                        )}
                        {slot.remaining != null && !isFull && (
                          <span className="text-xs text-gray-400">{slot.remaining} seats left</span>
                        )}
                        {isConflicting && (
                          <span className="text-xs text-red-600 font-medium mt-0.5 block">⚠ Conflict</span>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => saveMutation.mutate()}
        title="Lock Your Date Sheet"
        message="Saving will lock your date sheet. You will not be able to change it unless you raise a change request. Continue?"
        isConfirming={saveMutation.isPending}
        confirmText="Yes, save and lock"
        danger={false}
      />
    </div>
  );
}
