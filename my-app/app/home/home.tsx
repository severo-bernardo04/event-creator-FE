"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { normalizeEventList, type ApiEventNorm } from "@/lib/eventsFromApi";

export function Home() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const [events, setEvents] = useState<ApiEventNorm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState(false);

  const isOrganizer =
    user?.role === "ORGANIZER" || user?.role === "ORGANIZADOR" || user?.role === "ADMIN";

  const loadEvents = useCallback(async () => {
    try {
      const data = await apiFetch<unknown>("/events", { method: "GET" });
      setEvents(normalizeEventList(data).slice(0, 6));
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  function openEnroll(eventId: number) {
    if (!user) {
      router.push(`/login?next=/`);
      return;
    }
    setFormError(null);
    setOpenId(eventId);
  }

  async function submitEnroll(eventId: number) {
    setFormError(null);
    setSubmitting(true);
    try {
      await apiFetch(`/events/${eventId}/participants?userId=${user?.userId}`, {
        method: "POST",
        json: {
          name: user?.name,
          email: user?.email,
          phone: "",
          cpf: user?.cpf ?? "",
        },
      });
      setOpenId(null);
      setSuccessBanner(true);
      setTimeout(() => setSuccessBanner(false), 4000);
      await loadEvents();
    } catch (err: unknown) {
      setFormError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUnenroll(eventId: number) {
    if (!confirm("Tem certeza que deseja cancelar sua inscrição?")) return;
    setSubmitting(true);
    try {
      const ev = events.find((e) => e.id === eventId);
      const participant = ev?.participants.find((p) => p.email === user?.email);
      if (!participant?.id) throw new Error("Inscrição não encontrada.");
      await apiFetch(`/events/${eventId}/participants/${participant.id}`, {
        method: "DELETE",
      });
      await loadEvents();
    } catch (err: unknown) {
      alert(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-950 text-slate-100">
      <main className="flex w-full flex-1 flex-col">
        <section className="flex w-full flex-1 flex-col justify-center border-b border-slate-800 px-4 py-16 sm:px-6 sm:py-20 lg:min-h-[calc(100dvh-73px)] lg:px-10">
          <div className="mx-auto w-full max-w-[1600px]">
            <p className="text-sm font-bold uppercase tracking-widest text-secondary">
              Eventos ao vivo · ingressos · organização
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black text-white sm:text-5xl lg:text-6xl xl:text-7xl">
              Descubra eventos. Publique o seu.
            </h1>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/eventos"
                className="inline-flex items-center justify-center rounded-xl bg-primary px-8 py-4 text-base font-bold text-white shadow-lg shadow-primary/35 hover:brightness-110"
              >
                Ver eventos
              </Link>
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

        <section className="w-full border-b border-slate-800 bg-slate-900/50 px-4 py-16 sm:px-6 lg:px-10">
          <div className="mx-auto w-full max-w-[1600px]">
            {successBanner && (
              <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-4 py-3 text-sm font-semibold text-emerald-100">
                Inscrição realizada com sucesso!
              </div>
            )}

            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {loading
                ? Array.from({ length: 3 }).map((_, idx) => (
                    <div key={idx} className="animate-pulse rounded-2xl border border-slate-800 bg-slate-950 p-4 h-64" />
                  ))
                : events.map((ev) => {
                    const isRegistered = ev.participants.some((p) => p.email === user?.email);
                    const isFull = ev.participants.length >= ev.maxParticipants;

                    return (
                      <article key={ev.id} className="flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-xl">
                        <div className="aspect-[16/10] bg-gradient-to-br from-primary/40 to-secondary/20" />
                        <div className="flex flex-col p-6">
                          <h3 className="text-lg font-bold text-white">{ev.title}</h3>
                          <p className="mt-2 text-sm text-slate-400 line-clamp-2">
                            {ev.description || "Sem descrição."}
                          </p>
                          <div className="mt-6">
                            {!isOrganizer && (
                              isRegistered ? (
                                <button
                                  onClick={() => handleUnenroll(ev.id)}
                                  disabled={submitting}
                                  className="w-full rounded-xl bg-emerald-600/10 border border-emerald-500/50 py-3 text-sm font-bold text-emerald-400 transition hover:bg-red-500/20 hover:text-red-200 hover:border-red-500"
                                >
                                  {submitting ? "..." : "Inscrito (Sair)"}
                                </button>
                              ) : (
                                <button
                                  onClick={() => openEnroll(ev.id)}
                                  disabled={isFull || submitting}
                                  className={`w-full rounded-xl py-3 text-sm font-bold transition ${
                                    isFull
                                      ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                                      : "bg-primary text-white hover:brightness-110"
                                  }`}
                                >
                                  {isFull ? "Lotado" : "Quero participar"}
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="mx-auto grid w-full max-w-[1600px] gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Event Creator
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Plataforma para descobrir eventos e publicar os seus, com foco em participantes e
              gestão de inscrições.
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Plataforma
            </p>
            <ul className="mt-3 space-y-2 text-sm text-slate-400">
              <li>
                <Link href="/eventos" className="hover:text-secondary">Eventos</Link>
              </li>
              <li>
                <a href="#categorias" className="hover:text-secondary">Categorias</a>
              </li>
              <li>
                <Link href="/login" className="hover:text-secondary">Minha conta</Link>
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
                  <Link href="/admin" className="hover:text-secondary">Meu painel</Link>
                </li>
              </ul>
            </div>
          )}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Contato
            </p>
            <p className="mt-3 text-sm text-slate-400">
              <a href="mailto:contato@eventcreator.com" className="hover:text-secondary">
                contato@eventcreator.com
              </a>
            </p>
          </div>
        </div>
      </footer>

      {openId !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 px-4">
          <div
            className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-extrabold text-white">Confirmar inscrição</h3>
            <p className="mt-3 text-sm text-slate-400">Deseja se inscrever como:</p>
            <div className="mt-3 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3">
              <p className="text-sm font-bold text-white">{user?.name}</p>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>
            {formError && (
              <p className="mt-4 text-sm font-semibold text-red-300">{formError}</p>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setOpenId(null)} className="px-4 py-2 text-sm font-bold text-slate-300">
                Cancelar
              </button>
              <button
                onClick={() => void submitEnroll(openId)}
                disabled={submitting}
                className="rounded-xl bg-secondary px-4 py-2 text-sm font-bold text-slate-950 hover:brightness-105"
              >
                {submitting ? "Enviando..." : "Sim, participar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}