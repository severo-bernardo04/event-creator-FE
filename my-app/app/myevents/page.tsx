"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Inbox } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import {
  normalizeEventList,
  type ApiEventNorm,
  type ApiParticipantNorm,
} from "@/lib/eventsFromApi";
import {
  getParticipantForEmail,
  isActiveRegistration,
  isApprovedRegistration,
  isPendingRegistration,
} from "@/lib/eventParticipants";
import CancelRegistrationModal from "@/app/components/CancelRegistrationModal";

type MyEventRow = {
  event: ApiEventNorm;
  participant: ApiParticipantNorm;
};

function isEventFinished(date: string) {
  return new Date(`${date}T23:59:59`) < new Date();
}


export default function MeusEventosPage() {
  const { user } = useAuth();

  const [myEvents, setMyEvents] = useState<MyEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [selectedEventTitle, setSelectedEventTitle] = useState("");
  const [cancelingSubmitting, setCancelingSubmitting] = useState(false);

  const handleCancelRequest = (eventId: number, eventTitle: string) => {
    setSelectedEventId(eventId);
    setSelectedEventTitle(eventTitle);
    setCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!selectedEventId) return;

    setCancelingSubmitting(true);
    try {
      await apiFetch(`/events/${selectedEventId}/participants/cancel`, {
        method: "DELETE",
      });

      const data = await apiFetch("/events", { method: "GET" });
      const all = normalizeEventList(data);

      setMyEvents(
        all.flatMap((event) => {
          const participant = getParticipantForEmail(event, user?.email);
          if (!participant || !isActiveRegistration(participant)) return [];
          return [{ event, participant }];
        }),
      );

      setCancelModalOpen(false);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setCancelingSubmitting(false);
    }
  };

  useEffect(() => {
    async function loadEvents() {
      try {
        const data = await apiFetch("/events", { method: "GET" });
        const all = normalizeEventList(data);

        setMyEvents(
          all.flatMap((event) => {
            const participant = getParticipantForEmail(event, user?.email);
            if (!participant || !isActiveRegistration(participant)) return [];
            return [{ event, participant }];
          }),
        );
      } catch (err: unknown) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }

    if (user?.email) {
      void loadEvents();
    } else {
      setLoading(false);
    }
  }, [user]);

  const pendingEvents = useMemo(
    () =>
      myEvents.filter(
        ({ event, participant }) =>
          !isEventFinished(event.date) && isPendingRegistration(participant),
      ),
    [myEvents],
  );

  const activeEvents = useMemo(
    () =>
      myEvents.filter(
        ({ event, participant }) =>
          !isEventFinished(event.date) && isApprovedRegistration(participant),
      ),
    [myEvents],
  );

  const finishedEvents = useMemo(
    () =>
      myEvents.filter(
        ({ event, participant }) =>
          isEventFinished(event.date) && isApprovedRegistration(participant),
      ),
    [myEvents],
  );

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="text-4xl font-bold text-white">Meus eventos</h1>

        <p className="mt-4 text-blue-300/70">
          Você precisa estar logado para ver seus eventos.
        </p>

        <Link
          href="/login"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-white shadow-lg shadow-primary/25 transition hover:brightness-110"
        >
          Fazer login <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
  <div className="mx-auto max-w-6xl px-6 py-10 lg:py-14">
    <div className="mb-8">
      <Link
        href="/"
        className="rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
      >
        Voltar para home
      </Link>
    </div>

    <header className="mb-12">
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-yellow-400">
          Área do participante
        </span>

        <h1 className="mt-2 text-4xl font-extrabold text-white lg:text-5xl">
          Meus eventos
        </h1>

        <p className="mt-3 max-w-2xl text-blue-300/70">
          Veja os eventos em que você está inscrito e o histórico dos eventos
          que já participou.
        </p>
      </header>

      {loading ? (
        <LoadingSkeleton />
      ) : error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-300">
          {error}
        </div>
      ) : (
        <div className="space-y-14">
          <EventSection
            title="Aguardando aprovação"
            description="Eventos privados ou moderados em que sua inscrição ainda precisa ser aprovada."
            count={pendingEvents.length}
          >
            {pendingEvents.length ? (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {pendingEvents.map(({ event, participant }) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    participant={participant}
                    variant="pending"
                    onCancelationRequested={handleCancelRequest}
                  />
                ))}
              </div>
            ) : (
              <EmptyCard text="Você não tem inscrições pendentes." />
            )}
          </EventSection>

          <EventSection
            title="Próximos eventos"
            description="Eventos em que você está inscrito e que ainda vão acontecer."
            count={activeEvents.length}
          >
            {activeEvents.length ? (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {activeEvents.map(({ event, participant }) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    participant={participant}
                    variant="active"
                    onCancelationRequested={handleCancelRequest}
                  />
                ))}
              </div>
            ) : (
              <EmptyCard text="Você ainda não está inscrito em nenhum evento futuro." />
            )}
          </EventSection>

          <EventSection
            title="Eventos finalizados"
            description="Histórico dos eventos em que você já participou."
            count={finishedEvents.length}
          >
            {finishedEvents.length ? (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {finishedEvents.map(({ event, participant }) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    participant={participant}
                    variant="finished"
                  />
                ))}
              </div>
            ) : (
              <EmptyCard text="Você ainda não participou de nenhum evento." />
            )}
          </EventSection>
        </div>
      )}

      <CancelRegistrationModal
        isOpen={cancelModalOpen}
        eventTitle={selectedEventTitle}
        isLoading={cancelingSubmitting}
        canCancel={true}
        onConfirm={handleConfirmCancel}
        onCancel={() => setCancelModalOpen(false)}
      />
    </div>
  );
}

