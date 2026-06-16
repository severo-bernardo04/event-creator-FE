"use client";

// Tela para solicitar codigo de recuperacao de senha.
import { Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getErrorMessage } from "@/lib/errors";
import { requestPasswordResetCode } from "@/lib/passwordReset";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    setError(null);
    setSuccess(null);

    if (!emailRegex.test(normalizedEmail)) {
      setError("Informe um e-mail válido.");
      return;
    }

    setLoading(true);
    try {
      const response = await requestPasswordResetCode(normalizedEmail);
      setSuccess(response.message || "Enviamos um código de verificação para o seu e-mail.");
      window.setTimeout(() => {
        router.push(`/reset-password?email=${encodeURIComponent(normalizedEmail)}`);
      }, 900);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-10 text-white">
      <Link
        href="/login"
        className="absolute left-3 top-3 z-20 rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-bold text-white hover:border-slate-500 hover:bg-slate-800"
      >
        Voltar
      </Link>
      <div className="floating-orb left-10 top-20 h-36 w-36 bg-primary/45" />
      <div className="floating-orb bottom-12 right-8 h-44 w-44 bg-secondary/35" />

      <section className="glass-card relative z-10 grid w-full max-w-5xl overflow-hidden rounded-[34px] md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="grid-pattern absolute inset-0 opacity-15" />

        <div className="relative z-[1] flex flex-col justify-between border-b border-white/10 bg-gradient-to-br from-primary/[0.12] via-transparent to-secondary/[0.06] p-8 sm:p-10 md:border-b-0 md:border-r">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-lg font-black text-white shadow-lg shadow-primary/30">
                E
              </span>
              <div>
                <p className="text-lg font-bold tracking-tight text-white">Event Creator</p>
                <p className="text-xs text-slate-400">Recuperação segura de acesso</p>
              </div>
            </div>
            <h1 className="mt-8 text-2xl font-bold leading-tight text-white sm:text-3xl">
              Receba um código para redefinir sua senha
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-slate-300/95">
              Use o e-mail da sua conta. Se ele estiver cadastrado, enviaremos um código de verificação para continuar.
            </p>
          </div>
          <div className="mt-8 flex gap-3 text-sm text-slate-200/95 md:mt-10">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-secondary">
              <ShieldCheck className="h-4 w-4" aria-hidden />
            </span>
            <span>O código deve ser usado na próxima etapa junto com a nova senha.</span>
          </div>
        </div>

        <div className="relative z-[1] p-8 sm:p-10">
          <div className="mx-auto flex w-full max-w-md flex-col gap-8">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-primary/90">Senha</p>
              <h2 className="mt-2 text-2xl font-bold">Esqueci minha senha</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300/85">
                Informe seu e-mail para receber o código.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-200">E-mail</span>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    placeholder="voce@email.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-2xl border border-white/12 bg-white/8 py-3.5 pl-11 pr-4 text-white placeholder:text-slate-400 focus:border-secondary focus:bg-white/10 focus:shadow-[0_0_0_4px_rgba(255,212,71,0.12)]"
                  />
                </div>
              </label>

              {error ? (
                <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">
                  {error}
                </div>
              ) : null}

              {success ? (
                <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300">
                  {success}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-primary px-6 py-4 text-base font-bold text-white shadow-[0_18px_35px_rgba(31,111,255,0.35)] hover:-translate-y-1 hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Enviando..." : "Enviar código"}
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
