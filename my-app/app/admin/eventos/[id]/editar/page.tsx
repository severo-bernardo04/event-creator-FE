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
    majority18?: boolean;
    imageUrl?: string | null;
    speakers: SpeakerForm[];
};

type SpeakerForm = {
    id?: number;
    name: string;
    bio: string;
    topics: string;
    agenda: string;
};

const emptySpeakerForm: SpeakerForm = {
    name: "",
    bio: "",
    topics: "",
    agenda: "",
};

function serializeSpeakers(speakers: SpeakerForm[]) {
    return speakers
        .map((speaker) => ({
            id: speaker.id,
            name: speaker.name.trim(),
            bio: speaker.bio.trim(),
            topics: speaker.topics
                .split(/[,;\n]/)
                .map((topic) => topic.trim())
                .filter(Boolean),
            agenda: speaker.agenda.trim(),
        }))
        .filter((speaker) => speaker.name);
}

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
        majority18: false,
        speakers: [emptySpeakerForm],
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
                    majority18: Boolean(event.majority18),
                    imageUrl: event.imageUrl ?? null,
                    speakers: event.speakers.length
                        ? event.speakers.map((speaker) => ({
                            id: speaker.id,
                            name: speaker.name,
                            bio: speaker.bio ?? "",
                            topics: speaker.topics.join(", "),
                            agenda: speaker.agenda ?? "",
                        }))
                        : [emptySpeakerForm],
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
        const speakers = serializeSpeakers(form.speakers);
        if (form.speakers.some((speaker) => !speaker.name.trim() && (speaker.bio.trim() || speaker.topics.trim() || speaker.agenda.trim()))) {
            setFormError("Informe o nome do palestrante ou remova os campos preenchidos.");
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
                    { key: "majority18", label: "Evento +18" },
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
            formData.append("majority18", String(Boolean(form.majority18)));
            formData.append("category", form.category || "");
            formData.append("requiresApproval", String(Boolean(form.private)));
            formData.append("private", String(Boolean(form.private)));
            formData.append("speakers", JSON.stringify(speakers));

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
                    majority18: Boolean(updatedEvent.majority18),
                    imageUrl: updatedEvent.imageUrl ?? null,
                    speakers: updatedEvent.speakers.length
                        ? updatedEvent.speakers.map((speaker) => ({
                            id: speaker.id,
                            name: speaker.name,
                            bio: speaker.bio ?? "",
                            topics: speaker.topics.join(", "),
                            agenda: speaker.agenda ?? "",
                        }))
                        : [emptySpeakerForm],
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
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 px-4 py-6 backdrop-blur-md">
                <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/40">
                    <div className="shrink-0 flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-4 sm:px-6">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
                                Painel administrativo
                            </p>
                            <h1 className="mt-1 text-xl font-black text-white">
                                Editar evento
                            </h1>
                            <p className="mt-1 text-sm text-slate-400">
                                Atualize os dados do evento usando o mesmo padrão visual do painel.
                            </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap justify-end gap-2">
                            <Link
                                href={`/admin/eventos/${eventId}/historico`}
                                className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-bold text-primary hover:bg-primary/20"
                            >
                                Histórico
                            </Link>
                            <Link
                                href="/admin"
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-950/60 text-lg leading-none text-slate-400 hover:bg-slate-800 hover:text-white"
                                aria-label="Voltar ao admin"
                            >
                                ×
                            </Link>
                        </div>
                    </div>
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
                            <div className="site-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                                <input type="hidden" value={form.id} readOnly aria-hidden />
                                <div className="rounded-xl border border-slate-800 bg-slate-950/35 p-4">
                                    <div className="mb-4">
                                        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                                            Dados do evento
                                        </p>
                                        <p className="mt-1 text-sm text-slate-400">
                                            Informações principais exibidas para os participantes.
                                        </p>
                                    </div>
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
                                        </label>
                                        <textarea
                                            value={form.desc}
                                            onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value }))}
                                            placeholder="Descreva o evento"
                                            rows={4}
                                            className={`${inputClass} min-h-[96px] resize-y`}
                                        />
                                        <p className="mt-1 text-right text-xs text-slate-500">{form.desc.length}/500</p>
                                    </div>
                                    <div className="mb-4">
                                        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                                            Imagem do evento
                                        </label>

                                        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
                                            {imagePreview || form.imageUrl ? (
                                                <img
                                                    src={imagePreview || form.imageUrl || ""}
                                                    alt=""
                                                    className="h-40 w-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-40 w-full items-center justify-center px-4 text-center text-sm font-semibold text-slate-500">
                                                    Nenhuma imagem cadastrada
                                                </div>
                                            )}
                                            <div className="flex flex-col gap-2 border-t border-slate-800 p-3 sm:flex-row sm:items-center sm:justify-between">
                                                <span className="min-w-0 truncate text-sm text-slate-400">
                                                    {imageFile?.name ?? "Nenhum arquivo escolhido"}
                                                </span>
                                                <label
                                                    htmlFor="event-image"
                                                    className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white"
                                                >
                                                    Escolher imagem
                                                </label>
                                                <input
                                                    id="event-image"
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
                                                    className="fixed left-[-9999px] top-0 h-px w-px opacity-0"
                                                />
                                            </div>
                                        </div>

                                        {imageError ? (
                                            <p className="mt-2 text-xs font-semibold text-red-300">
                                                {imageError}
                                            </p>
                                        ) : null}
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

                                    <div className="grid gap-3 md:grid-cols-2">
                                        <label className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                                            <input
                                                id="event-private"
                                                type="checkbox"
                                                checked={Boolean(form.private)}
                                                onChange={(e) => setForm((f) => ({ ...f, private: e.target.checked }))}
                                                className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-800 text-primary focus:ring-primary"
                                            />
                                            <span className="text-sm text-slate-300">Evento privado — participantes precisam de aprovação</span>
                                        </label>

                                        <label className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                                            <input
                                                id="event-majority18"
                                                type="checkbox"
                                                checked={Boolean(form.majority18)}
                                                onChange={(e) => setForm((f) => ({ ...f, majority18: e.target.checked }))}
                                                className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-800 text-primary focus:ring-primary"
                                            />
                                            <span className="text-sm text-slate-300">
                                                Evento +18 — bloquear inscrição de contas menores de idade
                                            </span>
                                        </label>
                                    </div>
                                </div>
                                <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/35 p-4">
                                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                                                Palestrantes
                                            </p>
                                            <p className="mt-1 text-sm text-slate-400">
                                                Atualize nome, temas, bio e agenda de cada palestrante.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setForm((f) => ({ ...f, speakers: [...f.speakers, { ...emptySpeakerForm }] }))}
                                            className="inline-flex w-full items-center justify-center rounded-lg border border-secondary/30 bg-secondary/10 px-3 py-2 text-xs font-bold text-secondary hover:bg-secondary/20 sm:w-auto"
                                        >
                                            Adicionar
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {form.speakers.map((speaker, index) => (
                                            <div key={index} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                                                <div className="mb-3 flex items-center justify-between gap-3">
                                                    <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs font-bold text-slate-300">
                                                        Palestrante {index + 1}
                                                    </span>
                                                    {form.speakers.length > 1 ? (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setForm((f) => ({
                                                                    ...f,
                                                                    speakers: f.speakers.filter((_, currentIndex) => currentIndex !== index),
                                                                }))
                                                            }
                                                            className="rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs font-bold text-red-300 hover:bg-red-500/20"
                                                        >
                                                            Remover
                                                        </button>
                                                    ) : null}
                                                </div>
                                                <div className="grid gap-3 md:grid-cols-2">
                                                    <div>
                                                        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                                                            Nome
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={speaker.name}
                                                            onChange={(e) =>
                                                                setForm((f) => ({
                                                                    ...f,
                                                                    speakers: f.speakers.map((item, currentIndex) =>
                                                                        currentIndex === index ? { ...item, name: e.target.value } : item,
                                                                    ),
                                                                }))
                                                            }
                                                            placeholder="Nome do palestrante"
                                                            className={inputClass}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                                                            Temas
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={speaker.topics}
                                                            onChange={(e) =>
                                                                setForm((f) => ({
                                                                    ...f,
                                                                    speakers: f.speakers.map((item, currentIndex) =>
                                                                        currentIndex === index ? { ...item, topics: e.target.value } : item,
                                                                    ),
                                                                }))
                                                            }
                                                            placeholder="Temas apresentados"
                                                            className={inputClass}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                                                            Mini biografia
                                                        </label>
                                                        <textarea
                                                            value={speaker.bio}
                                                            onChange={(e) =>
                                                                setForm((f) => ({
                                                                    ...f,
                                                                    speakers: f.speakers.map((item, currentIndex) =>
                                                                        currentIndex === index ? { ...item, bio: e.target.value } : item,
                                                                    ),
                                                                }))
                                                            }
                                                            placeholder="Mini biografia"
                                                            rows={3}
                                                            className={`${inputClass} resize-y`}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                                                            Agenda individual
                                                        </label>
                                                        <textarea
                                                            value={speaker.agenda}
                                                            onChange={(e) =>
                                                                setForm((f) => ({
                                                                    ...f,
                                                                    speakers: f.speakers.map((item, currentIndex) =>
                                                                        currentIndex === index ? { ...item, agenda: e.target.value } : item,
                                                                    ),
                                                                }))
                                                            }
                                                            placeholder="Agenda individual"
                                                            rows={3}
                                                            className={`${inputClass} resize-y`}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {formError ? (
                                    <div className="mt-1 rounded-[10px] border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-[13px] font-semibold text-red-400">
                                        {formError}
                                    </div>
                                ) : null}
                            </div>
                            <div className="shrink-0 flex flex-col-reverse gap-2 border-t border-slate-800 bg-slate-900 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                                <Link
                                    href="/admin"
                                    className="cursor-pointer rounded-[10px] border border-slate-600 bg-transparent px-4 py-2.5 text-center text-[13.5px] font-semibold text-slate-300 hover:bg-slate-800"
                                >
                                    Cancelar
                                </Link>
                                <button
                                    type="button"
                                    onClick={() => void salvarEvento()}
                                    disabled={submitting}
                                    className="cursor-pointer rounded-[10px] border border-primary bg-primary px-4 py-2.5 text-[13.5px] font-semibold text-white hover:border-blue-600 hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
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
