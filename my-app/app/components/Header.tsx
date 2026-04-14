"use client";
import { useState } from "react";
import styles from "./Header.module.css";
import { useRouter } from "next/navigation";

const Header = () => {
  const [active, setActive] = useState("eventos");
  const router = useRouter();

  return (
    <header className="w-full border-b">
      <div>
        <ul className="flex gap-4 justify-center py-4">
          <li className={`${styles.HeaderElement} 
                          ${active === "eventos" ? styles.active : ""}`
                          } onClick={() => {setActive("eventos");router.push("/dashboard/events")}}>
            Lista de eventos
          </li>

          <li className={`${styles.HeaderElement}
                          ${active === "inscricoes" ? styles.active : ""}`
                          } onClick={() => {setActive("inscricoes");router.push("/dashboard/inscriptions")}}>
            Minhas inscrições
          </li>
        </ul>
      </div>
    </header>
  );
};

export default Header;