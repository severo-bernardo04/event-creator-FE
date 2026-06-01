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

function sanitizeMessage(msg: string) {
  if (!msg) return msg;

  const lower = msg.toLowerCase();

  const sensitiveKeywords = [
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
  ];

  if (sensitiveKeywords.some((k) => lower.includes(k))) {
    return "Ocorreu um erro no servidor. Contate o administrador.";
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

const BASE_URL = "http://localhost:8080";

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

  const res = await fetch(`${BASE_URL}${path}`, {
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

    const message = sanitizeMessage(rawMessage);

    throw new ApiError(message, res.status, payload);
  }

  return (await parseJsonSafe(res)) as T;
}
