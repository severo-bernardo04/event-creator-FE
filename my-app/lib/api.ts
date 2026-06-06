import { clearAuthUser, getAuthUser } from "@/lib/auth";

function pickMessage(payload: unknown, fallback: string) {
  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  if (payload && typeof payload === "object") {
    const maybe = payload as Record<string, unknown>;

    const msg =
        maybe.message ??
        maybe.error ??
        maybe.erro ??
        maybe.detail;

    if (typeof msg === "string" && msg.trim()) {
      return msg;
    }
  }

  return fallback;
}

function sanitizeMessage(msg: string, status?: number) {
  if (!msg) return msg;

  const trimmed = msg.trim();
  const lower = msg.toLowerCase();

  if (
    trimmed.startsWith("[") ||
    trimmed.startsWith("{") ||
    trimmed.startsWith("<!DOCTYPE") ||
    trimmed.toLowerCase().startsWith("<html") ||
    /<\/html>/i.test(trimmed)
  ) {
    return "Não foi possível concluir a ação agora. Tente novamente em alguns instantes.";
  }

  if (status === 401) {
    return "Sua sessão expirou. Faça login novamente.";
  }

  if (status === 403) {
    return "Você não tem permissão para realizar esta ação.";
  }

  if (status === 404) {
    return "Não encontramos o recurso solicitado.";
  }

  if (status === 409) {
    return "Não foi possível concluir a ação porque já existe um registro semelhante.";
  }

  if (status && status >= 500) {
    return "Não foi possível concluir a ação agora. Tente novamente em alguns instantes.";
  }

  if (lower === "internal server error") {
    return "Não foi possível concluir a ação agora. Tente novamente em alguns instantes.";
  }

  const sensitiveKeywords = [
    "cannot invoke",
    "nullpointer",
    "null pointer",
    "authentication.getname",
    "auth\" is null",
    "org.springframework",
    "java.",
    "jakarta.",
    "hibernate",
    "servlet",
    "bean",
    "methodargument",
    "illegalstate",
    "illegalargument",
    "duplicate",
    "duplicate key",
    "unique constraint",
    "violates",
    "constraint",
    "sql",
    "syntax",
    "stack",
    "trace",
    "exception",
    "pg_",
    "error code",
    "at ",
  ];

  if (sensitiveKeywords.some((k) => lower.includes(k))) {
    return "Não foi possível concluir a ação agora. Tente novamente em alguns instantes.";
  }

  return msg;
}

async function parseJsonSafe(res: Response) {
  const text = await res.text();

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    const t = text.trim();

    if (
        t.startsWith("<!DOCTYPE") ||
        t.toLowerCase().startsWith("<html") ||
        /<\/html>/i.test(t)
    ) {
      return null;
    }

    return text;
  }
}

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8080";

type ApiFetchOptions = RequestInit & {
  json?: unknown;
};

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

function buildApiRequest(init?: ApiFetchOptions) {
  const headers = new Headers(init?.headers);

  headers.set("Accept", "application/json");

  const token = getAuthUser()?.token;

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let body = init?.body;

  if (init && "json" in init) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.json);
  }

  return { headers, body };
}

export async function apiFetch<T>(
    path: string,
    init?: ApiFetchOptions
): Promise<T> {
  const { headers, body } = buildApiRequest(init);

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    body,
    credentials: "include",
  });

  const contentType = res.headers.get("content-type") ?? "";

  if (contentType.toLowerCase().includes("text/html")) {
    throw new Error("Falha na comunicação com a API.");
  }

  if (res.status === 401) {
    clearAuthUser();

    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }

    throw new Error("Sessão expirada. Faça login novamente.");
  }

  if (res.status >= 400) {
    const payload = await parseJsonSafe(res);

    const rawMessage = pickMessage(
        payload,
        res.statusText || "Erro na requisição"
    );

    const message = sanitizeMessage(rawMessage, res.status);

    throw new ApiError(message, res.status, payload);
  }

  return (await parseJsonSafe(res)) as T;
}
