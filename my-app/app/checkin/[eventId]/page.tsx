"use client";

import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type TicketResponse = {
    ticketId: string;
    eventId: number;
    token: string;
    qrCodeBase64: string;
};

export default function CheckinPage() {
    const { user } = useAuth();
    const params = useParams();
    const eventId = params.eventId as string;

    const [ticket, setTicket] = useState<TicketResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;

        async function fetchTicket() {
            setLoading(true);
            setError(null);
            try {
                const data = await apiFetch<TicketResponse>("/tickets", {
                    method: "POST",
                    json: {
                        eventId: Number(eventId),
                        expirationMinutes: 60,
                    },
                });
                setTicket(data);
            } catch (err) {
                setError(getErrorMessage(err));
            } finally {
                setLoading(false);
            }
        }

        void fetchTicket();
    }, [user, eventId]);

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
                    Apresente na entrada do evento
                </p>

                <div className="mt-8 flex justify-center">
                    {loading ? (
                        <div className="h-[200px] w-[200px] animate-pulse rounded-xl bg-slate-800" />
                    ) : error ? (
                        <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-4">
                            <p className="text-sm text-red-300">{error}</p>
                        </div>
                    ) : ticket ? (
                        <div className="rounded-2xl bg-white p-4">
                            <img
                                src={`data:image/png;base64,${ticket.qrCodeBase64}`}
                                alt="QR Code de entrada"
                                width={200}
                                height={200}
                            />
                        </div>
                    ) : null}
                </div>

                {ticket ? (
                    <div className="mt-6 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-left">
                        <p className="text-sm font-bold text-white">{user.name}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                        <p className="mt-1 text-xs text-slate-600">
                            Evento #{eventId} · válido por 60 min
                        </p>
                    </div>
                ) : null}

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