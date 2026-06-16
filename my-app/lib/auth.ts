// Funcoes de apoio para ler e validar dados de autenticacao.
import type { AuthUser } from "@/types";

// Chaves usadas para salvar os dados do usuario e o token no navegador.
const USER_KEY = "auth_user";
const TOKEN_KEY = "auth_token";
const COOKIE_KEY = "auth_user";

// Recupera o usuario autenticado salvo no localStorage.
export function getAuthUser(): AuthUser | null {
  // Garante que o codigo so rode no navegador, porque localStorage nao existe no servidor.
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<AuthUser>;

    // Valida os campos obrigatorios antes de confiar nos dados salvos.
    if (
        typeof parsed.userId !== "number" ||
        typeof parsed.name !== "string" ||
        typeof parsed.email !== "string" ||
        typeof parsed.role !== "string"
    ) {
      return null;
    }

    // O token pode estar dentro do objeto do usuario ou separado em outra chave.
    const tokenFromStorage = window.localStorage.getItem(TOKEN_KEY) ?? "";
    const token =
        typeof parsed.token === "string" && parsed.token.trim()
            ? parsed.token
            : tokenFromStorage;

    // Sem token, o usuario nao deve ser considerado autenticado.
    if (!token) return null;

    // Retorna um objeto padronizado, incluindo campos opcionais quando existirem.
    return {
      userId: parsed.userId,
      name: parsed.name,
      email: parsed.email,
      role: parsed.role,
      token,
      cpf: typeof parsed.cpf === "string" ? parsed.cpf : undefined,
      dataNascimento:
          typeof parsed.dataNascimento === "string" ? parsed.dataNascimento : null,
    };
  } catch {
    // Se o JSON salvo estiver corrompido, trata como usuario nao autenticado.
    return null;
  }
}

// Salva o usuario logado no navegador para manter a sessao entre telas e recarregamentos.
export function setAuthUser(user: AuthUser) {
  if (typeof window === "undefined") return;

  // localStorage guarda os dados que o frontend usa nas chamadas e na interface.
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.localStorage.setItem(TOKEN_KEY, user.token);

  // Cookie usado pelo middleware para verificar o perfil do usuario nas rotas.
  document.cookie = `${COOKIE_KEY}=${user.role}; path=/; SameSite=Lax`;
}

// Remove todos os dados de autenticacao quando o usuario sai ou a sessao expira.
export function clearAuthUser() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(USER_KEY);
  window.localStorage.removeItem(TOKEN_KEY);

  // Expira o cookie imediatamente para apagar o role usado pelo middleware.
  document.cookie = `${COOKIE_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

// Funcao auxiliar para saber se o usuario tem perfil de administrador.
export function isAdmin(user: AuthUser | null) {
  return user?.role === "ADMIN";
}
