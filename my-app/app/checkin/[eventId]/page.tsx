"use client";

import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function CheckinPage() {

    const { user } = useAuth();
    const params = useParams();
    const eventId = params.eventId as string;

    if (!user) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-950">
                <p className="text-slate-400">
                    Você precisa estar logado.{" "}
                    <Link href="/login" className="text-secondary underline">
                        Entrar
                    </Link>
                </p>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-slate-100">
            <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center shadow-2xl">
                <p className="text-xs font-bold uppercase tracking-widest text-secondary">
                    Check-in
                </p>
                <h1 className="mt-2 text-2xl font-black text-white">
                    Seu QR Code
                </h1>
                <p className="mt-1 text-sm text-slate-400">
                    Evento #{eventId}
                </p>

                <div className="mt-8 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-left">
                    <p className="text-sm font-bold text-amber-100">
                        O QR Code é gerado pela organização do evento.
                    </p>
                    <p className="mt-2 text-sm leading-6 text-amber-200/80">
                        Solicite seu QR Code na entrada ou com um administrador. Somente usuários ADMIN podem criar e validar ingressos.
                    </p>
                </div>

                <div className="mt-6 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-left">
                    <p className="text-sm font-bold text-white">{user.name}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                </div>

                <div className="mt-6">
                    <Link
                        href="/eventos"
                        className="rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
                    >
                        Voltar aos eventos
                    </Link>
                </div>
            </div>
        </div>
    );
}
