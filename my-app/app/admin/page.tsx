import Link from "next/link";

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <header className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
          <p className="text-sm uppercase tracking-[0.2em] text-secondary">
            Dashboard Admin
          </p>
          <h1 className="mt-3 text-3xl font-black text-white">
            Painel do organizador
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Esta e uma versao inicial sem dados reais. Aqui ficara a gestao de
            eventos, inscricoes e metricas.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wider text-slate-400">
              Total de eventos
            </p>
            <p className="mt-2 text-2xl font-bold">0</p>
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wider text-slate-400">
              Inscricoes
            </p>
            <p className="mt-2 text-2xl font-bold">0</p>
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wider text-slate-400">
              Proximos eventos
            </p>
            <p className="mt-2 text-2xl font-bold">0</p>
          </article>
        </section>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold hover:border-slate-500 hover:bg-slate-800"
          >
            Voltar para a home
          </Link>
          <Link
            href="/organizer"
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
          >
            Editar cadastro rapido
          </Link>
        </div>
      </div>
    </main>
  );
}
