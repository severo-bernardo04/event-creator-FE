"use client";

import { Calendar, Megaphone, Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { getErrorMessage } from "@/lib/errors";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-10 text-white">
      <Link
        href="/"
        className="absolute top-3 left-3 z-20 rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-bold text-white hover:border-slate-500 hover:bg-slate-800"
      >
        Voltar
      </Link>
      <div className="floating-orb top-20 left-10 h-36 w-36 bg-primary/55" />
      <div
        className="floating-orb right-8 bottom-12 h-44 w-44 bg-secondary/45"
        style={{ animationDelay: "1.5s" }}
      />

      <section className="glass-card relative z-10 grid w-full max-w-5xl overflow-hidden rounded-[34px] md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="grid-pattern absolute inset-0 opacity-15" />

        <div className="relative z-[1] flex flex-col justify-between border-b border-white/10 bg-gradient-to-br from-primary/[0.12] via-transparent to-secondary/[0.06] p-8 sm:p-10 md:border-b-0 md:border-r">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-lg font-black text-white shadow-lg shadow-primary/30">
                E
              </span>
              <div>
                <p className="text-lg font-bold tracking-tight text-white">
                  Event Creator
                </p>
                <p className="text-xs text-slate-400">
                  Onde eventos e pessoas se encontram
                </p>
              </div>
            </div>
            <h2 className="mt-8 text-2xl font-bold leading-tight text-white sm:text-3xl">Encontre eventos, inscreva-se e acompanhe tudo em um lugar</h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-300/95">
              Faça login para acessar suas inscrições, descobrir novos eventos e acompanhar as oportunidades abertas na plataforma.
            </p>
            <ul className="mt-8 space-y-4">
              <li className="flex gap-3 text-sm text-slate-200/95">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-secondary">
                  <Search className="h-4 w-4" aria-hidden />
                </span>
                <span>
                  <span className="font-semibold text-white">Descobrir eventos</span> por tema, data e local com navegação simples.
                </span>
              </li>
              <li className="flex gap-3 text-sm text-slate-200/95">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-secondary">
                  <Calendar className="h-4 w-4" aria-hidden />
                </span>
                <span>
                  <span className="font-semibold text-white">Gerenciar inscrições</span> em um só lugar, com confirmação rápida.
                </span>
              </li>
              <li className="flex gap-3 text-sm text-slate-200/95">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-secondary">
                  <Megaphone className="h-4 w-4" aria-hidden />
                </span>
                <span>
                  <span className="font-semibold text-white">Acompanhar novidades</span> com páginas atualizadas em tempo real.
                </span>
              </li>
            </ul>
          </div>
          <p className="mt-8 text-xs leading-relaxed text-slate-500 md:mt-10">
            O login conecta você às funções do site de acordo com o seu perfil.
          </p>
        </div>

        <div className="relative z-[1] p-8 sm:p-10">
          <div className="mx-auto flex w-full max-w-md flex-col gap-8">
            <div className="space-y-3">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-primary/90">
                  Login
                </p>
                <h1 className="mt-2 text-2xl font-bold">Entrar</h1>
                <p className="mt-2 text-sm leading-6 text-slate-300/85">
                  E-mail e senha da sua conta.
                </p>
              </div>
            </div>

            <form
              className="space-y-5"
              onSubmit={async (e) => {
                e.preventDefault();
                setError(null); setEmailError(null); setPasswordError(null);
                if (!email.trim()) setEmailError("E-mail é obrigatório.");
                if (!password.trim()) setPasswordError("Senha é obrigatória.");
                if (!email.trim() || !password.trim()) return;
                setLoading(true);
                try {
                  const res = await apiFetch<{
                    message: string;
                    userId: number;
                    name: string;
                    email: string;
                    role: string;
                    token: string;
                  }>("/users/login", {
                    method: "POST",
                    json: { email, password },
                  });
                  login(res);
                  const next = searchParams.get("next");
                  const dest =
                    next && next.startsWith("/") && !next.startsWith("//")
                      ? next
                      : "/";
                  router.push(dest);
                } catch (err: unknown) {
                  setError(getErrorMessage(err));
                } finally {
                  setLoading(false);
                }
              }}
            >
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-200">
                  E-mail
                </span>
                <input
                  type="email"
                  placeholder="voce@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3.5 text-white placeholder:text-slate-400 focus:border-secondary focus:bg-white/10 focus:shadow-[0_0_0_4px_rgba(255,212,71,0.12)]"
                />
                {emailError ? <p className="text-xs font-semibold text-red-300">{emailError}</p> : null}
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-200">
                  Senha
                </span>
                <input
                  type="password"
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3.5 text-white placeholder:text-slate-400 focus:border-secondary focus:bg-white/10 focus:shadow-[0_0_0_4px_rgba(255,212,71,0.12)]"
                />
                {passwordError ? <p className="text-xs font-semibold text-red-300">{passwordError}</p> : null}
              </label>

              {error ? (
                <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">
                  {error}
                </div>
              ) : null}

              <div className="flex items-center justify-between gap-3 text-sm text-slate-300/90">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" className="h-4 w-4 accent-secondary" />
                  Lembrar de mim
                </label>
                <a
                  href="#"
                  className="font-medium text-secondary hover:text-yellow-300"
                >
                  Esqueci minha senha
                </a>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-primary px-6 py-4 text-base font-bold text-white shadow-[0_18px_35px_rgba(31,111,255,0.35)] hover:-translate-y-1 hover:bg-blue-500"
              >
                {loading ? "Entrando..." : "Entrar"}
              </button>
            </form>

            <p className="text-center text-sm text-slate-300/80">
              Ainda não tem conta?{" "}
              <Link
                href={
                  searchParams.get("next")
                    ? `/register?next=${encodeURIComponent(searchParams.get("next")!)}`
                    : "/register"
                }
                className="font-semibold text-secondary hover:text-yellow-300"
              >
                Criar cadastro
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
          Carregando…
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
