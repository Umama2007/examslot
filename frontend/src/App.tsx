import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import AdminLayout from './components/AdminLayout';
import StudentLayout from './components/StudentLayout';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ToastProvider } from './components/Toast';

// Auth pages
import Login from './pages/auth/Login';
import SetPassword from './pages/auth/SetPassword';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// Admin pages
import Branches from './pages/admin/Branches';
import Courses from './pages/admin/Courses';
import Students from './pages/admin/Students';
import AuditLogs from './pages/admin/AuditLogs';
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminAssignments = lazy(() => import('./pages/admin/Assignments'));
const AdminSlots = lazy(() => import('./pages/admin/Slots'));
const AdminRequests = lazy(() => import('./pages/admin/Requests'));

// Student pages
const StudentDashboard = lazy(() => import('./pages/student/Dashboard'));
const SelectBranch = lazy(() => import('./pages/student/SelectBranch'));
const DatesheetDesign = lazy(() => import('./pages/student/DatesheetDesign'));
const DatesheetView = lazy(() => import('./pages/student/DatesheetView'));
const StudentHelp = lazy(() => import('./pages/student/Help'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function PageSpinner() {
  return (
    <div className="flex h-full items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

function ProtectedRoute({
  children,
  allowedRole,
}: {
  children: React.ReactNode;
  allowedRole: 'admin' | 'student';
}) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <PageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== allowedRole) {
    return (
      <Navigate
        to={user.role === 'admin' ? '/admin' : '/student'}
        replace
      />
    );
  }
  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <Suspense fallback={<PageSpinner />}>
              <Routes>
                {/* Auth */}
                <Route path="/login" element={<Login />} />
                <Route path="/set-password" element={<SetPassword />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                {/* Admin */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute allowedRole="admin">
                      <AdminLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<AdminDashboard />} />
                  <Route path="branches" element={<Branches />} />
                  <Route path="courses" element={<Courses />} />
                  <Route path="students" element={<Students />} />
                  <Route path="assignments" element={<AdminAssignments />} />
                  <Route path="slots" element={<AdminSlots />} />
                  <Route path="requests" element={<AdminRequests />} />
                  <Route path="audit-logs" element={<AuditLogs />} />
                </Route>

                {/* Student */}
                <Route
                  path="/student"
                  element={
                    <ProtectedRoute allowedRole="student">
                      <StudentLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<StudentDashboard />} />
                  <Route path="select-branch" element={<SelectBranch />} />
                  <Route path="datesheet" element={<DatesheetDesign />} />
                  <Route path="datesheet/view" element={<DatesheetView />} />
                  <Route path="help" element={<StudentHelp />} />
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </Suspense>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
