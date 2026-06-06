"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { fetchAllEvents } from "@/lib/eventRequests";
import { setAuthUser } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";
import {
  addEventHistory,
  buildEventHistoryChanges,
  type EventHistoryFieldDefinition,
} from "@/lib/eventHistory";
import {
  coerceTime,
  normalizeEventRecord,
  type ApiEventNorm,
} from "@/lib/eventsFromApi";
import EventsChart from "@/components/EventsChart";
import { CATEGORIES } from "@/lib/categoryMocks";
import { NavIconDashboard, NavIconCalendar, NavIconPeople, NavIconUser, NavIconBack } from "./components/NavIcons";
import StatusParticipante from "@/components/StatusParticipante";
import EventMaterialsManager from "./components/EventMaterialsManager";
import type { EventMaterial, ParticipantStatus } from "@/types";
import { getMaterialsByEventId } from "@/lib/eventMaterials";
import {
  createEventNotification,
  deleteEventNotification,
  listEventNotifications,
  notifyEventUpdated,
  updateEventNotification,
  type EventNotification,
} from "@/lib/notifications";

type Participante = {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  status: ParticipantStatus;
  presenca?: string;
  createdAt?: string;
};

type Evento = {
  id: number;
  titulo: string;
  desc: string;
  data: string;
  hora: string;
  local: string;
  max: number;
  participantes: Participante[];
  category?: string | null;
  private?: boolean;
  majority18?: boolean;
  imageUrl?: string | null;
  speakers: SpeakerForm[];
};

type SpeakerForm = {
  id?: number;
  name: string;
  bio: string;
  topics: string;
  agenda: string;
};

type PageId =
  | "dashboard"
  | "eventos"
  | "evento-detalhe"
  | "participantes"
  | "aprovacoes"
  | "usuarios";

type ParticipantSortField = "nome" | "createdAt" | "status";
type SortDirection = "asc" | "desc";

type EventHistorySnapshot = {
  titulo: string;
  desc: string;
  data: string;
  hora: string;
  local: string;
  max: string;
  category: string;
  private: boolean;
  majority18: boolean;
  imageUrl: string;
};

type TicketResponse = {
  ticketId: string;
  eventId: number;
  token: string;
  qrCodeBase64: string;
};

type AdminUser = {
  id: number;
  name: string;
  email: string;
  cpf?: string | null;
  dataNascimento?: string | null;
  role: string;
  phone?: string | null;
  address?: string | null;
};

const eventHistoryFields: EventHistoryFieldDefinition<EventHistorySnapshot>[] = [
  { key: "titulo", label: "Título" },
  { key: "desc", label: "Descrição" },
  { key: "data", label: "Data" },
  { key: "hora", label: "Horário" },
  { key: "local", label: "Local" },
  { key: "max", label: "Máx. participantes" },
  { key: "category", label: "Categoria" },
  { key: "private", label: "Evento privado" },
  { key: "majority18", label: "Evento +18" },
  { key: "imageUrl", label: "Imagem" },
];

const participantStatusLabels: Record<ParticipantStatus, string> = {
  APPROVED: "Aprovado",
  PENDING: "Pendente",
  REJECTED: "Rejeitado",
};

const participantSortOptions: { value: ParticipantSortField; label: string }[] = [
  { value: "nome", label: "Nome" },
  { value: "createdAt", label: "Data de inscrição" },
  { value: "status", label: "Status de aprovação" },
];

const participantSortDirectionLabels: Record<SortDirection, string> = {
  asc: "Crescente",
  desc: "Decrescente",
};

function deriveMockParticipantStatus(participantId: number): ParticipantStatus {
  // MOCK: distribuição determinística para visualização no frontend (futuro: virá do backend)
  const mod = participantId % 3;
  if (mod === 0) return "PENDING";
  if (mod === 1) return "APPROVED";
  return "REJECTED";
}

function deriveMockCreatedAt(participantId: number): string {
  // MOCK: datas recentes (futuro: virá do backend)
  const now = Date.now();
  const daysAgo = participantId % 21; // 0..20
  const d = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
  return d.toISOString();
}

function isParticipantStatus(value: unknown): value is ParticipantStatus {
  return value === "APPROVED" || value === "PENDING" || value === "REJECTED";
}

function getApprovedCount(ev: Evento) {
  return ev.participantes.filter((p) => p.status === "APPROVED").length;
}

function mapNormToEvento(ev: ApiEventNorm): Evento {
  return {
    id: ev.id,
    titulo: ev.title,
    desc: ev.description ?? "",
    data: ev.date,
    hora: (ev.time ?? "").slice(0, 5),
    local: ev.location ?? "",
    max: ev.maxParticipants,
    participantes: ev.participants.map((p) => {
      const status = isParticipantStatus(p.status)
        ? p.status
        : deriveMockParticipantStatus(p.id);
      return {
        id: p.id,
        nome: p.name,
        email: p.email,
        telefone: p.phone,
        status,
        presenca: p.presenca,
        createdAt: p.createdAt ?? deriveMockCreatedAt(p.id),
      };
    }),
    category: ev.category ?? undefined,
    private: Boolean(ev.private),
    majority18: Boolean(ev.majority18),
    imageUrl: ev.imageUrl ?? null,
    speakers: ev.speakers.map((speaker) => ({
      id: speaker.id,
      name: speaker.name,
      bio: speaker.bio ?? "",
      topics: speaker.topics.join(", "),
      agenda: speaker.agenda ?? "",
    })),
  };
  }

function fmtDate(d: string) {
  const [y, m, dy] = d.split("-");
  return `${dy}/${m}/${y}`;
}

function fmtInscricaoDate(createdAt?: string) {
  if (!createdAt) return "—";
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return "—";
  return `${fmtDate(d.toISOString().slice(0, 10))}`;
}

function fmtDateTime(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function getParticipantCreatedAtTime(participant: Participante) {
  if (!participant.createdAt) return null;
  const time = Date.parse(participant.createdAt);
  return Number.isNaN(time) ? null : time;
}

function compareOptionalTime(a: number | null, b: number | null) {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a - b;
}

function compareParticipantes(
  a: Participante,
  b: Participante,
  sortBy: ParticipantSortField,
  direction: SortDirection,
) {
  const multiplier = direction === "asc" ? 1 : -1;

  if (sortBy === "createdAt") {
    const timeA = getParticipantCreatedAtTime(a);
    const timeB = getParticipantCreatedAtTime(b);
    const byDate =
      timeA !== null && timeB !== null
        ? (timeA - timeB) * multiplier
        : compareOptionalTime(timeA, timeB);
    if (byDate !== 0) return byDate;
  } else if (sortBy === "status") {
    const byStatus = participantStatusLabels[a.status].localeCompare(
      participantStatusLabels[b.status],
      "pt-BR",
      { sensitivity: "base" },
    ) * multiplier;
    if (byStatus !== 0) return byStatus;
  }

  const byName =
    a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }) *
    (sortBy === "nome" ? multiplier : 1);
  if (byName !== 0) return byName;
  return a.id - b.id;
}

