"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { clearAuthUser, getAuthUser, isAdmin as isUserAdmin, setAuthUser } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";
import type { AuthUser } from "@/types";

type LoginResponse = {
  message: string;
  userId?: number;
  name: string;
  email: string;
  role: string;
  token: string;
  cpf?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  isLogged: boolean;
  isAdmin: boolean;
  login: (data: LoginResponse) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setUser(getAuthUser());
      setMounted(true);
    });
  }, []);

  function login(data: LoginResponse) {
    const authUser: AuthUser = {
      userId: typeof data.userId === "number" ? data.userId : 0,
      name: data.name,
      email: data.email,
      role: data.role,
      token: data.token,
      cpf: data.cpf,
    };
    setAuthUser(authUser);
    setUser(authUser);
  }

  async function logout() {
    try {
      await apiFetch("/users/logout", { method: "POST" });
    } catch {
      // sessão pode já estar expirada
    }
    clearAuthUser();
    setUser(null);
  }

  async function refreshUser() {
    const local = getAuthUser();
    if (!local) {
      setUser(null);
      return;
    }
    try {
      const me = await apiFetch<{
        userId?: number;
        name: string;
        email: string;
        role: string;
        cpf?: string;
      }>("/users/me", { method: "GET" });
      const refreshed: AuthUser = {
        userId: typeof me.userId === "number" ? me.userId : local.userId,
        name: me.name,
        email: me.email,
        role: me.role,
        token: local.token,
        cpf: me.cpf ?? local.cpf,
      };
      setAuthUser(refreshed);
      setUser(refreshed);
    } catch (err: unknown) {
      clearAuthUser();
      setUser(null);
      throw new Error(getErrorMessage(err));
    }
  }

  const value = useMemo<AuthContextValue>(
      () => ({
        user,
        isLogged: Boolean(user),
        isAdmin: isUserAdmin(user),
        login,
        logout,
        refreshUser,
      }),
      [user],
  );

  if (!mounted) return null;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  }
  return context;
}
