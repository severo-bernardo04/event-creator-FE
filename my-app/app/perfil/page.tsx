"use client";

import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { useState } from "react";

export default function PerfilPage() {
    const { user, isAdmin } = useAuth();

    const [avatarPreview, setAvatarPreview] = useState<string | null>(() => {
        if (typeof window === "undefined") return null;
        return localStorage.getItem("avatar_preview");
    });

    const [avatarError, setAvatarError] = useState<string | null>(null);

    function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setAvatarError(null);

        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
            setAvatarError("Use JPG, PNG ou WebP.");
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            setAvatarError("Imagem deve ter no máximo 2MB.");
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            setAvatarPreview(result);
            localStorage.setItem("avatar_preview", result);
            // TODO: enviar para POST /users/me/avatar quando endpoint existir
        };
        reader.readAsDataURL(file);
    }

    if (!user) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-950">
                <p className="text-slate-400">
                    Você precisa estar logado para ver seu perfil.{" "}
                    <Link href="/login" className="text-secondary underline">
                        Entrar
                    </Link>
                </p>
            </div>
        );
    }

    const initial = user.name.charAt(0).toUpperCase();

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            <div className="border-b border-slate-800 bg-slate-900/40">
                <div className="mx-auto max-w-[1600px] px-4 py-10 sm:px-6 lg:px-10">
                    <p className="text-sm font-bold uppercase tracking-widest text-secondary">
                        Conta
                    </p>
                    <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
                        Meu Perfil
                    </h1>
                </div>
            </div>

            <div className="mx-auto max-w-[1600px] px-4 py-12 sm:px-6 lg:px-10">
                <div className="mx-auto max-w-2xl space-y-8">

                    {/* Avatar */}
                    <div className="flex items-center gap-6">
                        <div className="relative">
                            {avatarPreview ? (
                                <img
                                    src={avatarPreview}
                                    alt="Foto de perfil"
                                    className="h-24 w-24 rounded-2xl object-cover ring-2 ring-primary/30"
                                />
                            ) : (
                                <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-primary/20 text-4xl font-black text-primary ring-2 ring-primary/30">
                                    {initial}
                                </div>
                            )}
                        </div>
                        <div>
                            <p className="text-xl font-bold text-white">{user.name}</p>
                            <p className="text-sm text-slate-400">{user.email}</p>
                            <span className={`mt-2 inline-flex rounded-full px-3 py-0.5 text-xs font-bold ring-1 ring-inset ${
                                isAdmin
                                    ? "bg-amber-500/15 text-amber-300 ring-amber-500/25"
                                    : "bg-slate-500/15 text-slate-300 ring-slate-500/20"
                            }`}>
                {isAdmin ? "Organizador" : "Participante"}
              </span>
                            <div className="mt-3">
                                <label className="cursor-pointer text-xs font-semibold text-secondary hover:text-yellow-300">
                                    Alterar foto
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        className="hidden"
                                        onChange={handleAvatarChange}
                                    />
                                </label>
                                {avatarError && (
                                    <p className="mt-1 text-xs font-semibold text-red-300">{avatarError}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Dados da conta */}
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                            Dados da conta
                        </p>
                        {/* TODO: substituir "—" pelos dados reais quando GET /users/me
                retornar o UserResponseDTO completo */}
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <Field label="Nome completo" value={user.name} />
                            <Field label="E-mail" value={user.email} />
                            <Field label="Telefone" value="—" />
                            <Field label="CPF" value="—" />
                            <Field label="Endereço" value="—" />
                            <Field label="Data de nascimento" value="—" />
                        </div>
                    </div>

                    {/* Ações */}
                    <div className="flex flex-wrap gap-3">
                        <Link
                            href="/eventos"
                            className="rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
                        >
                            Ver eventos
                        </Link>
                        {isAdmin && (
                            <Link
                                href="/admin"
                                className="rounded-xl border border-primary/40 bg-primary/10 px-4 py-2.5 text-sm font-bold text-primary hover:bg-primary/20"
                            >
                                Meu painel
                            </Link>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}

function Field({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {label}
            </p>
            <p className="mt-1 text-sm text-white">{value}</p>
        </div>
    );
}