"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL, apiFetch } from "@/lib/api";
import { normalizeEventList } from "@/lib/eventsFromApi";
import { getParticipantForEmail, isActiveRegistration } from "@/lib/eventParticipants";

type NotificationType = "GENERAL" | "SPECIFIC_EVENT";

type NotificationResponse = {
  id: number;
  titulo: string;
  conteudo: string;
  type: NotificationType;
  eventId?: number | null;
  createdAt: string;
};

type NotificationItem = NotificationResponse & {
  receivedAt: string;
  unread: boolean;
};

type LocalNotificationChange = {
  type?: string;
  notification?: Partial<NotificationResponse>;
};

type NotificationContextValue = {
  items: NotificationItem[];
  unreadCount: number;
  markAllAsRead: () => void;
  clearAll: () => void;
};

type NotificationCenterProps = {
  placement?: "fixed" | "inline";
};

const MAX_ITEMS = 30;
const NotificationContext = createContext<NotificationContextValue | null>(null);

function storageKey(email?: string | null) {
  return `event-notifications:${email?.trim().toLowerCase() || "anonymous"}`;
}

function isNotification(value: unknown): value is NotificationItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "number" &&
    typeof item.titulo === "string" &&
    typeof item.conteudo === "string" &&
    typeof item.createdAt === "string"
  );
}

function readStoredNotifications(email?: string | null) {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(email));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isNotification) : [];
  } catch {
    return [];
  }
}

