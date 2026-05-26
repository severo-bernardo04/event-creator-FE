"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { setAuthUser } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";
import { uploadEventImage } from "@/lib/eventImages";
import {
  addEventHistory,
  buildEventHistoryChanges,
  type EventHistoryFieldDefinition,
} from "@/lib/eventHistory";
import {
  coerceTime,
  normalizeEventList,
  normalizeEventRecord,
  type ApiEventNorm,
} from "@/lib/eventsFromApi";
import EventsChart from "@/components/EventsChart";
import { CATEGORIES } from "@/lib/categoryMocks";
import { NavIconDashboard, NavIconCalendar, NavIconPeople, NavIconUser, NavIconBack } from "./components/NavIcons";
import StatusParticipante from "@/components/StatusParticipante";
import type { ParticipantStatus } from "@/types";

type Participante = {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  status: ParticipantStatus;
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
type ApprovalRule = "ALL" | "EMAIL_ALLOWLIST" | "CAPACITY";

type EventHistorySnapshot = {
  titulo: string;
  desc: string;
  data: string;
  hora: string;
  local: string;
  max: string;
  category: string;
  private: boolean;
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
];

const participantStatusLabels: Record<ParticipantStatus, string> = {
  APPROVED: "Aprovado",
  PENDING: "Pendente",
  REJECTED: "Rejeitado",
};

const participantSortOptions: { value: ParticipantSortField; label: string }[] = [
  { value: "nome", label: "Nome" },
  { value: "createdAt", label: "Data de inscrição" },
  { value: "status", label: "Status de presença" },
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
      const status = (p.status as ParticipantStatus) ?? deriveMockParticipantStatus(p.id);
      return {
        id: p.id,
        nome: p.name,
        email: p.email,
        telefone: p.phone,
        status,
        createdAt: p.createdAt ?? deriveMockCreatedAt(p.id),
      };
    }),
    category: ev.category ?? undefined,
    private: Boolean(ev.private),
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

