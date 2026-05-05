"use client";

import Link from "next/link";
import type { CSSProperties, SVGProps } from "react";
import { useMemo, useRef, useState } from "react";

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

type Usuario = {
  id: number;
  nome: string;
  email: string;
  papel: "admin" | "usuario";
  ativo: boolean;
};

type PageId =
  | "dashboard"
  | "eventos"
  | "evento-detalhe"
  | "participantes"
  | "usuarios";

const MOCK_EVENTOS: Evento[] = [
  {
    id: 1,
    titulo: "Workshop de APIs REST",
    desc: "Evento voltado para desenvolvimento de APIs com Spring Boot e Express.",
    data: "2026-05-20",
    hora: "19:00",
    local: "Laboratório 2",
    max: 40,
    participantes: [
      {
        id: 1,
        nome: "João Silva",
        email: "joao@email.com",
        telefone: "(51) 99999-1111",
      },
      {
        id: 2,
        nome: "Maria Souza",
        email: "maria@email.com",
        telefone: "(51) 99999-2222",
      },
      {
        id: 3,
        nome: "Carlos Lima",
        email: "carlos@email.com",
        telefone: "(51) 99999-3333",
      },
    ],
  },
  {
    id: 2,
    titulo: "Hackathon de Inovação",
    desc: "Maratona de programação com foco em soluções sustentáveis.",
    data: "2026-06-10",
    hora: "08:00",
    local: "Auditório Principal",
    max: 80,
    participantes: [
      {
        id: 4,
        nome: "Ana Pereira",
        email: "ana@email.com",
        telefone: "(51) 99999-4444",
      },
      {
        id: 5,
        nome: "Bruno Costa",
        email: "bruno@email.com",
        telefone: "(51) 99999-5555",
      },
    ],
  },
  {
    id: 3,
    titulo: "Palestra: Carreira em TI",
    desc: "Papo sobre mercado, carreira e habilidades técnicas.",
    data: "2026-04-28",
    hora: "19:30",
    local: "Sala 301",
    max: 30,
    participantes: Array.from({ length: 30 }, (_, i) => ({
      id: i + 10,
      nome: `Participante ${i + 1}`,
      email: `part${i + 1}@email.com`,
      telefone: `(51) 9${String(i).padStart(4, "0")}-0000`,
    })),
  },
  {
    id: 4,
    titulo: "Minicurso: Docker e DevOps",
    desc: "Introdução prática a containers e pipelines de CI/CD.",
    data: "2026-07-15",
    hora: "14:00",
    local: "Laboratório 1",
    max: 25,
    participantes: [],
  },
];

const MOCK_USUARIOS: Usuario[] = [
  {
    id: 1,
    nome: "Admin Sistema",
    email: "admin@eventos.com",
    papel: "admin",
    ativo: true,
  },
  {
    id: 2,
    nome: "João Silva",
    email: "joao@email.com",
    papel: "usuario",
    ativo: true,
  },
  {
    id: 3,
    nome: "Maria Souza",
    email: "maria@email.com",
    papel: "usuario",
    ativo: true,
  },
  {
    id: 4,
    nome: "Carlos Lima",
    email: "carlos@email.com",
    papel: "usuario",
    ativo: false,
  },
];

function fmtDate(d: string) {
  const [y, m, dy] = d.split("-");
  return `${dy}/${m}/${y}`;
}

function getStatus(ev: Evento) {
  const p = ev.participantes.length / ev.max;
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
  const [eventos, setEventos] = useState<Evento[]>(() =>
    JSON.parse(JSON.stringify(MOCK_EVENTOS)) as Evento[],
  );
  const [currentPage, setCurrentPage] = useState<PageId>("dashboard");
  const [eventoAtualId, setEventoAtualId] = useState<number | null>(null);

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

  const dashboardStats = useMemo(() => {
    const totalP = eventos.reduce((a, e) => a + e.participantes.length, 0);
    const ativos = eventos.filter((e) => e.participantes.length < e.max).length;
    return {
      total: eventos.length,
      ativos,
      inscricoes: totalP,
      usuarios: MOCK_USUARIOS.length,
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
    if (!titulo || !data || !hora || !local || !max) {
      setFormError("Preencha todos os campos obrigatórios.");
      return;
    }
    setFormError(null);
    const idStr = form.id;
    if (idStr) {
      const idNum = parseInt(idStr, 10);
      setEventos((prev) =>
        prev.map((e) =>
          e.id === idNum ? { ...e, titulo, desc, data, hora, local, max } : e,
        ),
      );
      if (currentPage === "evento-detalhe" && eventoAtualId === idNum) {
        /* estado já reflete em eventoAtual */
      }
    } else {
      const nextId = Math.max(...eventos.map((e) => e.id), 0) + 1;
      setEventos((prev) => [
        ...prev,
        {
          id: nextId,
          titulo,
          desc,
          data,
          hora,
          local,
          max,
          participantes: [],
        },
      ]);
    }
    closeModalEvento();
  }

  function pedirExclusaoEvento(id: number) {
    const ev = eventos.find((e) => e.id === id);
    setConfirmContent({
      title: "Excluir evento",
      text: `Tem certeza que deseja excluir "${ev?.titulo ?? ""}"? Esta ação não pode ser desfeita.`,
    });
    pendingActionRef.current = () => {
      setEventos((prev) => prev.filter((e) => e.id !== id));
      if (currentPage === "evento-detalhe") {
        navigate("eventos");
      }
    };
    setModalConfirmOpen(true);
  }

  function pedirRemocaoParticipante(eventoId: number, partId: number, nome: string) {
    setConfirmContent({
      title: "Remover participante",
      text: `Remover "${nome}" deste evento?`,
    });
    pendingActionRef.current = () => {
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
    ? Math.round((eventoAtual.participantes.length / eventoAtual.max) * 100)
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
                Usuários cadastrados
              </p>
              <p className="text-[28px] font-black text-white">{dashboardStats.usuarios}</p>
              <p className="mt-1 text-[11.5px] text-slate-500">na plataforma</p>
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
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-[10px] border border-primary bg-primary px-4 py-2 text-[13.5px] font-medium text-white shadow-[0_4px_14px_rgba(31,111,255,0.3)] hover:border-blue-600 hover:bg-blue-600"
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
                    href={`/admin/eventos/${eventoAtual.id}/editar`}
                    className="cursor-pointer rounded-lg border border-slate-600 bg-transparent px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800"
                  >
                    Editar
                  </Link>
                  <Link
                    href={`/admin/eventos/${eventoAtual.id}/historico`}
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
                {MOCK_USUARIOS.map((u) => (
                  <tr key={u.id} className="group hover:[&>td]:bg-slate-900/60">
                    <td className={`${tdClass} font-semibold text-white`}>{u.nome}</td>
                    <td className={`${tdClass} text-slate-500`}>{u.email}</td>
                    <td className={tdClass}>
                      {u.papel === "admin" ? (
                        <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[11.5px] font-bold text-amber-300 ring-1 ring-inset ring-amber-500/25">
                          Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-500/15 px-2 py-0.5 text-[11.5px] font-bold text-slate-400 ring-1 ring-inset ring-slate-500/20">
                          Usuário
                        </span>
                      )}
                    </td>
                    <td className={tdClass}>
                      {u.ativo ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11.5px] font-bold text-emerald-400 ring-1 ring-inset ring-emerald-500/25">
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-red-500/10 px-2 py-0.5 text-[11.5px] font-bold text-red-400 ring-1 ring-inset ring-red-500/25">
                          Inativo
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
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
