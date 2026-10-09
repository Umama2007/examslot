import { useAuth } from '../../hooks/useAuth';

export default function Dashboard() {
  const { user, logout } = useAuth();
  
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-gray-100 shadow-sm h-16 flex items-center justify-between px-6">
        <h1 className="text-xl font-bold text-primary">ExamSlot Student</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">{user?.email}</span>
          <button 
            onClick={() => logout()}
            className="text-sm text-red-600 font-medium hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </header>
      
      <main className="max-w-5xl mx-auto p-6 mt-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to ExamSlot</h2>
          <p className="text-gray-500 mb-6">
            Part 2 features (Student Self-Service) will be available here. 
            For now, you can log in, reset your password, and verify your session works.
          </p>
          <div className="inline-block bg-primary/10 text-primary px-4 py-2 rounded-lg font-medium">
            Stay tuned for the Date Sheet module!
          </div>
        </div>
      </main>
    </div>
  );
}
