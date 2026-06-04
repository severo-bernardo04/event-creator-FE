import { apiFetch } from "@/lib/api";
import type { EventHistoryFieldChange } from "@/lib/eventHistory";

type NotificationType = "GENERAL" | "SPECIFIC_EVENT";

type CreateNotificationInput = {
  titulo: string;
  conteudo: string;
  type: NotificationType;
  eventId?: number | null;
};

export async function createNotification(input: CreateNotificationInput) {
  return apiFetch("/avisos", {
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
