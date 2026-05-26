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
    const totalChanges = useMemo(
        () => history.reduce((total, item) => total + item.changes.length, 0),
        [history],
    );

    useEffect(() => {
        if (!Number.isFinite(eventId)) {
            setLoadError("ID de evento inválido.");
            setLoading(false);
            return;
        }

        let cancelled = false;
        setEventTitle(`Evento #${eventId}`);
        setHistory(getEventHistory(eventId));

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
                setHistory(getEventHistory(eventId));
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
                    <div className="grid gap-3 border-b border-slate-800 px-6 py-5 sm:grid-cols-3">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                                Registros
                            </p>
                            <p className="mt-1 text-2xl font-black text-white">{history.length}</p>
                        </div>
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                                Campos alterados
                            </p>
                            <p className="mt-1 text-2xl font-black text-white">{totalChanges}</p>
                        </div>
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                                Última alteração
                            </p>
                            <p className="mt-2 text-sm font-semibold text-slate-300">
                                {history[0] ? formatDateTime(history[0].changedAt) : "—"}
                            </p>
                        </div>
                    </div>

                    {loadError ? (
                        <div className="border-b border-slate-800 px-6 py-4">
                            <p className="rounded-[10px] border border-amber-500/25 bg-amber-500/10 px-3.5 py-2.5 text-[13px] font-semibold text-amber-200">
                                Não foi possível atualizar os dados do evento agora: {loadError}
                            </p>
                        </div>
                    ) : null}

                    {loading ? (
                        <div className="px-6 py-7 text-sm text-slate-400">Carregando histórico...</div>
                    ) : history.length === 0 ? (
                        <div className="px-6 py-10 text-center">
                            <p className="text-base font-bold text-white">Nenhuma alteração registrada.</p>
                            <p className="mt-2 text-sm text-slate-400">
                                O histórico começa a ser salvo quando este evento é atualizado no painel.
                            </p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-slate-800">
                            {history.map((item) => (
                                <li key={item.id} className="px-6 py-5">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                            <p className="text-sm font-bold text-white">{item.changedBy}</p>
                                            <p className="mt-1 text-xs text-slate-500">
                                                {item.changes.length} campo{item.changes.length === 1 ? "" : "s"} alterado{item.changes.length === 1 ? "" : "s"}
                                            </p>
                                        </div>
                                        <time
                                            dateTime={item.changedAt}
                                            className="text-xs font-semibold uppercase tracking-wide text-slate-400"
                                        >
                                            {formatDateTime(item.changedAt)}
                                        </time>
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
