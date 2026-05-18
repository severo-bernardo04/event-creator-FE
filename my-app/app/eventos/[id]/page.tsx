"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type { ApiEventNorm } from "@/lib/eventsFromApi";
import { normalizeEventRecord } from "@/lib/eventsFromApi";
import { getCategoryForEvent } from "@/lib/categoryMocks";
import { useAuth } from "@/context/AuthContext";

type EventByIdRaw = unknown;

type EventDetails = ApiEventNorm;

export default function EventoDetalhesPage() {
  const { user } = useAuth();
  const params = useParams();
  const id = params.id as string;

  const [event, setEvent] = useState<EventDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      setEvent(null);
      try {
        const data = await apiFetch<EventByIdRaw>(`/events/${id}`, { method: "GET" });
        const norm = normalizeEventRecord(data as Record<string, unknown>);
        if (!norm) throw new Error("Evento não encontrado.");
        setEvent(norm);
      } catch (err: unknown) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }

    if (id) void load();
  }, [id]);

  function fmtDate(d: string) {
    const [y, m, dy] = d.split("-");
    return `${dy}/${m}/${y}`;
  }

  function timeShort(t: string | null) {
    if (!t) return "—";
    return t.slice(0, 5);
  }

  const isRegistered = Boolean(
    event?.participants?.some((p) => p.email === user?.email),
  );
  const full = Boolean(event && event.participants.length >= event.maxParticipants);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="border-b border-slate-800 bg-slate-900/40">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-10 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-10">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-secondary">
              Detalhes do evento
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
              {loading ? "Carregando..." : event?.title ?? "Evento"}
            </h1>
            <p className="mt-2 max-w-2xl text-slate-400">
              {event?.description?.trim() || "Sem descrição."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/eventos"
              className="rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
            >
              Voltar
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] px-4 py-12 sm:px-6 lg:px-10">
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="animate-pulse rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
              <div className="aspect-[16/10] rounded-xl bg-slate-800" />
            </div>
            <div className="animate-pulse rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
              <div className="h-6 rounded bg-slate-800" />
              <div className="mt-3 h-4 rounded bg-slate-800" />
              <div className="mt-3 h-4 rounded bg-slate-800" />
              <div className="mt-8 h-10 rounded-xl bg-slate-800" />
            </div>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-6">
            <p className="text-red-300">{error}</p>
          </div>
        ) : event ? (
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40">
                <div className="relative aspect-[16/10] w-full bg-gradient-to-br from-primary/35 via-slate-900 to-secondary/15">
                  <span className="absolute left-4 top-4 rounded-md bg-black/60 px-2 py-1 text-xs font-bold uppercase tracking-wide text-secondary">
                    {event.category ? event.category : getCategoryForEvent(event.id)}
                  </span>
                </div>

                <div className="p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-black text-white">{event.title}</h2>
                      <p className="mt-2 text-sm text-slate-400">
                        {fmtDate(event.date)} · {timeShort(event.time)}
                        {event.location ? ` · ${event.location}` : ""}
                      </p>
                    </div>

                    <div className="rounded-full bg-secondary/15 px-4 py-2 text-xs font-bold text-secondary ring-1 ring-secondary/30">
                      {event.majority18 ? "+18" : "Livre"}
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                        Inscritos
                      </p>
                      <p className="mt-2 text-2xl font-black text-white">
                        {event.participants.length}/{event.maxParticipants}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        {full ? "Lotado" : "Disponível"}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                        Status
                      </p>
                      <p className="mt-2 text-sm font-bold text-secondary">
                        {isRegistered ? "Você está inscrito" : "Você ainda não está inscrito"}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        {isRegistered ? "Acesse o check-in para gerar seu QR." : "Inscreva-se na lista de eventos."}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/30 p-5">
                    <p className="text-sm font-bold text-white">Sobre</p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">
                      {event.description?.trim() || "Sem descrição."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
                <p className="text-xs font-bold uppercase tracking-widest text-secondary">
                  Ações
                </p>

                {isRegistered ? (
                  <Link
                    href={`/checkin/${event.id}`}
                    className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-lg shadow-primary/25 hover:brightness-110"
                  >
                    Check-in (QR)
                  </Link>
                ) : (
                  <Link
                    href="/eventos"
                    className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm font-bold text-primary hover:bg-primary/20"
                  >
                    Voltar para inscrever
                  </Link>
                )}

                <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/30 p-4">
                  <p className="text-sm font-bold text-white">Informações</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {event.majority18 ? "+18" : "Sem restrição"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Evento #{event.id}
                  </p>
                </div>

                <div className="mt-4">
                  <Link
                    href="/eventos"
                    className="inline-flex w-full items-center justify-center rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
                  >
                    Ver mais eventos
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

