import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchClient, ApiError } from '../../api/client';
import { DataTable, type Column } from '../../components/DataTable';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';
import { Plus, Trash2, AlertCircle } from 'lucide-react';

interface Student {
  id: string;
  full_name: string;
  registration_no: string;
  program: string;
  email: string;
  datesheet_locked: boolean;
}

interface Course {
  id: string;
  code: string;
  title: string;
}

interface Assignment {
  student_id: string;
  student_name: string;
  registration_no: string;
  courses: Course[];
  course_count: number;
  is_complete: boolean;
}

export default function AdminAssignments() {
  const { toast } = useToast();
  const qc = useQueryClient();

  // Student search
  const [studentQuery, setStudentQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [addCourseId, setAddCourseId] = useState('');
  const [removeTarget, setRemoveTarget] = useState<{ courseId: string; courseName: string } | null>(null);

  const { data: studentSearch } = useQuery({
    queryKey: ['student-search', studentQuery],
    queryFn: () =>
      studentQuery.length >= 2
        ? fetchClient<{ items: Student[] }>(`/admin/students?q=${encodeURIComponent(studentQuery)}&page_size=10`)
        : Promise.resolve({ items: [] }),
    enabled: studentQuery.length >= 2,
  });

  const { data: assignments, isLoading: assignLoading } = useQuery({
    queryKey: ['assignments', selectedStudent?.id],
    queryFn: () =>
      fetchClient<{ courses: Course[]; course_count: number }>(
        `/admin/students/${selectedStudent!.id}/courses`
      ),
    enabled: !!selectedStudent,
  });

  const { data: coursesData } = useQuery({
    queryKey: ['courses-all'],
    queryFn: () => fetchClient<{ items: Course[] }>('/admin/courses?page_size=100'),
  });

  const addMutation = useMutation({
    mutationFn: ({ studentId, courseId }: { studentId: string; courseId: string }) =>
      fetchClient(`/admin/students/${studentId}/courses/${courseId}`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assignments'] });
      toast('Course assigned successfully', 'success');
      setAddCourseId('');
    },
    onError: (e: ApiError) => toast(e.message, 'error'),
  });

  const removeMutation = useMutation({
    mutationFn: ({ studentId, courseId }: { studentId: string; courseId: string }) =>
      fetchClient(`/admin/students/${studentId}/courses/${courseId}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assignments'] });
      toast('Course removed', 'success');
      setRemoveTarget(null);
    },
    onError: (e: ApiError) => {
      toast(e.message, 'error');
      setRemoveTarget(null);
    },
  });

  const courseCount = assignments?.course_count ?? 0;
  const isComplete = courseCount >= 4 && courseCount <= 6;

  const columns: Column<Course>[] = [
    { key: 'code', header: 'Code', render: (c) => <span className="font-mono text-primary">{c.code}</span> },
    { key: 'title', header: 'Title' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Assignments</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage course assignments per student. Students need 4–6 courses.
        </p>
      </div>

      {/* Student typeahead */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Search Student
        </label>
        <input
          type="search"
          value={studentQuery}
          onChange={(e) => {
            setStudentQuery(e.target.value);
            setSelectedStudent(null);
          }}
          placeholder="Type name, email or reg number…"
          className="w-full max-w-md px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:border-primary"
        />
        {studentSearch && studentSearch.items.length > 0 && !selectedStudent && (
          <ul className="border border-gray-200 dark:border-gray-600 rounded-lg divide-y divide-gray-100 dark:divide-gray-700 max-w-md max-h-48 overflow-y-auto shadow-sm">
            {studentSearch.items.map((s) => (
              <li key={s.id}>
                <button
                  className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => {
                    setSelectedStudent(s);
                    setStudentQuery(s.full_name);
                  }}
                >
                  <span className="font-medium text-gray-900 dark:text-white">{s.full_name}</span>
                  <span className="text-gray-500 dark:text-gray-400 ml-2">({s.registration_no})</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selectedStudent && (
        <div className="space-y-4">
          {/* Status banner */}
          <div
            className={`flex items-center gap-3 p-4 rounded-xl border ${
              isComplete
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
            }`}
          >
            <AlertCircle
              size={18}
              className={isComplete ? 'text-green-600' : 'text-yellow-600'}
            />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {selectedStudent.full_name} — {selectedStudent.registration_no}
              </p>
              <p className={`text-xs ${isComplete ? 'text-green-700' : 'text-yellow-700'}`}>
                {courseCount} course{courseCount !== 1 ? 's' : ''} assigned
                {!isComplete && ' — needs 4–6 to be complete'}
                {selectedStudent.datesheet_locked && ' — date sheet is locked'}
              </p>
            </div>
          </div>

          {/* Add course */}
          <div className="flex gap-3 flex-wrap">
            <select
              value={addCourseId}
              onChange={(e) => setAddCourseId(e.target.value)}
              className="flex-1 min-w-0 max-w-xs px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2"
            >
              <option value="">Select course to add…</option>
              {(coursesData?.items ?? [])
                .filter(
                  (c) => !(assignments?.courses ?? []).find((ac) => ac.id === c.id)
                )
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.title}
                  </option>
                ))}
            </select>
            <button
              onClick={() => {
                if (!addCourseId || !selectedStudent) return;
                addMutation.mutate({ studentId: selectedStudent.id, courseId: addCourseId });
              }}
              disabled={!addCourseId || addMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover disabled:opacity-50 min-h-[44px]"
            >
              <Plus size={16} />
              Assign
            </button>
          </div>

          <DataTable
            columns={columns}
            data={assignments?.courses ?? []}
            isLoading={assignLoading}
            keyExtractor={(c) => c.id}
            searchable={false}
            pagination={false}
            actions={(course) => (
              <button
                onClick={() => setRemoveTarget({ courseId: course.id, courseName: course.title })}
                className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <Trash2 size={16} />
              </button>
            )}
          />
        </div>
      )}

      <ConfirmDialog
        isOpen={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => {
          if (!removeTarget || !selectedStudent) return;
          removeMutation.mutate({
            studentId: selectedStudent.id,
            courseId: removeTarget.courseId,
          });
        }}
        title="Remove Assignment"
        message={`Remove "${removeTarget?.courseName}" from ${selectedStudent?.full_name}?`}
        isConfirming={removeMutation.isPending}
      />
    </div>
  );
}
