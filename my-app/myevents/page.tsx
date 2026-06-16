"use client";

// Pagina que mostra os eventos associados ao usuario.
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { normalizeEventList, type ApiEventNorm } from "@/lib/eventsFromApi";

function fmtDate(d: string) {
    const [y, m, dy] = d.split("-");
    return `${dy}/${m}/${y}`;
}

export default function MeusEventosPage() {
    const { user } = useAuth();
    const [events, setEvents] = useState<ApiEventNorm[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadMyEvents = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Usar endpoint do backend que retorna eventos do usuário autenticado
            const data = await apiFetch<unknown>("/users/me/events", { method: "GET" });
            const all = normalizeEventList(data);
            // O endpoint já retorna apenas os eventos do usuário
            setEvents(all);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user) void loadMyEvents();
        else setLoading(false);
    }, [user, loadMyEvents]);

    if (!user) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-950">
                <div className="text-center">
                    <p className="text-slate-400">Você precisa estar logado.</p>
                    <Link href="/login?next=/meus-eventos"
                          className="mt-4 inline-block rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white">
                        Fazer login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            <div className="border-b border-slate-800 bg-slate-900/40">
                <div className="mx-auto max-w-[1600px] px-4 py-10 sm:px-6 lg:px-10">
                    <p className="text-sm font-bold uppercase tracking-widest text-secondary">
                        Minha conta
                    </p>
                    <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
                        Meus eventos
                    </h1>
                    <p className="mt-2 text-slate-400">
                        Eventos em que você está inscrito.
                    </p>
                </div>
            </div>

            <div className="mx-auto max-w-[1600px] px-4 py-12 sm:px-6 lg:px-10">
                {loading ? (
                    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                        {Array.from({ length: 3 }).map((_, idx) => (
                            <div key={idx} className="animate-pulse rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
                                <div className="aspect-[16/10] rounded-xl bg-slate-800" />
                                <div className="mt-4 h-5 w-2/3 rounded bg-slate-800" />
                                <div className="mt-2 h-4 w-full rounded bg-slate-800" />
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-5">
                        <p className="text-red-300">{error}</p>
                        <button onClick={() => void loadMyEvents()}
                                className="mt-4 rounded-xl border border-red-400/40 px-4 py-2 text-sm font-bold text-red-200">
                            Tentar novamente
                        </button>
                    </div>
                ) : events.length === 0 ? (
                    <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950 p-10 text-center">
                        <div className="mx-auto mb-4 h-14 w-14 text-secondary">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="h-full w-full">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7}
                                      d="M8 2v3m8-3v3M4 9h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" />
                            </svg>
                        </div>
                        <p className="text-xl font-bold text-white">Nenhuma inscrição ainda</p>
                        <p className="mt-2 text-sm text-slate-400">
                            Explore os eventos disponíveis e inscreva-se.
                        </p>
                        <Link href="/eventos"
                              className="mt-6 inline-flex rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white hover:brightness-110">
                            Ver eventos
                        </Link>
                    </div>
                ) : (
                    <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                        {events.map((ev) => (
                            <li key={ev.id}
                                className="flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 shadow-lg">
                                <div className="aspect-[16/10] w-full bg-gradient-to-br from-primary/35 via-slate-900 to-secondary/15" />
                                <div className="flex flex-1 flex-col p-6">
                                    <h2 className="text-lg font-bold text-white">{ev.title}</h2>
                                    <p className="mt-2 line-clamp-2 text-sm text-slate-400">
                                        {ev.description?.trim() || "Sem descrição."}
                                    </p>
                                    <p className="mt-3 text-sm text-slate-500">
                                        {fmtDate(ev.date)}
                                        {ev.location ? ` · ${ev.location}` : ""}
                                    </p>
                                    <div className="mt-4 inline-flex rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-400 ring-1 ring-emerald-500/25 w-fit">
                                        Inscrito
                                    </div>
                                    <Link href={`/checkin/${ev.id}`}
                                          className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-primary/40 bg-primary/10 py-3 text-sm font-bold text-primary hover:bg-primary/20">
                                        Ver QR Code
                                    </Link>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
