"use client";

// Tela de perfil onde o usuario visualiza e edita seus dados.
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import Link from "next/link";
import { useEffect, useState } from "react";

type ProfileData = {
    userId?: number;
    name: string;
    email: string;
    phone?: string;
    cpf?: string;
    address?: string;
    dataNascimento?: string | null;
    role: string;
};

export default function PerfilPage() {
    const { user, isAdmin, refreshUser } = useAuth();

    const [avatarPreview, setAvatarPreview] = useState<string | null>(() => {
        if (typeof window === "undefined") return null;
        return localStorage.getItem("avatar_preview");
    });

    const [avatarError, setAvatarError] = useState<string | null>(null);
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [form, setForm] = useState({
        name: "",
        phone: "",
        address: "",
        dataNascimento: "",
    });
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [savingProfile, setSavingProfile] = useState(false);
    const [profileError, setProfileError] = useState<string | null>(null);
    const [profileMessage, setProfileMessage] = useState<string | null>(null);
    const [editModalOpen, setEditModalOpen] = useState(false);

    useEffect(() => {
        if (!user) {
            setLoadingProfile(false);
            return;
        }

        let cancelled = false;

        (async () => {
            setLoadingProfile(true);
            setProfileError(null);
            try {
                const data = await apiFetch<ProfileData>("/users/me", { method: "GET" });
                if (cancelled) return;
                setProfile(data);
                setForm({
                    name: data.name ?? "",
                    phone: data.phone ?? "",
                    address: data.address ?? "",
                    dataNascimento: data.dataNascimento ?? "",
                });
            } catch (err: unknown) {
                if (!cancelled) setProfileError(getErrorMessage(err));
            } finally {
                if (!cancelled) setLoadingProfile(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [user]);

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

    async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const name = form.name.trim();
        if (!name) {
            setProfileError("Informe seu nome.");
            return;
        }

        setSavingProfile(true);
        setProfileError(null);
        setProfileMessage(null);
        try {
            const updated = await apiFetch<ProfileData>("/users/me", {
                method: "PATCH",
                json: {
                    name,
                    phone: form.phone.trim(),
                    address: form.address.trim(),
                    dataNascimento: form.dataNascimento || null,
                },
            });
            setProfile(updated);
            setForm({
                name: updated.name ?? "",
                phone: updated.phone ?? "",
                address: updated.address ?? "",
                dataNascimento: updated.dataNascimento ?? "",
            });
            await refreshUser();
            setProfileMessage("Perfil atualizado com sucesso.");
            setEditModalOpen(false);
        } catch (err: unknown) {
            setProfileError(getErrorMessage(err));
        } finally {
            setSavingProfile(false);
        }
    }

    function openEditModal() {
        setProfileError(null);
        setProfileMessage(null);
        setForm({
            name: profile?.name ?? user?.name ?? "",
            phone: profile?.phone ?? "",
            address: profile?.address ?? "",
            dataNascimento: profile?.dataNascimento ?? "",
        });
        setEditModalOpen(true);
    }

    function closeEditModal() {
        if (savingProfile) return;
        setEditModalOpen(false);
        setProfileError(null);
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

    const displayName = profile?.name || user.name;
    const initial = displayName.charAt(0).toUpperCase();

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
                            <p className="text-xl font-bold text-white">{displayName}</p>
                            <p className="text-sm text-slate-400">{profile?.email ?? user.email}</p>
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
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                                    Dados da conta
                                </p>
                                <h2 className="mt-1 text-xl font-black text-white">Informações pessoais</h2>
                            </div>
                            {loadingProfile ? (
                                <span className="rounded-full border border-slate-700 px-3 py-1 text-xs font-bold text-slate-400">
                                    Carregando...
                                </span>
                            ) : (
                                <button
                                    type="button"
                                    onClick={openEditModal}
                                    className="rounded-xl border border-secondary/40 bg-secondary/10 px-4 py-2.5 text-sm font-bold text-secondary hover:bg-secondary/20"
                                >
                                    Editar informações
                                </button>
                            )}
                        </div>

                        {profileError ? (
                            <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-300">
                                {profileError}
                            </p>
                        ) : null}
                        {profileMessage ? (
                            <p className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-200">
                                {profileMessage}
                            </p>
                        ) : null}

                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                            <Field label="Nome completo" value={profile?.name ?? user.name} />
                            <Field label="E-mail" value={profile?.email ?? user.email} />
                            <Field label="Telefone" value={profile?.phone || "—"} />
                            <Field label="CPF" value={profile?.cpf || user.cpf || "—"} />
                            <Field label="Endereço" value={profile?.address || "—"} />
                            <Field label="Data de nascimento" value={profile?.dataNascimento || "—"} />
                        </div>
                    </div>

                    {editModalOpen ? (
                        <div
                            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4"
                            role="presentation"
                            onClick={closeEditModal}
                        >
                            <form
                                onSubmit={saveProfile}
                                className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
                                role="dialog"
                                aria-modal="true"
                                aria-labelledby="perfil-editar-titulo"
                                onClick={(event) => event.stopPropagation()}
                            >
                                <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-widest text-secondary">
                                            Perfil
                                        </p>
                                        <h2 id="perfil-editar-titulo" className="mt-1 text-xl font-black text-white">
                                            Editar informações
                                        </h2>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={closeEditModal}
                                        disabled={savingProfile}
                                        className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm font-bold text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        Fechar
                                    </button>
                                </div>

                                {profileError ? (
                                    <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-300">
                                        {profileError}
                                    </p>
                                ) : null}

                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="block">
                                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Nome completo
                                    </span>
                                    <input
                                        value={form.name}
                                        onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                                        disabled={loadingProfile || savingProfile}
                                        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                                        placeholder="Seu nome"
                                    />
                                </label>
                                <Field label="E-mail" value={profile?.email ?? user.email} />
                                <label className="block">
                                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Telefone
                                    </span>
                                    <input
                                        value={form.phone}
                                        onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                                        disabled={loadingProfile || savingProfile}
                                        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                                        placeholder="(00) 00000-0000"
                                    />
                                </label>
                                <Field label="CPF" value={profile?.cpf || user.cpf || "—"} />
                                <label className="block sm:col-span-2">
                                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Endereço
                                    </span>
                                    <input
                                        value={form.address}
                                        onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
                                        disabled={loadingProfile || savingProfile}
                                        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                                        placeholder="Rua, número, bairro, cidade"
                                    />
                                </label>
                                <label className="block">
                                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Data de nascimento
                                    </span>
                                    <input
                                        type="date"
                                        value={form.dataNascimento}
                                        onChange={(event) => setForm((current) => ({ ...current, dataNascimento: event.target.value }))}
                                        disabled={loadingProfile || savingProfile}
                                        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                                    />
                                </label>
                            </div>
                                <div className="mt-6 flex justify-end gap-2 sm:col-span-2">
                                    <button
                                        type="button"
                                        onClick={closeEditModal}
                                        disabled={savingProfile}
                                        className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-bold text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loadingProfile || savingProfile}
                                        className="rounded-xl bg-secondary px-4 py-2.5 text-sm font-black text-slate-950 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {savingProfile ? "Salvando..." : "Salvar alterações"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : null}

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
