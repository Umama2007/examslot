import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useDarkMode } from '../hooks/useDarkMode';
import {
  LayoutDashboard,
  Building2,
  Calendar,
  Eye,
  HelpCircle,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function StudentLayout() {
  const { logout, user } = useAuth();
  const { isDark, toggle } = useDarkMode();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { href: '/student', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { href: '/student/select-branch', label: 'Select Branch', icon: Building2 },
    { href: '/student/datesheet', label: 'Design Sheet', icon: Calendar },
    { href: '/student/datesheet/view', label: 'View Sheet', icon: Eye },
    { href: '/student/help', label: 'Need Help', icon: HelpCircle },
  ];

  const isActive = (item: (typeof navItems)[0]) =>
    item.exact ? location.pathname === item.href : location.pathname.startsWith(item.href);

  return (
    <div className="min-h-screen bg-background dark:bg-gray-900 font-sans">
      {/* Top header */}
      <header className="sticky top-0 z-30 h-16 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 shadow-sm flex items-center px-4 sm:px-6 gap-4 no-print">
        <button
          onClick={() => setMenuOpen(true)}
          className="md:hidden text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>

        <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600 flex-1">
          ExamSlot
        </span>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px]',
                  active
                    ? 'bg-primary/10 text-primary dark:bg-primary/20'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                )}
              >
                <item.icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-400 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <span className="hidden sm:block text-sm text-gray-600 dark:text-gray-300 max-w-[140px] truncate">
            {user?.email}
          </span>
          <button
            onClick={() => logout()}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg min-h-[44px]"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-xl md:hidden flex flex-col">
            <div className="flex items-center justify-between h-16 px-6 border-b border-gray-100 dark:border-gray-700">
              <span className="font-bold text-primary">Menu</span>
              <button
                onClick={() => setMenuOpen(false)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400"
                aria-label="Close menu"
              >
                <X size={22} />
              </button>
            </div>
            <nav className="flex-1 px-4 py-6 space-y-1">
              {navItems.map((item) => {
                const active = isActive(item);
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors min-h-[44px]',
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    )}
                  >
                    <item.icon size={18} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => { logout(); setMenuOpen(false); }}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl min-h-[44px]"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </aside>
        </>
      )}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
    </div>
  );
}
