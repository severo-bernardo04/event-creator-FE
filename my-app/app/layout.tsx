"use client";

import { usePathname } from "next/navigation";
import Footer from "./components/Footer";
import Header from "./components/Header";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/register";

  return (
    <html lang="pt-BR" className={cn("font-sans", geist.variable)}>
      <body className="bg-slate-950 antialiased">
        <div className="flex min-h-screen flex-col">
          
          {!isAuthPage && <Header />}

          <main className="flex-1">
            <div className={cn(
              "w-full",
              !isAuthPage && "max-w-5xl mx-auto px-4"
            )}>
              {children}
            </div>
          </main>

          {!isAuthPage && <Footer />}

        </div>
      </body>
    </html>
  );
}