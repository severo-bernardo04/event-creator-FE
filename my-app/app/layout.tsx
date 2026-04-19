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
  return (
    <html lang="pt-BR" className={cn("font-sans", geist.variable)}>
      <body>
        <div className="flex min-h-screen flex-col">
          <Header />
          <main className="flex-1">
            <div className="max-w-5xl mx-auto px-4 w-full">
              {children}
            </div>
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