function EventSection({
  title,
  description,
  count,
  children,
}: {
  title: string;
  description: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <p className="mt-1 text-sm text-blue-300/60">{description}</p>
        </div>

        <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300">
          {count} evento{count === 1 ? "" : "s"}
        </span>
      </div>

      {children}
    </section>
  );
}

function EventCard({
  event,
  participant,
  variant,
  onCancelationRequested,
}: {
  event: ApiEventNorm;
  participant: ApiParticipantNorm;
  variant: "pending" | "active" | "finished";
  onCancelationRequested?: (eventId: number, eventTitle: string) => void;
}) {
  const isActive = variant === "active";
  const isPending = variant === "pending";

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-primary/10">
      <div className="mb-4 flex items-center justify-between gap-2">
        <span className="rounded-full bg-primary/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
          {event.category || "Evento"}
        </span>

        <span
          className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${
            isPending
              ? "bg-amber-500/15 text-amber-300"
              : isActive
              ? "bg-secondary/15 text-secondary"
              : "bg-white/10 text-blue-300/70"
          }`}
        >
          {variant === "finished" ? "Evento finalizado" : isPending ? "Inscrição pendente" : "Inscrição confirmada"}
        </span>
      </div>

      <h3 className="text-xl font-extrabold text-white">{event.title}</h3>

      <p className="mt-2 line-clamp-2 text-sm text-blue-300/70">
        {event.description || "Sem descrição."}
      </p>

      <div className="my-5 h-px bg-white/5" />

      <div className="space-y-2.5 text-sm">
        <div className="flex items-center gap-3">
          <span className="text-blue-400/60">📅</span>
          <span className="w-12 text-[10px] font-bold uppercase tracking-wider text-blue-300/50">
            Data
          </span>
          <span className="flex-1 truncate font-medium text-white/90">
            {new Date(`${event.date}T00:00:00`).toLocaleDateString("pt-BR")}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-blue-400/60">🕐</span>
          <span className="w-12 text-[10px] font-bold uppercase tracking-wider text-blue-300/50">
            Hora
          </span>
          <span className="flex-1 truncate font-medium text-white/90">
            {event.time ? event.time.slice(0, 5) : "A definir"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-blue-400/60">📍</span>
          <span className="w-12 text-[10px] font-bold uppercase tracking-wider text-blue-300/50">
            Local
          </span>
          <span className="flex-1 truncate font-medium text-white/90">
            {event.location || "A definir"}
          </span>
        </div>
      </div>

      <div className="mt-6 flex gap-2">
        <Link
          href={`/eventos/${event.id}`}
          className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all duration-300 ${
            isPending
              ? "border border-amber-400/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20"
              : isActive
              ? "bg-primary text-white shadow-lg shadow-primary/25 hover:brightness-110"
              : "border border-primary/40 text-primary hover:bg-primary/10"
          }`}
        >
          {isPending ? "Ver status da inscrição" : "Ver detalhes do evento"}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>

        {isActive && (
          <button
            onClick={() => onCancelationRequested?.(event.id, event.title)}
            className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300 transition hover:bg-red-500/20"
            title="Cancelar sua inscrição neste evento"
          >
            ✕
          </button>
        )}
      </div>
    </article>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/2 py-16 text-center">
      <Inbox className="h-10 w-10 text-blue-400/30" />
      <p className="mt-4 text-sm text-blue-300/60">{text}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="h-72 animate-pulse rounded-2xl border border-white/5 bg-white/3"
        />
      ))}
    </div>
  );
}
