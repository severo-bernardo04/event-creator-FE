"use client";
// Tela home com destaques, eventos e chamadas principais.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getAdultEventRestrictionMessage } from "@/lib/ageRestriction";
import { getErrorMessage } from "@/lib/errors";
import { normalizeEventList, type ApiEventNorm } from "@/lib/eventsFromApi";
import {
  checkEventRegistration,
  createEventRegistration,
  EVENT_REGISTRATION_CHANGED,
  getRegistrationDetailHref,
  isAlreadyRegisteredError,
  notifyEventRegistrationChanged,
  rememberEventRegistration,
} from "@/lib/eventRegistration";
import { useAuth } from "@/context/AuthContext";
import Carousel from "@/app/components/Carousel";
import {
  canViewPrivateEventInfo,
  getParticipantForEmail,
  isApprovedRegistration,
  isPendingRegistration,
} from "@/lib/eventParticipants";

function eventCoverStyle(imageUrl?: string | null) {
  if (!imageUrl) return undefined;
  return {
    backgroundImage: `linear-gradient(180deg, rgba(2, 6, 23, 0.08), rgba(2, 6, 23, 0.34)), url("${imageUrl.replace(/"/g, "%22")}")`,
  };
}

export function Home() {
  const router = useRouter();
  const { isAdmin, user } = useAuth();
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [events, setEvents] = useState<ApiEventNorm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 6;

  const loadEvents = useCallback(async () => {
    const data = await apiFetch<unknown>("/events", { method: "GET" });
    setEvents(normalizeEventList(data));
  }, []);


async function submitEnroll(eventId: number) {
  if (!user) {
    window.location.href = "/login";
    return;
  }

  setFormError(null);
  setSubmitting(true);

  try {
    const eventToEnroll = events.find((eventItem) => eventItem.id === eventId);
    const adultRestriction = eventToEnroll
      ? getAdultEventRestrictionMessage(eventToEnroll, user)
      : null;
    if (adultRestriction) {
      setFormError(adultRestriction);
      return;
    }

    const alreadyRegistered = await checkEventRegistration(eventId, user.email);

    if (alreadyRegistered) {
      setFormError("Você já está inscrito neste evento.");
      return;
    }

    try {
      await createEventRegistration(eventId, user);
    } catch (err: unknown) {
      if (!isAlreadyRegisteredError(err)) throw err;
    }

    await loadEvents();
    notifyEventRegistrationChanged(eventId);

    setOpenId(null);
  } catch (err: unknown) {
    setFormError(getErrorMessage(err));
  } finally {
    setSubmitting(false);
  }
}


  useEffect(() => {
    (async () => {
      try {
        await loadEvents();
      } catch (err: unknown) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [loadEvents]);

  useEffect(() => {
    const refresh = () => {
      void loadEvents().catch((err: unknown) => setError(getErrorMessage(err)));
    };

    window.addEventListener(EVENT_REGISTRATION_CHANGED, refresh);
    window.addEventListener("focus", refresh);

    return () => {
      window.removeEventListener(EVENT_REGISTRATION_CHANGED, refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [loadEvents]);

  useEffect(() => {
    if (!user?.email) return;

    events.forEach((ev) => {
      const participant = getParticipantForEmail(ev, user.email);
      if (!participant) return;

      rememberEventRegistration(ev.id, user.email, participant.status);
    });
  }, [events, user?.email]);
  useEffect(() => {
  setPage(1);
}, [searchTerm, activeCategory]);

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

    // ESCONDE EVENTOS JÁ FINALIZADOS
    const dataEvento = new Date(`${ev.date}T${ev.time || "00:00"}`);

    if (dataEvento < new Date()) {
      return false;
    }

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

    const totalPages = Math.ceil(filteredEvents.length / perPage);

    const displayEvents = useMemo(() => {
    const start = (page - 1) * perPage;
    const end = start + perPage;

  return filteredEvents.slice(start, end);
}, [filteredEvents, page]);

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

        <section className="w-full border-b border-slate-800 bg-slate-950 px-4 py-14 sm:px-6 sm:py-16 lg:px-10">
          <div className="mx-auto grid w-full max-w-[1600px] gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-secondary">
                Demonstração
              </p>
              <h2 className="mt-3 max-w-xl text-3xl font-black tracking-tight text-white sm:text-4xl">
                Eventos com visual pronto para chamar atenção.
              </h2>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-400">
                Uma prévia dos formatos que podem aparecer na plataforma, de conferências a festivais.
              </p>
            </div>
            <Carousel />
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

            {formError ? (
              <div className="mt-8 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">
                {formError}
              </div>
            ) : null}

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
                : displayEvents.map((ev) => {
                  const participant = getParticipantForEmail(ev, user?.email);
                  const hasRegistration = Boolean(participant);
                  const isApproved = isApprovedRegistration(participant);
                  const isPending = isPendingRegistration(participant);
                  const isRejected = participant?.status === "REJECTED";
                  const registrationStatus = isPending ? "PENDING" : isApproved ? "APPROVED" : isRejected ? "REJECTED" : null;
                  const eventDetailHref = getRegistrationDetailHref(ev.id, registrationStatus);
                  const canViewDetails = canViewPrivateEventInfo(ev, participant);
                  const availableSpots = Math.max(0, ev.maxParticipants - ev.participants.length);
                  const description = canViewDetails
                    ? ev.description || "Sem descrição."
                    : "Informações privadas — aguarde aprovação do administrador.";
                  const location = canViewDetails ? ev.location || "Local a definir" : "Local liberado após aprovação";

        return (
          <article
            key={ev.id}
            role="link"
            tabIndex={0}
            onClick={() => router.push(eventDetailHref)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                router.push(eventDetailHref);
              }
            }}
            className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-xl transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/60"
          >
            <div
              className={`relative aspect-[16/10] w-full bg-cover bg-center ${
                ev.imageUrl
                  ? "bg-slate-900"
                  : "bg-gradient-to-br from-primary/40 via-slate-900 to-secondary/20"
              }`}
              style={eventCoverStyle(ev.imageUrl)}
            >
              <span className="absolute left-4 top-4 rounded-md bg-black/60 px-2 py-1 text-xs font-bold uppercase tracking-wide text-secondary">
                {ev.category ?? "Evento"}
              </span>
              {ev.majority18 ? (
                <span className="absolute right-4 top-4 rounded-md bg-red-500/90 px-2 py-1 text-xs font-black uppercase tracking-wide text-white">
                  +18
                </span>
              ) : null}
            </div>

            <div className="flex flex-1 flex-col p-6">
              <h3 className="text-lg font-bold text-white transition group-hover:text-secondary">
                {ev.title}
              </h3>

              <p className="mt-2 line-clamp-2 text-sm text-slate-400">
                {description}
              </p>

              <p className="mt-4 text-sm text-slate-400">
                {ev.date} · {location}
              </p>

              <p className="mt-2 text-sm font-bold text-emerald-400">
                Vagas disponíveis: {availableSpots}
              </p>

              {hasRegistration ? (
            <Link
              href={eventDetailHref}
              onClick={(event) => event.stopPropagation()}
              className={`mt-6 inline-flex w-full items-center justify-center rounded-xl border py-3 text-sm font-bold ${
                isPending
                  ? "border-amber-400/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                  : isApproved
                  ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                  : "border-red-400/40 bg-red-500/10 text-red-300"
              }`}
            >
              {isPending
                ? "Inscrição pendente — Ver status"
                : isApproved
                ? "Inscrito — Ver detalhes"
                : "Inscrição não aprovada"}
            </Link>
          ) : (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                const adultRestriction = getAdultEventRestrictionMessage(ev, user);
                if (adultRestriction) {
                  setFormError(adultRestriction);
                  return;
                }
                setOpenId(ev.id);
              }}
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-primary/15 py-3 text-sm font-bold text-primary ring-1 ring-primary/40 hover:bg-primary/25"
            >
              Quero participar
            </button>
          )}
            </div>
          </article>
        );
      })}
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

        {totalPages > 1 && (
  <div className="mt-10 flex items-center justify-center gap-3">
    <button
      type="button"
      disabled={page === 1}
      onClick={() => setPage((p) => p - 1)}
      className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300 disabled:opacity-40"
    >
      ← Anterior
    </button>

    <span className="text-sm font-bold text-white">
      Página {page} de {totalPages}
    </span>

    <button
      type="button"
      disabled={page === totalPages}
      onClick={() => setPage((p) => p + 1)}
      className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300 disabled:opacity-40"
    >
      Próxima →
    </button>
  </div>
)}

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
            <span className="cursor-not-allowed text-slate-600" aria-disabled="true">
              Privacidade
            </span>
            <span className="cursor-not-allowed text-slate-600" aria-disabled="true">
              Termos
            </span>
          </div>
        </div>
      </footer>

      {openId !== null ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 px-4"
          onClick={() => !submitting && setOpenId(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-extrabold text-white">
              Confirmar inscrição
            </h3>

            <p className="mt-3 text-sm text-slate-400">
              Deseja se inscrever neste evento como:
            </p>

            <div className="mt-3 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3">
              <p className="text-sm font-bold text-white">{user?.name}</p>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>

            {formError ? (
              <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-300">
                {formError}
              </p>
            ) : null}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setOpenId(null)}
                className="rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-bold text-slate-300 hover:bg-slate-800"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={() => void submitEnroll(openId)}
                className="rounded-xl bg-secondary px-4 py-2.5 text-sm font-bold text-slate-950 hover:brightness-105 disabled:opacity-50"
              >
                {submitting ? "Inscrevendo..." : "Sim, quero participar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
