"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getCurrentUser,
  loadUserFromStorage,
  login as authLogin,
  logout as authLogout,
  Roles,
  subscribeAuth,
} from "./authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Load once on mount
    const loaded = loadUserFromStorage() || getCurrentUser();
    if (loaded) {
      setUser(loaded);
    }
    setInitializing(false);

    const unsubscribe = subscribeAuth(setUser);
    return unsubscribe;
  }, []);

  const handleLogin = async (credentials) => {
    const loggedIn = await authLogin(credentials);
    setUser(loggedIn);
    return loggedIn;
  };

  const handleLogout = async () => {
    await authLogout();
    setUser(null);
    // After logout, navigate to login page
    try {
      router.replace("/login");
    } catch {
      // ignore routing errors in non-browser contexts
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role ?? null,
        isAuthenticated: !!user,
        initializing,
        Roles,
        login: handleLogin,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
