"use client";

import { usePathname } from "next/navigation";
import Header from "../Header";

export default function LayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const hideHeaderRoutes = ["/login", "/register", "/organizer", "/admin"];
  const isAuth = hideHeaderRoutes.includes(pathname);

  return (
    <>
      {!isAuth && <Header />}
      <main className={isAuth ? "" : "flex-1"}>
        {children}
      </main>
    </>
  );
}