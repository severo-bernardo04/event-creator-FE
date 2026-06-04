"use client";

import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { getParticipantForEmail } from "@/lib/eventParticipants";
import { checkEventRegistration } from "@/lib/eventRegistration";
import {
    normalizeEventList,
    normalizeEventRecord,
    normalizeParticipantList,
    type ApiEventNorm,
} from "@/lib/eventsFromApi";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type TicketResponse = {
    ticketId: string;
    token: string;
    qrCodeBase64: string;
};

export default function CheckinPage() {

    const { user } = useAuth();
    const params = useParams();
    const eventId = params.eventId as string;
    const [event, setEvent] = useState<ApiEventNorm | null>(null);
    const [ticket, setTicket] = useState<TicketResponse | null>(null);
    const [registrationConfirmed, setRegistrationConfirmed] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const userEmail = user?.email;

        if (!userEmail || !eventId) {
            setLoading(false);
            return;
        }
        const email = userEmail;

        async function loadEvent() {
            setLoading(true);
            setError(null);

            try {
                const data = await apiFetch<unknown>(`/events/${eventId}`, { method: "GET" });
                const normalizedEvent = normalizeEventRecord(data as Record<string, unknown>);

                if (!normalizedEvent) {
                    throw new Error("Evento não encontrado.");
                }

                const participants = await apiFetch<unknown>(`/events/${eventId}/participants`, {
                    method: "GET",
                })
                    .then(normalizeParticipantList)
                    .catch(() => []);

                const eventWithParticipants = participants.length
                    ? { ...normalizedEvent, participants }
                    : normalizedEvent;
                const participantFromEvent = getParticipantForEmail(eventWithParticipants, email);

                if (participantFromEvent) {
                    setRegistrationConfirmed(true);
                    setEvent(eventWithParticipants);
                    await apiFetch<TicketResponse>(`/tickets/events/${eventId}/me`, { method: "GET" })
                        .then(setTicket)
                        .catch(() => setTicket(null));
                    return;
                }

                const eventFromList = await apiFetch<unknown>("/events", { method: "GET" })
                    .then(normalizeEventList)
                    .then((events) => events.find((currentEvent) => String(currentEvent.id) === String(eventId)))
                    .catch(() => null);
                const participantFromList = eventFromList
                    ? getParticipantForEmail(eventFromList, email)
                    : null;

                if (eventFromList && participantFromList) {
                    setRegistrationConfirmed(true);
                    setEvent({
                        ...normalizedEvent,
                        participants: eventFromList.participants,
                    });
                    await apiFetch<TicketResponse>(`/tickets/events/${eventId}/me`, { method: "GET" })
                        .then(setTicket)
                        .catch(() => setTicket(null));
                    return;
                }

                const checked = await checkEventRegistration(eventId, email).catch(() => false);
                setRegistrationConfirmed(checked);
                setEvent(eventFromList ? { ...normalizedEvent, participants: eventFromList.participants } : eventWithParticipants);
                if (checked) {
                    await apiFetch<TicketResponse>(`/tickets/events/${eventId}/me`, { method: "GET" })
                        .then(setTicket)
                        .catch(() => setTicket(null));
                }
            } catch (err: unknown) {
                setError(getErrorMessage(err));
                setEvent(null);
                setTicket(null);
                setRegistrationConfirmed(false);
            } finally {
                setLoading(false);
            }
        }

        void loadEvent();
    }, [eventId, user?.email]);

    const participant = event ? getParticipantForEmail(event, user?.email) : null;
    const qrCodeBase64 = ticket?.qrCodeBase64 ?? participant?.qrCodeBase64;

    if (!user) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-950">
                <p className="text-slate-400">
                    Você precisa estar logado.{" "}
                    <Link href="/login" className="text-secondary underline">
                        Entrar
                    </Link>
                </p>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-slate-100">
            <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center shadow-2xl">
                <p className="text-xs font-bold uppercase tracking-widest text-secondary">
                    Check-in
                </p>
                <h1 className="mt-2 text-2xl font-black text-white">
                    Seu QR Code
                </h1>
                <p className="mt-1 text-sm text-slate-400">
                    {event?.title ?? `Evento #${eventId}`}
                </p>

                {loading ? (
                    <div className="mx-auto mt-8 h-[220px] w-[220px] animate-pulse rounded-xl bg-slate-800" />
                ) : error ? (
                    <div className="mt-8 rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-left text-sm font-semibold text-red-300">
                        {error}
                    </div>
                ) : !participant && !registrationConfirmed ? (
                    <div className="mt-8 rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-left">
                        <p className="text-sm font-bold text-red-100">
                            Inscrição não encontrada.
                        </p>
                        <p className="mt-2 text-sm leading-6 text-red-200/80">
                            Use a mesma conta cadastrada no evento para acessar seu QR Code.
                        </p>
                    </div>
                ) : participant && qrCodeBase64 ? (
                    <div className="mt-8 space-y-5">
                        <div className="mx-auto w-fit rounded-2xl bg-white p-4">
                            <img
                                src={`data:image/png;base64,${qrCodeBase64}`}
                                alt="QR Code do participante"
                                width={220}
                                height={220}
                            />
                        </div>
                        {ticket?.ticketId || participant.ticketId ? (
                            <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-xs text-slate-500">
                                Ticket: <span className="text-slate-300">{ticket?.ticketId ?? participant.ticketId}</span>
                            </div>
                        ) : null}
                    </div>
                ) : (
                    <div className="mt-8 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-left">
                        <p className="text-sm font-bold text-amber-100">
                            O QR Code ainda não foi gerado.
                        </p>
                        <p className="mt-2 text-sm leading-6 text-amber-200/80">
                            Sua inscrição foi encontrada, mas a API ainda não retornou um QR Code para este participante.
                        </p>
                    </div>
                )}

                <div className="mt-6 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-left">
                    <p className="text-sm font-bold text-white">{participant?.name ?? user.name}</p>
                    <p className="text-xs text-slate-500">{participant?.email ?? user.email}</p>
                </div>

                <div className="mt-6">
                    <Link
                        href="/eventos"
                        className="rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
                    >
                        Voltar aos eventos
                    </Link>
                </div>
            </div>
        </div>
    );
}
