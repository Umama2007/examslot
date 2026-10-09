import { useQuery } from '@tanstack/react-query';
import { fetchClient } from '../../api/client';
import { Printer } from 'lucide-react';

interface DatesheetEntry {
  course_code: string;
  course_title: string;
  exam_date: string;
  start_time: string;
  end_time: string | null;
}

interface StudentInfo {
  full_name: string;
  registration_no: string;
  program: string;
  branch_name: string | null;
}

export default function DatesheetView() {
  const { data: entries = [], isLoading } = useQuery<DatesheetEntry[]>({
    queryKey: ['datesheet-view'],
    queryFn: () => fetchClient<DatesheetEntry[]>('/student/datesheet/view'),
  });

  const { data: profile } = useQuery<StudentInfo>({
    queryKey: ['student-profile-info'],
    queryFn: () => fetchClient<StudentInfo>('/student/profile'),
  });

  const sorted = [...entries].sort((a, b) => {
    const d = a.exam_date.localeCompare(b.exam_date);
    if (d !== 0) return d;
    return a.start_time.localeCompare(b.start_time);
  });

  return (
    <div>
      {/* Print header info */}
      <div className="mb-6 flex items-start justify-between no-print flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Exam Date Sheet</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Your confirmed examination schedule.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover min-h-[44px] no-print"
          >
            <Printer size={16} /> Print
          </button>
          <a
            href="/api/v1/student/datesheet/pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 min-h-[44px] no-print"
          >
            Download PDF
          </a>
        </div>
      </div>

      {/* Print-visible header */}
      <div className="print-only hidden print:block mb-6 border-b-2 border-gray-900 pb-4">
        <h1 className="text-xl font-bold">Loopverse Virtual University</h1>
        <h2 className="text-lg font-semibold mt-1">Exam Date Sheet</h2>
        {profile && (
          <div className="mt-2 grid grid-cols-2 gap-x-8 text-sm">
            <div><span className="font-medium">Name:</span> {profile.full_name}</div>
            <div><span className="font-medium">Reg No:</span> {profile.registration_no}</div>
            <div><span className="font-medium">Program:</span> {profile.program}</div>
            <div><span className="font-medium">Branch:</span> {profile.branch_name ?? '—'}</div>
          </div>
        )}
      </div>

      {/* Profile card (screen only) */}
      {profile && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm mb-6 no-print">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Name</p>
              <p className="font-medium text-gray-900 dark:text-white">{profile.full_name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Reg No</p>
              <p className="font-medium font-mono text-gray-900 dark:text-white">{profile.registration_no}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Program</p>
              <p className="font-medium text-gray-900 dark:text-white">{profile.program}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Branch</p>
              <p className="font-medium text-gray-900 dark:text-white">{profile.branch_name ?? '—'}</p>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="py-12 text-center text-gray-400">Loading…</div>
      ) : sorted.length === 0 ? (
        <div className="py-12 text-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">No date sheet found. Design your sheet first.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm print:shadow-none print:border-0">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 print:bg-gray-100">
                <tr>
                  {['#', 'Course Code', 'Course Title', 'Date', 'Start Time', 'End Time'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {sorted.map((entry, i) => (
                  <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 print:hover:bg-transparent">
                    <td className="px-5 py-3 text-gray-500">{i + 1}</td>
                    <td className="px-5 py-3 font-mono font-semibold text-primary">{entry.course_code}</td>
                    <td className="px-5 py-3 text-gray-800 dark:text-gray-200">{entry.course_title}</td>
                    <td className="px-5 py-3 text-gray-700 dark:text-gray-300">
                      {new Date(entry.exam_date + 'T12:00:00').toLocaleDateString('en-PK', {
                        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </td>
                    <td className="px-5 py-3 text-gray-700 dark:text-gray-300">{entry.start_time.slice(0, 5)}</td>
                    <td className="px-5 py-3 text-gray-700 dark:text-gray-300">
                      {entry.end_time ? entry.end_time.slice(0, 5) : `${entry.start_time.slice(0, 5)} +60min`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {sorted.map((entry, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-semibold text-primary">{entry.course_code}</span>
                  <span className="text-xs text-gray-500">#{i + 1}</span>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">{entry.course_title}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {new Date(entry.exam_date + 'T12:00:00').toLocaleDateString('en-PK', {
                    weekday: 'short', day: 'numeric', month: 'short',
                  })}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {entry.start_time.slice(0, 5)} – {entry.end_time ? entry.end_time.slice(0, 5) : `+60min`}
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Print footer */}
      <div className="hidden print:block mt-8 pt-4 border-t border-gray-400 text-xs text-gray-600 text-center">
        Keep this sheet for your records.
      </div>
    </div>
  );
}
