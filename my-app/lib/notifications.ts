import { apiFetch } from "@/lib/api";
import type { EventHistoryFieldChange } from "@/lib/eventHistory";

type NotificationType = "GENERAL" | "SPECIFIC_EVENT";

export type EventNotification = {
  id: number;
  titulo: string;
  conteudo: string;
  type: NotificationType;
  eventId?: number | null;
  createdAt: string;
};

type CreateNotificationInput = {
  titulo: string;
  conteudo: string;
  type: NotificationType;
  eventId?: number | null;
};

export async function listEventNotifications(eventId: number) {
  return apiFetch<EventNotification[]>(`/avisos/evento/${eventId}`, {
    method: "GET",
  });
}

export async function createNotification(input: CreateNotificationInput) {
  return apiFetch<EventNotification>("/avisos", {
    method: "POST",
    json: input,
  });
}

export async function createEventNotification(
  eventId: number,
  titulo: string,
  conteudo: string,
) {
  return createNotification({
    titulo,
    conteudo,
    type: "SPECIFIC_EVENT",
    eventId,
  });
}

export async function updateEventNotification(
  notificationId: number,
  eventId: number,
  titulo: string,
  conteudo: string,
) {
  return apiFetch<EventNotification>(`/avisos/${notificationId}`, {
    method: "PATCH",
    json: {
      titulo,
      conteudo,
      type: "SPECIFIC_EVENT",
      eventId,
    },
  });
}

export async function deleteEventNotification(notificationId: number) {
  return apiFetch<void>(`/avisos/${notificationId}`, {
    method: "DELETE",
  });
}

export async function notifyEventUpdated(
  eventId: number,
  eventTitle: string,
  changes: EventHistoryFieldChange[],
) {
  if (!changes.length) return;

  const changedFields = changes.map((change) => change.field).join(", ");
  await createEventNotification(
    eventId,
    `Atualizacao no evento ${eventTitle}`,
    `O evento ${eventTitle} foi atualizado pelo organizador. Campos alterados: ${changedFields}. Acesse a pagina do evento para conferir os detalhes.`,
  );
}
