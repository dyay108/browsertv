import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { pb } from '../lib/pocketbase';
import { User } from '../types/pocketbase-types';
import { RecordModel } from 'pocketbase';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, passwordConfirm: string, name: string) => Promise<User>;
  logout: () => void;
  loading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

// Helper function to safely convert RecordModel to User
function recordToUser(record: RecordModel | null): User | null {
  if (!record) return null;
  
  // Ensure the record has the required User properties
  return {
    id: record.id,
    email: record.email || '',
    name: record.name || '',
    avatar: record.avatar,
    created: record.created,
    updated: record.updated,
    collectionId: record.collectionId,
    collectionName: record.collectionName,
    expand: record.expand
  } as User;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(recordToUser(pb.authStore.model));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Set initial user
    setUser(recordToUser(pb.authStore.model));
    setLoading(false);

    // Subscribe to auth state changes
    const unsubscribe = pb.authStore.onChange((_token, model) => {
      setUser(recordToUser(model));
    });

    return () => {
      // Cleanup subscription
      unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const authData = await pb.collection('users').authWithPassword(email, password);
    return recordToUser(authData.record) as User;
  };

  const register = async (email: string, password: string, passwordConfirm: string, name: string): Promise<User> => {
    const data = {
      email,
      password,
      passwordConfirm,
      name,
    };
    const record = await pb.collection('users').create(data);
    
    // Auto login after registration
    if (record) {
      const authData = await login(email, password);
      return authData;
    }
    return recordToUser(record) as User;
  };

  const logout = () => {
    pb.authStore.clear();
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      register, 
      logout, 
      loading, 
      isAuthenticated: pb.authStore.isValid 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};