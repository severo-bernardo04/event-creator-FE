"use client";

import { useState } from "react";
import styles from "./Header.module.css";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

const Header = () => {
  const [active, setActive] = useState("eventos");
  const router = useRouter();

  return (
    <header className="w-full border-b">
      <div className="flex items-center justify-between max-w-5xl mx-auto px-4 py-4">
        <Link href="/">
          <Image src="/home.png" alt="Home" width={24} height={24} className="cursor-pointer invert brightness-0" onClick={() => router.push("/dashboard")}/>
        </Link>
        <ul className="flex gap-4 justify-center">
          <li
            className={`${styles.HeaderElement} ${
              active === "eventos" ? styles.active : ""
            }`}
            onClick={() => {
              setActive("eventos");
              router.push("/dashboard/events");
            }}
          >
            Lista de eventos
          </li>

          <li
            className={`${styles.HeaderElement} ${
              active === "inscricoes" ? styles.active : ""
            }`}
            onClick={() => {
              setActive("inscricoes");
              router.push("/dashboard/inscriptions");
            }}
          >
            Minhas inscrições
          </li>
        </ul>
        <div className="w-6" />
      </div>
    </header>
  );
};

export default Header;