"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type { ApiEventNorm } from "@/lib/eventsFromApi";
import { normalizeEventRecord } from "@/lib/eventsFromApi";
import { getCategoryForEvent } from "@/lib/categoryMocks";
import { useAuth } from "@/context/AuthContext";
import {
  canViewPrivateEventInfo,
  getParticipantForEmail,
  getParticipantStatus,
  isApprovedRegistration,
  isPendingRegistration,
} from "@/lib/eventParticipants";

type EventByIdRaw = unknown;

type EventDetails = ApiEventNorm;

function eventCoverStyle(imageUrl?: string | null) {
  if (!imageUrl) return undefined;
  return {
    backgroundImage: `linear-gradient(180deg, rgba(2, 6, 23, 0.08), rgba(2, 6, 23, 0.34)), url("${imageUrl.replace(/"/g, "%22")}")`,
  };
}

function infoCardClass() {
  return "rounded-xl border border-slate-800 bg-slate-950/35 p-4";
}

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

  const currentParticipant = event ? getParticipantForEmail(event, user?.email) : null;
  const hasRegistration = Boolean(currentParticipant);
  const isApproved = isApprovedRegistration(currentParticipant);
  const isPending = isPendingRegistration(currentParticipant);
  const isRejected = getParticipantStatus(currentParticipant) === "REJECTED";
  const full = Boolean(event && event.participants.length >= event.maxParticipants);
  const canViewDetails = event ? canViewPrivateEventInfo(event, currentParticipant) : false;
  const approvedCount = event?.participants.filter((participant) => participant.status === "APPROVED").length ?? 0;
  const capacityPercent = event
    ? Math.min(100, Math.round((approvedCount / Math.max(event.maxParticipants, 1)) * 100))
    : 0;
  const statusTitle = hasRegistration
    ? isApproved
      ? "Inscrição confirmada"
      : isPending
      ? "Inscrição em análise"
      : "Inscrição não aprovada"
    : "Inscrição aberta";
  const statusDescription = hasRegistration
    ? isApproved
      ? "Sua vaga foi aprovada. O check-in fica disponível pelo QR Code."
      : isPending
      ? "A organização precisa aprovar sua inscrição antes de liberar as informações privadas."
      : "Entre em contato com a organização para mais informações."
    : "Inscreva-se para participar deste evento.";

  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [successBanner, setSuccessBanner] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  async function enrollNow() {
    if (!user) {
      router.push(`/login?next=/eventos/${id}`);
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      const alreadyRegistered = await apiFetch<{ emailInscrito?: boolean }>(
        `/events/${id}/participants/check-email?email=${encodeURIComponent(user.email!)}`,
        { method: "GET" },
      ).catch(() => ({ emailInscrito: false }));

      if (alreadyRegistered.emailInscrito) {
        setFormError("Você já está inscrito neste evento.");
        return;
      }

      // POST to create participant using server-side authenticated user (no userId query param)
      await apiFetch(`/events/${id}/participants`, {
        method: "POST",
      });

      // reload event
      const raw = await apiFetch<unknown>(`/events/${id}`, { method: "GET" });
      const norm = normalizeEventRecord(raw as Record<string, unknown>);
      setEvent(norm);

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
      setSuccessBanner(true);
      window.setTimeout(() => setSuccessBanner(false), 4000);
    } catch (err: unknown) {
      setFormError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="border-b border-slate-800 bg-slate-900/40">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <Link
            href="/eventos"
            className="rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
          >
            Voltar
          </Link>
          {event ? (
            <span className="rounded-full border border-slate-700 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-400">
              Evento #{event.id}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-6 lg:px-8">
        {loading ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="animate-pulse rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
              <div className="h-6 rounded bg-slate-800" />
              <div className="mt-3 h-4 rounded bg-slate-800" />
              <div className="mt-6 aspect-[16/7] rounded-xl bg-slate-800" />
            </div>
            <div className="animate-pulse rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
              <div className="h-6 rounded bg-slate-800" />
              <div className="mt-3 h-4 rounded bg-slate-800" />
              <div className="mt-8 h-10 rounded-xl bg-slate-800" />
            </div>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-6">
            <p className="text-red-300">{error}</p>
          </div>
        ) : event ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
            <main className="space-y-6">
              <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/45">
                <div
                  className={`relative aspect-[16/7] min-h-[220px] w-full bg-cover bg-center ${
                    event.imageUrl
                      ? "bg-slate-900"
                      : "bg-gradient-to-br from-primary/35 via-slate-900 to-secondary/15"
                  }`}
                  style={eventCoverStyle(event.imageUrl)}
                >
                  <span className="absolute left-4 top-4 rounded-md bg-black/60 px-2 py-1 text-xs font-bold uppercase tracking-wide text-secondary">
                    {event.category ? event.category : getCategoryForEvent(event.id)}
                  </span>
                  <span className="absolute right-4 top-4 rounded-md bg-black/60 px-2 py-1 text-xs font-bold uppercase tracking-wide text-white">
                    {event.majority18 ? "+18" : "Livre"}
                  </span>
                </div>

                <div className="p-6">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-widest text-secondary">
                      Detalhes do evento
                    </p>
                    <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
                      {event.title}
                    </h1>
                    <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-400 sm:text-base">
                      {!canViewDetails
                        ? "Informações privadas — sua inscrição precisa ser aprovada para ver os detalhes."
                        : event.description?.trim() || "Sem descrição."}
                    </p>
                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-3">
                    <div className={infoCardClass()}>
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                        Data
                      </p>
                      <p className="mt-2 text-base font-black text-white">
                        {fmtDate(event.date)}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        {timeShort(event.time)}
                      </p>
                    </div>

                    <div className={infoCardClass()}>
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                        Local
                      </p>
                      <p className="mt-2 text-base font-black text-white">
                        {canViewDetails ? event.location || "A definir" : "Após aprovação"}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        {canViewDetails ? "Informação liberada" : "Evento privado"}
                      </p>
                    </div>

                    <div className={infoCardClass()}>
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                        Vagas
                      </p>
                      <p className="mt-2 text-base font-black text-white">
                        {approvedCount}/{event.maxParticipants}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        {full ? "Lotado" : "Disponível"}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-800 bg-slate-900/45 p-6">
                <p className="text-sm font-bold text-white">Sobre o evento</p>
                <p className="mt-3 text-sm leading-7 text-slate-400">
                  {!canViewDetails
                    ? "Este é um evento privado. As informações completas ficam disponíveis somente depois que sua inscrição for aprovada pela organização."
                    : event.description?.trim() || "Sem descrição."}
                </p>
              </section>
            </main>

            <aside className="space-y-4 lg:sticky lg:top-6">
              <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl shadow-black/20">
                <p className="text-xs font-bold uppercase tracking-widest text-secondary">
                  Sua participação
                </p>
                <h2 className="mt-2 text-xl font-black text-white">{statusTitle}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{statusDescription}</p>

                {hasRegistration ? (
                  isApproved ? (
                    <Link
                      href={`/checkin/${event.id}`}
                      className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-lg shadow-primary/25 hover:brightness-110"
                    >
                      Check-in (QR)
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-slate-800/60 px-4 py-3 text-sm font-bold text-slate-400 cursor-not-allowed"
                      title={
                        isPending
                          ? "Sua inscrição está pendente — aguarde aprovação."
                          : "Inscrição não aprovada."
                      }
                    >
                      {isPending
                        ? "Inscrição pendente"
                        : isRejected
                        ? "Inscrição não aprovada"
                        : "Aprovação necessária"}
                    </button>
                  )
                ) : (
                  <>
                    {formError ? (
                      <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-300">{formError}</p>
                    ) : null}
                    {successBanner ? (
                      <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-3 py-2 text-sm font-semibold text-emerald-100">{successMessage}</div>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void enrollNow()}
                      disabled={full || submitting}
                      className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-lg shadow-primary/25 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {full ? "Lotado" : submitting ? "Inscrevendo…" : "Inscrever-se"}
                    </button>
                  </>
                )}
              </section>

              <section className="rounded-2xl border border-slate-800 bg-slate-900/45 p-5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-white">Ocupação</span>
                  <span className="text-slate-400">{capacityPercent}%</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${capacityPercent}%` }} />
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  {approvedCount} participante{approvedCount === 1 ? "" : "s"} aprovado{approvedCount === 1 ? "" : "s"} de {event.maxParticipants} vagas.
                </p>
              </section>

              <Link
                href="/eventos"
                className="inline-flex w-full items-center justify-center rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
              >
                Ver mais eventos
              </Link>
            </aside>
          </div>
        ) : null}
      </div>
    </div>
  );
}