function sortParticipantes<T extends { p: Participante }>(
  rows: T[],
  sortBy: ParticipantSortField,
  direction: SortDirection,
) {
  return rows
    .slice()
    .sort((a, b) => compareParticipantes(a.p, b.p, sortBy, direction));
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getStatus(ev: Evento) {
  const cap = ev.max > 0 ? ev.max : 1;
  const approved = getApprovedCount(ev);

  const p = approved / cap;

  if (p >= 1) return "full" as const;
  if (p >= 0.8) return "almost" as const;
  return "ok" as const;
}

function StatusBadge({ ev }: { ev: Evento }) {
  const s = getStatus(ev);
  const base =
    "inline-flex items-center rounded-full px-2 py-0.5 text-[11.5px] font-bold ring-1 ring-inset";
  if (s === "full") {
    return (
      <span className={`${base} bg-red-500/10 text-red-400 ring-red-500/25`}>
        Lotado
      </span>
    );
  }
  if (s === "almost") {
    return (
      <span className={`${base} bg-amber-500/10 text-amber-300 ring-amber-500/25`}>
        Quase cheio
      </span>
    );
  }
  return (
    <span className={`${base} bg-emerald-500/10 text-emerald-400 ring-emerald-500/25`}>
      Com vagas
    </span>
  );
}



const inputClass =
  "w-full rounded-[10px] border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-primary focus:ring-2 focus:ring-primary/20";

const thClass =
  "border-b border-slate-800 bg-slate-900 px-5 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.07em] text-slate-500";

const tdClass =
  "border-b border-slate-800 px-5 py-3.5 text-[13.5px] text-slate-300 group-last:border-b-0";

const emptySpeakerForm: SpeakerForm = {
  name: "",
  bio: "",
  topics: "",
  agenda: "",
};

function serializeSpeakers(speakers: SpeakerForm[]) {
  return speakers
    .map((speaker) => ({
      id: speaker.id,
      name: speaker.name.trim(),
      bio: speaker.bio.trim(),
      topics: speaker.topics
        .split(/[,;\n]/)
        .map((topic) => topic.trim())
        .filter(Boolean),
      agenda: speaker.agenda.trim(),
    }))
    .filter((speaker) => speaker.name);
}

export default function AdminPage() {
  const { user } = useAuth();
  const [eventos, setEventos] = useState<Evento[]>([]);

 async function recarregarEventos() {
  const list = await fetchAllEvents();
  setEventos(list.map(mapNormToEvento));
}

async function aprovarParticipante(participanteId: number, eventoId?: number) {
  const evento = eventoId != null
    ? eventos.find((ev) => ev.id === eventoId)
    : eventos.find((ev) => ev.participantes.some((p) => p.id === participanteId));
  const participante = evento?.participantes.find((p) => p.id === participanteId);

  if (!evento) return;

  try {
    setApprovalStatus(null);
    setFormError(null);
    await apiFetch(`/events/${evento.id}/participants/${participanteId}/aprovar`, {
      method: "PATCH",
    });

    await recarregarEventos();
    setApprovalStatus(
      `Inscrição aprovada. A confirmação foi enviada por email para ${participante?.email ?? "o participante"}.`,
    );
  } catch (err: unknown) {
    setFormError(getErrorMessage(err));
  }
}


async function rejeitarParticipante(participanteId: number, eventoId?: number) {
  const evento = eventoId != null
    ? eventos.find((ev) => ev.id === eventoId)
    : eventos.find((ev) => ev.participantes.some((p) => p.id === participanteId));
  const participante = evento?.participantes.find((p) => p.id === participanteId);

  if (!evento) return;

  try {
    setApprovalStatus(null);
    setFormError(null);
    await apiFetch(`/events/${evento.id}/participants/${participanteId}/rejeitar`, {
      method: "PATCH",
    });

    await recarregarEventos();
    setApprovalStatus(
      `Inscrição rejeitada. O aviso foi enviado por email para ${participante?.email ?? "o participante"}.`,
    );
  } catch (err: unknown) {
    setFormError(getErrorMessage(err));
  }
}

  const [currentPage, setCurrentPage] = useState<PageId>("dashboard");
  const [eventoAtualId, setEventoAtualId] = useState<number | null>(null);
  const [sessionRole, setSessionRole] = useState<string | null>(null);
  const [sessionHint, setSessionHint] = useState<string | null>(null);
  const [eventsApiError, setEventsApiError] = useState<string | null>(null);
  const [usersApiError, setUsersApiError] = useState<string | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [participantSearch, setParticipantSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [updatingUserRoleId, setUpdatingUserRoleId] = useState<number | null>(null);
  /** CRUD de eventos exige sessão HTTP com role ADMIN (igual ao EventsController). */
  const canManage = sessionRole === "ADMIN";
  const canManageHint =
    !canManage && user?.role === "ADMIN"
      ? "Seu navegador tem perfil ADMIN salvo, mas a sessão do servidor não está ativa. Faça login de novo em /login e volte ao painel."
      : null;

  const [modalEventoOpen, setModalEventoOpen] = useState(false);
  const [modalConfirmOpen, setModalConfirmOpen] = useState(false);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [ticketParticipant, setTicketParticipant] = useState<{
    eventoId: number;
    eventoTitulo: string;
    participante: Participante;
  } | null>(null);
  const [ticket, setTicket] = useState<TicketResponse | null>(null);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketError, setTicketError] = useState<string | null>(null);
  const [ticketMessage, setTicketMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [materials, setMaterials] = useState<EventMaterial[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationContent, setNotificationContent] = useState("");
  const [notificationStatus, setNotificationStatus] = useState<string | null>(null);
  const [notificationSubmitting, setNotificationSubmitting] = useState(false);
  const [eventNotifications, setEventNotifications] = useState<EventNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [editingNotificationId, setEditingNotificationId] = useState<number | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);
  const [approvalSearch, setApprovalSearch] = useState("");

  const [form, setForm] = useState({
    id: "",
    titulo: "",
    desc: "",
    data: "",
    hora: "",
    local: "",
    max: "",
    category: "",
    private: false,
    majority18: false,
    speakers: [emptySpeakerForm],
  });
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [modalEventoTitulo, setModalEventoTitulo] = useState("Novo evento");

  const [confirmContent, setConfirmContent] = useState<{
    title: string;
    text: string;
  } | null>(null);
  const pendingActionRef = useRef<(() => void) | null>(null);

  async function gerarTicketParticipante(
    eventoId: number,
    eventoTitulo: string,
    participante: Participante,
  ) {
    setTicketModalOpen(true);
    setTicketParticipant({ eventoId, eventoTitulo, participante });
    setTicket(null);
    setTicketError(null);
    setTicketMessage(null);
    setTicketLoading(true);

    try {
      if (participante.status !== "APPROVED") {
        throw new Error("Apenas participantes aprovados podem receber QR Code.");
      }

      const data = await apiFetch<TicketResponse>("/tickets", {
        method: "POST",
        json: {
          eventId: eventoId,
          participantId: participante.id,
          expirationMinutes: 60,
        },
      });

      setTicket(data);
      setTicketMessage("QR Code gerado e liberado para o participante aprovado.");
    } catch (err: unknown) {
      setTicketError(getErrorMessage(err));
    } finally {
      setTicketLoading(false);
    }
  }

  async function validarTicketAtual() {
    if (!ticket) return;

    setTicketLoading(true);
    setTicketError(null);
    setTicketMessage(null);

    try {
      const data = await apiFetch<{ message?: string }>("/tickets/validar", {
        method: "POST",
        json: {
          token: ticket.token,
        },
      });

      setTicketMessage(data?.message ?? "Ticket validado e presença marcada.");
      await recarregarEventos();
    } catch (err: unknown) {
      setTicketError(getErrorMessage(err));
    } finally {
      setTicketLoading(false);
    }
  }

  function fecharTicketModal() {
    setTicketModalOpen(false);
    setTicketParticipant(null);
    setTicket(null);
    setTicketError(null);
    setTicketMessage(null);
  }

  const eventoAtual = useMemo(
    () => eventos.find((e) => e.id === eventoAtualId) ?? null,
    [eventos, eventoAtualId],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await apiFetch<{ userId?: unknown; role?: unknown }>(
          "/users/me",
          { method: "GET" },
        );
        if (cancelled) return;
        const role = typeof me.role === "string" ? me.role : "";
        setSessionRole(role || null);
        setSessionHint(null);
        const u = user;
        if (u && role) {
          setAuthUser({ ...u, role });
        }

        if (role === "ADMIN") {
          try {
            const users = await apiFetch<AdminUser[]>("/users", { method: "GET" });
            if (!cancelled) {
              setAdminUsers(users);
              setUsersApiError(null);
            }
          } catch (err: unknown) {
            if (!cancelled) {
              setAdminUsers([]);
              setUsersApiError(getErrorMessage(err));
            }
          }
        } else {
          setAdminUsers([]);
          setUsersApiError("Apenas administradores podem listar usuários.");
        }
      } catch {
        if (cancelled) return;
        setSessionRole(null);
        setAdminUsers([]);
        setSessionHint(
          "Sessão não encontrada. Faça login (de preferência com usuário ADMIN) em /login para criar ou editar eventos.",
        );
      }

      try {
        const list = await fetchAllEvents();
        if (cancelled) return;
        setEventsApiError(null);
        setEventos(list.map(mapNormToEvento));
      } catch (err: unknown) {
        if (cancelled) return;
        setEventos([]);
        setEventsApiError(getErrorMessage(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!eventoAtualId) {
      setMaterials([]);
      return;
    }

    let cancelled = false;
    (async () => {
      setMaterialsLoading(true);
      try {
        const data = await getMaterialsByEventId(eventoAtualId);
        if (!cancelled) setMaterials(data);
      } catch {
        if (!cancelled) setMaterials([]);
      } finally {
        if (!cancelled) setMaterialsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [eventoAtualId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setNotificationTitle("");
      setNotificationContent("");
      setNotificationStatus(null);
      setEditingNotificationId(null);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [eventoAtualId]);

  useEffect(() => {
    if (!eventoAtualId) {
      setEventNotifications([]);
      return;
    }

    let cancelled = false;

    (async () => {
      setNotificationsLoading(true);
      setNotificationStatus(null);
      try {
        const notices = await listEventNotifications(eventoAtualId);
        if (!cancelled) setEventNotifications(notices);
      } catch (err: unknown) {
        if (!cancelled) setNotificationStatus(getErrorMessage(err));
      } finally {
        if (!cancelled) setNotificationsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [eventoAtualId]);

  const dashboardStats = useMemo(() => {
    const totalP = eventos.reduce((a, e) => a + e.participantes.length, 0);

    let pending = 0;
    let approved = 0;
    let rejected = 0;

    eventos.forEach((e) => {
      e.participantes.forEach((p) => {
        if (p.status === "PENDING") pending += 1;
        else if (p.status === "APPROVED") approved += 1;
        else rejected += 1;
      });
    });

    const ativos = eventos.filter((e) => getApprovedCount(e) < e.max).length;

    return {
      total: eventos.length,
      ativos,
      inscricoes: totalP,
      pending,
      approved,
      rejected,
    };
  }, [eventos]);

  type ApprovalFilter = "TODOS" | "PENDENTES" | "APROVADOS" | "REJEITADOS";
  const [aprovacoesFilter, setAprovacoesFilter] = useState<ApprovalFilter>("TODOS");
  const [participantSortBy, setParticipantSortBy] = useState<ParticipantSortField>("nome");
  const [participantSortDirection, setParticipantSortDirection] = useState<SortDirection>("asc");

  const participantesRows = useMemo(() => {
    const rows: { p: Participante; titulo: string; eventoId: number }[] = [];
    eventos.forEach((ev) =>
      ev.participantes.forEach((p) => rows.push({ p, titulo: ev.titulo, eventoId: ev.id })),
    );
    const term = normalizeSearch(participantSearch);
    const filtered = !term
      ? rows
      : rows.filter(({ p, titulo }) =>
          normalizeSearch(
            `${p.nome} ${p.email} ${p.telefone} ${titulo} ${participantStatusLabels[p.status]} ${p.presenca ?? ""}`,
          ).includes(term),
        );

    return sortParticipantes(filtered, participantSortBy, participantSortDirection);
  }, [eventos, participantSearch, participantSortBy, participantSortDirection]);

  const eventoAtualParticipantes = useMemo(() => {
    if (!eventoAtual) return [];
    const participantesFiltrados =
      aprovacoesFilter === "TODOS"
        ? eventoAtual.participantes
        : aprovacoesFilter === "PENDENTES"
          ? eventoAtual.participantes.filter((p) => p.status === "PENDING")
          : aprovacoesFilter === "APROVADOS"
            ? eventoAtual.participantes.filter((p) => p.status === "APPROVED")
            : eventoAtual.participantes.filter((p) => p.status === "REJECTED");

    return sortParticipantes(
      participantesFiltrados.map((p) => ({ p })),
      participantSortBy,
      participantSortDirection,
    ).map(({ p }) => p);
  }, [eventoAtual, aprovacoesFilter, participantSortBy, participantSortDirection]);

  const filteredAdminUsers = useMemo(() => {
    const term = normalizeSearch(userSearch);
    if (!term) return adminUsers;

    return adminUsers.filter((adminUser) =>
      normalizeSearch(
        `${adminUser.name} ${adminUser.email} ${adminUser.role} ${adminUser.cpf ?? ""} ${adminUser.phone ?? ""}`,
      ).includes(term),
    );
  }, [adminUsers, userSearch]);

  const approvalEvents = useMemo(() => {
    const term = normalizeSearch(approvalSearch);
    if (!term) return eventos;

    return eventos.filter((ev) =>
      normalizeSearch(
        [
          ev.titulo,
          ev.local,
          ev.category ?? "",
          ev.data,
          ...ev.participantes.flatMap((p) => [
            p.nome,
            p.email,
            p.telefone,
            participantStatusLabels[p.status],
            p.presenca ?? "",
          ]),
        ].join(" "),
      ).includes(term),
    );
  }, [approvalSearch, eventos]);

  function navigate(page: PageId) {
    setCurrentPage(page);
    const navPages: PageId[] = [
      "dashboard",
      "eventos",
      "participantes",
      "aprovacoes",
      "usuarios",
    ];
    if (navPages.includes(page)) {
      setEventoAtualId(null);
    }
  }

  function verEvento(id: number) {
    const ev = eventos.find((e) => e.id === id);
    if (!ev) return;
    setEventoAtualId(id);
    setAprovacoesFilter("TODOS");
    setCurrentPage("evento-detalhe");
  }

  function openModalEvento(id?: number) {
    setFormError(null);
    setImageError(null);
    setImageFile(null);
    setImagePreview(null);
    if (id !== undefined) {
      const ev = eventos.find((e) => e.id === id);
      if (!ev) return;
      setModalEventoTitulo("Editar evento");
      setForm({
        id: String(ev.id),
        titulo: ev.titulo,
        desc: ev.desc,
        data: ev.data,
        hora: ev.hora,
        local: ev.local,
        max: String(ev.max),
        category: ev.category ?? "",
        private: Boolean(ev.private ?? false),
        majority18: Boolean(ev.majority18 ?? false),
        speakers: ev.speakers.length ? ev.speakers : [emptySpeakerForm],
      });
    } else {
      setModalEventoTitulo("Novo evento");
      setForm({
        id: "",
        titulo: "",
        desc: "",
        data: "",
        hora: "",
        local: "",
        max: "",
        category: "",
        private: false,
        majority18: false,
        speakers: [emptySpeakerForm],
      });
    }
    setModalEventoOpen(true);
  }

  function closeModalEvento() {
    setModalEventoOpen(false);
    setImageError(null);
    setImageFile(null);
    setImagePreview(null);
  }

  function closeModalConfirm() {
    setModalConfirmOpen(false);
    setConfirmContent(null);
  }

  function salvarEvento() {
    const titulo = form.titulo.trim();
    const desc = form.desc.trim();
    const data = form.data;
    const hora = form.hora;
    const local = form.local.trim();
    const max = parseInt(form.max, 10);
    if (titulo.length < 3) {
      setFormError("Título deve ter no mínimo 3 caracteres.");
      return;
    }
    if (!data || !hora || !local) {
      setFormError("Preencha todos os campos obrigatórios.");
      return;
    }
    if (desc.length > 500) {
      setFormError("A descrição deve ter no máximo 500 caracteres.");
      return;
    }
    const today = new Date();
    const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    if (data < todayIso) {
      setFormError("A data do evento não pode estar no passado.");
      return;
    }
    if (!Number.isFinite(max) || max < 1) {
      setFormError("Informe um número máximo de participantes válido (mínimo 1).");
      return;
    }
    if (!canManage) {
      setFormError(
        "Para criar ou editar eventos é preciso sessão ativa como ADMIN. Use /login com uma conta administrador.",
      );
      return;
    }
    const timeForApi = coerceTime(hora);
    if (!timeForApi) {
      setFormError("Informe um horário válido.");
      return;
    }
    if (!form.category || !form.category.trim()) {
      setFormError("Selecione uma categoria.");
      return;
    }
    const speakers = serializeSpeakers(form.speakers);
    if (form.speakers.some((speaker) => !speaker.name.trim() && (speaker.bio.trim() || speaker.topics.trim() || speaker.agenda.trim()))) {
      setFormError("Informe o nome do palestrante ou remova os campos preenchidos.");
      return;
    }
    setFormError(null);
    const idStr = form.id;

    (async () => {
      try {
        if (idStr) {
          const idNum = parseInt(idStr, 10);
          const originalEvent = eventos.find((event) => event.id === idNum);
          const changes = originalEvent
            ? buildEventHistoryChanges(
                {
                  titulo: originalEvent.titulo,
                  desc: originalEvent.desc,
                  data: originalEvent.data,
                  hora: originalEvent.hora,
                  local: originalEvent.local,
                  max: String(originalEvent.max),
                  category: originalEvent.category ?? "",
                  private: Boolean(originalEvent.private),
                  majority18: Boolean(originalEvent.majority18),
                  imageUrl: originalEvent.imageUrl ?? "",
                },
                {
                  titulo,
                  desc,
                  data,
                  hora,
                  local,
                  max: String(max),
                  category: form.category || "",
                  private: Boolean(form.private),
                  majority18: Boolean(form.majority18),
                  imageUrl: imageFile ? imageFile.name : originalEvent.imageUrl ?? "",
                },
                eventHistoryFields,
              )
            : [];
          const formData = new FormData();
          formData.append("title", titulo);
          formData.append("description", desc || "");
          formData.append("date", data);
          formData.append("time", timeForApi);
          formData.append("location", local);
          formData.append("maxParticipants", String(max));
          formData.append("majority18", String(Boolean(form.majority18)));
          formData.append("category", form.category || "");
          formData.append("requiresApproval", String(Boolean(form.private)));
          formData.append("speakers", JSON.stringify(speakers));

          if (imageFile) {
            formData.append("image", imageFile);
          }

          const updatedRaw = await apiFetch<unknown>(`/events/${idNum}`, {
            method: "PATCH",
            body: formData,
          });
          const n = normalizeEventRecord(updatedRaw as Record<string, unknown>);
          if (!n) {
            setFormError("Resposta inválida do servidor ao atualizar o evento.");
            return;
          }
          const mapped = mapNormToEvento(n);
          addEventHistory(
            idNum,
            user ? `${user.name} (${user.email})` : "Administrador",
            changes,
          );
          await notifyEventUpdated(idNum, titulo, changes);
          setEventos((prev) => prev.map((e) => (e.id === idNum ? mapped : e)));
        } else {
          const formData = new FormData();

          formData.append("title", titulo);
          formData.append("description", desc || "");
          formData.append("date", data);
          formData.append("time", timeForApi);
          formData.append("location", local);
          formData.append("maxParticipants", String(max));
          formData.append("majority18", String(Boolean(form.majority18)));
          formData.append("category", form.category || "");
          formData.append("requiresApproval", String(Boolean(form.private)));
          formData.append("speakers", JSON.stringify(speakers));

          if (imageFile) {
            formData.append("image", imageFile);
          }

          const createdRaw = await apiFetch<unknown>("/events", {
            method: "POST",
            body: formData,
          });
          const n = normalizeEventRecord(createdRaw as Record<string, unknown>);
          if (!n) {
            setFormError("Resposta inválida do servidor ao criar o evento.");
            return;
          }
          const mapped = mapNormToEvento(n);
          setEventos((prev) => [...prev, mapped]);
        }
        closeModalEvento();
      } catch (err: unknown) {
        setFormError(getErrorMessage(err));
      }
    })();
  }

  function pedirExclusaoEvento(id: number) {
    const ev = eventos.find((e) => e.id === id);
    setConfirmContent({
      title: "Excluir evento",
      text: `Tem certeza que deseja excluir "${ev?.titulo ?? ""}"? Esta ação não pode ser desfeita.`,
    });
    pendingActionRef.current = () => {
      if (!canManage) {
        setFormError("Para excluir eventos, faça login com um usuário ADMIN.");
        return;
      }
      (async () => {
        try {
          await apiFetch<void>(`/events/${id}`, {
            method: "DELETE",
          });
          setEventos((prev) => prev.filter((e) => e.id !== id));
          if (currentPage === "evento-detalhe") {
            navigate("eventos");
          }
        } catch (err: unknown) {
          setFormError(getErrorMessage(err));
        }
      })();
    };
    setModalConfirmOpen(true);
  }

  function pedirRemocaoParticipante(eventoId: number, partId: number, nome: string) {
    setConfirmContent({
      title: "Remover participante",
      text: `Remover "${nome}" deste evento?`,
    });
    pendingActionRef.current = () => {
      (async () => {
        try {
          await apiFetch<void>(`/events/${eventoId}/participants/${partId}`, {
            method: "DELETE",
          });
          setEventos((prev) =>
            prev.map((e) =>
              e.id === eventoId
                ? {
                    ...e,
                    participantes: e.participantes.filter((p) => p.id !== partId),
                  }
                : e,
            ),
          );
        } catch (err: unknown) {
          setFormError(getErrorMessage(err));
        }
      })();
    };
    setModalConfirmOpen(true);
  }

  function confirmarAcao() {
    if (pendingActionRef.current) {
      pendingActionRef.current();
      pendingActionRef.current = null;
    }
    closeModalConfirm();
  }

  function excluirEventoAtual() {
    if (eventoAtualId != null) pedirExclusaoEvento(eventoAtualId);
  }

  async function enviarNotificacaoEvento() {
    if (!eventoAtual) return;

    const titulo = notificationTitle.trim();
    const conteudo = notificationContent.trim();

    if (!titulo || !conteudo) {
      setNotificationStatus("Preencha o titulo e o conteudo da publicacao.");
      return;
    }

    if (!canManage) {
      setNotificationStatus("Para publicar noticias e avisos, faca login com um usuario ADMIN.");
      return;
    }

    setNotificationSubmitting(true);
    setNotificationStatus(null);
    try {
      const saved = editingNotificationId
        ? await updateEventNotification(editingNotificationId, eventoAtual.id, titulo, conteudo)
        : await createEventNotification(eventoAtual.id, titulo, conteudo);
      setEventNotifications((current) => {
        if (editingNotificationId) {
          return current.map((notice) => (notice.id === saved.id ? saved : notice));
        }

        return [saved, ...current];
      });
      setNotificationTitle("");
      setNotificationContent("");
      setEditingNotificationId(null);
      setNotificationStatus(
        editingNotificationId
          ? "Aviso atualizado no mural do evento."
          : "Publicacao enviada aos participantes e adicionada ao mural do evento.",
      );
    } catch (err: unknown) {
      setNotificationStatus(getErrorMessage(err));
    } finally {
      setNotificationSubmitting(false);
    }
  }

  function editarNotificacaoEvento(notification: EventNotification) {
    setEditingNotificationId(notification.id);
    setNotificationTitle(notification.titulo);
    setNotificationContent(notification.conteudo);
    setNotificationStatus(null);
  }

  function cancelarEdicaoNotificacao() {
    setEditingNotificationId(null);
    setNotificationTitle("");
    setNotificationContent("");
    setNotificationStatus(null);
  }

  function pedirExclusaoNotificacao(notification: EventNotification) {
    setConfirmContent({
      title: "Apagar aviso",
      text: `Tem certeza que deseja apagar o aviso "${notification.titulo}"?`,
    });

    pendingActionRef.current = () => {
      void (async () => {
        setNotificationSubmitting(true);
        setNotificationStatus(null);
        try {
          await deleteEventNotification(notification.id);
          setEventNotifications((current) =>
            current.filter((item) => item.id !== notification.id),
          );
          if (editingNotificationId === notification.id) {
            cancelarEdicaoNotificacao();
          }
          setNotificationStatus("Aviso apagado do mural do evento.");
        } catch (err: unknown) {
          setNotificationStatus(getErrorMessage(err));
        } finally {
          setNotificationSubmitting(false);
        }
      })();
    };

    setModalConfirmOpen(true);
  }

  async function alterarPapelUsuario(userId: number, role: "ADMIN" | "USER") {
    setUpdatingUserRoleId(userId);
    setUsersApiError(null);
    try {
      const updated = await apiFetch<AdminUser>(`/users/${userId}/role`, {
        method: "PATCH",
        json: { role },
      });
      setAdminUsers((currentUsers) =>
        currentUsers.map((currentUser) =>
          currentUser.id === userId ? updated : currentUser,
        ),
      );

      if (user?.userId === userId) {
        setAuthUser({ ...user, role: updated.role });
        setSessionRole(updated.role);
      }
    } catch (err: unknown) {
      setUsersApiError(getErrorMessage(err));
    } finally {
      setUpdatingUserRoleId(null);
    }
  }

  const navIdx: Record<string, number> = {
    dashboard: 0,
    eventos: 1,
    participantes: 2,
    aprovacoes: 3,
    usuarios: 4,
  };

  function navActiveIndex() {
    if (currentPage === "evento-detalhe") return 1;
    const idx = navIdx[currentPage];
    return idx === undefined ? -1 : idx;
  }

  function pageClass(page: PageId) {
    return currentPage === page ? "admin-page-panel block" : "hidden";
  }

  const activeNav = navActiveIndex();

  const detalhePct = eventoAtual
    ? Math.round(
        (getApprovedCount(eventoAtual) / (eventoAtual.max > 0 ? eventoAtual.max : 1)) * 100,
      )
    : 0;

  function renderApprovalFilterControl() {
    return (
      <label className="block w-full sm:min-w-[170px] sm:w-auto">
        <span className="mb-1 block text-xs font-bold text-slate-500">Filtro</span>
        <select
          value={aprovacoesFilter}
          onChange={(e) => {
            setAprovacoesFilter(e.target.value as ApprovalFilter);
            setApprovalStatus(null);
          }}
          className={inputClass}
        >
          {[
            { value: "TODOS", label: "Todos" },
            { value: "PENDENTES", label: "Pendentes" },
            { value: "APROVADOS", label: "Aprovados" },
            { value: "REJEITADOS", label: "Rejeitados" },
          ].map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  function renderParticipantSortControls() {
    return (
      <div className="flex flex-wrap items-end gap-3">
        <label className="block w-full sm:min-w-[190px] sm:w-auto">
          <span className="mb-1 block text-xs font-bold text-slate-500">Ordenar por</span>
          <select
            value={participantSortBy}
            onChange={(e) => setParticipantSortBy(e.target.value as ParticipantSortField)}
            className={inputClass}
          >
            {participantSortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block w-full sm:min-w-[160px] sm:w-auto">
          <span className="mb-1 block text-xs font-bold text-slate-500">Direção</span>
          <select
            value={participantSortDirection}
            onChange={(e) => setParticipantSortDirection(e.target.value as SortDirection)}
            className={inputClass}
          >
            {(Object.keys(participantSortDirectionLabels) as SortDirection[]).map((direction) => (
              <option key={direction} value={direction}>
                {participantSortDirectionLabels[direction]}
              </option>
            ))}
          </select>
        </label>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <aside className="sticky top-0 z-20 flex w-full flex-col gap-3 border-b border-slate-800 bg-slate-900/95 px-4 py-4 backdrop-blur lg:fixed lg:left-0 lg:top-0 lg:h-screen lg:w-[220px] lg:border-b-0 lg:border-r lg:py-6">
        <div className="flex items-center gap-2.5 px-2 text-[15px] font-extrabold text-white lg:mb-5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-black text-white">
            E
          </span>
          <span>
            Event <span className="text-secondary">Admin</span>
          </span>
        </div>

        <nav className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
        <button
          type="button"
          onClick={() => navigate("dashboard")}
          className={`flex shrink-0 cursor-pointer items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13.5px] transition-colors ${
            activeNav === 0
              ? "bg-slate-800 font-semibold text-white [&_svg]:text-primary"
              : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          }`}
        >
          <NavIconDashboard />
          Dashboard
        </button>
        <button
          type="button"
          onClick={() => navigate("eventos")}
          className={`flex shrink-0 cursor-pointer items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13.5px] transition-colors ${
            activeNav === 1
              ? "bg-slate-800 font-semibold text-white [&_svg]:text-primary"
              : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          }`}
          >

          <NavIconCalendar />
          Eventos
        </button>
        <button
          type="button"
          onClick={() => navigate("participantes")}
          className={`flex shrink-0 cursor-pointer items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13.5px] transition-colors ${
            activeNav === 2
              ? "bg-slate-800 font-semibold text-white [&_svg]:text-primary"
              : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          }`}
        >
          <NavIconPeople />
          Participantes
        </button>
        <button
          type="button"
          onClick={() => navigate("aprovacoes")}
          className={`flex shrink-0 cursor-pointer items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13.5px] transition-colors ${
            activeNav === 3
              ? "bg-slate-800 font-semibold text-white [&_svg]:text-primary"
              : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          }`}
        >
          <NavIconPeople />
          Aprovações
        </button>
        <button
          type="button"
          onClick={() => navigate("usuarios")}
          className={`flex shrink-0 cursor-pointer items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13.5px] transition-colors ${
            activeNav === 4
              ? "bg-slate-800 font-semibold text-white [&_svg]:text-primary"
              : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          }`}
        >
          <NavIconUser />
          Usuários
        </button>

        </nav>

        <div className="border-t border-slate-800 pt-3 lg:mt-auto">
          <Link
            href="/"
            className="flex w-fit cursor-pointer items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13.5px] text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200 lg:w-full"
          >
            <NavIconBack />
            Voltar ao site
          </Link>
        </div>
      </aside>

      <div className="min-h-screen bg-slate-950 px-4 py-6 sm:px-6 lg:ml-[220px] lg:px-10 lg:py-8">
        {eventsApiError ? (
          <div
            className="mb-6 rounded-xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-200"
            role="alert"
          >
            <span className="font-bold">Eventos:</span> {eventsApiError}
          </div>
        ) : null}
        {sessionHint ? (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {sessionHint}
          </div>
        ) : null}
        {canManageHint ? (
          <div className="mb-6 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
            {canManageHint}
          </div>
        ) : null}
        {/* DASHBOARD */}
        <div
          id="page-dashboard"
          className={pageClass("dashboard")}
        >
          <div className="mb-8 flex flex-col items-start justify-between gap-3 sm:flex-row">
            <div>
              <h1 className="text-[26px] font-black tracking-tight text-white">
                Dashboard
              </h1>
              <p className="mt-1 text-[13px] text-slate-500">Visão geral do sistema</p>
            </div>
          </div>
          <div className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl bg-slate-900 px-5 py-4">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                Total de eventos
              </p>
              <p className="text-[28px] font-black text-white">{dashboardStats.total}</p>
              <p className="mt-1 text-[11.5px] text-slate-500">cadastrados</p>
            </div>
            <div className="rounded-xl bg-slate-900 px-5 py-4">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                Eventos ativos
              </p>
              <p className="text-[28px] font-black text-white">{dashboardStats.ativos}</p>
              <p className="mt-1 text-[11.5px] text-slate-500">com vagas disponíveis</p>
            </div>
            <div className="rounded-xl bg-slate-900 px-5 py-4">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                Total de inscrições
              </p>
              <p className="text-[28px] font-black text-white">{dashboardStats.inscricoes}</p>
              <p className="mt-1 text-[11.5px] text-slate-500">em todos os eventos</p>
            </div>
            <div className="rounded-xl bg-slate-900 px-5 py-4">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                Usuários
              </p>
              <p className="text-[28px] font-black text-white">{adminUsers.length}</p>
              <p className="mt-1 text-[11.5px] text-slate-500">
                cadastrados na plataforma
              </p>
            </div>
          </div>

          <div className="mb-8">
            <div className="overflow-hidden rounded-[14px] border border-slate-800 bg-slate-900/50">
              <div className="border-b border-slate-800 px-6 py-4">
                <span className="text-sm font-extrabold text-white">Eventos criados</span>
              </div>
              <div className="p-6">
                <EventsChart
                  events={eventos.map((ev) => ({
                    date: ev.data,
                    participants: getApprovedCount(ev),
                    title: ev.titulo,
                  }))}
                  months="all"
                  height={420}
                />
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-[14px] border border-slate-800 bg-slate-900/50">
          <div className="overflow-x-auto rounded-[14px] border border-slate-800 bg-slate-900/50">
            
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <span className="text-sm font-extrabold text-white">Todos os eventos</span>
              <button
                type="button"
                onClick={() => navigate("eventos")}
                className="cursor-pointer text-xs font-bold text-primary hover:underline"
              >
                Gerenciar →
              </button>
            </div>
            <table className="min-w-[760px] w-full border-collapse">
              <thead>
                <tr>
                  <th className={thClass}>Evento</th>
                  <th className={thClass}>Data</th>
                  <th className={thClass}>Local</th>
                  <th className={thClass}>Vagas</th>
                  <th className={thClass}>Status</th>
                </tr>
              </thead>
              <tbody>
                {eventos.map((ev) => (
                  <tr key={ev.id} className="group hover:[&>td]:bg-slate-900/60">
                    <td className={`${tdClass} font-semibold text-white`}>{ev.titulo}</td>
                    <td className={tdClass}>{fmtDate(ev.data)}</td>
                    <td className={tdClass}>{ev.local}</td>
                    <td className={tdClass}>
                      {getApprovedCount(ev)}/{ev.max}
                    </td>
                    <td className={tdClass}>
                      <StatusBadge ev={ev} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </div>

        {/* EVENTOS LIST */}
        <div id="page-eventos" className={pageClass("eventos")}>
          <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row">
            <div>
              <h1 className="text-[26px] font-black tracking-tight text-white">Eventos</h1>
              <p className="mt-1 text-[13px] text-slate-500">
                Gerencie todos os eventos da plataforma
              </p>
            </div>
            <button
              type="button"
              onClick={() => openModalEvento()}
              disabled={!canManage}
              title={
                canManage
                  ? undefined
                  : "É necessário estar logado como ADMIN (sessão ativa) para criar eventos."
              }
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-[10px] border border-primary bg-primary px-4 py-2 text-[13.5px] font-medium text-white shadow-[0_4px_14px_rgba(31,111,255,0.3)] hover:border-blue-600 hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              + Novo evento
            </button>
          </div>
          <div className="overflow-x-auto rounded-[14px] border border-slate-800 bg-slate-900/50">
            <table className="min-w-[860px] w-full border-collapse">
              <thead>
                <tr>
                  <th className={thClass}>Título</th>
                  <th className={thClass}>Data</th>
                  <th className={thClass}>Local</th>
                  <th className={thClass}>Vagas</th>
                  <th className={thClass}>Status</th>
                  <th className={thClass}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {!eventos.length ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-500">
                      Nenhum evento cadastrado
                    </td>
                  </tr>
                ) : (
                  eventos.map((ev) => (
                    <tr key={ev.id} className="group hover:[&>td]:bg-slate-900/60">
                      <td className={`${tdClass} font-semibold text-white`}>{ev.titulo}</td>
                      <td className={tdClass}>
                        {fmtDate(ev.data)} · {ev.hora}
                      </td>
                      <td className={tdClass}>{ev.local}</td>
                      <td className={tdClass}>
                        {getApprovedCount(ev)}/{ev.max}
                      </td>
                      <td className={tdClass}>
                        <StatusBadge ev={ev} />
                      </td>
                      <td className={tdClass}>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => verEvento(ev.id)}
                            className="cursor-pointer rounded-lg border border-slate-600 bg-transparent px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800"
                          >
                            Ver
                          </button>
                          <Link
                              href={`/admin/eventos/${ev.id}/editar`}
                              className="cursor-pointer rounded-lg border border-slate-600 bg-transparent px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800"
                          >
                            Editar
                          </Link>
                          <Link
                              href={`/admin/eventos/${ev.id}/historico`}
                              className="cursor-pointer rounded-lg border border-slate-600 bg-transparent px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800"
                          >
                            Histórico
                          </Link>
                          <button
                            type="button"
                            onClick={() => pedirExclusaoEvento(ev.id)}
                            className="cursor-pointer rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs text-red-400 hover:bg-red-500/20"
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* PARTICIPANTES */}
        <div
          id="page-participantes"
          className={pageClass("participantes")}
        >
          <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-[26px] font-black tracking-tight text-white">Participantes</h1>
              <p className="mt-1 text-[13px] text-slate-500">
                Todas as inscrições realizadas na plataforma
              </p>
            </div>
            <div className="flex w-full flex-wrap items-end gap-3 lg:w-auto">
              <label className="block w-full sm:min-w-[260px] sm:w-auto">
                <span className="mb-1 block text-xs font-bold text-slate-500">Pesquisar</span>
                <input
                  value={participantSearch}
                  onChange={(e) => setParticipantSearch(e.target.value)}
                  className={inputClass}
                  placeholder="Nome, e-mail, evento ou status"
                />
              </label>
              {renderParticipantSortControls()}
            </div>
          </div>

          <div className="overflow-hidden rounded-[14px] border border-slate-800 bg-slate-900/50">
            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full border-collapse">
                <thead>
                  <tr>
                    <th className={thClass}>Nome</th>
                    <th className={thClass}>Evento</th>
                    <th className={thClass}>E-mail</th>
                    <th className={thClass}>Inscrição</th>
                    <th className={thClass}>Status</th>
                    <th className={thClass}>Presença</th>
                    <th className={thClass}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {!participantesRows.length ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-500">
                        Nenhuma inscrição encontrada
                      </td>
                    </tr>
                  ) : (
                    participantesRows.map(({ p, titulo, eventoId }) => (
                      <tr key={`${eventoId}-${p.id}`} className="group hover:[&>td]:bg-slate-900/60">
                        <td className={`${tdClass} font-semibold text-white`}>{p.nome}</td>
                        <td className={tdClass}>{titulo}</td>
                        <td className={`${tdClass} text-slate-500`}>{p.email}</td>
                        <td className={tdClass}>{fmtInscricaoDate(p.createdAt)}</td>
                        <td className={tdClass}>
                          <StatusParticipante status={p.status} />
                        </td>
                        <td className={tdClass}>{p.presenca ?? "—"}</td>
                        <td className={tdClass}>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => verEvento(eventoId)}
                              className="cursor-pointer rounded-lg border border-slate-600 bg-transparent px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800"
                            >
                              Ver evento
                            </button>
                            <button
                              type="button"
                              onClick={() => gerarTicketParticipante(eventoId, titulo, p)}
                              disabled={p.status !== "APPROVED"}
                              className="cursor-pointer rounded-lg border border-secondary/30 bg-secondary/10 px-2.5 py-1 text-xs font-bold text-secondary hover:bg-secondary/20 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Gerar QR
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* EVENTO DETALHE */}
        <div
          id="page-evento-detalhe"
          className={pageClass("evento-detalhe")}
        >
          <button
            type="button"
            onClick={() => navigate("eventos")}
            className="mb-6 inline-flex cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 text-sm font-semibold text-slate-500 hover:text-white"
          >
            <svg
              className="h-4 w-4"
              width={16}
              height={16}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 16 16"
              aria-hidden
            >
              <path d="M10 12L6 8l4-4" />
            </svg>
            Voltar para eventos
          </button>
          {eventoAtual && (
            <>
              <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row">
                <div>
                  <h1 className="text-[30px] font-black tracking-tight text-white">
                    {eventoAtual.titulo}
                  </h1>
                  <p className="mt-1 text-base text-slate-500">{eventoAtual.local}</p>
                </div>
                <div className="flex gap-2">
                  <Link
                      href={`/admin/eventos/${eventoAtualId}/editar`}
                      className="cursor-pointer rounded-lg border border-slate-600 bg-transparent px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800"
                  >
                    Editar
                  </Link>
                  <Link
                      href={`/admin/eventos/${eventoAtualId}/historico`}
                      className="cursor-pointer rounded-lg border border-slate-600 bg-transparent px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800"
                  >
                    Histórico
                  </Link>
                  <button
                    type="button"
                    onClick={excluirEventoAtual}
                    className="cursor-pointer rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/20"
                  >
                    Excluir
                  </button>
                </div>
              </div>
              <div className="mb-6 flex flex-wrap gap-2">
                <a
                  href="#evento-inscricoes"
                  className="rounded-lg border border-secondary/30 bg-secondary/10 px-4 py-2.5 text-sm font-bold text-secondary hover:bg-secondary/20"
                >
                  Inscrições
                </a>
                <a
                  href="#evento-comunicados"
                  className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-bold text-slate-300 hover:bg-slate-800"
                >
                  Comunicados
                </a>
                <a
                  href="#evento-materiais"
                  className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-bold text-slate-300 hover:bg-slate-800"
                >
                  Materiais
                </a>
              </div>
              <div className="mb-6 grid gap-3 md:grid-cols-4">
                <div className="rounded-[14px] border border-slate-800 bg-slate-900/50 px-5 py-4">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Data e horário</p>
                  <p className="mt-2 text-base font-black text-white">{fmtDate(eventoAtual.data)}</p>
                  <p className="mt-1 text-base text-slate-400">{eventoAtual.hora}</p>
                </div>
                <div className="rounded-[14px] border border-slate-800 bg-slate-900/50 px-5 py-4">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Local</p>
                  <p className="mt-2 break-words text-base font-black text-white">{eventoAtual.local || "A definir"}</p>
                </div>
                <div className="rounded-[14px] border border-slate-800 bg-slate-900/50 px-5 py-4">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Inscrições</p>
                  <p className="mt-2 text-base font-black text-white">{eventoAtual.participantes.length} total</p>
                  <p className="mt-1 text-sm text-slate-400">{getApprovedCount(eventoAtual)} aprovadas</p>
                </div>
                <div className="rounded-[14px] border border-slate-800 bg-slate-900/50 px-5 py-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Vagas</p>
                    <StatusBadge ev={eventoAtual} />
                  </div>
                  <p className="text-base font-black text-white">{getApprovedCount(eventoAtual)} / {eventoAtual.max}</p>
                  <div
                    className="admin-progress-track mt-2"
                    style={
                      {
                        ["--admin-progress-pct" as string]: `${Math.min(detalhePct, 100)}%`,
                      } as CSSProperties
                    }
                  >
                    <div
                      className={`admin-progress-fill ${
                        detalhePct >= 100
                          ? "bg-red-500"
                          : detalhePct >= 80
                            ? "bg-amber-500"
                            : "bg-primary"
                      }`}
                    />
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    {detalhePct >= 100
                      ? "Evento lotado"
                      : `${Math.max(0, eventoAtual.max - getApprovedCount(eventoAtual))} vagas restantes`}
                  </p>
                </div>
              </div>
              <div className="mb-6 rounded-[14px] border border-slate-800 bg-slate-900/50 px-5 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Descrição</p>
                <p className="mt-2 whitespace-pre-line break-words text-base leading-7 text-slate-300">
                  {eventoAtual.desc || "Sem descrição cadastrada."}
                </p>
              </div>
              <div id="evento-comunicados" className="mb-8 scroll-mt-6 rounded-[14px] border border-slate-800 bg-slate-900/50 px-6 py-5">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-extrabold text-white">
                      Comunicados do evento
                    </h3>
                    <p className="mt-1 text-base text-slate-400">
                      Publique, edite ou apague noticias e avisos enviados aos participantes.
                    </p>
                  </div>
                </div>
                <div className="grid gap-5 xl:grid-cols-[minmax(280px,420px)_1fr]">
                  <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-4">
                    <div className="space-y-3">
                      <label className="block">
                        <span className="mb-1.5 block text-sm font-bold text-slate-400">
                          Titulo
                        </span>
                        <input
                          value={notificationTitle}
                          onChange={(event) => setNotificationTitle(event.target.value)}
                          maxLength={120}
                          className="w-full rounded-[10px] border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-primary focus:ring-2 focus:ring-primary/20"
                          placeholder="Ex: Mudanca na programacao"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-sm font-bold text-slate-400">
                          Conteudo
                        </span>
                        <textarea
                          value={notificationContent}
                          onChange={(event) => setNotificationContent(event.target.value)}
                          rows={5}
                          maxLength={500}
                          className="w-full resize-none rounded-[10px] border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-primary focus:ring-2 focus:ring-primary/20"
                          placeholder="Digite a noticia ou aviso que os participantes devem receber."
                        />
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void enviarNotificacaoEvento()}
                          disabled={notificationSubmitting}
                          className="rounded-xl bg-secondary px-4 py-2.5 text-base font-black text-slate-950 shadow-md hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {notificationSubmitting
                            ? editingNotificationId
                              ? "Salvando..."
                              : "Publicando..."
                            : editingNotificationId
                              ? "Salvar"
                              : "Publicar"}
                        </button>
                        {editingNotificationId ? (
                          <button
                            type="button"
                            onClick={cancelarEdicaoNotificacao}
                            disabled={notificationSubmitting}
                            className="rounded-xl border border-slate-700 px-4 py-2.5 text-base font-bold text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Cancelar edição
                          </button>
                        ) : null}
                      </div>
                    </div>
                    {notificationStatus ? (
                      <p className="mt-3 rounded-[10px] border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm font-semibold text-slate-300">
                        {notificationStatus}
                      </p>
                    ) : null}
                  </div>
                <div>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                      Avisos publicados
                    </h4>
                    <span className="text-sm text-slate-500">
                      {eventNotifications.length} aviso{eventNotifications.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  {notificationsLoading ? (
                    <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-5 text-base text-slate-400">
                      Carregando avisos...
                    </div>
                  ) : !eventNotifications.length ? (
                    <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/40 px-4 py-5 text-base text-slate-500">
                      Nenhum aviso publicado para este evento.
                    </div>
                  ) : (
                    <div className="max-h-[460px] space-y-3 overflow-y-auto pr-1">
                      {eventNotifications.map((notice) => (
                        <article
                          key={notice.id}
                          className="rounded-xl border border-slate-800 bg-slate-950/55 p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="break-words text-base font-extrabold text-white">
                                {notice.titulo}
                              </p>
                              <time className="mt-1 block text-sm text-slate-500">
                                {fmtDateTime(notice.createdAt)}
                              </time>
                            </div>
                            <div className="flex shrink-0 flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => editarNotificacaoEvento(notice)}
                                disabled={notificationSubmitting}
                                className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm font-bold text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => pedirExclusaoNotificacao(notice)}
                                disabled={notificationSubmitting}
                                className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-sm font-bold text-red-300 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Apagar
                              </button>
                            </div>
                          </div>
                          <p className="mt-3 whitespace-pre-line break-words text-base leading-7 text-slate-300">
                            {notice.conteudo}
                          </p>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
                </div>
              </div>
              <div id="evento-inscricoes" className="scroll-mt-6 overflow-hidden rounded-[14px] border border-slate-800 bg-slate-900/50">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 px-6 py-4">
                  <div>
                    <span className="text-xl font-extrabold text-white">
                      Inscrições do evento{" "}
                      <span className="font-normal text-slate-500">
                        ({eventoAtualParticipantes.length} de {eventoAtual.participantes.length})
                      </span>
                    </span>
                    <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-500">
                      <span>Pendentes: {eventoAtual.participantes.filter((p) => p.status === "PENDING").length}</span>
                      <span>Aprovados: {eventoAtual.participantes.filter((p) => p.status === "APPROVED").length}</span>
                      <span>Rejeitados: {eventoAtual.participantes.filter((p) => p.status === "REJECTED").length}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-end gap-3">
                    {renderApprovalFilterControl()}
                    {renderParticipantSortControls()}
                  </div>
                </div>
                {approvalStatus ? (
                  <div className="border-b border-slate-800 bg-green-500/10 px-6 py-3 text-base font-semibold text-green-300">
                    {approvalStatus}
                  </div>
                ) : null}
                {formError ? (
                  <div className="border-b border-slate-800 bg-red-500/10 px-6 py-3 text-base font-semibold text-red-300">
                    {formError}
                  </div>
                ) : null}
                <div className="overflow-x-auto">
                <table className="min-w-[980px] w-full border-collapse">
                  <thead>
                    <tr>
                      <th className={thClass}>Nome</th>
                      <th className={thClass}>E-mail</th>
                      <th className={thClass}>Telefone</th>
                      <th className={thClass}>Inscrição</th>
                      <th className={thClass}>Status</th>
                      <th className={thClass}>Presença</th>
                      <th className={thClass}>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!eventoAtualParticipantes.length ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-12 text-center text-base text-slate-500">
                          Nenhuma inscrição encontrada para este filtro
                        </td>
                      </tr>
                    ) : (
                      eventoAtualParticipantes.map((p) => (
                        <tr key={p.id} className="group hover:[&>td]:bg-slate-900/60">
                          <td className={`${tdClass} font-semibold text-white`}>{p.nome}</td>
                          <td className={`${tdClass} text-slate-500`}>{p.email}</td>
                          <td className={tdClass}>{p.telefone}</td>
                          <td className={tdClass}>{fmtInscricaoDate(p.createdAt)}</td>
                          <td className={tdClass}>
                            <StatusParticipante status={p.status} />
                          </td>
                          <td className={tdClass}>{p.presenca ?? "—"}</td>
                          <td className={tdClass}>
                            <div className="flex flex-wrap gap-2">
                              {p.status === "PENDING" ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => aprovarParticipante(p.id, eventoAtual.id)}
                                    className="cursor-pointer rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-1.5 text-sm font-bold text-green-300 hover:bg-green-500/20"
                                  >
                                    Aprovar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => rejeitarParticipante(p.id, eventoAtual.id)}
                                    className="cursor-pointer rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-sm font-bold text-red-300 hover:bg-red-500/20"
                                  >
                                    Rejeitar
                                  </button>
                                </>
                              ) : null}
                              <button
                                type="button"
                                onClick={() =>
                                  gerarTicketParticipante(eventoAtual.id, eventoAtual.titulo, p)
                                }
                                disabled={p.status !== "APPROVED"}
                                className="cursor-pointer rounded-lg border border-secondary/30 bg-secondary/10 px-3 py-1.5 text-sm font-bold text-secondary hover:bg-secondary/20 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Gerar QR
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  pedirRemocaoParticipante(eventoAtual.id, p.id, p.nome)
                                }
                                className="cursor-pointer rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-sm font-semibold text-red-400 hover:bg-red-500/20"
                              >
                                Remover
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                </div>
              </div>

              <div id="evento-materiais" className="mt-8 scroll-mt-6">
                {materialsLoading ? (
                  <div className="rounded-[14px] border border-slate-800 bg-slate-900/50 px-6 py-5 text-base text-slate-400">
                    Carregando materiais do evento...
                  </div>
                ) : (
                  <EventMaterialsManager
                    eventId={eventoAtual.id}
                    materials={materials}
                    onMaterialsChange={setMaterials}
                    isAdmin={canManage}
                  />
                )}
              </div>
            </>
          )}
        </div>

        {/* APROVAÇÕES */}
<div
  id="page-aprovacoes"
  className={pageClass("aprovacoes")}
>
  <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
    <div>
      <h1 className="text-2xl font-bold text-white">
        Aprovações
      </h1>
      <p className="mt-1 text-[13px] text-slate-500">
        Escolha um evento para aprovar as inscrições dele
      </p>
    </div>
    <label className="block w-full sm:w-[340px]">
      <span className="mb-1 block text-xs font-bold text-slate-500">Pesquisar</span>
      <input
        value={approvalSearch}
        onChange={(e) => setApprovalSearch(e.target.value)}
        className={inputClass}
        placeholder="Evento, local, participante ou status"
      />
    </label>
  </div>

  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
    {!eventos.length ? (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center text-sm text-slate-500">
        Nenhum evento cadastrado
      </div>
    ) : !approvalEvents.length ? (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center text-sm text-slate-500">
        Nenhum evento encontrado para esta pesquisa
      </div>
    ) : (
      approvalEvents.map((ev) => {
        const pending = ev.participantes.filter((p) => p.status === "PENDING").length;
        const approved = ev.participantes.filter((p) => p.status === "APPROVED").length;
        const rejected = ev.participantes.filter((p) => p.status === "REJECTED").length;
        return (
      <div
        key={ev.id}
        className="rounded-xl border border-slate-800 bg-slate-900 p-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-bold text-white">{ev.titulo}</p>
            <p className="mt-1 text-sm text-slate-400">
              {fmtDate(ev.data)} | {ev.local}
            </p>
          </div>
          <StatusBadge ev={ev} />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-2 text-amber-200">
            <div className="text-lg font-black">{pending}</div>
            Pendentes
          </div>
          <div className="rounded-lg border border-green-500/20 bg-green-500/10 px-2 py-2 text-green-200">
            <div className="text-lg font-black">{approved}</div>
            Aprovados
          </div>
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-2 py-2 text-red-200">
            <div className="text-lg font-black">{rejected}</div>
            Rejeitados
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500">
            {ev.participantes.length} inscrição(ões) neste evento
          </span>
          <button
            type="button"
            onClick={() => verEvento(ev.id)}
            className="cursor-pointer rounded-lg border border-secondary/30 bg-secondary/10 px-3 py-2 text-xs font-bold text-secondary hover:bg-secondary/20"
          >
            Ver inscrições
          </button>
        </div>
      </div>
        );
      })
    )}
  </div>
</div>

        {/* USUÁRIOS */}
        <div id="page-usuarios" className={pageClass("usuarios")}>
          <div className="mb-8 flex flex-col items-start justify-between gap-3 sm:flex-row">
            <div>
              <h1 className="text-[26px] font-black tracking-tight text-white">Usuários</h1>
              <p className="mt-1 text-[13px] text-slate-500">
                Usuários cadastrados na plataforma
              </p>
            </div>
            <label className="block w-full sm:w-[320px]">
              <span className="mb-1 block text-xs font-bold text-slate-500">Pesquisar</span>
              <input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className={inputClass}
                placeholder="Nome, e-mail, papel, CPF ou telefone"
              />
            </label>
          </div>
          <div className="overflow-x-auto rounded-[14px] border border-slate-800 bg-slate-900/50">
            <table className="min-w-[640px] w-full border-collapse">
              <thead>
                <tr>
                  <th className={thClass}>Nome</th>
                  <th className={thClass}>E-mail</th>
                  <th className={thClass}>Papel</th>
                  <th className={thClass}>Status</th>
                  <th className={thClass}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {usersApiError ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-sm text-red-300">
                      {usersApiError}
                    </td>
                  </tr>
                ) : !adminUsers.length ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-500">
                      Nenhum usuário cadastrado.
                    </td>
                  </tr>
                ) : !filteredAdminUsers.length ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-500">
                      Nenhum usuário encontrado para esta pesquisa.
                    </td>
                  </tr>
                ) : (
                  filteredAdminUsers.map((adminUser) => (
                    <tr key={adminUser.id} className="group hover:[&>td]:bg-slate-900/60">
                      <td className={`${tdClass} font-semibold text-white`}>{adminUser.name}</td>
                      <td className={`${tdClass} text-slate-500`}>{adminUser.email}</td>
                      <td className={tdClass}>
                        <span
                          className={
                            adminUser.role === "ADMIN"
                              ? "rounded-full border border-secondary/30 bg-secondary/10 px-2.5 py-1 text-xs font-bold text-secondary"
                              : "rounded-full border border-slate-700 bg-slate-800/60 px-2.5 py-1 text-xs font-bold text-slate-300"
                          }
                        >
                          {adminUser.role === "ADMIN" ? "Administrador" : "Usuário"}
                        </span>
                      </td>
                      <td className={tdClass}>
                        <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-300">
                          Ativo
                        </span>
                      </td>
                      <td className={tdClass}>
                        <select
                          value={adminUser.role === "ADMIN" ? "ADMIN" : "USER"}
                          disabled={updatingUserRoleId === adminUser.id}
                          onChange={(event) =>
                            void alterarPapelUsuario(
                              adminUser.id,
                              event.target.value === "ADMIN" ? "ADMIN" : "USER",
                            )
                          }
                          className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs font-semibold text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="USER">Usuário</option>
                          <option value="ADMIN">Administrador</option>
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL EVENTO */}
      <div
        id="modal-evento"
        className={`fixed inset-0 z-[100] items-center justify-center bg-black/65 ${
          modalEventoOpen ? "flex" : "hidden"
        }`}
        role="presentation"
      >
        <div className="mx-4 max-h-[90vh] w-full max-w-[520px] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">
            <span className="text-base font-extrabold text-white">{modalEventoTitulo}</span>
            <button
              type="button"
              onClick={closeModalEvento}
              className="cursor-pointer border-0 bg-transparent text-lg leading-none text-slate-500 hover:text-white"
              aria-label="Fechar"
            >
              ×
            </button>
          </div>
          <div className="px-6 py-6">
            <input type="hidden" value={form.id} readOnly aria-hidden />
            <div className="mb-4">
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                Título *
              </label>
              <input
                type="text"
                value={form.titulo}
                onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                placeholder="Nome do evento"
                className={inputClass}
              />
            </div>
            <div className="mb-4">
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                Descrição
              </label>
              <textarea
                value={form.desc}
                onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value }))}
                placeholder="Descreva o evento"
                rows={4}
                className={`${inputClass} min-h-[80px] resize-y`}
              />
              <p className="mt-1 text-right text-xs text-slate-500">{form.desc.length}/500</p>
            </div>
            <div className="mb-4">
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                Imagem de capa (preview local)
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  setImageError(null);
                  if (!file) return;
                  const allowed = ["image/jpeg", "image/png", "image/webp"];
                  if (!allowed.includes(file.type)) {
                    setImageError("Formato inválido. Use JPEG, PNG ou WEBP.");
                    setImageFile(null);
                    setImagePreview(null);
                    return;
                  }
                  if (file.size > 5 * 1024 * 1024) {
                    setImageError("A imagem deve ter no máximo 5MB.");
                    setImageFile(null);
                    setImagePreview(null);
                    return;
                  }
                  const preview = URL.createObjectURL(file);
                  setImageFile(file);
                  setImagePreview(preview);
                }}
                className={inputClass}
              />
              {imagePreview ? (
                <img src={imagePreview} alt="Preview da capa" className="mt-3 h-36 w-full rounded-xl object-cover" />
              ) : null}
              {imageError ? <p className="mt-2 text-xs font-semibold text-red-300">{imageError}</p> : null}
            </div>
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                  Data *
                </label>
                <input
                  type="date"
                  value={form.data}
                  onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                  Horário *
                </label>
                <input
                  type="time"
                  value={form.hora}
                  onChange={(e) => setForm((f) => ({ ...f, hora: e.target.value }))}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                  Local *
                </label>
                <input
                  type="text"
                  value={form.local}
                  onChange={(e) => setForm((f) => ({ ...f, local: e.target.value }))}
                  placeholder="Ex: Laboratório 2"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                  Máx. participantes *
                </label>
                <input
                  type="number"
                  value={form.max}
                  onChange={(e) => setForm((f) => ({ ...f, max: e.target.value }))}
                  placeholder="Ex: 40"
                  min={1}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                Categoria *
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className={inputClass}
              >
                <option value="">Selecione</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="mb-4 flex items-center gap-3">
              <input
                id="event-private"
                type="checkbox"
                checked={Boolean(form.private)}
                onChange={(e) => setForm((f) => ({ ...f, private: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-primary focus:ring-primary"
              />
              <label htmlFor="event-private" className="text-sm text-slate-300">Evento privado — participantes precisam de aprovação</label>
            </div>

            <div className="mb-4 flex items-center gap-3">
              <input
                id="event-majority18"
                type="checkbox"
                checked={Boolean(form.majority18)}
                onChange={(e) => setForm((f) => ({ ...f, majority18: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-primary focus:ring-primary"
              />
              <label htmlFor="event-majority18" className="text-sm text-slate-300">
                Evento +18 — bloquear inscrição de contas menores de idade
              </label>
            </div>

            <div className="mb-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                  Palestrantes
                </label>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, speakers: [...f.speakers, { ...emptySpeakerForm }] }))}
                  className="rounded-lg border border-secondary/30 bg-secondary/10 px-3 py-1.5 text-xs font-bold text-secondary hover:bg-secondary/20"
                >
                  Adicionar
                </button>
              </div>
              <div className="space-y-3">
                {form.speakers.map((speaker, index) => (
                  <div key={index} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="text-xs font-bold text-slate-400">Palestrante {index + 1}</span>
                      {form.speakers.length > 1 ? (
                        <button
                          type="button"
                          onClick={() =>
                            setForm((f) => ({
                              ...f,
                              speakers: f.speakers.filter((_, currentIndex) => currentIndex !== index),
                            }))
                          }
                          className="rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs font-bold text-red-300 hover:bg-red-500/20"
                        >
                          Remover
                        </button>
                      ) : null}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        type="text"
                        value={speaker.name}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            speakers: f.speakers.map((item, currentIndex) =>
                              currentIndex === index ? { ...item, name: e.target.value } : item,
                            ),
                          }))
                        }
                        placeholder="Nome do palestrante"
                        className={inputClass}
                      />
                      <input
                        type="text"
                        value={speaker.topics}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            speakers: f.speakers.map((item, currentIndex) =>
                              currentIndex === index ? { ...item, topics: e.target.value } : item,
                            ),
                          }))
                        }
                        placeholder="Temas apresentados"
                        className={inputClass}
                      />
                    </div>
                    <textarea
                      value={speaker.bio}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          speakers: f.speakers.map((item, currentIndex) =>
                            currentIndex === index ? { ...item, bio: e.target.value } : item,
                          ),
                        }))
                      }
                      placeholder="Mini biografia"
                      rows={2}
                      className={`${inputClass} mt-3 resize-y`}
                    />
                    <textarea
                      value={speaker.agenda}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          speakers: f.speakers.map((item, currentIndex) =>
                            currentIndex === index ? { ...item, agenda: e.target.value } : item,
                          ),
                        }))
                      }
                      placeholder="Agenda individual"
                      rows={2}
                      className={`${inputClass} mt-3 resize-y`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {formError ? (
              <div className="mt-1 rounded-[10px] border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-[13px] font-semibold text-red-400">
                {formError}
              </div>
            ) : null}
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-800 px-6 py-4">
            <button
              type="button"
              onClick={closeModalEvento}
              className="cursor-pointer rounded-[10px] border border-slate-600 bg-transparent px-4 py-2 text-[13.5px] text-slate-300 hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={salvarEvento}
              className="cursor-pointer rounded-[10px] border border-primary bg-primary px-4 py-2 text-[13.5px] text-white hover:border-blue-600 hover:bg-blue-600"
            >
              Salvar evento
            </button>
          </div>
        </div>
      </div>

      {/* MODAL QR CODE */}
      <div
        id="modal-ticket"
        className={`fixed inset-0 z-[100] items-center justify-center bg-black/65 px-4 ${
          ticketModalOpen ? "flex" : "hidden"
        }`}
        role="presentation"
      >
        <div className="w-full max-w-[430px] rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <div className="text-base font-extrabold text-white">QR Code do participante</div>
              <p className="mt-1 text-[13px] text-slate-500">
                {ticketParticipant?.participante.nome} · {ticketParticipant?.eventoTitulo}
              </p>
            </div>
            <button
              type="button"
              onClick={fecharTicketModal}
              className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800"
            >
              Fechar
            </button>
          </div>

          {ticketLoading && !ticket ? (
            <div className="mx-auto h-[220px] w-[220px] animate-pulse rounded-xl bg-slate-800" />
          ) : ticketError ? (
            <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm font-semibold text-red-300">
              {ticketError}
            </div>
          ) : ticket ? (
            <div className="space-y-5">
              <div className="mx-auto w-fit rounded-2xl bg-white p-4">
                <img
                  src={`data:image/png;base64,${ticket.qrCodeBase64}`}
                  alt="QR Code do participante"
                  width={220}
                  height={220}
                />
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-xs text-slate-500">
                Ticket: <span className="text-slate-300">{ticket.ticketId}</span>
              </div>
            </div>
          ) : null}

          {ticketMessage ? (
            <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-4 py-3 text-sm font-semibold text-emerald-100">
              {ticketMessage}
            </div>
          ) : null}

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={fecharTicketModal}
              className="cursor-pointer rounded-[10px] border border-slate-600 bg-transparent px-4 py-2 text-[13.5px] text-slate-300 hover:bg-slate-800"
            >
              Fechar
            </button>
            <button
              type="button"
              disabled={!ticket || ticketLoading}
              onClick={() => void validarTicketAtual()}
              className="cursor-pointer rounded-[10px] border border-secondary/30 bg-secondary/10 px-4 py-2 text-[13.5px] font-bold text-secondary hover:bg-secondary/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {ticketLoading && ticket ? "Validando..." : "Validar presença"}
            </button>
          </div>
        </div>
      </div>

      {/* MODAL CONFIRMAR */}
      <div
        id="modal-confirm"
        className={`fixed inset-0 z-[100] items-center justify-center bg-black/65 ${
          modalConfirmOpen ? "flex" : "hidden"
        }`}
        role="presentation"
      >
        <div className="w-full max-w-[400px] rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-2 text-base font-extrabold text-white">
            {confirmContent?.title}
          </div>
          <div className="mb-6 text-[13.5px] leading-relaxed text-slate-500">
            {confirmContent?.text}
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeModalConfirm}
              className="cursor-pointer rounded-[10px] border border-slate-600 bg-transparent px-4 py-2 text-[13.5px] text-slate-300 hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmarAcao}
              className="cursor-pointer rounded-[10px] border border-red-500/20 bg-red-500/10 px-4 py-2 text-[13.5px] text-red-400 hover:bg-red-500/20"
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
