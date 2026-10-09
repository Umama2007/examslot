import { createContext, useContext, useState, useEffect } from 'react';
import { fetchClient } from '../api/client';

export interface UserResponse {
  id: string;
  email: string;
  role: 'admin' | 'student';
  is_active: boolean;
  last_login_at: string | null;
}

interface AuthContextType {
  user: UserResponse | null;
  isLoading: boolean;
  setUser: (user: UserResponse | null) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      if (!localStorage.getItem('access_token')) {
        setIsLoading(false);
        return;
      }
      try {
        const u = await fetchClient<UserResponse>('/auth/me');
        setUser(u);
      } catch (err) {
        localStorage.removeItem('access_token');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    loadUser();
  }, []);

  const logout = async () => {
    try {
      await fetchClient('/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error("Logout error", e);
    } finally {
      localStorage.removeItem('access_token');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
