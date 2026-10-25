import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, LoginDTO, RegisterDTO } from '@rakshasphere/shared';
import { apiClient, ApiError } from '../../services/apiClient';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (data: LoginDTO) => Promise<void>;
  register: (data: RegisterDTO) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const initAuth = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const accessToken = sessionStorage.getItem('access_token');
      if (accessToken) {
        // Try to fetch current user profile with active access token
        try {
          const currentUser = await apiClient.auth.me();
          setUser(currentUser);
          return;
        } catch {
          // Access token might be expired; attempt silent refresh below
        }
      }

      // Attempt silent refresh via httpOnly cookie
      try {
        const refreshRes = await apiClient.auth.refresh();
        if (refreshRes && refreshRes.user) {
          setUser(refreshRes.user);
          return;
        }
      } catch {
        // No active refresh session or guest visitor
        sessionStorage.removeItem('access_token');
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuth();

    const handleUnauthorized = () => {
      setUser(null);
      sessionStorage.removeItem('access_token');
    };

    window.addEventListener('raksha:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('raksha:unauthorized', handleUnauthorized);
    };
  }, [initAuth]);

  const login = async (data: LoginDTO) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.auth.login(data);
      setUser(res.user);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Login failed. Please check your credentials.';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterDTO) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.auth.register(data);
      setUser(res.user);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Registration failed. Please check your inputs.';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await apiClient.auth.logout();
    } catch {
      // Clean up client state regardless of network response
    } finally {
      sessionStorage.removeItem('access_token');
      setUser(null);
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);

  const refreshUser = async () => {
    try {
      const currentUser = await apiClient.auth.me();
      setUser(currentUser);
    } catch {
      // Ignore
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
