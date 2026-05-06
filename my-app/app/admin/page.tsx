"use client";

import Link from "next/link";
import type { CSSProperties, SVGProps } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { setAuthUser } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";
import {
  coerceTime,
  normalizeEventList,
  normalizeEventRecord,
  type ApiEventNorm,
} from "@/lib/eventsFromApi";

type Participante = {
  id: number;
  nome: string;
  email: string;
  telefone: string;
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
};

type PageId =
  | "dashboard"
  | "eventos"
  | "evento-detalhe"
  | "participantes"
  | "usuarios";

function mapNormToEvento(ev: ApiEventNorm): Evento {
  return {
    id: ev.id,
    titulo: ev.title,
    desc: ev.description ?? "",
    data: ev.date,
    hora: (ev.time ?? "").slice(0, 5),
    local: ev.location ?? "",
    max: ev.maxParticipants,
    participantes: ev.participants.map((p) => ({
      id: p.id,
      nome: p.name,
      email: p.email,
      telefone: p.phone,
    })),
  };
}

function fmtDate(d: string) {
  const [y, m, dy] = d.split("-");
  return `${dy}/${m}/${y}`;
}

function getStatus(ev: Evento) {
  const cap = ev.max > 0 ? ev.max : 1;
  const p = ev.participantes.length / cap;
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

function NavIconDashboard(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      viewBox="0 0 16 16"
      aria-hidden
      {...props}
    >
      <rect x="1" y="1" width="6" height="6" rx="1" />
      <rect x="9" y="1" width="6" height="6" rx="1" />
      <rect x="1" y="9" width="6" height="6" rx="1" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </svg>
  );
}

function NavIconCalendar(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      viewBox="0 0 16 16"
      aria-hidden
      {...props}
    >
      <rect x="1" y="3" width="14" height="12" rx="1.5" />
      <path d="M5 1v4M11 1v4M1 7h14" />
    </svg>
  );
}

function NavIconPeople(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      viewBox="0 0 16 16"
      aria-hidden
      {...props}
    >
      <circle cx="6" cy="5" r="3" />
      <path d="M1 14c0-3 2-5 5-5s5 2 5 5" />
      <circle cx="13" cy="5" r="2" />
      <path d="M13 9c1.5 0 3 1 3 4" />
    </svg>
  );
}

function NavIconUser(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      viewBox="0 0 16 16"
      aria-hidden
      {...props}
    >
      <circle cx="8" cy="5" r="3.5" />
      <path d="M1 15c0-3.5 3-6 7-6s7 2.5 7 6" />
    </svg>
  );
}

