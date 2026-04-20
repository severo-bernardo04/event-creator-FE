"use client";
import Link from "next/link";
import Header from "../components/Header";
import { useState } from "react";

const SAMPLE_EVENTS = [
  {
    id: "1",
    title: "Noite Eletrônica — São Paulo",
    category: "Show",
    date: "24 mai 2026 · 22h",
    city: "São Paulo, SP",
    price: "A partir de R$ 80",
  },
  {
    id: "2",
    title: "Summit de Inovação 2026",
    category: "Palestra",
    date: "08 jun 2026 · 14h",
    city: "Belo Horizonte, MG",
    price: "A partir de R$ 120",
  },
  {
    id: "3",
    title: "Festival Gastronômico do Porto",
    category: "Festival",
    date: "15 jun 2026 · 11h",
    city: "Porto Alegre, RS",
    price: "Grátis",
  },
  {
    id: "4",
    title: "Workshop de UX para Produto",
    category: "Workshop",
    date: "02 jul 2026 · 9h",
    city: "Online",
    price: "A partir de R$ 199",
  },
  {
    id: "5",
    title: "Open Air Sunset",
    category: "Festas",
    date: "12 jul 2026 · 16h",
    city: "Rio de Janeiro, RJ",
    price: "A partir de R$ 65",
  },
  {
    id: "6",
    title: "Congresso de Saúde e Bem-estar",
    category: "Congresso",
    date: "20 ago 2026 · 8h",
    city: "Curitiba, PR",
    price: "A partir de R$ 350",
  },
] as const;

const CATEGORIES = [
  "Shows",
  "Festas e festivais",
  "Palestras",
  "Workshops",
  "Cursos",
  "Congresso",
  "Feiras",
  "Esportes",
] as const;

