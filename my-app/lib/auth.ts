import type { AuthUser } from "@/types";

const USER_KEY = "auth_user";
const TOKEN_KEY = "auth_token";
const COOKIE_KEY = "auth_user";

export function getAuthUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AuthUser>;
    if (
        typeof parsed.userId !== "number" ||
        typeof parsed.name !== "string" ||
        typeof parsed.email !== "string" ||
        typeof parsed.role !== "string"
    ) {
      return null;
    }
    const tokenFromStorage = window.localStorage.getItem(TOKEN_KEY) ?? "";
    const token =
        typeof parsed.token === "string" && parsed.token.trim()
            ? parsed.token
            : tokenFromStorage;
    if (!token) return null;
    return {
      userId: parsed.userId,
      name: parsed.name,
      email: parsed.email,
      role: parsed.role,
      token,
    };
  } catch {
    return null;
  }
}

export function setAuthUser(user: AuthUser) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.localStorage.setItem(TOKEN_KEY, user.token);
  // Salva o role no cookie para o middleware verificar
  document.cookie = `${COOKIE_KEY}=${user.role}; path=/; SameSite=Lax`;
}

export function clearAuthUser() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(USER_KEY);
  window.localStorage.removeItem(TOKEN_KEY);
  document.cookie = `${COOKIE_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

export function isAdmin(user: AuthUser | null) {
  return user?.role === "ADMIN";
}