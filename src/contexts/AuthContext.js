import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { getIpc } from '../utils/electronUtils';

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [databaseReady, setDatabaseReady] = useState(false);

  useEffect(() => {
    // Listen for database ready signal from main process
    const ipc = getIpc();
    if (ipc && ipc.on) {
      ipc.on('database-ready', () => {
        console.log('AuthContext: Database ready signal received');
        setDatabaseReady(true);
      });
    }

    // In development, assume database is ready after a short delay
    if (process.env.NODE_ENV === 'development') {
      setTimeout(() => {
        setDatabaseReady(true);
      }, 100); // Reduced from 500ms to 100ms
    }

    return () => {
      if (ipc && ipc.removeAllListeners) {
        ipc.removeAllListeners('database-ready');
      }
    };
  }, []);

  useEffect(() => {
    // Only check auth after database is ready
    if (!databaseReady) return;

    const checkAuth = async () => {
      console.log('AuthContext: Starting auth check');
      const startTime = performance.now();
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
        const endTime = performance.now();
        console.log(`AuthContext: Auth check completed in ${endTime - startTime}ms`);
      } catch (error) {
        console.log('AuthContext: No user logged in');
        const endTime = performance.now();
        console.log(`AuthContext: Auth check failed in ${endTime - startTime}ms`);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [databaseReady]);

  const login = async (username, password) => {
    console.log('AuthContext: Starting login process');
    const startTime = performance.now();
    try {
      const user = await authService.login(username, password);
      console.log('AuthContext: Setting user state:', user);
      setUser(user);
      const endTime = performance.now();
      console.log(`AuthContext: Login successful in ${endTime - startTime}ms, user set to:`, user);
      return { success: true };
    } catch (error) {
      const endTime = performance.now();
      console.log(`AuthContext: Login failed in ${endTime - startTime}ms - ${error.message}`);
      // Add timeout fallback for stuck login
      if (endTime - startTime > 5000) { // 5 second timeout
        console.log('AuthContext: Login timeout detected, forcing completion');
        return { success: false, error: 'Login timeout - please try again' };
      }

      // Provide user-friendly error messages
      let errorMessage = 'Login failed. Please try again.';
      if (error.message.includes('Invalid username or password')) {
        errorMessage = 'Wrong username or password. Please check your credentials and try again.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Connection timeout. Please check your internet connection and try again.';
      } else if (error.message.includes('database') || error.message.includes('IPC') || error.message.includes('invoke')) {
        errorMessage = 'Database connection error. Please ensure the database service is running and try again.';
      } else if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
        errorMessage = 'Unable to connect to the database. Please check if the database service is running.';
      } else if (error.message.includes('No handler registered')) {
        errorMessage = 'Application service unavailable. Please restart the application and try again.';
      }

      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    // For single-unit application, just clear the user state
    // No need to call authService.logout() since we want to keep the user in database
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
