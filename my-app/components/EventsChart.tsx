"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  LabelList,
} from "recharts";

type EventWithDate = {
  date: string;
  participants?: number;
  title?: string;
};

type Props = {
  events: EventWithDate[];
  months?: number;
};

type AggregatedMonth = {
  name: string;
  eventCount: number;
  totalInscricoes: number;
  events: string[];
};

function monthKey(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split("-");
  return `${m}/${y}`;
}

function TooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload as AggregatedMonth;
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/95 p-3 text-sm text-slate-100 shadow-xl">
      <div className="mb-2 border-b border-slate-800 pb-2 text-xs uppercase tracking-[0.14em] text-slate-400">
        {label}
      </div>
      <div className="mb-1 text-sm font-semibold text-white">Eventos: {item.eventCount}</div>
      <div className="mb-2 text-sm text-slate-300">Total de inscritos: {item.totalInscricoes}</div>
      {item.events.length ? (
        <div className="space-y-1 text-xs text-slate-300">
          {item.events.slice(0, 5).map((title, index) => (
            <div key={index} className="truncate text-ellipsis overflow-hidden">
              • {title}
            </div>
          ))}
          {item.events.length > 5 ? (
            <div className="text-slate-500">+{item.events.length - 5} outros eventos</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function EventsChart({ events, months = 6 }: Props) {
  const now = new Date();
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    keys.push(k);
  }

  const counts: Record<string, AggregatedMonth> = {};
  for (const k of keys) {
    counts[k] = {
      name: monthLabel(k),
      eventCount: 0,
      totalInscricoes: 0,
      events: [],
    };
  }

  for (const ev of events) {
    const k = monthKey(ev.date);
    if (!k || !(k in counts)) continue;
    counts[k].eventCount += 1;
    counts[k].totalInscricoes += ev.participants ?? 0;
    if (ev.title) counts[k].events.push(ev.title);
  }

  const data = keys.map((k) => counts[k]);

  return (
    <div className="w-full rounded-[20px] bg-slate-950/80 p-3 shadow-[0_18px_60px_rgba(15,23,42,0.2)]" style={{ height: 320 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 24, right: 20, left: 0, bottom: 12 }}>
          <defs>
            <linearGradient id="gradientEvent" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.95} />
              <stop offset="95%" stopColor="#1D4ED8" stopOpacity={0.65} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: "#94A3B8", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "#94A3B8", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={<TooltipContent />}
            cursor={{ fill: "rgba(96, 165, 250, 0.08)" }}
            wrapperStyle={{ outline: "none" }}
          />
          <Bar dataKey="eventCount" fill="url(#gradientEvent)" radius={[12, 12, 0, 0]} barSize={38}>
            <LabelList dataKey="eventCount" position="top" fill="#E2E8F0" fontSize={12} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
