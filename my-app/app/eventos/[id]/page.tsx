"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { cancelRegistration } from "@/lib/cancelRegistration";
import { getErrorMessage } from "@/lib/errors";
import type { ApiEventNorm } from "@/lib/eventsFromApi";
import { normalizeEventList, normalizeEventRecord, normalizeParticipantList } from "@/lib/eventsFromApi";
import { getCategoryForEvent } from "@/lib/categoryMocks";
import { useAuth } from "@/context/AuthContext";
import EventMaterials from "@/app/components/EventMaterials";
import {
  canViewPrivateEventInfo,
  getParticipantForEmail,
  getParticipantStatus,
  isApprovedRegistration,
  isPendingRegistration,
} from "@/lib/eventParticipants";
import {
  checkEventRegistration,
  createEventRegistration,
  EVENT_REGISTRATION_CHANGED,
  forgetEventRegistration,
  getRememberedEventRegistration,
  isAlreadyRegisteredError,
  notifyEventRegistrationChanged,
  rememberEventRegistration,
} from "@/lib/eventRegistration";

type EventByIdRaw = unknown;

type EventDetails = ApiEventNorm;
type RegistrationStatusHint = "PENDING" | "APPROVED" | "REJECTED" | null;

function eventCoverStyle(imageUrl?: string | null) {
  if (!imageUrl) return undefined;
  return {
    backgroundImage: `linear-gradient(180deg, rgba(2, 6, 23, 0.08), rgba(2, 6, 23, 0.34)), url("${imageUrl.replace(/"/g, "%22")}")`,
  };
}

function infoCardClass() {
  return "rounded-xl border border-slate-800 bg-slate-950/35 p-4";
}

async function loadEventWithParticipants(id: string): Promise<EventDetails> {
  const data = await apiFetch<EventByIdRaw>(`/events/${id}`, { method: "GET" });
  const norm = normalizeEventRecord(data as Record<string, unknown>);
  if (!norm) throw new Error("Evento não encontrado.");

  const participants = await apiFetch<unknown>(`/events/${id}/participants`, {
    method: "GET",
  })
    .then(normalizeParticipantList)
    .catch(() => []);

  if (participants.length) {
    return { ...norm, participants };
  }

  const events = await apiFetch<unknown>("/events", { method: "GET" })
    .then(normalizeEventList)
    .catch(() => []);
  const fromList = events.find((currentEvent) => String(currentEvent.id) === String(id));

  return fromList && fromList.participants.length
    ? { ...norm, participants: fromList.participants }
    : norm;
}

