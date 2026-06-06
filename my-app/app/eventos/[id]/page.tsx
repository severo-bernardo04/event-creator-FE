"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  LoaderCircle,
  MapPin,
  QrCode,
  ShieldCheck,
  Ticket,
  Users,
  X,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getAdultEventRestrictionMessage } from "@/lib/ageRestriction";
import { cancelRegistration } from "@/lib/cancelRegistration";
import { getErrorMessage } from "@/lib/errors";
import type { ApiEventNorm } from "@/lib/eventsFromApi";
import { normalizeEventList, normalizeEventRecord, normalizeParticipantList } from "@/lib/eventsFromApi";
import { getCategoryForEvent } from "@/lib/categoryMocks";
import { useAuth } from "@/context/AuthContext";
import EventMaterials from "@/app/components/EventMaterials";
import EventNews from "@/app/components/EventNews";
import CancelRegistrationModal from "@/app/components/CancelRegistrationModal";
import { canCancelRegistration } from "@/lib/eventDatetime";
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
type TicketResponse = {
  ticketId: string;
  token: string;
  qrCodeBase64: string;
};

function eventCoverStyle(imageUrl?: string | null) {
  if (!imageUrl) return undefined;
  return {
    backgroundImage: `linear-gradient(180deg, rgba(2, 6, 23, 0.08), rgba(2, 6, 23, 0.34)), url("${imageUrl.replace(/"/g, "%22")}")`,
  };
}

