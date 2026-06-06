export function getErrorMessage(err: unknown): string {
  const fallback = "Ocorreu um erro inesperado.";
  const serverFallback = "Não foi possível concluir a ação agora. Tente novamente em alguns instantes.";
  const permissionFallback = "Você não tem permissão para realizar esta ação.";
  const sessionFallback = "Sua sessão expirou. Faça login novamente.";
  const notFoundFallback = "Não encontramos o recurso solicitado.";

  function sanitize(raw: string) {
    const msg = raw.trim();
    if (!msg) return fallback;

    const lower = msg.toLowerCase();

    if (
      msg.startsWith("[") ||
      msg.startsWith("{") ||
      msg.startsWith("<!DOCTYPE") ||
      lower.startsWith("<html") ||
      /<\/html>/i.test(msg)
    ) {
      return serverFallback;
    }

    if (lower.includes("sessão expirada") || lower.includes("unauthorized") || lower === "401") {
      return sessionFallback;
    }

    if (lower.includes("forbidden") || lower === "403") {
      return permissionFallback;
    }

    if (lower.includes("not found") || lower === "404") {
      return notFoundFallback;
    }

    const sensitive = [
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
      "violates",
      "constraint",
      "sql",
      "stack",
      "trace",
      "exception",
      "pg_",
      "error code",
      "at ",
    ];

    if (sensitive.some((k) => lower.includes(k))) return serverFallback;

    return msg;
  }

  try {
    if (err && typeof err === "object" && "message" in err) {
      return sanitize(String((err as { message: unknown }).message));
    }
    if (err && typeof err === "object") {
      return serverFallback;
    }
    if (typeof err === "string" && err.trim()) {
      return sanitize(err);
    }
  } catch {
    // ignore and fallback
  }
  return fallback;
}