function saveStoredNotifications(email: string | undefined | null, items: NotificationItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(email), JSON.stringify(items.slice(0, MAX_ITEMS)));
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function shouldShowNotification(notification: NotificationResponse, eventIds: Set<number>) {
  if (!notification.eventId) return true;
  return eventIds.has(Number(notification.eventId));
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [subscribedEventIds, setSubscribedEventIds] = useState<Set<number>>(new Set());

  const unreadCount = useMemo(
    () => items.filter((item) => item.unread).length,
    [items],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setItems(readStoredNotifications(user?.email));
    }, 0);

    return () => window.clearTimeout(timer);
  }, [user?.email]);

  useEffect(() => {
    if (!user?.email) {
      const timer = window.setTimeout(() => {
        setSubscribedEventIds(new Set());
      }, 0);

      return () => window.clearTimeout(timer);
    }

    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch<unknown>("/events", { method: "GET" });
        if (cancelled) return;
        const eventIds = normalizeEventList(data)
          .filter((event) => {
            const participant = getParticipantForEmail(event, user.email);
            return isActiveRegistration(participant);
          })
          .map((event) => event.id);
        setSubscribedEventIds(new Set(eventIds));
      } catch {
        if (!cancelled) setSubscribedEventIds(new Set());
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.email]);

  useEffect(() => {
    if (!user?.email) return;

    const email = user.email;
    const source = new EventSource(`${API_BASE_URL}/avisos/stream`);

    function shouldShow(notification: NotificationResponse) {
      return shouldShowNotification(notification, subscribedEventIds);
    }

    function addNotification(notification: NotificationResponse, unread = true) {
      if (!shouldShow(notification)) return;

      setItems((current) => {
        const withoutDuplicate = current.filter((item) => item.id !== notification.id);
        const next = [
          {
            ...notification,
            receivedAt: new Date().toISOString(),
            unread,
          },
          ...withoutDuplicate,
        ].slice(0, MAX_ITEMS);
        saveStoredNotifications(email, next);
        return next;
      });
    }

    function removeNotification(notification: NotificationResponse) {
      setItems((current) => {
        const next = current.filter((item) => item.id !== notification.id);
        saveStoredNotifications(email, next);
        return next;
      });
    }

    function parseEvent(event: MessageEvent) {
      return JSON.parse(event.data) as NotificationResponse;
    }

    const created = (event: MessageEvent) => {
      try {
        addNotification(parseEvent(event));
      } catch {
        // Ignore malformed SSE payloads.
      }
    };

    const updated = (event: MessageEvent) => {
      try {
        addNotification(parseEvent(event));
      } catch {
        // Ignore malformed SSE payloads.
      }
    };

    const deleted = (event: MessageEvent) => {
      try {
        removeNotification(parseEvent(event));
      } catch {
        // Ignore malformed SSE payloads.
      }
    };

    source.addEventListener("notification-created", created);
    source.addEventListener("notification-updated", updated);
    source.addEventListener("notification-deleted", deleted);

    return () => {
      source.removeEventListener("notification-created", created);
      source.removeEventListener("notification-updated", updated);
      source.removeEventListener("notification-deleted", deleted);
      source.close();
    };
  }, [subscribedEventIds, user?.email]);

  useEffect(() => {
    if (!user?.email) return;

    const email = user.email;

    function isCompleteNotification(value: Partial<NotificationResponse> | undefined): value is NotificationResponse {
      return (
        Boolean(value) &&
        typeof value?.id === "number" &&
        typeof value?.titulo === "string" &&
        typeof value?.conteudo === "string" &&
        typeof value?.createdAt === "string"
      );
    }

    function handleLocalChange(event: Event) {
      const detail = (event as CustomEvent<LocalNotificationChange>).detail;
      const notification = detail?.notification;

      if (detail?.type === "notification-deleted" && typeof notification?.id === "number") {
        setItems((current) => {
          const next = current.filter((item) => item.id !== notification.id);
          saveStoredNotifications(email, next);
          return next;
        });
        return;
      }

      if (!isCompleteNotification(notification)) return;
      if (!shouldShowNotification(notification, subscribedEventIds)) return;

      setItems((current) => {
        const withoutDuplicate = current.filter((item) => item.id !== notification.id);
        const next = [
          {
            ...notification,
            receivedAt: new Date().toISOString(),
            unread: true,
          },
          ...withoutDuplicate,
        ].slice(0, MAX_ITEMS);
        saveStoredNotifications(email, next);
        return next;
      });
    }

    window.addEventListener("event-creator:notification-change", handleLocalChange);
    return () => window.removeEventListener("event-creator:notification-change", handleLocalChange);
  }, [subscribedEventIds, user?.email]);

  useEffect(() => {
    if (!user?.email) return;

    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch<unknown>("/avisos", { method: "GET" });
        if (cancelled || !Array.isArray(data)) return;

        const loaded = data
          .filter((item): item is NotificationResponse => {
            if (!item || typeof item !== "object") return false;
            const notification = item as Record<string, unknown>;
            return (
              typeof notification.id === "number" &&
              typeof notification.titulo === "string" &&
              typeof notification.conteudo === "string" &&
              typeof notification.createdAt === "string" &&
              shouldShowNotification(notification as NotificationResponse, subscribedEventIds)
            );
          })
          .map((notification) => ({
            ...notification,
            receivedAt: notification.createdAt,
            unread: false,
          }))
          .slice(0, MAX_ITEMS);

        setItems((current) => {
          const currentIds = new Set(current.map((item) => item.id));
          const merged = [
            ...current,
            ...loaded.filter((item) => !currentIds.has(item.id)),
          ].slice(0, MAX_ITEMS);
          saveStoredNotifications(user.email, merged);
          return merged;
        });
      } catch {
        // Existing notifications are optional; live SSE still works.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [subscribedEventIds, user?.email]);

  function markAllAsRead() {
    setItems((current) => {
      const next = current.map((item) => ({ ...item, unread: false }));
      saveStoredNotifications(user?.email, next);
      return next;
    });
  }

  function clearAll() {
    setItems([]);
    saveStoredNotifications(user?.email, []);
  }

  return (
    <NotificationContext.Provider value={{ items, unreadCount, markAllAsRead, clearAll }}>
      {children}
    </NotificationContext.Provider>
  );
}

export default function NotificationCenter({ placement = "fixed" }: NotificationCenterProps) {
  const { user } = useAuth();
  const notifications = useContext(NotificationContext);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  if (!user || !notifications) return null;

  const { items, unreadCount, markAllAsRead, clearAll } = notifications;
  const wrapperClassName = placement === "inline" ? "relative" : "fixed right-4 top-4 z-[130]";
  const panelClassName =
    placement === "inline"
      ? "absolute right-0 mt-3 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl shadow-black/40"
      : "mt-3 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl shadow-black/40";

  return (
    <div ref={wrapperRef} className={wrapperClassName}>
      <button
        type="button"
        onClick={() => {
          setOpen((current) => !current);
          markAllAsRead();
        }}
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-950/95 text-slate-200 shadow-xl shadow-black/30 hover:border-slate-500 hover:bg-slate-900"
        aria-label="Notificações recebidas"
      >
        <Bell className="h-5 w-5" />
        {unreadCount ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1 text-[11px] font-black text-slate-950">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className={panelClassName}>
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
            <div>
              <p className="text-sm font-black text-white">Notificações recebidas</p>
              <p className="text-xs text-slate-500">Avisos gerais e dos seus eventos</p>
            </div>
            {items.length ? (
              <button
                type="button"
                onClick={clearAll}
                className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                Limpar
              </button>
            ) : null}
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {!items.length ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                Nenhuma notificação recebida ainda.
              </div>
            ) : (
              <ul className="divide-y divide-slate-800">
                {items.map((item) => (
                  <li key={`${item.id}-${item.receivedAt}`} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-white">{item.titulo}</p>
                        <p className="mt-1 line-clamp-3 text-sm leading-5 text-slate-300">
                          {item.conteudo}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span>{formatDateTime(item.createdAt)}</span>
                          {item.eventId ? <span>Evento #{item.eventId}</span> : <span>Geral</span>}
                        </div>
                      </div>
                      {item.unread ? (
                        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-secondary" />
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
