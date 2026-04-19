import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import LayoutShell from "./components/layoutShell/page";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={cn("font-sans", geist.variable)}>
      <body className="flex min-h-screen flex-col">
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}
