// Chama a API para solicitar e concluir redefinicao de senha.
import { apiFetch } from "@/lib/api";

export async function requestPasswordResetCode(email: string) {
  return apiFetch<{ message?: string }>("/users/forgot-password", {
    method: "POST",
    json: { email },
  });
}

export async function resetPasswordWithCode(email: string, code: string, password: string) {
  return apiFetch<{ message?: string }>("/users/reset-password", {
    method: "POST",
    json: { email, code, password },
  });
}
