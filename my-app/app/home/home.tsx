"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { normalizeEventList, type ApiEventNorm } from "@/lib/eventsFromApi";
import { useAuth } from "@/context/AuthContext";

export function Home() {
  const { isAdmin } = useAuth();
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [events, setEvents] = useState<ApiEventNorm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch<unknown>("/events", { method: "GET" });
        setEvents(normalizeEventList(data));
      } catch (err: unknown) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const categories = useMemo(() => {
    const catSet = new Set<string>();
    events.forEach((ev) => {
      if (ev.category && ev.category.trim()) {
        catSet.add(ev.category.trim());
      }
    });
    return ["Todos", ...Array.from(catSet)];
  }, [events]);

  const filteredEvents = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return events.filter((ev) => {
      const isCategoryMatch =
        activeCategory === "Todos" ||
        (ev.category ?? "").toLowerCase() === activeCategory.toLowerCase();

      if (!isCategoryMatch) return false;

      if (!query) return true;

      const text = [ev.title, ev.description, ev.category]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const participantMatch = ev.participants.some((participant) =>
        participant.name.toLowerCase().includes(query),
      );

      return text.includes(query) || participantMatch;
    });
  }, [activeCategory, events, searchTerm]);

  const displayEvents = useMemo(() => {
    if (!searchTerm.trim()) {
      return filteredEvents.slice(0, 6);
    }
    return filteredEvents;
  }, [filteredEvents, searchTerm]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-950 text-slate-100">
      

      <main className="flex w-full flex-1 flex-col">
        
        <section className="flex w-full flex-1 flex-col justify-center border-b border-slate-800 px-4 py-16 sm:px-6 sm:py-20 lg:px-10">
          <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-10">
            <p className="text-sm font-bold uppercase tracking-widest text-secondary">
              Eventos ao vivo · ingressos · organização
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl xl:text-7xl">
              Descubra eventos. Publique o seu. Tudo em um só lugar.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-400 sm:text-xl">
              Para quem compra ingresso ou para quem produz: uma experiência
              direta, em tela cheia, com o visual azul e amarelo da marca.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/eventos"
                className="inline-flex items-center justify-center rounded-xl bg-primary px-8 py-4 text-base font-bold text-white shadow-lg shadow-primary/35 hover:brightness-110"
              >
                Ver eventos
              </Link>
              {/* Botão só aparece para ADMIN */}
              {isAdmin && (
                  <Link
                      href="/admin"
                      className="inline-flex items-center justify-center rounded-xl border-2 border-secondary bg-secondary/10 px-8 py-4 text-base font-bold text-secondary hover:bg-secondary/20"
                  >
                    Meu painel
                  </Link>
              )}
            </div>
          </div>
        </section>

        {/* Lista de eventos — largura total, fundo levemente diferente */}
        <section
          id="eventos"
          className="w-full border-b border-slate-800 bg-slate-900/50 px-4 py-16 sm:px-6 sm:py-20 lg:px-10"
        >
          <div className="mx-auto w-full max-w-[1600px]">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-3">
                <div>
                  <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                    Eventos em destaque
                  </h2>
                  <p className="mt-2 max-w-2xl text-slate-400">
                    Busque palestras, atividades ou participantes na plataforma.
                  </p>
                </div>
                <div className="max-w-2xl">
                  <label htmlFor="home-search" className="sr-only">
                    Buscar participante, palestra ou atividade
                  </label>
                  <div className="relative">
                    <input
                      id="home-search"
                      type="search"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Buscar participante, palestra ou atividade"
                      className="w-full rounded-3xl border border-slate-800 bg-slate-950/90 px-5 py-4 text-sm text-slate-100 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
                      🔎
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => {
                  const isActive = activeCategory === cat;

                  return (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={
                        isActive
                          ? "rounded-full bg-primary/20 px-4 py-2 text-xs font-bold text-primary"
                          : "rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white"
                      }
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {loading
                ? Array.from({ length: 6 }).map((_, idx) => (
                    <article key={idx} className="animate-pulse overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-4">
                      <div className="aspect-[16/10] rounded-xl bg-slate-800" />
                      <div className="mt-4 h-5 w-3/4 rounded bg-slate-800" />
                      <div className="mt-2 h-4 w-full rounded bg-slate-800" />
                      <div className="mt-4 h-10 w-full rounded-xl bg-slate-800" />
                    </article>
                  ))
                : displayEvents.map((ev) => (
                <article
                  key={ev.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-xl transition hover:border-primary/40 hover:shadow-primary/10"
                >
                  <div className="relative aspect-[16/10] w-full bg-gradient-to-br from-primary/40 via-slate-900 to-secondary/20">
                    <span className="absolute left-4 top-4 rounded-md bg-black/60 px-2 py-1 text-xs font-bold uppercase tracking-wide text-secondary">
                      {ev.category ?? "Evento"}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="text-lg font-bold text-white">{ev.title}</h3>
                    <p className="mt-2 line-clamp-2 text-sm text-slate-400">{ev.description || "Sem descrição."}</p>
                    <p className="mt-4 text-sm text-slate-400">{ev.date} · {ev.location || "Local a definir"}</p>
                    <Link
                      href="/eventos"
                      className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-primary/15 py-3 text-sm font-bold text-primary ring-1 ring-primary/40 hover:bg-primary/25"
                    >
                      Quero participar
                    </Link>
                  </div>
                </article>
              ))}
              {!loading && (error || displayEvents.length === 0) ? (
                <div className="col-span-full rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950 p-10 text-center">
                  <div className="mx-auto mb-4 h-14 w-14 text-secondary">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="h-full w-full">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M8 2v3m8-3v3M4 9h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" />
                    </svg>
                  </div>
                  <p className="text-xl font-bold text-white">
                    {error ? "Não foi possível carregar os eventos" : "Nenhum evento encontrado"}
                  </p>
                  <p className="mt-2 text-sm text-slate-400">
                    {error
                      ? "Tente novamente ou verifique a conexão."
                      : searchTerm.trim()
                      ? "Ajuste sua busca para encontrar palestras, atividades ou participantes."
                      : "Volte em breve para conferir os próximos eventos."}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {/* Categorias */}
        <section
          id="categorias"
          className="w-full px-4 py-16 sm:px-6 sm:py-20 lg:px-10"
        >
          <div className="mx-auto w-full max-w-[1600px]">
            <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              Categorias
            </h2>
            <p className="mt-2 max-w-2xl text-slate-400">
              Atalhos para explorar as categorias.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {categories
                .filter((name) => name !== "Todos")
                  .map((name) => (
                <Link
                  key={name}
                  href="/eventos"
                  className="rounded-full border border-slate-700 bg-slate-900 px-5 py-2.5 text-sm font-bold text-slate-200 hover:border-secondary/50 hover:text-secondary"
                >
                  {name}
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer — largura total */}
      <footer className="border-t border-slate-800 px-6 py-10 sm:px-8 lg:px-10">
        <div className="mx-auto grid w-full max-w-[1600px] gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Event Creator
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Plataforma para descobrir eventos e publicar os seus, com foco em
              participantes e gestão de inscrições.
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Plataforma
            </p>
            <ul className="mt-3 space-y-2 text-sm text-slate-400">
              <li>
                <Link href="/eventos" className="hover:text-secondary">
                  Eventos
                </Link>
              </li>
              <li>
                <a href="#categorias" className="hover:text-secondary">
                  Categorias
                </a>
              </li>
              <li>
                <Link href="/login" className="hover:text-secondary">
                  Minha conta
                </Link>
              </li>
            </ul>
          </div>
          {/* Gestão só aparece para ADMIN */}
          {isAdmin && (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Gestão
                </p>
                <ul className="mt-3 space-y-2 text-sm text-slate-400">
                  <li>
                    <Link href="/admin" className="hover:text-secondary">
                      Meu painel
                    </Link>
                  </li>
                </ul>
              </div>
          )}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Contato
            </p>
            <p className="mt-3 text-sm text-slate-400">
              <a
                href="mailto:contato@eventcreator.com"
                className="hover:text-secondary"
              >
                contato@eventcreator.com
              </a>
            </p>
            <p className="mt-2 text-sm text-slate-500">Seg–Sex, 9h–18h</p>
          </div>
        </div>
        <div className="mx-auto mt-10 flex w-full max-w-[1600px] flex-col items-center justify-between gap-4 border-t border-slate-800 pt-8 text-center text-xs text-slate-500 sm:flex-row">
          <span>
            © {new Date().getFullYear()} Event Creator. Todos os direitos
            reservados.
          </span>
          <div className="flex gap-6">
            <a href="#" className="hover:text-slate-300">
              Privacidade
            </a>
            <a href="#" className="hover:text-slate-300">
              Termos
            </a>
          </div>
        </div>

      </footer>
    </div>
  );
}