export default function EventoDetalhesPage() {
  const { user } = useAuth();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const registeredFromLink = searchParams.get("registered") === "1";
  const statusFromLink = searchParams.get("status");
  const initialStatusHint: RegistrationStatusHint =
    statusFromLink === "PENDING" || statusFromLink === "APPROVED" || statusFromLink === "REJECTED"
      ? statusFromLink
      : null;
  const rememberedStatus =
    typeof window !== "undefined"
      ? getRememberedEventRegistration(id, user?.email)
      : null;

  const [event, setEvent] = useState<EventDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registrationKnown, setRegistrationKnown] = useState(Boolean(registeredFromLink || rememberedStatus));
  const [registrationStatusHint, setRegistrationStatusHint] =
    useState<RegistrationStatusHint>(initialStatusHint ?? rememberedStatus);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      setEvent(null);
      try {
        const eventWithParticipants = await loadEventWithParticipants(id);
        setEvent(eventWithParticipants);

        if (user?.email) {
          const participant = getParticipantForEmail(eventWithParticipants, user.email);
          if (participant) {
            setRegistrationKnown(true);
            setRegistrationStatusHint(getParticipantStatus(participant));
            rememberEventRegistration(id, user.email, getParticipantStatus(participant));
          } else {
            const cached = getRememberedEventRegistration(id, user.email);
            const checked = await checkEventRegistration(id, user.email).catch(() => Boolean(registeredFromLink || cached));
            setRegistrationKnown(checked);
            if (checked) setRegistrationStatusHint((current) => current ?? cached ?? "PENDING");
          }
        } else {
          setRegistrationKnown(registeredFromLink);
          setRegistrationStatusHint(initialStatusHint);
        }
      } catch (err: unknown) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }

    if (id) void load();
  }, [id, user?.email, registeredFromLink, initialStatusHint]);

  useEffect(() => {
    const refresh = () => {
      if (!id) return;
      void loadEventWithParticipants(id)
        .then((updatedEvent) => {
          setEvent(updatedEvent);
          if (!user?.email) return;

          const participant = getParticipantForEmail(updatedEvent, user.email);
          if (participant) {
            const status = getParticipantStatus(participant);
            setRegistrationKnown(true);
            setRegistrationStatusHint(status);
            rememberEventRegistration(id, user.email, status);
          } else {
            setRegistrationKnown(false);
            setRegistrationStatusHint(null);
            forgetEventRegistration(id, user.email);
          }
        })
        .catch((err: unknown) => setError(getErrorMessage(err)));
    };

    window.addEventListener(EVENT_REGISTRATION_CHANGED, refresh);
    window.addEventListener("focus", refresh);

    return () => {
      window.removeEventListener(EVENT_REGISTRATION_CHANGED, refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [id, user?.email]);

  function fmtDate(d: string) {
    const [y, m, dy] = d.split("-");
    return `${dy}/${m}/${y}`;
  }

  function timeShort(t: string | null) {
    if (!t) return "—";
    return t.slice(0, 5);
  }

  const currentParticipant = event ? getParticipantForEmail(event, user?.email) : null;
  const currentStatus = getParticipantStatus(currentParticipant) ?? registrationStatusHint;
  const hasRegistration = Boolean(currentParticipant) || registrationKnown;
  const isApproved = currentParticipant
    ? isApprovedRegistration(currentParticipant)
    : currentStatus === "APPROVED";
  const isPending = currentParticipant
    ? isPendingRegistration(currentParticipant)
    : currentStatus === "PENDING" || (registrationKnown && !currentStatus);
  const isRejected = currentStatus === "REJECTED";
  const approvedCount = event?.participants.filter((participant) => participant.status === "APPROVED").length ?? 0;
  const full = Boolean(event && approvedCount >= event.maxParticipants);
  const canViewDetails = event
    ? canViewPrivateEventInfo(event, currentParticipant) || (hasRegistration && !isRejected)
    : false;
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
      ? "Sua inscrição está ativa. Acesse o check-in pelo QR Code."
      : isPending
      ? "Sua inscrição está registrada. Você pode ver as informações do evento e acompanhar o check-in."
      : "Entre em contato com a organização para mais informações."
    : "Inscreva-se para participar deste evento.";

  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [canceling, setCanceling] = useState(false);
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
      if (hasRegistration) {
        setSuccessMessage("Você já está inscrito neste evento.");
        setSuccessBanner(true);
        window.setTimeout(() => setSuccessBanner(false), 4000);
        return;
      }

      const alreadyRegistered = await checkEventRegistration(id, user.email).catch(() => false);

      if (alreadyRegistered) {
        setRegistrationKnown(true);
        setRegistrationStatusHint((current) => current ?? "PENDING");
        const updatedEvent = await loadEventWithParticipants(id);
        const participant = getParticipantForEmail(updatedEvent, user.email);
        const status = getParticipantStatus(participant) ?? currentStatus ?? "PENDING";
        setEvent(updatedEvent);
        setRegistrationStatusHint(status);
        rememberEventRegistration(id, user.email, status);
        setSuccessMessage("Você já está inscrito neste evento.");
        setSuccessBanner(true);
        window.setTimeout(() => setSuccessBanner(false), 4000);
        return;
      }

      try {
        await createEventRegistration(id, user);
      } catch (err: unknown) {
        if (!isAlreadyRegisteredError(err)) throw err;
        setRegistrationKnown(true);
        setRegistrationStatusHint("PENDING");
        rememberEventRegistration(id, user.email, "PENDING");
      }

      const updatedEvent = await loadEventWithParticipants(id);
      setEvent(updatedEvent);
      notifyEventRegistrationChanged(id);

      const part = getParticipantForEmail(updatedEvent, user.email);
      setRegistrationKnown(true);
      setRegistrationStatusHint(getParticipantStatus(part) ?? "PENDING");
      rememberEventRegistration(id, user.email, getParticipantStatus(part) ?? "PENDING");
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

  async function cancelCurrentRegistration() {
    if (!event || !currentParticipant?.id) {
      setFormError("Não foi possível localizar sua inscrição para cancelar.");
      return;
    }

    if (!confirm("Tem certeza que deseja cancelar sua inscrição?")) return;

    setCanceling(true);
    setFormError(null);
    try {
      await cancelRegistration(event.id, currentParticipant.id);
      setEvent((currentEvent) =>
        currentEvent
          ? {
              ...currentEvent,
              participants: currentEvent.participants.filter(
                (participant) => participant.id !== currentParticipant.id,
              ),
            }
          : currentEvent,
      );
      setRegistrationKnown(false);
      setRegistrationStatusHint(null);
      forgetEventRegistration(event.id, user?.email);
      notifyEventRegistrationChanged(event.id);
      setSuccessMessage("Sua inscrição foi cancelada.");
      setSuccessBanner(true);
      window.setTimeout(() => setSuccessBanner(false), 4000);
    } catch (err: unknown) {
      setFormError(getErrorMessage(err));
    } finally {
      setCanceling(false);
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
	                        ? "Informações privadas — faça sua inscrição para ver os detalhes."
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
                    ? "Este é um evento privado. As informações completas ficam disponíveis somente para usuários inscritos."
                    : event.description?.trim() || "Sem descrição."}
                </p>
              </section>

              <section className="rounded-2xl border border-slate-800 bg-slate-900/45 p-6">
                <p className="text-sm font-bold text-white">
                  Área exclusiva para participantes
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Acesse materiais relacionados ao evento dentro da plataforma.
                </p>
                <div className="mt-5">
                  <EventMaterials eventId={event.id} isApproved={hasRegistration && isApproved} />
                </div>
              </section>
            </main>

            <aside className="space-y-4 lg:sticky lg:top-6">
              <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl shadow-black/20">
                <p className="text-xs font-bold uppercase tracking-widest text-secondary">
                  Sua participação
                </p>
                <h2 className="mt-2 text-xl font-black text-white">{statusTitle}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{statusDescription}</p>

	                {formError ? (
	                  <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-300">{formError}</p>
	                ) : null}
	                {successBanner ? (
	                  <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-3 py-2 text-sm font-semibold text-emerald-100">{successMessage}</div>
	                ) : null}

	                {hasRegistration && !isRejected ? (
	                  <div className="mt-4 space-y-2">
	                    <Link
	                      href={`/checkin/${event.id}`}
	                      className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-lg shadow-primary/25 hover:brightness-110"
	                    >
	                      Check-in (QR)
	                    </Link>
	                    <button
	                      type="button"
	                      onClick={() => void cancelCurrentRegistration()}
	                      disabled={canceling}
	                      className="inline-flex w-full items-center justify-center rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
	                    >
	                      {canceling ? "Cancelando..." : "Cancelar inscrição"}
	                    </button>
	                  </div>
	                ) : hasRegistration ? (
	                  <button
	                    type="button"
	                    disabled
	                    className="mt-4 inline-flex w-full cursor-not-allowed items-center justify-center rounded-xl bg-slate-800/60 px-4 py-3 text-sm font-bold text-slate-400"
	                  >
	                    Inscrição não aprovada
	                  </button>
	                ) : (
	                  <button
	                    type="button"
	                    onClick={() => void enrollNow()}
	                    disabled={full || submitting}
	                    className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-lg shadow-primary/25 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
	                  >
	                    {full ? "Lotado" : submitting ? "Inscrevendo..." : "Inscrever-se"}
	                  </button>
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
