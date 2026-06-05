"use client";

import { useEffect, useState } from "react";
import styles from "./Events.module.css";
import { fetchAllEvents } from "@/lib/eventRequests";
import { getErrorMessage } from "@/lib/errors";
import type { ApiEventNorm } from "@/lib/eventsFromApi";
import EventsChart from "@/components/EventsChart";

function fmtDateIso(d: string) {
  const [y, m, dy] = d.split("-");
  return `${dy}/${m}/${y}`;
}

const Events = () => {
  const [events, setEvents] = useState<ApiEventNorm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setEvents(await fetchAllEvents());
      } catch (err: unknown) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className={styles.page}>
      {loading ? (
        <div className={styles.page}>Carregando...</div>
      ) : error ? (
        <div className={styles.page}>{error}</div>
      ) : null}
      {!loading && !error && (
        <EventsChart
          events={events.map((event) => ({
            date: event.date,
            participants: event.participants.length,
            title: event.title,
          }))}
          months="all"
        />
      )}
      <ul className={styles.grid}>
        {events.map((event) => {
          const remaining = Math.max(0, event.maxParticipants - event.participants.length);
          return (
            <li key={event.id} className={styles.card}>
              <div className={styles.imageWrapper}>
                <div className={styles.image} style={{ background: "linear-gradient(135deg, rgba(31,111,255,.35), rgba(255,212,71,.18))" }} />
              </div>
              <div className={styles.body}>
                <h3 className={styles.title}>{event.title}</h3>
                <div className={styles.meta}>
                  <span className={styles.metaItem}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    {fmtDateIso(event.date)}
                  </span>
                  <span className={styles.metaItem}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    {event.location ?? "—"}
                  </span>
                </div>
                <div className={styles.footer}>
                  <span className={styles.badge}>Evento</span>
                  <span className={styles.spots}>
                    {remaining > 0
                      ? `Vagas disponíveis: ${remaining}`
                      : "Esgotado"}
                  </span>
                </div>
                <span className={styles.capacity}>
                  {event.participants.length}/{event.maxParticipants} vagas preenchidas
                </span>
                <button className={styles.button}>Inscrever-se</button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  )
}

export default Events
