"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { addEventHistory, type EventHistoryFieldChange } from "@/lib/eventHistory";
import { getErrorMessage } from "@/lib/errors";
import { coerceTime, normalizeEventRecord } from "@/lib/eventsFromApi";
import { CATEGORIES } from "@/lib/categoryMocks";
import { notifyEventUpdated } from "@/lib/notifications";

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
    imageUrl?: string | null;
};

export default function EditarEventoPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const { user } = useAuth();
    const eventId = useMemo(() => Number(params?.id), [params]);

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [form, setForm] = useState<EventForm>({
        id: "",
        titulo: "",
        desc: "",
        data: "",
        hora: "",
        local: "",
        max: "",
        category: "",
    });
    const [initialForm, setInitialForm] = useState<EventForm | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageError, setImageError] = useState<string | null>(null);

    useEffect(() => {
        if (!Number.isFinite(eventId)) {
            setLoadError("ID de evento inválido.");
            setLoading(false);
            return;
        }

        let cancelled = false;
        (async () => {
            try {
                const data = await apiFetch<unknown>(`/events/${eventId}`, { method: "GET" });
                const event = normalizeEventRecord(data as Record<string, unknown>);
                if (!event) {
                    throw new Error("Não foi possível ler os dados do evento.");
                }
                if (cancelled) return;
                const loadedForm: EventForm = {
                    id: String(event.id),
                    titulo: event.title,
                    desc: event.description ?? "",
                    data: event.date,
                    hora: (event.time ?? "").slice(0, 5),
                    local: event.location ?? "",
                    max: String(event.maxParticipants),
                    category: event.category ?? "",
                    private: Boolean(event.private),
                    imageUrl: event.imageUrl ?? null,
                };
                setForm(loadedForm);
                setInitialForm(loadedForm);
            } catch (err: unknown) {
                if (cancelled) return;
                setLoadError(getErrorMessage(err));
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [eventId]);

    async function salvarEvento() {
        const titulo = form.titulo.trim();
        const desc = form.desc.trim();
        const data = form.data;
        const hora = form.hora;
        const local = form.local.trim();
        const max = parseInt(form.max, 10);

        if (titulo.length < 3) {
            setFormError("Título deve ter no mínimo 3 caracteres.");
            return;
        }
        if (!data || !hora || !local) {
            setFormError("Preencha todos os campos obrigatórios.");
            return;
        }
        if (desc.length > 500) {
            setFormError("A descrição deve ter no máximo 500 caracteres.");
            return;
        }
        const today = new Date();
        const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        if (data < todayIso) {
            setFormError("A data do evento não pode estar no passado.");
            return;
        }
        if (!Number.isFinite(max) || max < 1) {
            setFormError("Informe um número máximo de participantes válido (mínimo 1).");
            return;
        }
        const timeForApi = coerceTime(hora);
        if (!timeForApi) {
            setFormError("Informe um horário válido.");
            return;
        }
        if (!form.category || !form.category.trim()) {
            setFormError("Selecione uma categoria.");
            return;
        }

        setSubmitting(true);
        setFormError(null);
        try {
            const changes: EventHistoryFieldChange[] = [];
            const original = initialForm;
            if (original) {
                const fields: Array<{ key: keyof EventForm; label: string }> = [
                    { key: "titulo", label: "Título" },
                    { key: "desc", label: "Descrição" },
                    { key: "data", label: "Data" },
                    { key: "hora", label: "Horário" },
                    { key: "local", label: "Local" },
                    { key: "max", label: "Máximo de participantes" },
                    { key: "category", label: "Categoria" },
                    { key: "private", label: "Evento privado" },
                ];
                for (const { key, label } of fields) {
                    const from = String(original[key] ?? "").trim();
                    const to = String(form[key] ?? "").trim();
                    if (from !== to) {
                        changes.push({ field: label, from, to });
                    }
                }
                if (imageFile) {
                    changes.push({
                        field: "Imagem",
                        from: original.imageUrl ? "Imagem atual" : "—",
                        to: imageFile.name,
                    });
                }
            }

            const formData = new FormData();

            formData.append("title", titulo);
            formData.append("description", desc || "");
            formData.append("date", data);
            formData.append("time", timeForApi);
            formData.append("location", local);
            formData.append("maxParticipants", String(max));
            formData.append("majority18", "false");
            formData.append("category", form.category || "");
            formData.append("requiresApproval", String(Boolean(form.private)));
            formData.append("private", String(Boolean(form.private)));

            if (imageFile) {
                formData.append("image", imageFile);
            }

            const updatedRaw = await apiFetch<unknown>(`/events/${eventId}`, {
                method: "PATCH",
                body: formData,
});
            const updatedEvent = normalizeEventRecord(updatedRaw as Record<string, unknown>);
            addEventHistory(
                eventId,
                user ? `${user.name} (${user.email})` : "Administrador",
                changes,
            );
            await notifyEventUpdated(eventId, titulo, changes);
            if (updatedEvent) {
                const updatedForm: EventForm = {
                    id: String(updatedEvent.id),
                    titulo: updatedEvent.title,
                    desc: updatedEvent.description ?? "",
                    data: updatedEvent.date,
                    hora: (updatedEvent.time ?? "").slice(0, 5),
                    local: updatedEvent.location ?? "",
                    max: String(updatedEvent.maxParticipants),
                    category: updatedEvent.category ?? "",
                    private: Boolean(updatedEvent.private),
                    imageUrl: updatedEvent.imageUrl ?? null,
                };
                setInitialForm(updatedForm);
            }
            router.push("/admin");
        } catch (err: unknown) {
            setFormError(getErrorMessage(err));
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
                        <p className="mt-2 text-sm text-slate-400">
                            Atualize os dados do evento usando o mesmo padrão visual do painel.
                        </p>
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
                            Voltar ao admin
                        </Link>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/50">
                    {loading ? (
                        <div className="px-6 py-7 text-sm text-slate-400">Carregando evento...</div>
                    ) : loadError ? (
                        <div className="px-6 py-7">
                            <p className="rounded-[10px] border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-[13px] font-semibold text-red-300">
                                {loadError}
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="border-b border-slate-800 px-6 py-5">
                                <span className="text-base font-extrabold text-white">Dados do evento</span>
                            </div>
                            <div className="px-6 py-6">
                                <input type="hidden" value={form.id} readOnly aria-hidden />
                                <div className="mb-4">
                                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                                        Título *
                                    </label>
                                    <input
                                        type="text"
                                        value={form.titulo}
                                        onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                                        placeholder="Nome do evento"
                                        className={inputClass}
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                                        Descrição
                                        <div className="mb-4">
    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
        Imagem do evento
    </label>

    {imagePreview || form.imageUrl ? (
        <img
            src={imagePreview || form.imageUrl || ""}
            alt="Imagem atual do evento"
            className="mb-3 h-40 w-full rounded-xl object-cover"
        />
    ) : null}

    <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => {
            const file = e.target.files?.[0];
            setImageError(null);

            if (!file) return;

            const allowed = ["image/jpeg", "image/png", "image/webp"];

            if (!allowed.includes(file.type)) {
                setImageError("Formato inválido. Use JPEG, PNG ou WEBP.");
                setImageFile(null);
                setImagePreview(null);
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                setImageError("A imagem deve ter no máximo 5MB.");
                setImageFile(null);
                setImagePreview(null);
                return;
            }

            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }}
        className={inputClass}
    />

    {imageError ? (
        <p className="mt-2 text-xs font-semibold text-red-300">
            {imageError}
        </p>
    ) : null}
</div>
                                    </label>
                                    <textarea
                                        value={form.desc}
                                        onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value }))}
                                        placeholder="Descreva o evento"
                                        rows={4}
                                        className={`${inputClass} min-h-[80px] resize-y`}
                                    />
                                    <p className="mt-1 text-right text-xs text-slate-500">{form.desc.length}/500</p>
                                </div>
                                <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                                            Data *
                                        </label>
                                        <input
                                            type="date"
                                            value={form.data}
                                            onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))}
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
                                            onChange={(e) => setForm((f) => ({ ...f, hora: e.target.value }))}
                                            className={inputClass}
                                        />
                                    </div>
                                </div>
                                <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                                            Local *
                                        </label>
                                        <input
                                            type="text"
                                            value={form.local}
                                            onChange={(e) => setForm((f) => ({ ...f, local: e.target.value }))}
                                            placeholder="Ex: Laboratório 2"
                                            className={inputClass}
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                                            Máx. participantes *
                                        </label>
                                        <input
                                            type="number"
                                            value={form.max}
                                            onChange={(e) => setForm((f) => ({ ...f, max: e.target.value }))}
                                            placeholder="Ex: 40"
                                            min={1}
                                            className={inputClass}
                                        />
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                                        Categoria *
                                    </label>
                                    <select
                                        value={form.category}
                                        onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                                        className={inputClass}
                                    >
                                        <option value="">Selecione</option>
                                        {CATEGORIES.map((c) => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="mb-4 flex items-center gap-3">
                                    <input
                                        id="event-private"
                                        type="checkbox"
                                        checked={Boolean(form.private)}
                                        onChange={(e) => setForm((f) => ({ ...f, private: e.target.checked }))}
                                        className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-primary focus:ring-primary"
                                    />
                                    <label htmlFor="event-private" className="text-sm text-slate-300">Evento privado — participantes precisam de aprovação</label>
                                </div>
                                {formError ? (
                                    <div className="mt-1 rounded-[10px] border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-[13px] font-semibold text-red-400">
                                        {formError}
                                    </div>
                                ) : null}
                            </div>
                            <div className="flex justify-end gap-2 border-t border-slate-800 px-6 py-4">
                                <Link
                                    href="/admin"
                                    className="cursor-pointer rounded-[10px] border border-slate-600 bg-transparent px-4 py-2 text-[13.5px] text-slate-300 hover:bg-slate-800"
                                >
                                    Cancelar
                                </Link>
                                <button
                                    type="button"
                                    onClick={() => void salvarEvento()}
                                    disabled={submitting}
                                    className="cursor-pointer rounded-[10px] border border-primary bg-primary px-4 py-2 text-[13.5px] text-white hover:border-blue-600 hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {submitting ? "Salvando..." : "Salvar evento"}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
