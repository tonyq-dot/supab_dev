'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api, { setToken, setRefreshToken, clearAuthTokens } from '../api/client';

// Define the shape of the user object
interface User {
  id: number;
  email: string;
  is_admin: boolean;
  created_at: string;
  profile: {
    id: number;
    user_id: number;
    first_name: string;
    last_name: string;
    display_name: string;
    bio: string | null;
    avatar_url: string | null;
    location: string | null;
    website: string | null;
    created_at: string;
    updated_at: string;
  } | null;
}

// Define the shape of the auth context
interface AuthContextType {
  user: User | null;
  loading: boolean;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<boolean>;
  logout: () => void;
  requestPasswordReset: (email: string) => Promise<boolean>;
  resetPassword: (token: string, newPassword: string) => Promise<boolean>;
  updateUser: (user: User) => void;
}

// Define the shape of the register data
interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

// Create the auth context with a default value
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isLoading: true,
  error: null,
  isAuthenticated: false,
  login: async () => false,
  register: async () => false,
  logout: () => {},
  requestPasswordReset: async () => false,
  resetPassword: async () => false,
  updateUser: () => {},
});

// Define the props for the AuthProvider component
interface AuthProviderProps {
  children: ReactNode;
}

// Create the AuthProvider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const { data, error } = await api.auth.me();
        
        if (error) {
          clearAuthTokens();
          setUser(null);
        } else if (data) {
          setUser(data);
        }
      } catch (err) {
        console.error('Error loading user:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  // Login function
  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await api.auth.login({ email, password });
      
      if (error) {
        setError(error);
        return false;
      }
      
      if (data?.token && data?.refreshToken) {
        setToken(data.token);
        setRefreshToken(data.refreshToken);
        
        // Fetch user data
        const userResponse = await api.auth.me();
        
        if (userResponse.data) {
          setUser(userResponse.data);
          return true;
        }
      }
      
      return false;
    } catch (err) {
      setError('An unexpected error occurred');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (userData: RegisterData): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await api.auth.register(userData);
      
      if (error) {
        setError(error);
        return false;
      }
      
      if (data?.token && data?.refreshToken) {
        setToken(data.token);
        setRefreshToken(data.refreshToken);
        
        // Fetch user data
        const userResponse = await api.auth.me();
        
        if (userResponse.data) {
          setUser(userResponse.data);
          return true;
        }
      }
      
      return false;
    } catch (err) {
      setError('An unexpected error occurred');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (refreshToken) {
        await api.auth.logout(refreshToken);
      }
    } catch (err) {
      console.error('Error during logout:', err);
    } finally {
      clearAuthTokens();
      setUser(null);
    }
  };

  // Request password reset function
  const requestPasswordReset = async (email: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await api.auth.requestPasswordReset(email);
      
      if (error) {
        setError(error);
        return false;
      }
      
      return true;
    } catch (err) {
      setError('An unexpected error occurred');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Reset password function
  const resetPassword = async (token: string, newPassword: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await api.auth.resetPassword(token, newPassword);
      
      if (error) {
        setError(error);
        return false;
      }
      
      return true;
    } catch (err) {
      setError('An unexpected error occurred');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Update user function
  const updateUser = (updatedUser: User): void => {
    setUser(updatedUser);
  };

  // Create the context value
  const contextValue: AuthContextType = {
    user,
    loading,
    isLoading: loading,
    error,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    requestPasswordReset,
    resetPassword,
    updateUser,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Create a hook to use the auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

export default AuthContext;