function infoCardClass() {
  return "min-w-0 rounded-xl border border-slate-800 bg-slate-950/45 p-4";
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
      ? "Sua inscrição está pendente. O QR Code será liberado somente após aprovação."
      : "Entre em contato com a organização para mais informações."
    : "Inscreva-se para participar deste evento.";

  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [checkinModalOpen, setCheckinModalOpen] = useState(false);
  const [ticket, setTicket] = useState<TicketResponse | null>(null);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketError, setTicketError] = useState<string | null>(null);
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
      const adultRestriction = event ? getAdultEventRestrictionMessage(event, user) : null;
      if (adultRestriction) {
        setFormError(adultRestriction);
        return;
      }

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

  async function openCheckinModal() {
    if (!event) return;

    setCheckinModalOpen(true);
    setTicketError(null);

    if (ticket?.qrCodeBase64 || currentParticipant?.qrCodeBase64) return;

    setTicketLoading(true);
    try {
      const data = await apiFetch<TicketResponse>(`/tickets/events/${event.id}/me`, { method: "GET" });
      setTicket(data);
    } catch (err: unknown) {
      setTicket(null);
      setTicketError(getErrorMessage(err));
    } finally {
      setTicketLoading(false);
    }
  }

  const qrCodeBase64 = isApproved ? ticket?.qrCodeBase64 ?? currentParticipant?.qrCodeBase64 : undefined;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="border-b border-slate-800 bg-slate-900/55">
        <div className="mx-auto flex max-w-[1220px] items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/eventos"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm font-bold text-white transition hover:bg-slate-800 sm:px-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
          {event ? (
            <span className="min-w-0 truncate rounded-full border border-slate-700 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-400">
              Evento #{event.id}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mx-auto max-w-[1220px] px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
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
          <div className="space-y-6">
            <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/45">
              <div
                className={`relative flex min-h-[360px] items-end bg-cover bg-center sm:min-h-[430px] ${
                  event.imageUrl
                    ? "bg-slate-900"
                    : "bg-gradient-to-br from-primary/35 via-slate-900 to-secondary/15"
                }`}
                style={eventCoverStyle(event.imageUrl)}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-slate-950/10" />
                <div className="relative w-full p-4 sm:p-6 lg:p-8">
                  <div className="mb-4 flex flex-wrap gap-2">
                    <span className="max-w-full truncate rounded-full bg-secondary px-3 py-1 text-xs font-black uppercase text-slate-950">
                      {event.category ? event.category : getCategoryForEvent(event.id)}
                    </span>
                    <span className="rounded-full border border-white/20 bg-black/45 px-3 py-1 text-xs font-bold uppercase text-white">
                      {event.majority18 ? "+18" : "Livre"}
                    </span>
                    {event.private ? (
                      <span className="rounded-full border border-amber-400/30 bg-amber-400/15 px-3 py-1 text-xs font-bold uppercase text-amber-100">
                        Privado
                      </span>
                    ) : null}
                  </div>

                  <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-end">
                    <div className="min-w-0">
                      <h1 className="max-w-4xl break-words text-3xl font-black tracking-tight text-white sm:text-5xl">
                        {event.title}
                      </h1>
                      <p className="mt-4 max-w-3xl break-words text-sm leading-7 text-slate-200 sm:text-base">
                        {!canViewDetails
                          ? "Informações privadas. Faça sua inscrição para acompanhar os detalhes liberados pela organização."
                          : event.description?.trim() || "Sem descrição."}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-slate-950/75 p-4 backdrop-blur sm:p-5">
                      <p className="text-xs font-bold uppercase tracking-widest text-secondary">
                        Sua participação
                      </p>
                      <h2 className="mt-2 break-words text-xl font-black text-white">{statusTitle}</h2>
                      <p className="mt-2 break-words text-sm leading-relaxed text-slate-400">{statusDescription}</p>

                      {formError ? (
                        <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-300">
                          {formError}
                        </p>
                      ) : null}
                      {successBanner ? (
                        <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-3 py-2 text-sm font-semibold text-emerald-100">
                          {successMessage}
                        </div>
                      ) : null}

	                      {hasRegistration && isApproved ? (
	                        <div className="mt-4 space-y-2">
	                          <button
                              type="button"
                              onClick={() => void openCheckinModal()}
	                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-lg shadow-primary/25 transition hover:brightness-110"
	                          >
	                            <QrCode className="h-4 w-4" />
	                            Check-in
	                          </button>
                          <button
                            type="button"
                            onClick={() => setCancelModalOpen(true)}
                            disabled={canceling}
                            className="inline-flex w-full items-center justify-center rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {canceling ? "Cancelando..." : "Cancelar inscrição"}
                          </button>
                        </div>
                      ) : hasRegistration && isPending ? (
                        <div className="mt-4 space-y-2">
                          <div className="inline-flex w-full items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-200">
                            Inscrição em análise
                          </div>
                          <button
                            type="button"
                            onClick={() => setCancelModalOpen(true)}
                            disabled={canceling}
                            className="inline-flex w-full items-center justify-center rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {canceling ? "Cancelando..." : "Cancelar envio de inscrição"}
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
                          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-lg shadow-primary/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Ticket className="h-4 w-4" />
                          {full ? "Lotado" : submitting ? "Inscrevendo..." : "Inscrever-se"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              </section>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-start">
              <main className="min-w-0 space-y-6">
                <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className={infoCardClass()}>
                    <CalendarDays className="h-5 w-5 text-secondary" />
                    <p className="mt-3 text-xs font-bold uppercase tracking-widest text-slate-500">Data</p>
                    <p className="mt-1 break-words text-lg font-black text-white">{fmtDate(event.date)}</p>
                  </div>
                  <div className={infoCardClass()}>
                    <Clock className="h-5 w-5 text-secondary" />
                    <p className="mt-3 text-xs font-bold uppercase tracking-widest text-slate-500">Horário</p>
                    <p className="mt-1 break-words text-lg font-black text-white">{timeShort(event.time)}</p>
                  </div>
                  <div className={infoCardClass()}>
                    <MapPin className="h-5 w-5 text-secondary" />
                    <p className="mt-3 text-xs font-bold uppercase tracking-widest text-slate-500">Local</p>
                    <p className="mt-1 break-words text-lg font-black text-white">
                      {canViewDetails ? event.location || "A definir" : "Após aprovação"}
                    </p>
                  </div>
                  <div className={infoCardClass()}>
                    <Users className="h-5 w-5 text-secondary" />
                    <p className="mt-3 text-xs font-bold uppercase tracking-widest text-slate-500">Vagas</p>
                    <p className="mt-1 break-words text-lg font-black text-white">
                      {approvedCount}/{event.maxParticipants}
                    </p>
                  </div>
                </section>

                <section className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/45 p-4 sm:p-6">
                  <div className="flex items-start gap-3">
                    <span className="rounded-xl bg-secondary/10 p-2 text-secondary">
                      <ShieldCheck className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-lg font-black text-white">Sobre o evento</h2>
                      <p className="mt-3 break-words text-sm leading-7 text-slate-400">
                        {!canViewDetails
                          ? "Este é um evento privado. As informações completas ficam disponíveis somente para usuários inscritos."
                          : event.description?.trim() || "Sem descrição."}
                      </p>
                    </div>
                  </div>
                </section>

                {canViewDetails && event.speakers.length ? (
                  <section className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/45 p-4 sm:p-6">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-black text-white">Palestrantes</h2>
                        <p className="mt-1 text-sm text-slate-500">Convidados e temas do evento.</p>
                      </div>
                      <Users className="h-5 w-5 shrink-0 text-secondary" />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      {event.speakers.map((speaker, index) => (
                        <article
                          key={`${speaker.id ?? speaker.name}-${index}`}
                          className="rounded-xl border border-slate-800 bg-slate-950/45 p-4"
                        >
                          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                            Palestrante {index + 1}
                          </p>
                          <h3 className="mt-1 break-words text-lg font-black text-white">
                            {speaker.name}
                          </h3>
                          {speaker.topics.length ? (
                            <p className="mt-3 break-words text-sm leading-6 text-slate-300">
                              {speaker.topics.join(", ")}
                            </p>
                          ) : null}
                          {speaker.bio ? (
                            <p className="mt-3 break-words text-sm leading-6 text-slate-400">
                              {speaker.bio}
                            </p>
                          ) : null}
                          {speaker.agenda ? (
                            <p className="mt-3 break-words text-sm leading-6 text-slate-500">
                              {speaker.agenda}
                            </p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </section>
                ) : null}

                <section className="min-w-0 space-y-4">
                  <div>
                    <h2 className="text-lg font-black text-white">Área do participante</h2>
                    <p className="mt-1 break-words text-sm leading-6 text-slate-500">
                      Notícias, avisos e materiais liberados pela organização.
                    </p>
                  </div>
                  <div className="grid gap-4 xl:grid-cols-2">
                    <EventNews eventId={event.id} isApproved={hasRegistration && isApproved} />
                    <EventMaterials eventId={event.id} isApproved={hasRegistration && isApproved} />
                  </div>
                </section>
              </main>

              <aside className="min-w-0 space-y-4 lg:sticky lg:top-6">
                <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl shadow-black/20 sm:p-5">
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

                <section className="rounded-2xl border border-slate-800 bg-slate-900/45 p-4 sm:p-5">
                  <p className="text-sm font-bold text-white">Resumo</p>
                  <dl className="mt-4 space-y-3 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">Categoria</dt>
                      <dd className="break-words text-right font-semibold text-slate-200">
                        {event.category ? event.category : getCategoryForEvent(event.id)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">Classificação</dt>
                      <dd className="font-semibold text-slate-200">{event.majority18 ? "+18" : "Livre"}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">Status</dt>
                      <dd className="font-semibold text-slate-200">{full ? "Lotado" : "Disponível"}</dd>
                    </div>
                  </dl>
                </section>

                <Link
                  href="/eventos"
                  className="inline-flex w-full items-center justify-center rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
                >
                  Ver mais eventos
                </Link>
              </aside>
            </div>
          </div>
        ) : null}
        {checkinModalOpen ? (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/75 px-4 py-6 backdrop-blur-md"
            role="presentation"
            onClick={() => setCheckinModalOpen(false)}
          >
            <div
              className="relative w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-5 text-center shadow-2xl shadow-black/50 sm:p-6"
              role="dialog"
              aria-modal="true"
              aria-labelledby="checkin-modal-title"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setCheckinModalOpen(false)}
                className="absolute right-3 top-3 rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                aria-label="Fechar QR Code"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <QrCode className="h-6 w-6" />
              </div>
              <p className="mt-4 text-xs font-bold uppercase tracking-widest text-secondary">
                Check-in
              </p>
              <h2 id="checkin-modal-title" className="mt-1 break-words text-2xl font-black text-white">
                Seu QR Code
              </h2>
              <p className="mt-1 break-words text-sm text-slate-400">
                {event?.title ?? "Evento"}
              </p>

              {ticketLoading ? (
                <div className="mt-7 flex h-[252px] flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-950">
                  <LoaderCircle className="h-7 w-7 animate-spin text-primary" />
                  <p className="mt-3 text-sm font-semibold text-slate-400">Gerando QR Code...</p>
                </div>
              ) : ticketError ? (
                <div className="mt-7 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-left">
                  <p className="text-sm font-bold text-red-200">Não foi possível carregar o QR Code.</p>
                  <p className="mt-2 text-sm leading-6 text-red-200/80">{ticketError}</p>
                </div>
              ) : qrCodeBase64 ? (
                <div className="mt-7 space-y-4">
                  <div className="mx-auto w-fit rounded-2xl bg-white p-4">
                    <img
                      src={`data:image/png;base64,${qrCodeBase64}`}
                      alt="QR Code do participante"
                      width={220}
                      height={220}
                    />
                  </div>
                  {ticket?.ticketId || currentParticipant?.ticketId ? (
                    <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-xs text-slate-500">
                      Ticket:{" "}
                      <span className="break-all text-slate-300">
                        {ticket?.ticketId ?? currentParticipant?.ticketId}
                      </span>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="mt-7 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-left">
                  <p className="text-sm font-bold text-amber-100">QR Code ainda não disponível.</p>
                  <p className="mt-2 text-sm leading-6 text-amber-200/80">
                    Sua inscrição foi encontrada, mas a API ainda não retornou um QR Code.
                  </p>
                </div>
              )}

              <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-left">
                <p className="break-words text-sm font-bold text-white">
                  {currentParticipant?.name ?? user?.name}
                </p>
                <p className="break-words text-xs text-slate-500">
                  {currentParticipant?.email ?? user?.email}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <CancelRegistrationModal
          isOpen={cancelModalOpen}
          eventTitle={event?.title ?? "este evento"}
          isLoading={canceling}
          canCancel={event ? canCancelRegistration(event.date, event.time) : true}
          onConfirm={async () => {
            await cancelCurrentRegistration();
            setCancelModalOpen(false);
          }}
          onCancel={() => setCancelModalOpen(false)}
        />
      </div>
    </div>
  );
}
