"use client";

import { useState } from "react";
import styles from "./Header.module.css";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useBackToTop } from "../hooks/backToTop";

const Header = () => {
  const [active, setActive] = useState("eventos");
  const router = useRouter();

  const scrollToTop = useBackToTop();

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
            <a
              href="#eventos"
              className="rounded-lg px-3 py-2 hover:bg-slate-800 hover:text-white"
            >
              Eventos
            </a>
            <a
              href="#categorias"
              className="rounded-lg px-3 py-2 hover:bg-slate-800 hover:text-white"
            >
              Categorias
            </a>
            <Link
              href="/organizer"
              className="rounded-lg px-3 py-2 text-secondary hover:bg-slate-800"
            >
              Sou organizador
            </Link>
            <a
              href="#ajuda"
              className="rounded-lg px-3 py-2 hover:bg-slate-800 hover:text-white"
            >
              Ajuda
            </a>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
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
          </div>
        </div>
      </header>
  );
};

export default Header;