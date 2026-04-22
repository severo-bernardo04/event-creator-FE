"use client";

import { usePathname } from "next/navigation";
import Header from "../Header";

export default function LayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAuth = pathname === "/login" || pathname === "/register";

  return (
    <>
      {!isAuth && <Header />}
      <main className={isAuth ? "" : "flex-1"}>
        {children}
      </main>
    </>
  );
}