// Valida se o usuario pode cancelar uma inscricao em evento.
import { apiFetch } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import {
  normalizeEventList,
  normalizeEventRecord,
  normalizeParticipantList,
  type ApiEventNorm,
} from "@/lib/eventsFromApi";
import { isActiveRegistration } from "@/lib/eventParticipants";

function normalizeEventFromResponse(raw: unknown): ApiEventNorm | null {
  if (!raw || typeof raw !== "object") return null;

  const direct = normalizeEventRecord(raw as Record<string, unknown>);
  if (direct) return direct;

  const list = normalizeEventList(raw);
  if (list.length) return list[0];

  const payload = raw as Record<string, unknown>;
  const nestedCandidates = [
    payload.event,
    payload.data,
    payload.content,
    payload.item,
    payload.result,
    payload.record,
  ];

  for (const candidate of nestedCandidates) {
    const normalized = normalizeEventFromResponse(candidate);
    if (normalized) return normalized;
  }

  return null;
}

async function registrationStillActive(eventId: number, participantId: number) {
  const authUser = getAuthUser();
  const normalizedEmail = authUser?.email.trim().toLowerCase();

  if (normalizedEmail) {
    try {
      const checked = await apiFetch<{ emailInscrito?: boolean }>(
        `/events/${eventId}/participants/check-email?email=${encodeURIComponent(normalizedEmail)}`,
        { method: "GET" },
      );
      if (checked.emailInscrito === false) return false;
      if (checked.emailInscrito === true) return true;
    } catch {
      // Fallback para as listagens abaixo.
    }
  }

  try {
    const participantsRaw = await apiFetch<unknown>(`/events/${eventId}/participants`, {
      method: "GET",
    });
    const participant = normalizeParticipantList(participantsRaw).find(
      (currentParticipant) =>
        currentParticipant.id === participantId ||
        (!!normalizedEmail && currentParticipant.email.trim().toLowerCase() === normalizedEmail),
    );

    return isActiveRegistration(participant);
  } catch {
    // Fallback para GET /events/{id}.
  }

  const raw = await apiFetch<unknown>(`/events/${eventId}`, { method: "GET" });
  const event = normalizeEventFromResponse(raw);

  if (!event) {
    throw new Error("Não foi possível confirmar se a inscrição foi cancelada.");
  }

  const participant = event.participants.find(
    (currentParticipant) =>
      currentParticipant.id === participantId ||
      (!!normalizedEmail && currentParticipant.email.trim().toLowerCase() === normalizedEmail),
  );

  return isActiveRegistration(participant);
}

export async function cancelRegistration(eventId: number, participantId: number) {
  await apiFetch<void>(`/events/${eventId}/participants/cancel`, {
    method: "DELETE",
  });

  if (!(await registrationStillActive(eventId, participantId))) {
    return;
  }

  throw new Error("A API respondeu, mas a inscrição continua ativa no servidor.");
}
