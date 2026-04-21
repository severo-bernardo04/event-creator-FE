"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function OrganizerPage() {
  const router = useRouter();

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-10 text-white">
      <div className="floating-orb top-16 left-8 h-36 w-36 bg-secondary/40" />
      <div
        className="floating-orb right-8 bottom-12 h-44 w-44 bg-primary/50"
        style={{ animationDelay: "1.2s" }}
      />

      <section className="glass-card relative z-10 w-full max-w-2xl overflow-hidden rounded-[34px] p-8 sm:p-10 md:p-12">
        <div className="grid-pattern absolute inset-0 opacity-15" />

        <div className="relative mx-auto flex w-full max-w-xl flex-col gap-8">
          <div className="space-y-3">
            <Link
              href="/"
              className="inline-flex text-sm font-medium text-slate-300 hover:text-secondary"
            >
              Voltar para a home
            </Link>
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-secondary/95">
                Organizador
              </p>
              <h1 className="mt-2 text-3xl font-bold">
                Solicitar acesso ao painel
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-300/85">
                Preencha nome e e-mail para continuar para o dashboard de
                administração.
              </p>
            </div>
          </div>

          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              router.push("/admin");
            }}
          >
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-200">Nome</span>
              <input
                type="text"
                placeholder="Seu nome"
                required
                className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3.5 text-white placeholder:text-slate-400 focus:border-primary focus:bg-white/10 focus:shadow-[0_0_0_4px_rgba(31,111,255,0.14)]"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-200">E-mail</span>
              <input
                type="email"
                placeholder="voce@email.com"
                required
                className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3.5 text-white placeholder:text-slate-400 focus:border-primary focus:bg-white/10 focus:shadow-[0_0_0_4px_rgba(31,111,255,0.14)]"
              />
            </label>

            <button
              type="submit"
              className="w-full rounded-2xl bg-secondary px-6 py-4 text-base font-bold text-slate-950 shadow-[0_18px_35px_rgba(255,212,71,0.28)] hover:-translate-y-1 hover:bg-yellow-300"
            >
              Continuar para o dashboard
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
