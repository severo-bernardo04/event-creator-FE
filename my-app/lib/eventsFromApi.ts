export type ApiParticipantNorm = {
  id: number;
  name: string;
  email: string;
  phone: string;
  status?: string; // e.g. PENDING | APPROVED | REJECTED
  presenca?: string;
  createdAt?: string;
  ticketId?: string;
  ticketToken?: string;
  qrCodeBase64?: string;
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
  imageUrl?: string | null;
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

function normalizeParticipantStatus(status: unknown) {
  const value = String(status ?? "").toUpperCase();

  if (value === "PENDENTE") return "PENDING";
  if (value === "APROVADO") return "APPROVED";
  if (value === "REJEITADO") return "REJECTED";

  return value || undefined;
}

function pickTicketValue(raw: Record<string, unknown>, key: string): unknown {
  const ticket = raw.ticket;
  if (ticket && typeof ticket === "object" && !Array.isArray(ticket)) {
    const ticketRecord = ticket as Record<string, unknown>;
    return ticketRecord[key];
  }

  return undefined;
}

function pickNestedRecord(raw: Record<string, unknown>, key: string): Record<string, unknown> | null {
  const value = raw[key];
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function mapParticipant(raw: Record<string, unknown>): ApiParticipantNorm | null {
  const user = pickNestedRecord(raw, "user") ?? pickNestedRecord(raw, "usuario");
  const id = num(raw.id ?? raw.participantId ?? raw.inscriptionId ?? raw.registrationId, NaN);
  if (!Number.isFinite(id)) return null;
  const createdAt = raw.createdAt ?? raw.created_at ?? raw.registeredAt;
  const ticketId = raw.ticketId ?? raw.ticket_id ?? pickTicketValue(raw, "ticketId") ?? pickTicketValue(raw, "id");
  const ticketToken = raw.ticketToken ?? raw.token ?? pickTicketValue(raw, "token");
  const qrCodeBase64 =
    raw.qrCodeBase64 ??
    raw.qrcodeBase64 ??
    raw.qr_code_base64 ??
    raw.qrCode ??
    raw.qrcode ??
    pickTicketValue(raw, "qrCodeBase64") ??
    pickTicketValue(raw, "qrcodeBase64") ??
    pickTicketValue(raw, "qrCode") ??
    pickTicketValue(raw, "qrcode");

  return {
    id,
    name: str(raw.name ?? raw.nome ?? user?.name ?? user?.nome),
    email: str(raw.email ?? user?.email),
    phone: str(raw.phone ?? raw.telefone ?? user?.phone ?? user?.telefone),
    status: normalizeParticipantStatus(
    raw.status ?? raw.approvalStatus ?? raw.state
),
    presenca:
      raw.presenca != null
        ? str(raw.presenca)
        : raw.attendance != null
          ? str(raw.attendance)
          : raw.presence != null
            ? str(raw.presence)
            : undefined,
    createdAt: createdAt != null ? str(createdAt) : undefined,
    ticketId: ticketId != null ? str(ticketId) : undefined,
    ticketToken: ticketToken != null ? str(ticketToken) : undefined,
    qrCodeBase64: qrCodeBase64 != null ? str(qrCodeBase64) : undefined,
  };
}

function unwrapParticipantPayload(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];
  const o = data as Record<string, unknown>;
  for (const c of [
    o.participants,
    o.participantList,
    o.inscriptions,
    o.registrations,
    o.data,
    o.content,
    o.items,
    o.results,
    o.records,
  ]) {
    if (Array.isArray(c)) return c;
  }
  return [];
}

export function normalizeParticipantList(data: unknown): ApiParticipantNorm[] {
  const items = unwrapParticipantPayload(data);
  const out: ApiParticipantNorm[] = [];
  for (const item of items) {
    if (item && typeof item === "object") {
      const participant = mapParticipant(item as Record<string, unknown>);
      if (participant) out.push(participant);
    }
  }
  return out;
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
  const privateRaw =
  raw.requiresApproval ??
  raw.private ??
  raw.isPrivate ??
  raw.privateEvent ??
  raw.is_private;

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
    imageUrl: raw.imageUrl != null ? str(raw.imageUrl) : null,
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
