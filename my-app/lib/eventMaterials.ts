import { apiFetch } from "@/lib/api";
import type { EventMaterial, EventMaterialDTO } from "@/types";

function asRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function pickString(record: Record<string, unknown>, keys: string[], fallback = "") {
    for (const key of keys) {
        const value = record[key];
        if (typeof value === "string") return value;
    }

    return fallback;
}

function pickNumber(record: Record<string, unknown>, keys: string[], fallback = 0) {
    for (const key of keys) {
        const value = record[key];
        if (typeof value === "number" && Number.isFinite(value)) return value;
        if (typeof value === "string") {
            const parsed = Number(value);
            if (Number.isFinite(parsed)) return parsed;
        }
    }

    return fallback;
}

function pickBoolean(record: Record<string, unknown>, keys: string[], fallback = true) {
    for (const key of keys) {
        const value = record[key];
        if (typeof value === "boolean") return value;
        if (typeof value === "string") {
            const normalized = value.trim().toLowerCase();
            if (["true", "approved", "aprovado"].includes(normalized)) return true;
            if (["false", "pending", "rejected", "pendente", "rejeitado"].includes(normalized)) return false;
        }
    }

    return fallback;
}

function normalizeMaterial(raw: unknown): EventMaterial | null {
    const record = asRecord(raw);
    if (!record) return null;

    const fileType = pickString(record, ["fileType", "type", "mimeType"], "DOCUMENT").toUpperCase();
    const normalizedFileType: EventMaterial["fileType"] =
        fileType === "PDF" || fileType === "IMAGE" || fileType === "DOCUMENT" || fileType === "LINK"
            ? fileType
            : "DOCUMENT";

    const fileUrl = pickString(record, ["fileUrl", "url", "link", "file", "path"]);
    const fileName = pickString(record, ["fileName", "name", "originalName"], normalizedFileType === "LINK" ? fileUrl : "");

    const fileSize = pickNumber(record, ["fileSize", "size"], Number.NaN);

    return {
        id: pickNumber(record, ["id", "materialId"]),
        eventId: pickNumber(record, ["eventId", "event_id"]),
        title: pickString(record, ["title", "titulo", "name"], fileName || "Material"),
        description: pickString(record, ["description", "descricao"]),
        fileUrl,
        fileName,
        fileType: normalizedFileType,
        fileSize: Number.isFinite(fileSize) ? fileSize : undefined,
        uploadedBy: pickString(record, ["uploadedBy", "createdBy", "author"]),
        uploadedAt: pickString(record, ["uploadedAt", "createdAt", "updatedAt"], new Date().toISOString()),
        isApproved: pickBoolean(record, ["isApproved", "approved", "aprovado", "status"], true),
    };
}

function normalizeMaterialList(raw: unknown): EventMaterial[] {
    const direct = Array.isArray(raw) ? raw : null;
    const record = asRecord(raw);
    const nested = record
        ? [record.materials, record.data, record.content, record.items].find(Array.isArray)
        : null;

    return (direct ?? nested ?? [])
        .map(normalizeMaterial)
        .filter((material): material is EventMaterial => Boolean(material));
}

export async function getMaterialsByEventId(eventId: number): Promise<EventMaterial[]> {
    const data = await apiFetch<unknown>(`/events/${eventId}/materials`, { method: "GET" });
    return normalizeMaterialList(data);
}

export async function uploadMaterial(eventId: number, material: EventMaterialDTO): Promise<EventMaterial> {
    const formData = new FormData();
    formData.append("title", material.title);
    formData.append("description", material.description);
    formData.append("fileType", material.fileType);

    if (material.file) {
        formData.append("file", material.file);
    }

    if (material.link) {
        formData.append("link", material.link);
        formData.append("url", material.link);
    }

    const data = await apiFetch<unknown>(`/events/${eventId}/materials`, {
        method: "POST",
        body: formData,
    });
    const normalized = normalizeMaterial(data);

    if (!normalized) {
        const materials = await getMaterialsByEventId(eventId);
        const created = materials.findLast((current) => current.title === material.title) ?? materials.at(-1);

        if (created) return created;

        throw new Error("A API criou o material, mas retornou um formato inválido.");
    }

    return normalized;
}

export async function updateMaterial(eventId: number, materialId: number, material: EventMaterialDTO): Promise<EventMaterial> {
    const formData = new FormData();
    formData.append("title", material.title);
    formData.append("description", material.description);

    if (material.file) {
        formData.append("file", material.file);
    }

    const data = await apiFetch<unknown>(`/events/${eventId}/materials/${materialId}`, {
        method: "PUT",
        body: formData,
    });
    const normalized = normalizeMaterial(data);

    if (!normalized) {
        throw new Error("A API atualizou o material, mas retornou um formato inválido.");
    }

    return normalized;
}

export async function deleteMaterial(eventId: number, materialId: number): Promise<void> {
    return apiFetch<void>(`/events/${eventId}/materials/${materialId}`, { method: "DELETE" });
}

export async function approveMaterial(eventId: number, materialId: number): Promise<EventMaterial> {
    const data = await apiFetch<unknown>(`/events/${eventId}/materials/${materialId}/approve`, {
        method: "PATCH",
    });
    const normalized = normalizeMaterial(data);

    if (!normalized) {
        throw new Error("A API aprovou o material, mas retornou um formato inválido.");
    }

    return normalized;
}
