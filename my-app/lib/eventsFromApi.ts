export type ApiParticipantNorm = {
  id: number;
  name: string;
  email: string;
  phone: string;
  status?: string; // e.g. PENDING | APPROVED | REJECTED
  createdAt?: string;
};

export type ApiEventNorm = {
  id: number;
  title: string;
  description: string | null;
  date: string;
  time: string | null;
  location: string | null;
  maxParticipants: number;
  majority18: boolean;
  participants: ApiParticipantNorm[];
  category?: string;
  private?: boolean;
};

function num(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

export function coerceIsoDate(val: unknown): string {
  if (typeof val === "string") {
    const s = val.trim();
    if (s.length >= 10) return s.slice(0, 10);
    return s;
  }
  if (Array.isArray(val) && val.length >= 3) {
    const y = num(val[0]);
    const m = num(val[1]);
    const d = num(val[2]);
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  if (val && typeof val === "object" && !Array.isArray(val)) {
    const o = val as Record<string, unknown>;
    const y = num(o.year ?? o.y, NaN);
    const m = num(o.monthValue ?? o.month ?? o.m, NaN);
    const d = num(o.dayOfMonth ?? o.day ?? o.d, NaN);
    if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)) {
      return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }
  return "";
}

export function coerceTime(val: unknown): string | null {
  if (val == null || val === "") return null;
  if (typeof val === "string") {
    const s = val.trim();
    if (!s) return null;
    if (s.length >= 8) return s.slice(0, 8);
    if (s.length === 5) return `${s}:00`;
    return s;
  }
  if (Array.isArray(val) && val.length >= 2) {
    const h = num(val[0]);
    const m = num(val[1]);
    const s = val.length >= 3 ? num(val[2]) : 0;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return null;
}

function mapParticipant(raw: Record<string, unknown>): ApiParticipantNorm | null {
  const id = num(raw.id, NaN);
  if (!Number.isFinite(id)) return null;

  function normStatus(v: unknown): string | undefined {
    if (typeof v !== "string") return undefined;
    const s = v.trim().toUpperCase();
    if (s === "PENDING" || s === "PENDENTE") return "PENDING";
    if (s === "APPROVED" || s === "APROVADO") return "APPROVED";
    if (s === "REJECTED" || s === "REJEITADO") return "REJECTED";
    return undefined;
  }

  const rawStatus =
    raw.status ?? raw.approvalStatus ?? raw.state ?? raw.approval ?? raw.approved ?? raw.aprovado ?? undefined;
  const status = normStatus(rawStatus);

  const createdAtRaw =
    raw.createdAt ?? raw.created_at ?? raw.registeredAt ?? raw.registered_at ?? raw.dataInscricao ?? raw.data_inscricao ?? undefined;
  const createdAt = createdAtRaw == null ? undefined : typeof createdAtRaw === "string" ? createdAtRaw : String(createdAtRaw);

  return {
    id,
    name: str(raw.name),
    email: str(raw.email),
    phone: str(raw.phone ?? raw.telefone),
    status,
    createdAt,
  };
}

function pickMaxParticipants(raw: Record<string, unknown>): number {
  const v = raw.maxParticipants ?? raw.max_participants ?? raw.maxParticipantsLimit;
  const n = num(v, NaN);
  if (Number.isFinite(n) && n >= 1) return Math.floor(n);
  return 100;
}

function pickParticipantsArray(raw: Record<string, unknown>): unknown {
  return raw.participants ?? raw.participantList ?? raw.inscriptions ?? raw.registrations;
}

function unwrapEventPayload(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];
  const o = data as Record<string, unknown>;
  for (const c of [o.events, o.data, o.content, o.items, o.results, o.records]) {
    if (Array.isArray(c)) return c;
  }
  const embedded = o._embedded;
  if (embedded && typeof embedded === "object") {
    const emb = embedded as Record<string, unknown>;
    const ev = emb.events ?? emb.eventList;
    if (Array.isArray(ev)) return ev;
  }
  return [];
}

export function normalizeEventRecord(raw: Record<string, unknown>): ApiEventNorm | null {
  const id = num(raw.id, NaN);
  if (!Number.isFinite(id)) return null;

  const partsRaw = pickParticipantsArray(raw);
  const participants: ApiParticipantNorm[] = [];
  if (Array.isArray(partsRaw)) {
    for (const p of partsRaw) {
      if (p && typeof p === "object") {
        const m = mapParticipant(p as Record<string, unknown>);
        if (m) participants.push(m);
      }
    }
  }

  const date = coerceIsoDate(raw.date ?? raw.eventDate ?? raw.startDate);
  const time = coerceTime(raw.time ?? raw.startTime);
  const maxP = pickMaxParticipants(raw);
  if (!date) return null;

  const title = str(raw.title ?? raw.name);
  if (!title.trim()) return null;

  const descRaw = raw.description ?? raw.descricao ?? raw.details;
  const locRaw = raw.location ?? raw.local ?? raw.address;
  const categoryRaw = raw.category;
  const privateRaw = raw.private ?? raw.isPrivate ?? raw.privateEvent ?? raw.is_private;

  return {
    id,
    title,
    description: descRaw == null ? null : str(descRaw),
    date: date || "",
    time,
    location: locRaw == null ? null : str(locRaw),
    maxParticipants: maxP,
    majority18: Boolean(raw.majority18 ?? raw.majority_18),
    participants,
    category: categoryRaw != null ? str(categoryRaw) : undefined,
    private: Boolean(privateRaw),
  };
}

export function normalizeEventList(data: unknown): ApiEventNorm[] {
  const items = unwrapEventPayload(data);
  const out: ApiEventNorm[] = [];
  for (const item of items) {
    if (item && typeof item === "object") {
      const n = normalizeEventRecord(item as Record<string, unknown>);
      if (n) out.push(n);
    }
  }
  return out;
}