function getStatus(ev: Evento) {
  const cap = ev.max > 0 ? ev.max : 1;

  const approved = ev.participantes.filter(
    (p) => p.status === "APPROVED"
  ).length;

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

export default function AdminPage() {
  const { user } = useAuth();
  const [eventos, setEventos] = useState<Evento[]>([]);

 async function recarregarEventos() {
  const data = await apiFetch<unknown>("/events", { method: "GET" });
  const list = normalizeEventList(data);
  setEventos(list.map(mapNormToEvento));
}

async function aprovarParticipante(participanteId: number) {
  const evento = eventos.find((ev) =>
    ev.participantes.some((p) => p.id === participanteId),
  );

  if (!evento) return;

  try {
    await apiFetch(`/events/${evento.id}/participants/${participanteId}/aprovar`, {
      method: "PATCH",
    });

    await recarregarEventos();
  } catch (err: unknown) {
    setFormError(getErrorMessage(err));
  }
}


async function rejeitarParticipante(participanteId: number) {
  const evento = eventos.find((ev) =>
    ev.participantes.some((p) => p.id === participanteId),
  );

  if (!evento) return;

  try {
    await apiFetch(`/events/${evento.id}/participants/${participanteId}/rejeitar`, {
      method: "PATCH",
    });

    await recarregarEventos();
  } catch (err: unknown) {
    setFormError(getErrorMessage(err));
  }
}

  const [currentPage, setCurrentPage] = useState<PageId>("dashboard");
  const [eventoAtualId, setEventoAtualId] = useState<number | null>(null);
  const [sessionRole, setSessionRole] = useState<string | null>(null);
  const [sessionHint, setSessionHint] = useState<string | null>(null);
  const [eventsApiError, setEventsApiError] = useState<string | null>(null);
  /** CRUD de eventos exige sessão HTTP com role ADMIN (igual ao EventsController). */
  const canManage = sessionRole === "ADMIN";
  const canManageHint =
    !canManage && user?.role === "ADMIN"
      ? "Seu navegador tem perfil ADMIN salvo, mas a sessão do servidor não está ativa. Faça login de novo em /login e volte ao painel."
      : null;

  const [modalEventoOpen, setModalEventoOpen] = useState(false);
  const [modalConfirmOpen, setModalConfirmOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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

  // Approval mechanism: manual or automatic with configurable rules
  const [approvalMode, setApprovalMode] = useState<"MANUAL" | "AUTO">("MANUAL");
  const [approvalRule, setApprovalRule] = useState<ApprovalRule>("ALL");
  const [emailAllowlist, setEmailAllowlist] = useState<string>(""); // comma-separated domains

  function parseAllowlist() {
    return emailAllowlist
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  }

  /**
   * Apply approval rules to all pending registrations.
   * - MANUAL mode: no-op
   * - AUTO mode with rule:
   *   - ALL: approve every pending
   *   - EMAIL_ALLOWLIST: approve only if email domain is in allowlist
   *   - CAPACITY: approve in FIFO order until event.max is reached; others remain pending or rejected
   */
  function applyApprovalRules() {
    if (approvalMode !== "AUTO") return;
    const allowed = parseAllowlist();

    // Use local snapshot to avoid stale closures; iterate events and participants
    eventos.forEach((ev) => {
      const approvedCount = ev.participantes.filter((p) => p.status === "APPROVED").length;
      let capacityLeft = ev.max > 0 ? ev.max - approvedCount : 0;

      // pending participants in deterministic order (createdAt || id)
      const pending = ev.participantes
        .filter((p) => p.status === "PENDING")
        .slice()
        .sort((a, b) => {
          const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
          const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
          if (ta !== tb) return ta - tb;
          return a.id - b.id;
        });

      pending.forEach((p) => {
        let shouldApprove = false;
        if (approvalRule === "ALL") {
          shouldApprove = true;
        } else if (approvalRule === "EMAIL_ALLOWLIST") {
          if (!p.email) shouldApprove = false;
          const domain = p.email.split("@").pop()?.toLowerCase() ?? "";
          shouldApprove = allowed.length === 0 ? false : allowed.includes(domain);
        } else if (approvalRule === "CAPACITY") {
          if (capacityLeft > 0) {
            shouldApprove = true;
            capacityLeft -= 1;
          } else {
            shouldApprove = false;
          }
        }

        try {
          if (shouldApprove) aprovarParticipante(p.id);
          else rejeitarParticipante(p.id);
        } catch (err) {
          // keep UI stable; set formError to surface to admin
          setFormError((e) => (String(err) || "Erro ao aplicar regra") ?? e);
        }
      });
    });
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
      } catch {
        if (cancelled) return;
        setSessionRole(null);
        setSessionHint(
          "Sessão não encontrada. Faça login (de preferência com usuário ADMIN) em /login para criar ou editar eventos.",
        );
      }

      try {
        const data = await apiFetch<unknown>("/events", { method: "GET" });
        if (cancelled) return;
        const list = normalizeEventList(data);
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

    const ativos = eventos.filter((e) => e.participantes.length < e.max).length;

    return {
      total: eventos.length,
      ativos,
      inscricoes: totalP,
      pending,
      approved,
      rejected,
    };
  }, [eventos]);

  type AprovalFilter = "TODOS" | "PENDENTES" | "APROVADOS" | "REJEITADOS";
  const [aprovacoesFilter, setAprovacoesFilter] = useState<AprovalFilter>("PENDENTES");
  const [participantSortBy, setParticipantSortBy] = useState<ParticipantSortField>("nome");
  const [participantSortDirection, setParticipantSortDirection] = useState<SortDirection>("asc");

  const participantesRows = useMemo(() => {
    const rows: { p: Participante; titulo: string; eventoId: number }[] = [];
    eventos.forEach((ev) =>
      ev.participantes.forEach((p) => rows.push({ p, titulo: ev.titulo, eventoId: ev.id })),
    );
    return sortParticipantes(rows, participantSortBy, participantSortDirection);
  }, [eventos, participantSortBy, participantSortDirection]);

  const eventoAtualParticipantes = useMemo(() => {
    if (!eventoAtual) return [];
    return sortParticipantes(
      eventoAtual.participantes.map((p) => ({ p })),
      participantSortBy,
      participantSortDirection,
    ).map(({ p }) => p);
  }, [eventoAtual, participantSortBy, participantSortDirection]);

  const aprovacoesRows = useMemo(() => {
    const all = eventos.flatMap((ev) => ev.participantes.map((p) => ({ ev, p })));
    const filtered =
      aprovacoesFilter === "TODOS"
        ? all
        : aprovacoesFilter === "PENDENTES"
          ? all.filter(({ p }) => p.status === "PENDING")
          : aprovacoesFilter === "APROVADOS"
            ? all.filter(({ p }) => p.status === "APPROVED")
            : all.filter(({ p }) => p.status === "REJECTED");

    return sortParticipantes(filtered, participantSortBy, participantSortDirection);
  }, [eventos, aprovacoesFilter, participantSortBy, participantSortDirection]);

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
                },
                eventHistoryFields,
              )
            : [];
          const updatedRaw = await apiFetch<unknown>(`/events/${idNum}`, {
            method: "PUT",
            json: {
              title: titulo,
              description: desc || null,
              date: data,
              time: timeForApi,
              location: local,
              maxParticipants: max,
              majority18: false,
              category: form.category || null,
              private: Boolean(form.private),
            },
          });
          const n = normalizeEventRecord(updatedRaw as Record<string, unknown>);
          if (!n) {
            setFormError("Resposta inválida do servidor ao atualizar o evento.");
            return;
          }
          let mapped = mapNormToEvento(n);
          if (imageFile) {
            await uploadEventImage(idNum, imageFile);
            const refreshedRaw = await apiFetch<unknown>(`/events/${idNum}`, {
              method: "GET",
            });
            const refreshed = normalizeEventRecord(refreshedRaw as Record<string, unknown>);
            if (refreshed) mapped = mapNormToEvento(refreshed);
          }
          addEventHistory(
            idNum,
            user ? `${user.name} (${user.email})` : "Administrador",
            changes,
          );
          setEventos((prev) => prev.map((e) => (e.id === idNum ? mapped : e)));
        } else {
              const formData = new FormData();

            formData.append("title", titulo);
            formData.append("description", desc || "");
            formData.append("date", data);
            formData.append("time", timeForApi);
            formData.append("location", local);
            formData.append("maxParticipants", String(max));
            formData.append("majority18", "false");
            formData.append("category", form.category || "");
            formData.append("private", String(Boolean(form.private)));

            const createdRaw = await apiFetch<unknown>("/events", {
              method: "POST",
              body: formData,
            });
          const n = normalizeEventRecord(createdRaw as Record<string, unknown>);
          if (!n) {
            setFormError("Resposta inválida do servidor ao criar o evento.");
            return;
          }
          let mapped = mapNormToEvento(n);
          if (imageFile) {
            await uploadEventImage(n.id, imageFile);
            const refreshedRaw = await apiFetch<unknown>(`/events/${n.id}`, {
              method: "GET",
            });
            const refreshed = normalizeEventRecord(refreshedRaw as Record<string, unknown>);
            if (refreshed) mapped = mapNormToEvento(refreshed);
          }
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

  function editarEventoAtual() {
    if (eventoAtualId != null) openModalEvento(eventoAtualId);
  }

  function excluirEventoAtual() {
    if (eventoAtualId != null) pedirExclusaoEvento(eventoAtualId);
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

  const activeNav = navActiveIndex();

  const detalhePct = eventoAtual
    ? Math.round(
        (eventoAtual.participantes.length / (eventoAtual.max > 0 ? eventoAtual.max : 1)) * 100,
      )
    : 0;

  function renderParticipantSortControls() {
    return (
      <div className="flex flex-wrap items-end gap-3">
        <label className="block min-w-[190px]">
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
        <label className="block min-w-[160px]">
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
      <aside className="fixed left-0 top-0 z-10 flex h-screen w-[220px] flex-col gap-1 border-r border-slate-800 bg-slate-900 px-4 py-6">
        <div className="mb-5 flex items-center gap-2.5 px-2 text-[15px] font-extrabold text-white">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-black text-white">
            E
          </span>
          <span>
            Event <span className="text-secondary">Admin</span>
          </span>
        </div>

        <button
          type="button"
          onClick={() => navigate("dashboard")}
          className={`flex cursor-pointer items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13.5px] transition-colors ${
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
          className={`flex cursor-pointer items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13.5px] transition-colors ${
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
          className={`flex cursor-pointer items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13.5px] transition-colors ${
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
          className={`flex cursor-pointer items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13.5px] transition-colors ${
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
          className={`flex cursor-pointer items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13.5px] transition-colors ${
            activeNav === 4
              ? "bg-slate-800 font-semibold text-white [&_svg]:text-primary"
              : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          }`}
        >
          <NavIconUser />
          Usuários
        </button>

        <div className="mt-auto border-t border-slate-800 pt-3">
          <Link
            href="/"
            className="flex cursor-pointer items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13.5px] text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
          >
            <NavIconBack />
            Voltar ao site
          </Link>
        </div>
      </aside>

      <div className="ml-[220px] min-h-screen bg-slate-950 px-10 py-8">
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
          className={currentPage === "dashboard" ? "block" : "hidden"}
        >
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-[26px] font-black tracking-tight text-white">
                Dashboard
              </h1>
              <p className="mt-1 text-[13px] text-slate-500">Visão geral do sistema</p>
            </div>
          </div>
          <div className="mb-8 grid grid-cols-4 gap-3">
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
                Usuários (painel)
              </p>
              <p className="text-[28px] font-black text-slate-400">—</p>
              <p className="mt-1 text-[11.5px] text-slate-500">
                A API não expõe listagem de usuários; use o banco ou Postman para auditoria.
              </p>
            </div>
          </div>

          <div className="mb-8 grid grid-cols-2 gap-4">
            <div className="overflow-hidden rounded-[14px] border border-slate-800 bg-slate-900/50">
              <div className="border-b border-slate-800 px-6 py-4">
                <span className="text-sm font-extrabold text-white">Eventos criados nos últimos 6 meses</span>
              </div>
              <div className="p-6">
                <EventsChart
                  events={eventos.map((ev) => ({
                    date: ev.data,
                    participants: ev.participantes.length,
                    title: ev.titulo,
                  }))}
                  months={6}
                />
              </div>
            </div>

            <div className="overflow-hidden rounded-[14px] border border-slate-800 bg-slate-900/50 px-6 py-4">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-white">Regras de aprovação</h3>
                  <p className="mt-1 text-[13px] text-slate-500">Defina se as inscrições são aprovadas manualmente ou automaticamente.</p>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => setApprovalMode((m) => (m === 'AUTO' ? 'MANUAL' : 'AUTO'))}
                    className="cursor-pointer rounded-[8px] border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-white"
                  >
                    {approvalMode === 'AUTO' ? 'Modo: Automático' : 'Modo: Manual'}
                  </button>
                </div>
              </div>

              <div className="mt-3 space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500">Regra</label>
                  <select
                    value={approvalRule}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "ALL" || value === "EMAIL_ALLOWLIST" || value === "CAPACITY") {
                        setApprovalRule(value);
                      }
                    }}
                    className={inputClass}
                    disabled={approvalMode !== 'AUTO'}
                  >
                    <option value="ALL">Aprovar todos</option>
                    <option value="EMAIL_ALLOWLIST">Aprovar por domínio de e-mail</option>
                    <option value="CAPACITY">Aprovar até lotação</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500">Domínios permitidos (separados por vírgula)</label>
                  <input
                    type="text"
                    value={emailAllowlist}
                    onChange={(e) => setEmailAllowlist(e.target.value)}
                    placeholder="ex: universidade.edu, empresa.com"
                    className={inputClass}
                    disabled={approvalMode !== 'AUTO' || approvalRule !== 'EMAIL_ALLOWLIST'}
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => applyApprovalRules()}
                    disabled={approvalMode !== 'AUTO'}
                    className="cursor-pointer rounded-[8px] border border-primary bg-primary px-3 py-1 text-xs font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Aplicar regras agora
                  </button>
                </div>
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
            <table className="w-full border-collapse">
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
                      {
                        ev.participantes.filter(
                          (p) => p.status === "APPROVED"
                        ).length
                      }/{ev.max}
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
        <div id="page-eventos" className={currentPage === "eventos" ? "block" : "hidden"}>
          <div className="mb-8 flex items-start justify-between">
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
          <div className="overflow-hidden rounded-[14px] border border-slate-800 bg-slate-900/50">
            <table className="w-full border-collapse">
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
                        {
                        ev.participantes.filter(
                          (p) => p.status === "APPROVED"
                        ).length
                      }/{ev.max}
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
          className={currentPage === "participantes" ? "block" : "hidden"}
        >
          <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-[26px] font-black tracking-tight text-white">Participantes</h1>
              <p className="mt-1 text-[13px] text-slate-500">
                Todas as inscrições realizadas na plataforma
              </p>
            </div>
            {renderParticipantSortControls()}
          </div>

          <div className="overflow-hidden rounded-[14px] border border-slate-800 bg-slate-900/50">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className={thClass}>Nome</th>
                    <th className={thClass}>Evento</th>
                    <th className={thClass}>E-mail</th>
                    <th className={thClass}>Inscrição</th>
                    <th className={thClass}>Status</th>
                    <th className={thClass}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {!participantesRows.length ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-500">
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
                        <td className={tdClass}>
                          <button
                            type="button"
                            onClick={() => verEvento(eventoId)}
                            className="cursor-pointer rounded-lg border border-slate-600 bg-transparent px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800"
                          >
                            Ver evento
                          </button>
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
          className={currentPage === "evento-detalhe" ? "block" : "hidden"}
        >
          <button
            type="button"
            onClick={() => navigate("eventos")}
            className="mb-6 inline-flex cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 text-[13px] text-slate-500 hover:text-white"
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
              <div className="mb-8 flex items-start justify-between">
                <div>
                  <h1 className="text-[26px] font-black tracking-tight text-white">
                    {eventoAtual.titulo}
                  </h1>
                  <p className="mt-1 text-[13px] text-slate-500">{eventoAtual.local}</p>
                </div>
                <div className="flex gap-2">
                  <Link
                      href={`/admin/eventos/${eventoAtualId}/editar`}
                      className="cursor-pointer rounded-lg border border-slate-600 bg-transparent px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800"
                  >
                    Editar
                  </Link>
                  <Link
                      href={`/admin/eventos/${eventoAtualId}/historico`}
                      className="cursor-pointer rounded-lg border border-slate-600 bg-transparent px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800"
                  >
                    Histórico
                  </Link>
                  <button
                    type="button"
                    onClick={excluirEventoAtual}
                    className="cursor-pointer rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs text-red-400 hover:bg-red-500/20"
                  >
                    Excluir
                  </button>
                </div>
              </div>
              <div className="mb-8 grid grid-cols-2 gap-5">
                <div className="rounded-[14px] border border-slate-800 bg-slate-900/50 px-6 py-5">
                  <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                    Informações
                  </h3>
                  <div className="mb-3 last:mb-0">
                    <p className="mb-0.5 text-[11.5px] text-slate-500">Descrição</p>
                    <p className="text-[13.5px] font-medium text-slate-200">
                      {eventoAtual.desc || "—"}
                    </p>
                  </div>
                  <div className="mb-3 last:mb-0">
                    <p className="mb-0.5 text-[11.5px] text-slate-500">Data</p>
                    <p className="text-[13.5px] font-medium text-slate-200">
                      {fmtDate(eventoAtual.data)}
                    </p>
                  </div>
                  <div className="mb-3 last:mb-0">
                    <p className="mb-0.5 text-[11.5px] text-slate-500">Horário</p>
                    <p className="text-[13.5px] font-medium text-slate-200">
                      {eventoAtual.hora}
                    </p>
                  </div>
                  <div className="mb-3 last:mb-0">
                    <p className="mb-0.5 text-[11.5px] text-slate-500">Local</p>
                    <p className="text-[13.5px] font-medium text-slate-200">
                      {eventoAtual.local}
                    </p>
                  </div>
                </div>
                <div className="rounded-[14px] border border-slate-800 bg-slate-900/50 px-6 py-5">
                  <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                    Vagas
                  </h3>
                  <div className="mb-1">
                    <span className="text-[32px] font-black text-white">
                      {eventoAtual.participantes.length}
                    </span>
                    <span className="ml-1 text-base text-slate-500">/ {eventoAtual.max}</span>
                  </div>
                  <div
                    className="admin-progress-track"
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
                  <div className="mt-2.5 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      {detalhePct >= 100
                        ? "Evento lotado"
                        : `${eventoAtual.max - eventoAtual.participantes.length} vagas restantes (${detalhePct}% preenchido)`}
                    </span>
                    <span>
                      <StatusBadge ev={eventoAtual} />
                    </span>
                  </div>
                </div>
              </div>
              <div className="overflow-hidden rounded-[14px] border border-slate-800 bg-slate-900/50">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 px-6 py-4">
                  <div>
                    <span className="text-sm font-extrabold text-white">
                      Participantes inscritos{" "}
                      <span className="font-normal text-slate-500">
                        ({eventoAtual.participantes.length})
                      </span>
                    </span>
                  </div>
                  {renderParticipantSortControls()}
                </div>
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className={thClass}>Nome</th>
                      <th className={thClass}>E-mail</th>
                      <th className={thClass}>Telefone</th>
                      <th className={thClass}>Inscrição</th>
                      <th className={thClass}>Status</th>
                      <th className={thClass}>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!eventoAtual.participantes.length ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-500">
                          Nenhum participante inscrito
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
                          <td className={tdClass}>
                            <button
                              type="button"
                              onClick={() =>
                                pedirRemocaoParticipante(eventoAtual.id, p.id, p.nome)
                              }
                              className="cursor-pointer rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs text-red-400 hover:bg-red-500/20"
                            >
                              Remover
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* APROVAÇÕES */}
<div
  id="page-aprovacoes"
  className={currentPage === "aprovacoes" ? "block" : "hidden"}
