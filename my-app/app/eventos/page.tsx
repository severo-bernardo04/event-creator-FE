"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { cancelRegistration } from "@/lib/cancelRegistration";
import { getErrorMessage } from "@/lib/errors";
import { normalizeEventList, normalizeEventRecord, type ApiEventNorm } from "@/lib/eventsFromApi";
import {
  canViewPrivateEventInfo,
  getParticipantForEmail,
  getParticipantStatus,
  isApprovedRegistration,
  isPendingRegistration,
} from "@/lib/eventParticipants";
const CATEGORIES = [
  "Tecnologia",
  "Educação",
  "Música",
  "Esporte",
  "Entretenimento"
];

function fmtDate(d: string) {
  const [y, m, dy] = d.split("-");
  return `${dy}/${m}/${y}`;
}

function timeShort(t: string | null) {
  if (!t) return "—";
  return t.slice(0, 5);
}

function eventCoverStyle(imageUrl?: string | null) {
  if (!imageUrl) return undefined;
  return {
    backgroundImage: `linear-gradient(180deg, rgba(2, 6, 23, 0.08), rgba(2, 6, 23, 0.34)), url("${imageUrl.replace(/"/g, "%22")}")`,
  };
}

export default function EventosPage() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const [events, setEvents] = useState<ApiEventNorm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successBanner, setSuccessBanner] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [filterCategory, setFilterCategory] = useState("Todos");
  const [filterStatus, setFilterStatus] = useState("Todos");

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<unknown>("/events", { method: "GET" });
      setEvents(normalizeEventList(data));
    } catch (err: unknown) {
      setError(getErrorMessage(err));
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  function openEnroll(ev: ApiEventNorm) {
    setFormError(null);
    setOpenId(ev.id);
  }

  async function submitEnroll(eventId: number) {
    if (!user) {
      router.push(`/login?next=/eventos`);
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      const alreadyRegistered = await apiFetch<{ emailInscrito: boolean }>(
          `/events/${eventId}/participants/check-email?email=${encodeURIComponent(user.email)}`,
          { method: "GET" },
      );
      if (alreadyRegistered.emailInscrito) {
        setFormError("Você já está inscrito neste evento.");
        return;
      }
      await apiFetch(`/events/${eventId}/participants?userId=${user.userId}`, {
        method: "POST",
        json: {
          name: user.name,
          email: user.email,
          phone: "",
          cpf: user.cpf ?? "",
        },
      });
      setOpenId(null);
      // reload events and fetch single event to inspect participant status
      await loadEvents();
      try {
        const raw = await apiFetch<unknown>(`/events/${eventId}`, { method: "GET" });
        const norm = normalizeEventRecord(raw as Record<string, unknown>);
        const part = norm?.participants?.find((p) => p.email === user.email);
        if (part) {
          if (part.status === "PENDING") {
            setSuccessMessage("Inscrição realizada — Aguardando aprovação do administrador.");
          } else if (part.status === "APPROVED") {
            setSuccessMessage("Inscrição confirmada — Bem-vindo ao evento!");
          } else {
            setSuccessMessage("Inscrição realizada.");
          }
        } else {
          setSuccessMessage("Inscrição realizada com sucesso!");
        }
      } catch {
        setSuccessMessage("Inscrição realizada com sucesso!");
      }
      setSuccessBanner(true);
      window.setTimeout(() => setSuccessBanner(false), 4000);
    } catch (err: unknown) {
      setFormError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUnenroll(eventId: number) {
    if (!user || !confirm("Tem certeza que deseja cancelar sua inscrição?")) return;
    setSubmitting(true);
    try {
      const ev = eventList.find((e) => e.id === eventId);
      const participant = ev?.participants.find((p) => p.email === user.email);
      if (!participant?.id) throw new Error("Inscrição não encontrada.");
      await cancelRegistration(eventId, participant.id);
      setEvents((currentEvents) =>
        currentEvents.map((currentEvent) =>
          currentEvent.id === eventId
            ? {
                ...currentEvent,
                participants: currentEvent.participants.filter(
                  (currentParticipant) => currentParticipant.id !== participant.id,
                ),
              }
            : currentEvent,
        ),
      );
      setSuccessMessage("Sua inscrição foi cancelada.");
      setSuccessBanner(true);
      window.setTimeout(() => setSuccessBanner(false), 4000);
    } catch (err: unknown) {
      alert(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const eventList = Array.isArray(events) ? events : [];

  const filtered = eventList.filter((ev) => {
  const eventDate = new Date(`${ev.date}T${ev.time || "00:00"}`);

  // remove eventos já finalizados
  if (eventDate <= new Date()) {
    return false;
  }

  const full = ev.participants.length >= ev.maxParticipants;

  const CategoryOk =
    filterCategory === "Todos" ||
    ev.category?.toLowerCase() === filterCategory.toLowerCase();

  const statusOk =
    filterStatus === "Todos" ||
    (filterStatus === "Disponível" && !full) ||
    (filterStatus === "Lotado" && full);

  return CategoryOk && statusOk;
});
  const EVENTS_PER_PAGE = 9;
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(filtered.length / EVENTS_PER_PAGE);
  const paginated = filtered.slice(
      (currentPage - 1) * EVENTS_PER_PAGE,
      currentPage * EVENTS_PER_PAGE
  );

// Reset para página 1 quando filtro mudar
  useEffect(() => {
    setCurrentPage(1);
  }, [filterCategory, filterStatus]);

  return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="border-b border-slate-800 bg-slate-900/40">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-10 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-10">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-secondary">
                Eventos na plataforma
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Eventos criados
              </h1>
              <p className="mt-2 max-w-2xl text-slate-400">
                Confira os eventos disponíveis e inscreva-se com sua conta.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                  href="/"
                  className="rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
              >
                Voltar à home
              </Link>
              <button
                  type="button"
                  onClick={() => void loadEvents()}
                  className="rounded-xl border border-primary/40 bg-primary/10 px-4 py-2.5 text-sm font-bold text-primary hover:bg-primary/20"
              >
                Atualizar lista
              </button>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-[1600px] px-4 py-12 sm:px-6 lg:px-10">
          {successBanner ? (
              <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-4 py-3 text-sm font-semibold text-emerald-100">
                {successMessage}
              </div>
          ) : null}

          {!user ? (
              <div className="mb-8 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-5 py-4 text-sm text-amber-100">
                <span className="font-bold">Faça login</span> para se inscrever nos eventos.{" "}
                <Link href="/login?next=/eventos" className="font-bold text-secondary underline">
                  Entrar
                </Link>{" "}
                ou{" "}
                <Link href="/register" className="font-bold text-secondary underline">
                  criar conta
                </Link>
                .
              </div>
          ) : null}

          <div className="mb-8 flex flex-wrap gap-3">
            <div className="flex flex-wrap gap-2">
              {["Todos", ...CATEGORIES].map((cat) => (
                  <button
                      key={cat}
                      type="button"
                      onClick={() => setFilterCategory(cat)}
                      className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                          filterCategory === cat
                              ? "bg-primary/20 text-primary"
                              : "border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white"
                      }`}
                  >
                    {cat}
                  </button>
              ))}
            </div>
            <div className="h-px w-full border-t border-slate-800" />
            <div className="flex gap-2">
              {["Todos", "Disponível", "Lotado"].map((status) => (
                  <button
                      key={status}
                      type="button"
                      onClick={() => setFilterStatus(status)}
                      className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                          filterStatus === status
                              ? "bg-secondary/20 text-secondary"
                              : "border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white"
                      }`}
                  >
                    {status}
                  </button>
              ))}
            </div>
          </div>

          {loading ? (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, idx) => (
                    <div key={idx} className="animate-pulse rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
                      <div className="aspect-[16/10] rounded-xl bg-slate-800" />
                      <div className="mt-4 h-5 w-2/3 rounded bg-slate-800" />
                      <div className="mt-2 h-4 w-full rounded bg-slate-800" />
                      <div className="mt-4 h-10 rounded-xl bg-slate-800" />
                    </div>
                ))}
              </div>
          ) : error ? (
              <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-5">
                <p className="text-red-300">{error}</p>
                <button type="button" onClick={() => void loadEvents()} className="mt-4 rounded-xl border border-red-400/40 px-4 py-2 text-sm font-bold text-red-200">
                  Tentar novamente
                </button>
              </div>
          ) : eventList.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950 p-10 text-center">
                <div className="mx-auto mb-4 h-14 w-14 text-secondary">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="h-full w-full">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M8 2v3m8-3v3M4 9h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" />
                  </svg>
                </div>
                <p className="text-xl font-bold text-white">Nenhum evento por aqui ainda</p>
                <p className="mt-2 text-sm text-slate-400">Volte em breve para conferir os próximos eventos</p>
              </div>
          ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950 p-10 text-center">
                <div className="mx-auto mb-4 h-14 w-14 text-secondary">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="h-full w-full">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M8 2v3m8-3v3M4 9h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" />
                  </svg>
                </div>
                <p className="text-xl font-bold text-white">Nenhum evento encontrado</p>
                <p className="mt-2 text-sm text-slate-400">Tente outro filtro</p>
                <button
                    type="button"
                    onClick={() => { setFilterCategory("Todos"); setFilterStatus("Todos"); }}
                    className="mt-4 rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300 hover:bg-slate-800"
                >
                  Limpar filtros
                </button>
              </div>
          ) : (
              <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {paginated.map((ev) => {
                  const count = ev.participants.length;
                  const full = count >= ev.maxParticipants;
                  const participant = getParticipantForEmail(ev, user?.email);
                   const hasRegistration = Boolean(participant);
                   const isApproved = isApprovedRegistration(participant);
                   const isPending = isPendingRegistration(participant);
                   const isRejected = getParticipantStatus(participant) === "REJECTED";
                   const canViewDetails = canViewPrivateEventInfo(ev, participant);
                   const description = canViewDetails
                     ? ev.description?.trim() || "Sem descrição."
                     : "Informações privadas — aguarde aprovação do administrador.";
                   const location = canViewDetails ? ev.location : null;

                  return (
                      <li key={ev.id} className="flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 shadow-lg hover:border-primary/40 hover:shadow-primary/10">
                        <div
                          className={`relative aspect-[16/10] w-full bg-cover bg-center ${
                            ev.imageUrl
                              ? "bg-slate-900"
                              : "bg-gradient-to-br from-primary/35 via-slate-900 to-secondary/15"
                          }`}
                          style={eventCoverStyle(ev.imageUrl)}
                        >
                          <span className="absolute left-4 top-4 rounded-md bg-black/60 px-2 py-1 text-xs font-bold uppercase tracking-wide text-secondary">
                            {ev.category || "Sem categoria"}
                          </span>
                        </div>
                        <div className="flex flex-1 flex-col p-6">
                          <h2 className="text-lg font-bold text-white">
                            <Link href={`/eventos/${ev.id}`} className="hover:underline">
                              {ev.title}
                            </Link>
                          </h2>
                          <p className="mt-2 line-clamp-2 text-sm text-slate-400">
                            {description}
                          </p>
                          <p className="mt-3 text-sm text-slate-500">
                            {fmtDate(ev.date)} · {timeShort(ev.time)}
                            {location ? ` · ${location}` : ""}
                          </p>
                          <p className={`text-sm font-bold ${
                                full ? "text-red-400" : "text-yellow-400"
                              }`}>
                                {count}/{ev.maxParticipants} inscritos
                              </p>
                          <div className="mt-6 flex flex-wrap gap-2">
                            {!isAdmin && (
                              hasRegistration ? (
                                <button
                                  type="button"
                                  disabled={submitting || isRejected}
                                  onClick={() => handleUnenroll(ev.id)}
                                  className={`inline-flex flex-1 min-w-[140px] items-center justify-center rounded-xl border px-4 py-3 text-sm font-bold transition disabled:opacity-50 ${
                                    isPending
                                      ? "border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-red-500/20 hover:border-red-500 hover:text-red-200"
                                      : isApproved
                                      ? "border-emerald-500/50 bg-emerald-600/10 text-emerald-400 hover:bg-red-500/20 hover:border-red-500 hover:text-red-200"
                                      : "cursor-not-allowed border-red-500/40 bg-red-500/10 text-red-300"
                                  }`}
                                >
                                  {submitting
                                    ? "..."
                                    : isPending
                                    ? "Inscrição pendente — Cancelar"
                                    : isApproved
                                    ? "Inscrito — Cancelar"
                                    : "Inscrição não aprovada"}
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    disabled={full || !user || submitting}
                                    onClick={() => openEnroll(ev)}
                                    className="inline-flex flex-1 min-w-[140px] items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-lg shadow-primary/25 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                                  >
                                    {full ? "Lotado" : user ? "Inscrever-se" : "Login para inscrever"}
                                  </button>
                                  <Link href={`/eventos/${ev.id}`} className="inline-flex items-center justify-center rounded-xl border border-slate-600 px-3 py-2 text-sm font-bold text-white hover:bg-slate-800">
                                    Ver detalhes
                                  </Link>
                                </>
                              )
                            )}
                          </div>
                        </div>
                      </li>
                  );
                })}
              </ul>
          )}
          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-2">
            <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-40"
        >
          ← Anterior
        </button>
        {Array.from({ length: totalPages }).map((_, idx) => (
            <button
                key={idx}
                type="button"
                onClick={() => setCurrentPage(idx + 1)}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                    currentPage === idx + 1
                        ? "bg-primary text-white"
                        : "border border-slate-700 text-slate-400 hover:bg-slate-800"
                }`}
            >
              {idx + 1}
            </button>
        ))}
        <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-40"
        >
          Próxima →
        </button>
      </div>
  )}


        {openId !== null ? (
            <div
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 px-4"
                role="presentation"
                onClick={() => !submitting && setOpenId(null)}
            >
              <div
                  className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                  role="dialog"
                  aria-modal
                  aria-labelledby="inscricao-titulo"
              >
                <h3 id="inscricao-titulo" className="text-lg font-extrabold text-white">
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
                    {submitting ? "Inscrevendo…" : "Sim, quero participar"}
                  </button>
                </div>
              </div>
            </div>
        ) : null}
      </div>
      </div>
  );
}
