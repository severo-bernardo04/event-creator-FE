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
      <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6">
        <p className="text-sm font-semibold text-amber-100">
          Noticias e avisos internos ficam disponiveis apos a aprovacao da inscricao.
        </p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-800 bg-slate-900/45 p-6">
        <div className="flex items-center justify-center gap-2 py-8">
          <LoaderCircle className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-slate-400">Carregando noticias e avisos...</span>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
        <p className="text-sm text-red-300">{error}</p>
      </section>
    );
  }

  if (!notices.length) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/30 p-8 text-center">
        <Newspaper className="mx-auto h-10 w-10 text-slate-600" />
        <p className="mt-3 text-sm text-slate-400">
          Ainda nao ha noticias ou avisos publicados para este evento.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/45 p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Noticias e avisos</h2>
          <p className="mt-1 text-sm text-slate-500">Comunicados internos publicados pela organizacao.</p>
        </div>
        <Megaphone className="h-5 w-5 text-secondary" />
      </div>

      <div className="space-y-3">
        {notices.map((notice) => (
          <article key={notice.id} className="rounded-xl border border-slate-800 bg-slate-950/45 p-4">
            <div className="flex flex-wrap items-center gap-2">
              {notice.id === latestNoticeId ? (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-black uppercase text-slate-950">
                  Novo
                </span>
              ) : null}
              <time className="text-xs font-semibold text-slate-500">{formatDateTime(notice.createdAt)}</time>
            </div>
            <h3 className="mt-2 text-base font-bold text-white">{notice.titulo}</h3>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-300">{notice.conteudo}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
