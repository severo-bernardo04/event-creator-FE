"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-10 text-white">
      <div className="floating-orb top-16 left-8 h-36 w-36 bg-secondary/40" />
      <div
        className="floating-orb right-8 bottom-12 h-44 w-44 bg-primary/50"
        style={{ animationDelay: "1.2s" }}
      />

      <section className="glass-card relative z-10 grid w-full max-w-6xl overflow-hidden rounded-[34px] md:grid-cols-[0.92fr_1.08fr]">
        <div className="grid-pattern absolute inset-0 opacity-15" />

        <div className="relative hidden border-r border-white/10 p-10 md:block">
          <span className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-blue-200">
            Novo cadastro
          </span>
          <h1 className="mt-6 max-w-sm text-5xl font-black leading-tight">
            Organize eventos com presença marcante.
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-slate-200/85">
            Crie sua conta e tenha um painel preparado para divulgar eventos,
            controlar participantes e transmitir uma identidade visual moderna.
          </p>

          <div className="mt-10 grid gap-4">
            <div className="rounded-3xl border border-white/10 bg-white/6 p-5">
              <p className="text-sm uppercase tracking-[0.26em] text-slate-300/75">
                Benefícios
              </p>
              <p className="mt-3 text-lg font-semibold text-secondary">
                Cadastro rápido, visual elegante e navegação intuitiva.
              </p>
            </div>
          </div>
        </div>

        <div className="relative p-8 sm:p-10 md:p-12">
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
            <div className="space-y-3">
              <Link
                href="/"
                className="inline-flex text-sm font-medium text-slate-300 hover:text-secondary"
              >
                Voltar para a home
              </Link>
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-secondary/95">
                  Registro
                </p>
                <h2 className="mt-2 text-3xl font-bold">Crie sua conta</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300/85">
                  Preencha seus dados para começar a publicar e administrar
                  eventos.
                </p>
              </div>
            </div>

            <form
              className="grid gap-5 md:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                // Por enquanto é só front: ao enviar, vamos para a home.
                router.push("/");
              }}
            >
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-200">
                  Primeiro nome
                </span>
                <input
                  type="text"
                  placeholder="Seu primeiro nome"
                  className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3.5 text-white placeholder:text-slate-400 focus:border-primary focus:bg-white/10 focus:shadow-[0_0_0_4px_rgba(31,111,255,0.14)]"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-200">
                  Sobrenome
                </span>
                <input
                  type="text"
                  placeholder="Seu sobrenome"
                  className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3.5 text-white placeholder:text-slate-400 focus:border-primary focus:bg-white/10 focus:shadow-[0_0_0_4px_rgba(31,111,255,0.14)]"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-200">
                  E-mail
                </span>
                <input
                  type="email"
                  placeholder="voce@email.com"
                  className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3.5 text-white placeholder:text-slate-400 focus:border-primary focus:bg-white/10 focus:shadow-[0_0_0_4px_rgba(31,111,255,0.14)]"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-200">
                  Telefone
                </span>
                <input
                  type="tel"
                  placeholder="(11) 99999-9999"
                  className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3.5 text-white placeholder:text-slate-400 focus:border-primary focus:bg-white/10 focus:shadow-[0_0_0_4px_rgba(31,111,255,0.14)]"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-200">CPF</span>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3.5 text-white placeholder:text-slate-400 focus:border-primary focus:bg-white/10 focus:shadow-[0_0_0_4px_rgba(31,111,255,0.14)]"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-200">
                  Senha
                </span>
                <input
                  type="password"
                  placeholder="Crie uma senha forte"
                  className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3.5 text-white placeholder:text-slate-400 focus:border-primary focus:bg-white/10 focus:shadow-[0_0_0_4px_rgba(31,111,255,0.14)]"
                />
              </label>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="w-full rounded-2xl bg-secondary px-6 py-4 text-base font-bold text-slate-950 shadow-[0_18px_35px_rgba(255,212,71,0.28)] hover:-translate-y-1 hover:bg-yellow-300"
                >
                  Criar conta
                </button>
              </div>
            </form>

            <p className="text-center text-sm text-slate-300/80">
              Já possui conta?{" "}
              <Link href="/login" className="font-semibold text-secondary hover:text-yellow-300">
                Fazer login
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
