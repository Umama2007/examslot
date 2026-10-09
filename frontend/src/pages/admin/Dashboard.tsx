import { useQuery } from '@tanstack/react-query';
import { fetchClient } from '../../api/client';
import { Users, BookOpen, Building2, FileText, Loader2 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from 'recharts';

interface DashboardData {
  total_students: number;
  total_branches: number;
  total_courses: number;
  total_requests: number;
  students_per_branch: { branch_name: string; count: number }[];
  datesheet_status: { status: string; count: number }[];
  bookings_per_day: { date: string; count: number }[];
  recent_requests: {
    id: string;
    student_name: string;
    request_type: string;
    status: string;
    created_at: string;
  }[];
}

const COLORS = ['#4F46E5', '#7C3AED', '#2563EB', '#059669', '#D97706'];

const STATUS_COLORS: Record<string, string> = {
  not_started: '#94a3b8',
  branch_selected: '#3b82f6',
  sheet_designed: '#f59e0b',
  locked: '#10b981',
};

export default function AdminDashboard() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['admin-dashboard'],
    queryFn: () => fetchClient<DashboardData>('/admin/dashboard'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const kpis = [
    { label: 'Students', value: data?.total_students ?? 0, icon: Users, color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' },
    { label: 'Branches', value: data?.total_branches ?? 0, icon: Building2, color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' },
    { label: 'Courses', value: data?.total_courses ?? 0, icon: BookOpen, color: 'bg-green-100 dark:bg-green-900/30 text-green-600' },
    { label: 'Requests', value: data?.total_requests ?? 0, icon: FileText, color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">System overview at a glance.</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${color}`}>
                <Icon size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Students per branch */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Students per Branch</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data?.students_per_branch ?? []}>
              <XAxis dataKey="branch_name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#4F46E5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Date sheet status donut */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Date Sheet Status</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data?.datesheet_status ?? []}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                label
                labelLine={false}
              >
                {(data?.datesheet_status ?? []).map((entry, index) => (
                  <Cell
                    key={entry.status}
                    fill={STATUS_COLORS[entry.status] ?? COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Legend formatter={(value) => value.replace(/_/g, ' ')} />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bookings per day */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Slot Bookings — Last 14 Days</h2>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data?.bookings_per_day ?? []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#4F46E5" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Recent requests */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">5 Most Recent Requests</h2>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {(data?.recent_requests ?? []).length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">No requests yet</p>
          ) : (
            (data?.recent_requests ?? []).map((req) => (
              <div key={req.id} className="px-5 py-3 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{req.student_name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{req.request_type.replace(/_/g, ' ')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      req.status === 'approved'
                        ? 'bg-green-100 text-green-700'
                        : req.status === 'rejected'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {req.status}
                  </span>
                  <span className="text-xs text-gray-400">{new Date(req.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
