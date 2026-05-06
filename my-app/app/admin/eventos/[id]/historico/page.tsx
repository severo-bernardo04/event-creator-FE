"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getEventHistory, type EventHistoryItem } from "@/lib/eventHistory";
import { getErrorMessage } from "@/lib/errors";
import { normalizeEventRecord } from "@/lib/eventsFromApi";

function formatDateTime(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "medium",
    });
}

export default function HistoricoEventoPage() {
    const params = useParams<{ id: string }>();
    const eventId = useMemo(() => Number(params?.id), [params]);
    const [eventTitle, setEventTitle] = useState<string>("Evento");
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [history, setHistory] = useState<EventHistoryItem[]>([]);

    useEffect(() => {
        if (!Number.isFinite(eventId)) {
            setLoadError("ID de evento inválido.");
            setLoading(false);
            return;
        }

        let cancelled = false;
        (async () => {
            try {
                const data = await apiFetch<unknown>(`/events/${eventId}`, { method: "GET" });
                const event = normalizeEventRecord(data as Record<string, unknown>);
                if (cancelled) return;
                setEventTitle(event?.title ?? `Evento #${eventId}`);
                setHistory(getEventHistory(eventId));
            } catch (err: unknown) {
                if (cancelled) return;
                setLoadError(getErrorMessage(err));
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [eventId]);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            <div className="mx-auto w-full max-w-[920px] px-4 py-10 sm:px-6 lg:px-8">
                <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-bold uppercase tracking-widest text-secondary">
                            Painel administrativo
                        </p>
                        <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
                            Histórico de alterações
                        </h1>
                        <p className="mt-2 text-sm text-slate-400">{eventTitle}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Link
                            href={`/admin/eventos/${eventId}/editar`}
                            className="rounded-xl border border-primary/40 bg-primary/10 px-4 py-2.5 text-sm font-bold text-primary hover:bg-primary/20"
                        >
                            Editar evento
                        </Link>
                        <Link
                            href="/admin"
                            className="rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
                        >
                            Voltar ao admin
                        </Link>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/50">
                    {loading ? (
                        <div className="px-6 py-7 text-sm text-slate-400">Carregando histórico...</div>
                    ) : loadError ? (
                        <div className="px-6 py-7">
                            <p className="rounded-[10px] border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-[13px] font-semibold text-red-300">
                                {loadError}
                            </p>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="px-6 py-10 text-center">
                            <p className="text-base font-bold text-white">Nenhuma alteração registrada.</p>
                            <p className="mt-2 text-sm text-slate-400">
                                O histórico começa a ser salvo quando este evento é atualizado pela nova tela
                                de edição.
                            </p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-slate-800">
                            {history.map((item) => (
                                <li key={item.id} className="px-6 py-5">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="text-sm font-bold text-white">{item.changedBy}</p>
                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                            {formatDateTime(item.changedAt)}
                                        </p>
                                    </div>
                                    <ul className="mt-4 space-y-2">
                                        {item.changes.map((change, idx) => (
                                            <li key={`${item.id}-${idx}`} className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2.5">
                                                <p className="text-xs font-bold uppercase tracking-wide text-secondary">
                                                    {change.field}
                                                </p>
                                                <p className="mt-1 text-sm text-slate-300">
                                                    <span className="text-slate-500">De:</span> {change.from || "—"}
                                                </p>
                                                <p className="text-sm text-slate-300">
                                                    <span className="text-slate-500">Para:</span> {change.to || "—"}
                                                </p>
                                            </li>
                                        ))}
                                    </ul>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}