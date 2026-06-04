"use client";

import { useEffect, useMemo, useState } from "react";
import { LoaderCircle, Megaphone, Newspaper } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";

type NotificationType = "GENERAL" | "SPECIFIC_EVENT";

type EventNotice = {
  id: number;
  titulo: string;
  conteudo: string;
  type?: NotificationType;
  eventId?: number | null;
  createdAt: string;
};

type EventNewsProps = {
  eventId: number;
  isApproved: boolean;
};

function isEventNotice(value: unknown): value is EventNotice {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "number" &&
    typeof item.titulo === "string" &&
    typeof item.conteudo === "string" &&
    typeof item.createdAt === "string"
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function EventNews({ eventId, isApproved }: EventNewsProps) {
  const [notices, setNotices] = useState<EventNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isApproved) {
      setLoading(false);
      setNotices([]);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<unknown>("/avisos", { method: "GET" });
        if (cancelled) return;
        const eventNotices = Array.isArray(data)
          ? data
              .filter(isEventNotice)
              .filter((notice) => Number(notice.eventId) === eventId)
              .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
          : [];
        setNotices(eventNotices);
      } catch (err: unknown) {
        if (!cancelled) setError(getErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [eventId, isApproved]);

  const latestNoticeId = useMemo(() => notices[0]?.id, [notices]);

  if (!isApproved) {
    return (
      <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-6">
        <p className="break-words text-sm font-semibold text-amber-100">
          Notícias e avisos internos ficam disponíveis após a aprovação da inscrição.
        </p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-800 bg-slate-900/45 p-4 sm:p-6">
        <div className="flex items-center justify-center gap-2 py-8">
          <LoaderCircle className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-slate-400">Carregando notícias e avisos...</span>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 sm:p-6">
        <p className="break-words text-sm text-red-300">{error}</p>
      </section>
    );
  }

  if (!notices.length) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/30 p-5 text-center sm:p-8">
        <Newspaper className="mx-auto h-10 w-10 text-slate-600" />
        <p className="mt-3 break-words text-sm text-slate-400">
          Ainda não há notícias ou avisos publicados para este evento.
        </p>
      </section>
    );
  }

  return (
    <section className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/45 p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="break-words text-lg font-bold text-white">Notícias e avisos</h2>
          <p className="mt-1 break-words text-sm text-slate-500">Comunicados internos publicados pela organização.</p>
        </div>
        <Megaphone className="h-5 w-5 shrink-0 text-secondary" />
      </div>

      <div className="space-y-3">
        {notices.map((notice) => (
          <article key={notice.id} className="min-w-0 rounded-xl border border-slate-800 bg-slate-950/45 p-3 sm:p-4">
            <div className="flex flex-wrap items-center gap-2">
              {notice.id === latestNoticeId ? (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-black uppercase text-slate-950">
                  Novo
                </span>
              ) : null}
              <time className="break-words text-xs font-semibold text-slate-500">{formatDateTime(notice.createdAt)}</time>
            </div>
            <h3 className="mt-2 break-words text-base font-bold text-white">{notice.titulo}</h3>
            <p className="mt-2 whitespace-pre-line break-words text-sm leading-6 text-slate-300">{notice.conteudo}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
