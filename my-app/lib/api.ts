import { clearAuthUser, getAuthUser } from "@/lib/auth";

function pickMessage(payload: unknown, fallback: string) {
  if (typeof payload === "string" && payload.trim()) return payload;
  if (payload && typeof payload === "object") {
    const maybe = payload as Record<string, unknown>;
    const msg =
      maybe.message ??
      maybe.error ??
      maybe.erro ??
      maybe.detail;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  return fallback;
}

async function parseJsonSafe(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_API_URL não está definida.");
  }

  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  headers.set("Content-Type", "application/json");

  const token = getAuthUser()?.token;
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let body = init?.body;
  if (init && "json" in init) {
    body = JSON.stringify(init.json);
  }

  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
    body,
    credentials: "include",
  });

  if (res.status === 401) {
    clearAuthUser();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  if (res.status >= 400) {
    const payload = await parseJsonSafe(res);
    const message = pickMessage(payload, res.statusText || "Erro na requisição");
    throw new Error(message);
  }

  return (await parseJsonSafe(res)) as T;
}