>
  <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
    <div>
      <h1 className="text-2xl font-bold text-white">
        Aprovações
      </h1>
      <p className="mt-1 text-[13px] text-slate-500">
        Inscrições filtradas por status de aprovação
      </p>
    </div>
    <div className="flex flex-wrap items-end gap-3">
      <label className="block min-w-[170px]">
        <span className="mb-1 block text-xs font-bold text-slate-500">Filtro</span>
        <select
          value={aprovacoesFilter}
          onChange={(e) => setAprovacoesFilter(e.target.value as AprovalFilter)}
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
      {renderParticipantSortControls()}
    </div>
  </div>

  <div className="space-y-4">
    {!aprovacoesRows.length ? (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center text-sm text-slate-500">
        Nenhuma inscrição encontrada para este filtro
      </div>
    ) : (
      aprovacoesRows.map(({ ev, p }) => (
      <div
        key={`${ev.id}-${p.id}`}
        className="rounded-xl border border-slate-800 bg-slate-900 p-4"
      >
        <p className="font-bold text-white">{p.nome}</p>

        <p className="text-sm text-slate-400">
          Evento: {ev.titulo}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <StatusParticipante status={p.status} />
          <span className="text-xs text-slate-500">
            Inscrição: {fmtInscricaoDate(p.createdAt)}
          </span>
        </div>

        {p.status === "PENDING" && (
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => aprovarParticipante(p.id)}
              className="rounded-lg bg-green-500 px-3 py-2 text-sm font-bold text-black"
            >
              Aprovar
            </button>

            <button
              onClick={() => rejeitarParticipante(p.id)}
              className="rounded-lg bg-red-500 px-3 py-2 text-sm font-bold text-white"
            >
              Rejeitar
            </button>
          </div>
        )}
      </div>
      ))
    )}
  </div>
</div>

        {/* USUÁRIOS */}
        <div id="page-usuarios" className={currentPage === "usuarios" ? "block" : "hidden"}>
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-[26px] font-black tracking-tight text-white">Usuários</h1>
              <p className="mt-1 text-[13px] text-slate-500">
                Usuários cadastrados na plataforma
              </p>
            </div>
          </div>
          <div className="overflow-hidden rounded-[14px] border border-slate-800 bg-slate-900/50">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={thClass}>Nome</th>
                  <th className={thClass}>E-mail</th>
                  <th className={thClass}>Papel</th>
                  <th className={thClass}>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-sm text-slate-500">
                    Não há endpoint público para listar usuários. O painel usa apenas dados de
                    eventos e inscrições vindos de <span className="font-mono text-slate-400">GET /events</span>.
                  </td>
                </tr>
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
        <div className="max-h-[90vh] w-full max-w-[520px] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900">
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
            <div className="mb-4 grid grid-cols-2 gap-3">
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
            <div className="mb-4 grid grid-cols-2 gap-3">
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
