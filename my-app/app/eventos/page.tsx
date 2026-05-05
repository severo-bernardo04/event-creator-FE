"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { normalizeEventList, type ApiEventNorm } from "@/lib/eventsFromApi";
import { getCategoryForEvent, CATEGORIES } from "@/lib/categoryMocks";

function fmtDate(d: string) {
  const [y, m, dy] = d.split("-");
  return `${dy}/${m}/${y}`;
}

function timeShort(t: string | null) {
  if (!t) return "—";
  return t.slice(0, 5);
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
      setSuccessMessage("Inscrição realizada com sucesso!");
      setSuccessBanner(true);
      window.setTimeout(() => setSuccessBanner(false), 4000);
      await loadEvents();
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
      await apiFetch(`/events/${eventId}/participants/${participant.id}`, {
        method: "DELETE",
      });
      setSuccessMessage("Sua inscrição foi cancelada.");
      setSuccessBanner(true);
      window.setTimeout(() => setSuccessBanner(false), 4000);
      await loadEvents();
    } catch (err: unknown) {
      alert(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const eventList = Array.isArray(events) ? events : [];
  const filtered = eventList.filter((ev) => {
    const category = getCategoryForEvent(ev.id);
    const full = ev.participants.length >= ev.maxParticipants;
    const categoryOk = filterCategory === "Todos" || category === filterCategory;
    const statusOk =
        filterStatus === "Todos" ||
        (filterStatus === "Disponível" && !full) ||
        (filterStatus === "Lotado" && full);
    return categoryOk && statusOk;
  });

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
                {filtered.map((ev) => {
                  const count = ev.participants.length;
                  const full = count >= ev.maxParticipants;
                  const isRegistered = ev.participants.some((p) => p.email === user?.email);

                  return (
                      <li key={ev.id} className="flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 shadow-lg">
                        <div className="relative aspect-[16/10] w-full bg-gradient-to-br from-primary/35 via-slate-900 to-secondary/15">
                    <span className="absolute left-4 top-4 rounded-md bg-black/60 px-2 py-1 text-xs font-bold uppercase tracking-wide text-secondary">
                      {getCategoryForEvent(ev.id)}
                    </span>
                        </div>
                        <div className="flex flex-1 flex-col p-6">
                          <h2 className="text-lg font-bold text-white">{ev.title}</h2>
                          <p className="mt-2 line-clamp-2 text-sm text-slate-400">
                            {ev.description?.trim() || "Sem descrição."}
                          </p>
                          <p className="mt-3 text-sm text-slate-500">
                            {fmtDate(ev.date)} · {timeShort(ev.time)}
                            {ev.location ? ` · ${ev.location}` : ""}
                          </p>
                          <p className="mt-2 text-sm font-semibold text-secondary">
                            {count}/{ev.maxParticipants} inscritos
                            {ev.majority18 ? " · +18" : ""}
                          </p>
                          <div className="mt-6 flex flex-wrap gap-2">
                            {!isAdmin && (
                                isRegistered ? (
                                    <button
                                        type="button"
                                        disabled={submitting}
                                        onClick={() => handleUnenroll(ev.id)}
                                        className="inline-flex flex-1 min-w-[140px] items-center justify-center rounded-xl bg-emerald-600/10 border border-emerald-500/50 px-4 py-3 text-sm font-bold text-emerald-400 transition hover:bg-red-500/20 hover:border-red-500 hover:text-red-200 disabled:opacity-50"
                                    >
                                      {submitting ? "..." : "Inscrito — Cancelar"}
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        disabled={full || !user || submitting}
                                        onClick={() => openEnroll(ev)}
                                        className="inline-flex flex-1 min-w-[140px] items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-lg shadow-primary/25 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                      {full ? "Lotado" : user ? "Inscrever-se" : "Login para inscrever"}
                                    </button>
                                )
                            )}
                          </div>
                        </div>
                      </li>
                  );
                })}
              </ul>
          )}
        </div>

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
  );
}