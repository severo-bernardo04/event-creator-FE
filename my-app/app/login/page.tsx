"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-10 text-white">
      <div className="floating-orb top-20 left-10 h-36 w-36 bg-primary/55" />
      <div
        className="floating-orb right-8 bottom-12 h-44 w-44 bg-secondary/45"
        style={{ animationDelay: "1.5s" }}
      />

      <section className="glass-card relative z-10 grid w-full max-w-6xl overflow-hidden rounded-[34px] md:grid-cols-[1fr_0.95fr]">
        <div className="grid-pattern absolute inset-0 opacity-15" />

        <div className="relative hidden flex-col justify-between border-r border-white/10 p-10 md:flex">
          <div className="space-y-5">
            <span className="inline-flex rounded-full border border-secondary/30 bg-secondary/10 px-4 py-2 text-sm font-medium text-secondary">
              Bem-vindo de volta
            </span>
            <h1 className="max-w-md text-5xl font-black leading-tight">
              Seu próximo grande evento começa aqui.
            </h1>
            <p className="max-w-md text-base leading-7 text-slate-200/85">
              Faça login para acessar a gestão dos seus eventos, acompanhar
              inscrições e deixar cada experiência ainda mais especial.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/6 p-6">
            <p className="text-sm uppercase tracking-[0.28em] text-slate-300/70">
              Destaque
            </p>
            <p className="mt-3 text-2xl font-bold text-secondary">
              Design vibrante, organizado e moderno.
            </p>
          </div>
        </div>

        <div className="relative p-8 sm:p-10 md:p-12">
          <div className="mx-auto flex w-full max-w-md flex-col gap-8">
            <div className="space-y-3">
              <Link
                href="/"
                className="inline-flex text-sm font-medium text-slate-300 hover:text-secondary"
              >
                Voltar para a home
              </Link>
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-primary/90">
                  Login
                </p>
                <h2 className="mt-2 text-3xl font-bold">Acesse sua conta</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300/85">
                  Entre com seus dados para continuar organizando seus eventos.
                </p>
              </div>
            </div>

            <form
              className="space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                // Por enquanto é só front: ao enviar, vamos para a home.
                router.push("/");
              }}
            >
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-200">
                  E-mail
                </span>
                <input
                  type="email"
                  placeholder="voce@email.com"
                  className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3.5 text-white placeholder:text-slate-400 focus:border-secondary focus:bg-white/10 focus:shadow-[0_0_0_4px_rgba(255,212,71,0.12)]"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-200">
                  Senha
                </span>
                <input
                  type="password"
                  placeholder="Digite sua senha"
                  className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3.5 text-white placeholder:text-slate-400 focus:border-secondary focus:bg-white/10 focus:shadow-[0_0_0_4px_rgba(255,212,71,0.12)]"
                />
              </label>

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
                className="w-full rounded-2xl bg-primary px-6 py-4 text-base font-bold text-white shadow-[0_18px_35px_rgba(31,111,255,0.35)] hover:-translate-y-1 hover:bg-blue-500"
              >
                Entrar
              </button>
            </form>

            <p className="text-center text-sm text-slate-300/80">
              Ainda não tem conta?{" "}
              <Link href="/register" className="font-semibold text-secondary hover:text-yellow-300">
                Criar cadastro
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
