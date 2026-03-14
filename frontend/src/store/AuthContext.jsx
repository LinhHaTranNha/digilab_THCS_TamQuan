import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
} from '../services/apiService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const hydrateUser = async () => {
      const user = await getCurrentUser();
      if (isMounted) {
        setCurrentUser(user);
        setLoading(false);
      }
    };

    hydrateUser();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (identifier, password) => {
    const user = await loginUser(identifier, password);
    setCurrentUser(user);
    return user;
  };

  const register = async (payload) => {
    const user = await registerUser(payload);
    setCurrentUser(user);
    return user;
  };

  const logout = () => {
    logoutUser();
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: Boolean(currentUser),
        loading,
        login,
        logout,
        register,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return context;
}