export function Home() {
  const [activeCategory, setActiveCategory] = useState("Todos");

  const filteredEvents =
    activeCategory === "Todos"
      ? SAMPLE_EVENTS
      : SAMPLE_EVENTS.filter((ev) =>
          ev.category.toLowerCase().includes(activeCategory.toLowerCase())
        );

  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-950 text-slate-100">
      {/* Header — largura total */}

      <main className="flex w-full flex-1 flex-col">
        {/* Hero — ocupa a altura da tela (menos header aprox.) */}
        <section className="flex w-full flex-1 flex-col justify-center border-b border-slate-800 px-4 py-16 sm:px-6 sm:py-20 lg:min-h-[calc(100dvh-73px)] lg:px-10">
          <div className="mx-auto w-full max-w-[1600px]">
            <p className="text-sm font-bold uppercase tracking-widest text-secondary">
              Eventos ao vivo · ingressos · organização
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl xl:text-7xl">
              Descubra eventos. Publique o seu. Tudo em um só lugar.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-400 sm:text-xl">
              Para quem compra ingresso ou para quem produz: uma experiência
              direta, em tela cheia, com o visual azul e amarelo da marca.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <a
                href="#eventos"
                className="inline-flex items-center justify-center rounded-xl bg-primary px-8 py-4 text-base font-bold text-white shadow-lg shadow-primary/35 hover:brightness-110"
              >
                Ver eventos
              </a>
              <Link
                href="/register?perfil=organizador"
                className="inline-flex items-center justify-center rounded-xl border-2 border-secondary bg-secondary/10 px-8 py-4 text-base font-bold text-secondary hover:bg-secondary/20"
              >
                Sou organizador
              </Link>
            </div>
          </div>
        </section>

        {/* Lista de eventos — largura total, fundo levemente diferente */}
        <section
          id="eventos"
          className="w-full border-b border-slate-800 bg-slate-900/50 px-4 py-16 sm:px-6 sm:py-20 lg:px-10"
        >
          <div className="mx-auto w-full max-w-[1600px]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                  Eventos em destaque
                </h2>
                <p className="mt-2 max-w-2xl text-slate-400">
                  Exemplos de cards — depois você liga na API com os dados
                  reais.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {["Todos", "Show", "Palestra", "Online"].map((cat) => {
                  const isActive = activeCategory === cat;

                  return (
                    <span
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={
                        isActive
                          ? "rounded-full bg-primary/20 px-4 py-2 text-xs font-bold text-primary cursor-pointer"
                          : "rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
                      }
                    >
                      {cat}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {filteredEvents.map((ev) => (
                <article
                  key={ev.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-xl transition hover:border-primary/40 hover:shadow-primary/10"
                >
                  <div className="relative aspect-[16/10] w-full bg-gradient-to-br from-primary/40 via-slate-900 to-secondary/20">
                    <span className="absolute left-4 top-4 rounded-md bg-black/60 px-2 py-1 text-xs font-bold uppercase tracking-wide text-secondary">
                      {ev.category}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="text-lg font-bold text-white">{ev.title}</h3>
                    <p className="mt-2 text-sm text-slate-400">
                      {ev.date} · {ev.city}
                    </p>
                    <p className="mt-4 text-base font-black text-secondary">
                      {ev.price}
                    </p>
                    <Link
                      href="/register"
                      className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-primary/15 py-3 text-sm font-bold text-primary ring-1 ring-primary/40 hover:bg-primary/25"
                    >
                      Quero participar
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Categorias */}
        <section
          id="categorias"
          className="w-full px-4 py-16 sm:px-6 sm:py-20 lg:px-10"
        >
          <div className="mx-auto w-full max-w-[1600px]">
            <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              Categorias
            </h2>
            <p className="mt-2 max-w-2xl text-slate-400">
              Atalhos para explorar — cada um leva ao cadastro por enquanto.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {CATEGORIES.map((name) => (
                <Link
                  key={name}
                  href="/register"
                  className="rounded-full border border-slate-700 bg-slate-900 px-5 py-2.5 text-sm font-bold text-slate-200 hover:border-secondary/50 hover:text-secondary"
                >
                  {name}
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer — largura total */}
      <footer
        id="ajuda"
        className="w-full border-t border-slate-800 bg-slate-950 px-4 py-12 sm:px-6 lg:px-10"
      >
        <div className="mx-auto grid w-full max-w-[1600px] gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Event Creator
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Plataforma para descobrir eventos e publicar os seus, com foco em
              participantes e organizadores.
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Plataforma
            </p>
            <ul className="mt-3 space-y-2 text-sm text-slate-400">
              <li>
                <a href="#eventos" className="hover:text-secondary">
                  Eventos
                </a>
              </li>
              <li>
                <a href="#categorias" className="hover:text-secondary">
                  Categorias
                </a>
              </li>
              <li>
                <Link href="/login" className="hover:text-secondary">
                  Minha conta
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Organizadores
            </p>
            <ul className="mt-3 space-y-2 text-sm text-slate-400">
              <li>
                <Link
                  href="/register?perfil=organizador"
                  className="hover:text-secondary"
                >
                  Criar evento
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-secondary">
                  Cadastro
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Contato
            </p>
            <p className="mt-3 text-sm text-slate-400">
              <a
                href="mailto:contato@eventcreator.com"
                className="hover:text-secondary"
              >
                contato@eventcreator.com
              </a>
            </p>
            <p className="mt-2 text-sm text-slate-500">Seg–Sex, 9h–18h</p>
          </div>
        </div>
        <div className="mx-auto mt-10 flex w-full max-w-[1600px] flex-col items-center justify-between gap-4 border-t border-slate-800 pt-8 text-xs text-slate-500 sm:flex-row">
          <span>
            © {new Date().getFullYear()} Event Creator. Todos os direitos
            reservados.
          </span>
          <div className="flex gap-6">
            <a href="#" className="hover:text-slate-300">
              Privacidade
            </a>
            <a href="#" className="hover:text-slate-300">
              Termos
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

