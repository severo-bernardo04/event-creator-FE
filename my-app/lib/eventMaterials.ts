import { apiFetch } from "@/lib/api";
import type { EventMaterial, EventMaterialDTO } from "@/types";

export async function getMaterialsByEventId(eventId: number): Promise<EventMaterial[]> {
    return apiFetch<EventMaterial[]>(`/events/${eventId}/materials`, { method: "GET" });
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
    }

    return apiFetch<EventMaterial>(`/events/${eventId}/materials`, {
        method: "POST",
        body: formData,
    });
}

export async function updateMaterial(eventId: number, materialId: number, material: EventMaterialDTO): Promise<EventMaterial> {
    const formData = new FormData();
    formData.append("title", material.title);
    formData.append("description", material.description);

    if (material.file) {
        formData.append("file", material.file);
    }

    return apiFetch<EventMaterial>(`/events/${eventId}/materials/${materialId}`, {
        method: "PUT",
        body: formData,
    });
}

export async function deleteMaterial(eventId: number, materialId: number): Promise<void> {
    return apiFetch<void>(`/events/${eventId}/materials/${materialId}`, { method: "DELETE" });
}

export async function approveMaterial(eventId: number, materialId: number): Promise<EventMaterial> {
    return apiFetch<EventMaterial>(`/events/${eventId}/materials/${materialId}/approve`, {
        method: "PATCH",
    });
}