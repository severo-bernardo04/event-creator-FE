"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/context/AuthContext";

import { apiFetch } from "@/lib/api";

import {
    addEventHistory,
    type EventHistoryFieldChange,
} from "@/lib/eventHistory";

import { getErrorMessage } from "@/lib/errors";

import {
    coerceTime,
    normalizeEventRecord,
} from "@/lib/eventsFromApi";

import { CATEGORIES } from "@/lib/categoryMocks";

const inputClass =
    "w-full rounded-[10px] border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-primary focus:ring-2 focus:ring-primary/20";

type EventForm = {
    id: string;
    titulo: string;
    desc: string;
    data: string;
    hora: string;
    local: string;
    max: string;
    category?: string;
    private?: boolean;
};

export default function EditarEventoPage() {

    const params =
        useParams<{ id: string }>();

    const router =
        useRouter();

    const { user } =
        useAuth();

    const eventId =
        useMemo(
            () => Number(params?.id),
            [params]
        );

    const [loading, setLoading] =
        useState(true);

    const [submitting, setSubmitting] =
        useState(false);

    const [loadError, setLoadError] =
        useState<string | null>(null);

    const [formError, setFormError] =
        useState<string | null>(null);

    const [image, setImage] =
        useState<File | null>(null);

    const [form, setForm] =
        useState<EventForm>({
            id: "",
            titulo: "",
            desc: "",
            data: "",
            hora: "",
            local: "",
            max: "",
            category: "",
            private: false,
        });

    const [initialForm, setInitialForm] =
        useState<EventForm | null>(null);

    useEffect(() => {

        if (!Number.isFinite(eventId)) {

            setLoadError(
                "ID inválido."
            );

            setLoading(false);

            return;
        }

        let cancelled = false;

        (async () => {

            try {

                const data =
                    await apiFetch<unknown>(
                        `/events/${eventId}`,
                        {
                            method: "GET",
                        }
                    );

                const event =
                    normalizeEventRecord(
                        data as Record<string, unknown>
                    );

                if (!event) {

                    throw new Error(
                        "Não foi possível carregar o evento."
                    );
                }

                if (cancelled) return;

                const eventRecord =
                    event as Record<string, unknown>;

                const loadedForm: EventForm = {
                    id: String(event.id),
                    titulo: event.title,
                    desc: event.description ?? "",
                    data: event.date,
                    hora: (event.time ?? "").slice(0, 5),
                    local: event.location ?? "",
                    max: String(event.maxParticipants),

                    category:
                        typeof eventRecord.category === "string"
                            ? eventRecord.category
                            : "",

                    private: Boolean(
                        eventRecord.private
                    ),
                };

                setForm(loadedForm);

                setInitialForm(
                    loadedForm
                );

            } catch (err: unknown) {

                if (cancelled) return;

                setLoadError(
                    getErrorMessage(err)
                );

            } finally {

                if (!cancelled) {
                    setLoading(false);
                }
            }

        })();

        return () => {
            cancelled = true;
        };

    }, [eventId]);

    async function salvarEvento() {

        const titulo =
            form.titulo.trim();

        const desc =
            form.desc.trim();

        const data =
            form.data;

        const hora =
            form.hora;

        const local =
            form.local.trim();

        const max =
            parseInt(form.max, 10);

        if (titulo.length < 3) {

            setFormError(
                "Título deve ter no mínimo 3 caracteres."
            );

            return;
        }

        if (!data || !hora || !local) {

            setFormError(
                "Preencha todos os campos obrigatórios."
            );

            return;
        }

        if (desc.length > 500) {

            setFormError(
                "Descrição deve ter no máximo 500 caracteres."
            );

            return;
        }

        const today =
            new Date();

        const todayIso =
            `${today.getFullYear()}-${String(
                today.getMonth() + 1
            ).padStart(2, "0")}-${String(
                today.getDate()
            ).padStart(2, "0")}`;

        if (data < todayIso) {

            setFormError(
                "A data do evento não pode estar no passado."
            );

            return;
        }

        if (
            !Number.isFinite(max) ||
            max < 1
        ) {

            setFormError(
                "Número máximo inválido."
            );

            return;
        }

        const timeForApi =
            coerceTime(hora);

        if (!timeForApi) {

            setFormError(
                "Horário inválido."
            );

            return;
        }

        if (
            !form.category ||
            !form.category.trim()
        ) {

            setFormError(
                "Selecione uma categoria."
            );

            return;
        }

        setSubmitting(true);

        setFormError(null);

        try {

            const changes:
                EventHistoryFieldChange[] = [];

            const original =
                initialForm;

            if (original) {

                const fields: Array<{
                    key: keyof EventForm;
                    label: string;
                }> = [
                    { key: "titulo", label: "Título" },
                    { key: "desc", label: "Descrição" },
                    { key: "data", label: "Data" },
                    { key: "hora", label: "Horário" },
                    { key: "local", label: "Local" },
                    {
                        key: "max",
                        label: "Máx. participantes",
                    },
                    {
                        key: "category",
                        label: "Categoria",
                    },
                ];

                for (const {
                    key,
                    label,
                } of fields) {

                    const from =
                        String(
                            original[key] ?? ""
                        );

                    const to =
                        String(
                            form[key] ?? ""
                        );

                    if (from !== to) {

                        changes.push({
                            field: label,
                            from,
                            to,
                        });
                    }
                }
            }

            // ====================================
            // FORM DATA
            // ====================================

            const formData =
                new FormData();

            formData.append(
                "title",
                titulo
            );

            formData.append(
                "description",
                desc || ""
            );

            formData.append(
                "date",
                data
            );

            formData.append(
                "time",
                timeForApi
            );

            formData.append(
                "location",
                local
            );

            formData.append(
                "maxParticipants",
                String(max)
            );

            formData.append(
                "majority18",
                "false"
            );

            formData.append(
                "category",
                form.category || ""
            );

            formData.append(
                "private",
                String(Boolean(form.private))
            );

            if (image) {

                formData.append(
                    "image",
                    image
                );
            }

            const token =
                localStorage.getItem(
                    "token"
                );

            const response =
                await fetch(
                    `http://localhost:8080/events/${eventId}`,
                    {
                        method: "PUT",

                        headers: token
                            ? {
                                Authorization:
                                    `Bearer ${token}`,
                            }
                            : undefined,

                        body: formData,

                        credentials: "include",
                    }
                );

            if (!response.ok) {

                throw new Error(
                    "Erro ao atualizar evento."
                );
            }

            addEventHistory(
                eventId,
                user
                    ? `${user.name} (${user.email})`
                    : "Administrador",
                changes
            );

            router.push("/admin");

        } catch (err: unknown) {

            setFormError(
                getErrorMessage(err)
            );

        } finally {

            setSubmitting(false);
        }
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">

            <div className="mx-auto w-full max-w-[820px] px-4 py-10 sm:px-6 lg:px-8">

                <div className="mb-8 flex flex-wrap items-center justify-between gap-3">

                    <div>

                        <p className="text-sm font-bold uppercase tracking-widest text-secondary">
                            Painel administrativo
                        </p>

                        <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
                            Editar evento
                        </h1>

                    </div>

                    <div className="flex flex-wrap gap-2">

                        <Link
                            href={`/admin/eventos/${eventId}/historico`}
                            className="rounded-xl border border-primary/40 bg-primary/10 px-4 py-2.5 text-sm font-bold text-primary hover:bg-primary/20"
                        >
                            Ver histórico
                        </Link>

                        <Link
                            href="/admin"
                            className="rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
                        >
                            Voltar
                        </Link>

                    </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/50">

                    {loading ? (

                        <div className="px-6 py-7 text-sm text-slate-400">
                            Carregando...
                        </div>

                    ) : loadError ? (

                        <div className="px-6 py-7">

                            <p className="rounded-[10px] border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-[13px] font-semibold text-red-300">
                                {loadError}
                            </p>

                        </div>

                    ) : (

                        <>
                            <div className="border-b border-slate-800 px-6 py-5">

                                <span className="text-base font-extrabold text-white">
                                    Dados do evento
                                </span>

                            </div>

                            <div className="px-6 py-6">

                                {/* TÍTULO */}
                                <div className="mb-4">

                                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                                        Título *
                                    </label>

                                    <input
                                        type="text"
                                        value={form.titulo}
                                        onChange={(e) =>
                                            setForm((f) => ({
                                                ...f,
                                                titulo: e.target.value,
                                            }))
                                        }
                                        className={inputClass}
                                    />

                                </div>

                                {/* DESCRIÇÃO */}
                                <div className="mb-4">

                                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                                        Descrição
                                    </label>

                                    <textarea
                                        value={form.desc}
                                        onChange={(e) =>
                                            setForm((f) => ({
                                                ...f,
                                                desc: e.target.value,
                                            }))
                                        }
                                        rows={4}
                                        className={`${inputClass} min-h-[80px] resize-y`}
                                    />

                                </div>

                                {/* DATA E HORA */}
                                <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">

                                    <div>

                                        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                                            Data *
                                        </label>

                                        <input
                                            type="date"
                                            value={form.data}
                                            onChange={(e) =>
                                                setForm((f) => ({
                                                    ...f,
                                                    data: e.target.value,
                                                }))
                                            }
                                            className={inputClass}
                                        />

                                    </div>

                                    <div>

                                        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                                            Horário *
                                        </label>

                                        <input
                                            type="time"
                                            value={form.hora}
                                            onChange={(e) =>
                                                setForm((f) => ({
                                                    ...f,
                                                    hora: e.target.value,
                                                }))
                                            }
                                            className={inputClass}
                                        />

                                    </div>

                                </div>

                                {/* LOCAL E PARTICIPANTES */}
                                <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">

                                    <div>

                                        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                                            Local *
                                        </label>

                                        <input
                                            type="text"
                                            value={form.local}
                                            onChange={(e) =>
                                                setForm((f) => ({
                                                    ...f,
                                                    local: e.target.value,
                                                }))
                                            }
                                            className={inputClass}
                                        />

                                    </div>

                                    <div>

                                        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                                            Máx. participantes *
                                        </label>

                                        <input
                                            type="number"
                                            min={1}
                                            value={form.max}
                                            onChange={(e) =>
                                                setForm((f) => ({
                                                    ...f,
                                                    max: e.target.value,
                                                }))
                                            }
                                            className={inputClass}
                                        />

                                    </div>

                                </div>

                                {/* CATEGORIA */}
                                <div className="mb-4">

                                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                                        Categoria *
                                    </label>

                                    <select
                                        value={form.category}
                                        onChange={(e) =>
                                            setForm((f) => ({
                                                ...f,
                                                category: e.target.value,
                                            }))
                                        }
                                        className={inputClass}
                                    >
                                        <option value="">
                                            Selecione
                                        </option>

                                        {CATEGORIES.map((c) => (
                                            <option
                                                key={c}
                                                value={c}
                                            >
                                                {c}
                                            </option>
                                        ))}
                                    </select>

                                </div>

                                {/* PRIVADO */}
                                <div className="mb-4 flex items-center gap-3">

                                    <input
                                        id="event-private"
                                        type="checkbox"
                                        checked={Boolean(form.private)}
                                        onChange={(e) =>
                                            setForm((f) => ({
                                                ...f,
                                                private:
                                                e.target.checked,
                                            }))
                                        }
                                        className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-primary"
                                    />

                                    <label
                                        htmlFor="event-private"
                                        className="text-sm text-slate-300"
                                    >
                                        Evento privado
                                    </label>

                                </div>

                                {/* IMAGEM */}
                                <div className="mb-4">

                                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                                        Imagem do evento
                                    </label>

                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {

                                            const file =
                                                e.target.files?.[0];

                                            if (file) {
                                                setImage(file);
                                            }
                                        }}
                                        className={inputClass}
                                    />

                                </div>

                                {/* ERRO */}
                                {formError ? (

                                    <div className="mt-1 rounded-[10px] border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-[13px] font-semibold text-red-400">
                                        {formError}
                                    </div>

                                ) : null}

                            </div>

                            {/* FOOTER */}
                            <div className="flex justify-end gap-2 border-t border-slate-800 px-6 py-4">

                                <Link
                                    href="/admin"
                                    className="rounded-[10px] border border-slate-600 px-4 py-2 text-[13.5px] text-slate-300 hover:bg-slate-800"
                                >
                                    Cancelar
                                </Link>

                                <button
                                    type="button"
                                    onClick={() =>
                                        void salvarEvento()
                                    }
                                    disabled={submitting}
                                    className="rounded-[10px] border border-primary bg-primary px-4 py-2 text-[13.5px] text-white hover:border-blue-600 hover:bg-blue-600 disabled:opacity-50"
                                >
                                    {submitting
                                        ? "Salvando..."
                                        : "Salvar evento"}
                                </button>

                            </div>

                        </>

                    )}

                </div>

            </div>

        </div>
    );
}