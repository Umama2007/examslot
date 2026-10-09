import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { fetchClient } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';
import {
  Building2,
  BookOpen,
  FileText,
  MessageSquare,
  ChevronRight,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';

interface StudentProfile {
  id: string;
  full_name: string;
  registration_no: string;
  program: string;
  semester: number;
  session_batch: string;
  email: string;
  phone: string;
  cnic_or_bform: string;
  branch_id: string | null;
  branch_name: string | null;
  branch_locked: boolean;
  datesheet_locked: boolean;
  course_count: number;
  pending_request_count: number;
  approved_unlocks: string[];
  rejected_requests: { type: string; remark: string }[];
  upcoming_exams: {
    course_code: string;
    course_title: string;
    exam_date: string;
    start_time: string;
  }[];
}

function CountdownBadge({ examDate }: { examDate: string }) {
  const today = new Date();
  const exam = new Date(examDate + 'T00:00:00');
  const diffMs = exam.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return <span className="text-xs text-gray-400">Past</span>;
  if (diffDays === 0) return <span className="text-xs font-semibold text-red-600">Today!</span>;
  if (diffDays === 1) return <span className="text-xs font-semibold text-orange-600">Tomorrow</span>;
  return <span className="text-xs text-gray-500 dark:text-gray-400">in {diffDays} days</span>;
}

function MaskedField({ value, label }: { value: string; label: string }) {
  const [revealed, setRevealed] = useState(false);
  const masked = value.replace(/./g, '•').slice(0, Math.min(value.length, 12));
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-mono text-gray-800 dark:text-gray-200">
          {revealed ? value : masked}
        </span>
        <button
          onClick={() => setRevealed((r) => !r)}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 min-w-[32px] min-h-[32px]"
          aria-label={revealed ? `Hide ${label}` : `Show ${label}`}
        >
          {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  );
}

const STEPS = [
  { label: 'Account Created', key: 'created' },
  { label: 'Branch Selected', key: 'branch' },
  { label: 'Date Sheet Designed', key: 'designed' },
  { label: 'Sheet Locked', key: 'locked' },
];

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: profile, isLoading } = useQuery<StudentProfile>({
    queryKey: ['student-profile'],
    queryFn: () => fetchClient<StudentProfile>('/student/profile'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="py-20 text-center text-gray-500">
        Could not load your profile. Please try again.
      </div>
    );
  }

  const courseOk = profile.course_count >= 4 && profile.course_count <= 6;
  const stepIndex = !profile.branch_id
    ? 0
    : !profile.datesheet_locked
    ? profile.course_count > 0
      ? 2
      : 1
    : 3;

  const kpis = [
    {
      label: 'Branch',
      value: profile.branch_name ?? 'Not selected',
      sub: profile.branch_locked ? 'Locked' : 'Select now',
      icon: Building2,
      badge: profile.branch_locked ? 'locked' : null,
      color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600',
      onClick: () => !profile.branch_locked && navigate('/student/select-branch'),
    },
    {
      label: 'Courses',
      value: `${profile.course_count} assigned`,
      sub: courseOk ? '4–6 ✓' : profile.course_count < 4 ? 'Need more' : 'Too many',
      icon: BookOpen,
      badge: courseOk ? 'ok' : 'warn',
      color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600',
      onClick: () => navigate('/student/datesheet'),
    },
    {
      label: 'Date Sheet',
      value: profile.datesheet_locked ? 'Locked' : 'Draft',
      sub: profile.datesheet_locked ? 'View sheet' : 'Design now',
      icon: FileText,
      badge: profile.datesheet_locked ? 'locked' : null,
      color: 'bg-green-50 dark:bg-green-900/20 text-green-600',
      onClick: () =>
        navigate(profile.datesheet_locked ? '/student/datesheet/view' : '/student/datesheet'),
    },
    {
      label: 'Requests',
      value: `${profile.pending_request_count} pending`,
      sub: 'Need help?',
      icon: MessageSquare,
      badge: null,
      color: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600',
      onClick: () => navigate('/student/help'),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome back, {profile.full_name.split(' ')[0]} 👋
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {user?.email} · {profile.registration_no}
        </p>
      </div>

      {/* Banners */}
      {profile.approved_unlocks.map((type) => (
        <div
          key={type}
          className="flex items-center gap-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-5 py-4"
        >
          <CheckCircle size={20} className="text-green-600 shrink-0" />
          <p className="text-sm text-green-800 dark:text-green-300">
            Your <strong>{type.replace(/_/g, ' ')}</strong> request was approved. You can now make
            the change.
          </p>
          <button
            onClick={() =>
              navigate(type === 'change_branch' ? '/student/select-branch' : '/student/datesheet')
            }
            className="ml-auto text-sm font-medium text-green-700 hover:underline whitespace-nowrap"
          >
            Go now →
          </button>
        </div>
      ))}
      {profile.rejected_requests.map((r, i) => (
        <div
          key={i}
          className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-5 py-4"
        >
          <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-800 dark:text-red-300 font-medium">
              {r.type.replace(/_/g, ' ')} request rejected
            </p>
            <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">{r.remark}</p>
          </div>
        </div>
      ))}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ label, value, sub, icon: Icon, badge, color, onClick }) => (
          <button
            key={label}
            onClick={onClick}
            className="text-left bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm hover:shadow-md transition-shadow group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${color}`}>
                <Icon size={18} />
              </div>
              {badge === 'locked' && (
                <Lock size={14} className="text-gray-400 mt-1" />
              )}
              <ChevronRight
                size={16}
                className="text-gray-300 group-hover:text-gray-500 dark:group-hover:text-gray-300 mt-1 transition-colors"
              />
            </div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sub}</p>
            <p className="text-xs font-medium text-primary mt-1">{label}</p>
          </button>
        ))}
      </div>

      {/* Progress stepper */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
          Progress
        </h2>
        <div className="flex items-center gap-0">
          {STEPS.map((step, i) => {
            const done = i < stepIndex;
            const active = i === stepIndex;
            return (
              <div key={step.key} className="flex items-center flex-1 min-w-0">
                <div className="flex flex-col items-center gap-1 flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                      done
                        ? 'bg-primary border-primary text-white'
                        : active
                        ? 'bg-white dark:bg-gray-800 border-primary text-primary'
                        : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-400'
                    }`}
                  >
                    {done ? (
                      <CheckCircle size={16} />
                    ) : (
                      <span className="text-xs font-bold">{i + 1}</span>
                    )}
                  </div>
                  <span
                    className={`text-xs text-center hidden sm:block leading-tight ${
                      done || active
                        ? 'text-gray-900 dark:text-white font-medium'
                        : 'text-gray-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 transition-all ${
                      i < stepIndex ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming exams */}
      {profile.upcoming_exams.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
            <Clock size={16} className="text-primary" />
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Next 3 Exams</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {profile.upcoming_exams.map((exam, i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between gap-4">
                <div>
                  <span className="font-mono font-semibold text-primary text-sm">{exam.course_code}</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{exam.course_title}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-800 dark:text-gray-200">
                    {new Date(exam.exam_date + 'T12:00:00').toLocaleDateString('en-PK', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </p>
                  <CountdownBadge examDate={exam.exam_date} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Profile snapshot */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
        <h2 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">Profile</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 divide-y divide-gray-100 dark:divide-gray-700 sm:divide-y-0">
          <div className="py-1 flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Program</span>
            <span className="font-medium text-gray-900 dark:text-white">{profile.program}</span>
          </div>
          <div className="py-1 flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Semester</span>
            <span className="font-medium text-gray-900 dark:text-white">{profile.semester}</span>
          </div>
          <div className="py-1 flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Session</span>
            <span className="font-medium text-gray-900 dark:text-white">{profile.session_batch}</span>
          </div>
          <div className="py-1 flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Email</span>
            <span className="font-medium text-gray-900 dark:text-white truncate max-w-[200px]">{profile.email}</span>
          </div>
          <MaskedField value={profile.cnic_or_bform} label="CNIC / B-Form" />
          <MaskedField value={profile.phone} label="Phone" />
        </div>
      </div>
    </div>
  );
}
