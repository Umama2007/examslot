import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './components/AdminLayout';
import Branches from './pages/admin/Branches';
import Courses from './pages/admin/Courses';
import Students from './pages/admin/Students';
import AuditLogs from './pages/admin/AuditLogs';
import Login from './pages/auth/Login';
import SetPassword from './pages/auth/SetPassword';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import StudentDashboard from './pages/student/Dashboard';
import { AuthProvider, useAuth } from './hooks/useAuth';

const queryClient = new QueryClient();

function ProtectedRoute({ children, allowedRole }: { children: React.ReactNode, allowedRole: string }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== allowedRole) {
    return <Navigate to={user.role === 'admin' ? '/admin/branches' : '/student/dashboard'} replace />;
  }
  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/set-password" element={<SetPassword />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRole="admin">
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="branches" replace />} />
              <Route path="branches" element={<Branches />} />
              <Route path="courses" element={<Courses />} />
              <Route path="students" element={<Students />} />
              <Route path="audit-logs" element={<AuditLogs />} />
            </Route>

            {/* Student Routes */}
            <Route path="/student" element={
              <ProtectedRoute allowedRole="student">
                <div className="p-8">Student Layout Placeholder</div>
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<StudentDashboard />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
