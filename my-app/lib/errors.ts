export function getErrorMessage(err: unknown): string {
  const fallback = "Ocorreu um erro inesperado.";
  try {
    if (err && typeof err === "object" && "message" in err) {
      const msg = String((err as { message: unknown }).message);
      const lower = msg.toLowerCase();
      const sensitive = ["duplicate", "violates", "constraint", "sql", "stack", "trace"];
      if (sensitive.some((k) => lower.includes(k))) return "Ocorreu um erro no servidor. Contate o administrador.";
      return msg || fallback;
    }
    if (typeof err === "string" && err.trim()) {
      const lower = err.toLowerCase();
      if (["duplicate", "violates", "constraint", "sql", "stack", "trace"].some((k) => lower.includes(k))) return "Ocorreu um erro no servidor. Contate o administrador.";
      return err;
    }
  } catch (e) {
    // ignore and fallback
  }
  return fallback;
}
