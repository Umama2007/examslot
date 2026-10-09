import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  Building2, 
  BookOpen, 
  Users, 
  History, 
  LogOut, 
  Menu, 
  X 
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function AdminLayout() {
  const { logout, user } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { name: 'Branches', href: '/admin/branches', icon: Building2 },
    { name: 'Courses', href: '/admin/courses', icon: BookOpen },
    { name: 'Students', href: '/admin/students', icon: Users },
    { name: 'Audit Logs', href: '/admin/audit-logs', icon: History },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans">
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      <div className={cn(
        "fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-100 shadow-sm transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-100">
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">ExamSlot Admin</span>
          <button className="lg:hidden text-gray-400 hover:text-gray-600" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={24} />
          </button>
        </div>
        
        <div className="px-4 py-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 ml-2">Management</p>
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group",
                    isActive 
                      ? "bg-primary/10 text-primary shadow-sm" 
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <item.icon className={cn(
                    "mr-3 h-5 w-5 transition-transform duration-200", 
                    isActive ? "text-primary scale-110" : "text-gray-400 group-hover:scale-110"
                  )} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
        
        <div className="absolute bottom-0 w-full p-4 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center px-2 py-2 mb-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold mr-3 shadow-sm">
              A
            </div>
            <div className="flex-1 truncate">
              <p className="text-sm font-semibold text-gray-900 truncate">{user?.email}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="flex items-center w-full px-4 py-2.5 text-sm font-medium text-red-600 rounded-xl hover:bg-red-50 transition-colors"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Logout
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 bg-white border-b border-gray-100 shadow-sm lg:hidden z-10">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="text-gray-500 hover:text-gray-900 transition-colors"
          >
            <Menu size={24} />
          </button>
          <span className="text-lg font-bold text-primary">ExamSlot</span>
          <div className="w-6" />
        </header>
        
        <main className="flex-1 overflow-auto bg-gray-50/30 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
