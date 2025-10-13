import React, { createContext, useContext, useMemo, useState } from 'react';
import { secureGet } from '../lib/secureStorage';

const AuthContext = createContext({ user: null, login: () => {}, logout: () => {}, checkAuthStatus: () => {} });

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const login = (nextUser) => {
    setUser(nextUser || { id: 'demo', name: 'Demo User' });
  };

  const logout = () => setUser(null);

  const checkAuthStatus = async () => {
    try {
      const token = await secureGet('authToken');
      const userData = await secureGet('userData');
      
      if (token && userData) {
        const parsedUser = typeof userData === 'string' ? JSON.parse(userData) : userData;
        setUser(parsedUser);
        return true;
      } else {
        setUser(null);
        return false;
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setUser(null);
      return false;
    }
  };

  const value = useMemo(() => ({ user, login, logout, checkAuthStatus }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);