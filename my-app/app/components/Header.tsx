"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useBackToTop } from "../hooks/backToTop";
import { useAuth } from "@/context/AuthContext";

const Header = () => {
  const router = useRouter();
  const scrollToTop = useBackToTop();
  const { user, isAdmin, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  async function handleLogout() {
    await logout();
    setMenuOpen(false);
    router.push("/login");
  }

  const initial = (user?.name || user?.email || "?").charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-950/95 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-10">
        <Link
          href="/"
          onClick={(e) => {
            e.preventDefault();
            scrollToTop();
          }}
          className="flex shrink-0 items-center gap-3 font-extrabold tracking-tight text-white"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-lg font-black text-white shadow-lg shadow-primary/30">
            E
          </span>
          <span className="text-lg sm:text-xl">Event Creator</span>
        </Link>

        <nav
          className="order-3 flex w-full flex-wrap items-center justify-center gap-1 text-sm font-semibold text-slate-300 md:order-none md:w-auto md:justify-end lg:gap-2"
          aria-label="Principal"
        >
          <Link
            href="/eventos"
            className="rounded-lg px-3 py-2 hover:bg-slate-800 hover:text-white"
          >
            Eventos
          </Link>
          <Link href="/#categorias" className="rounded-lg px-3 py-2 hover:bg-slate-800 hover:text-white">
            Categorias
          </Link>
          <Link
              href="/myevents"
              role="menuitem"
              className="block px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800"
              onClick={() => setMenuOpen(false)}
          >
            Meus eventos
          </Link>
          {isAdmin ? (
            <Link href="/admin" className="rounded-lg px-3 py-2 text-secondary hover:bg-slate-800">
              Meu painel
            </Link>
          ) : null}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          {!user ? (
            <>
              <Link
                href="/login"
                className="rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-bold text-white hover:border-slate-500 hover:bg-slate-800"
              >
                Entrar
              </Link>
              <Link
                href="/register"
                className="rounded-xl bg-secondary px-4 py-2.5 text-sm font-bold text-slate-900 shadow-md hover:brightness-105"
              >
                Criar conta
              </Link>
            </>
          ) : (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-left text-sm font-bold text-white hover:border-slate-500 hover:bg-slate-800"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/25 text-sm font-black text-primary ring-1 ring-primary/30">
                  {initial}
                </span>
                <span className="hidden max-w-[140px] truncate sm:inline">
                  {user.name || user.email}
                </span>
                <svg
                  className={`h-4 w-4 shrink-0 text-slate-400 transition ${menuOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {menuOpen ? (
                <div
                  className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-slate-800 bg-slate-900 py-2 shadow-xl"
                  role="menu"
                >
                  <div className="border-b border-slate-800 px-4 py-3">
                    <p className="truncate text-sm font-bold text-white">
                      {user.name || "Usuário"}
                    </p>
                    <p className="truncate text-xs text-slate-500">{user.email}</p>
                    <p className="mt-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset ${
                          isAdmin
                            ? "bg-amber-500/15 text-amber-300 ring-amber-500/25"
                            : "bg-slate-500/15 text-slate-300 ring-slate-500/20"
                        }`}
                      >
                        {isAdmin ? "Organizador" : "Participante"}
                      </span>
                    </p>
                  </div>
                  <Link
                    href="/eventos"
                    role="menuitem"
                    className="block px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800"
                    onClick={() => setMenuOpen(false)}
                  >
                    Ver eventos
                  </Link>
                  <Link
                      href="/perfil"
                      role="menuitem"
                      className="block px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800"
                      onClick={() => setMenuOpen(false)}
                  >
                    Meu perfil
                  </Link>
                  {isAdmin ? (
                    <Link
                      href="/admin"
                      role="menuitem"
                      className="block px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800"
                      onClick={() => setMenuOpen(false)}
                    >
                      Meu painel
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    role="menuitem"
                    className="w-full px-4 py-2.5 text-left text-sm font-bold text-red-400 hover:bg-slate-800"
                    onClick={() => void handleLogout()}
                  >
                    Sair
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