function NavIconBack(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      viewBox="0 0 16 16"
      aria-hidden
      {...props}
    >
      <path d="M6 12L2 8l4-4M2 8h12" />
    </svg>
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
  });
  const [imageError, setImageError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [modalEventoTitulo, setModalEventoTitulo] = useState("Novo evento");

  const [confirmContent, setConfirmContent] = useState<{
    title: string;
    text: string;
  } | null>(null);
  const pendingActionRef = useRef<(() => void) | null>(null);

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
    const ativos = eventos.filter((e) => e.participantes.length < e.max).length;
    return {
      total: eventos.length,
      ativos,
      inscricoes: totalP,
    };
  }, [eventos]);

  const participantesRows = useMemo(() => {
    const rows: { p: Participante; titulo: string }[] = [];
    eventos.forEach((ev) =>
      ev.participantes.forEach((p) => rows.push({ p, titulo: ev.titulo })),
    );
    return rows;
  }, [eventos]);

  function navigate(page: PageId) {
    setCurrentPage(page);
    const navPages: PageId[] = [
      "dashboard",
      "eventos",
      "participantes",
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
      });
    }
    setModalEventoOpen(true);
  }

  function closeModalEvento() {
    setModalEventoOpen(false);
    setImageError(null);
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
    setFormError(null);
    const idStr = form.id;

    (async () => {
      try {
        if (idStr) {
          const idNum = parseInt(idStr, 10);
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
            },
          });
          const n = normalizeEventRecord(updatedRaw as Record<string, unknown>);
          if (!n) {
            setFormError("Resposta inválida do servidor ao atualizar o evento.");
            return;
          }
          const mapped = mapNormToEvento(n);
          setEventos((prev) => prev.map((e) => (e.id === idNum ? mapped : e)));
        } else {
          const createdRaw = await apiFetch<unknown>("/events", {
            method: "POST",
            json: {
              title: titulo,
              description: desc || null,
              date: data,
              time: timeForApi,
              location: local,
              maxParticipants: max,
              majority18: false,
            },
          });
          const n = normalizeEventRecord(createdRaw as Record<string, unknown>);
          if (!n) {
            setFormError("Resposta inválida do servidor ao criar o evento.");
            return;
          }
          setEventos((prev) => [...prev, mapNormToEvento(n)]);
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
    usuarios: 3,
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
          onClick={() => navigate("usuarios")}
          className={`flex cursor-pointer items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13.5px] transition-colors ${
            activeNav === 3
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
          <div className="overflow-hidden rounded-[14px] border border-slate-800 bg-slate-900/50">
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
                      {ev.participantes.length}/{ev.max}
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
                        {ev.participantes.length}/{ev.max}
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
                <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
                  <span className="text-sm font-extrabold text-white">
                    Participantes inscritos{" "}
                    <span className="font-normal text-slate-500">
                      ({eventoAtual.participantes.length})
                    </span>
                  </span>
                </div>
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className={thClass}>Nome</th>
                      <th className={thClass}>E-mail</th>
                      <th className={thClass}>Telefone</th>
                      <th className={thClass}>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!eventoAtual.participantes.length ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-12 text-center text-sm text-slate-500">
                          Nenhum participante inscrito
                        </td>
                      </tr>
                    ) : (
                      eventoAtual.participantes.map((p) => (
                        <tr key={p.id} className="group hover:[&>td]:bg-slate-900/60">
                          <td className={`${tdClass} font-semibold text-white`}>{p.nome}</td>
                          <td className={`${tdClass} text-slate-500`}>{p.email}</td>
                          <td className={tdClass}>{p.telefone}</td>
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

        {/* PARTICIPANTES */}
        <div
          id="page-participantes"
          className={currentPage === "participantes" ? "block" : "hidden"}
        >
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-[26px] font-black tracking-tight text-white">
                Participantes
              </h1>
              <p className="mt-1 text-[13px] text-slate-500">
                Todas as inscrições realizadas na plataforma
              </p>
            </div>
          </div>
          <div className="overflow-hidden rounded-[14px] border border-slate-800 bg-slate-900/50">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={thClass}>Nome</th>
                  <th className={thClass}>E-mail</th>
                  <th className={thClass}>Telefone</th>
                  <th className={thClass}>Evento</th>
                </tr>
              </thead>
              <tbody>
                {!participantesRows.length ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center text-sm text-slate-500">
                      Nenhuma inscrição encontrada
                    </td>
                  </tr>
                ) : (
                  participantesRows.map(({ p, titulo }) => (
                    <tr key={`${titulo}-${p.id}`} className="group hover:[&>td]:bg-slate-900/60">
                      <td className={`${tdClass} font-semibold text-white`}>{p.nome}</td>
                      <td className={`${tdClass} text-slate-500`}>{p.email}</td>
                      <td className={tdClass}>{p.telefone}</td>
                      <td className={`${tdClass} text-slate-500`}>{titulo}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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
                    return;
                  }
                  if (file.size > 5 * 1024 * 1024) {
                    setImageError("A imagem deve ter no máximo 5MB.");
                    return;
                  }
                  const preview = URL.createObjectURL(file);
                  setImagePreview(preview);
                }}
                className={inputClass}
              />
              {imagePreview ? (
                // TODO: enviar imagem para POST /events/{id}/image após criação
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
