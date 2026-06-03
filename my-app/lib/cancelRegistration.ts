import { ApiError, apiFetch } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { normalizeEventList, normalizeEventRecord, type ApiEventNorm } from "@/lib/eventsFromApi";
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
  const raw = await apiFetch<unknown>(`/events/${eventId}`, { method: "GET" });
  const event = normalizeEventFromResponse(raw);

  if (!event) {
    throw new Error("Não foi possível confirmar se a inscrição foi cancelada.");
  }

  const normalizedEmail = authUser?.email.trim().toLowerCase();

  const participant = event.participants.find(
    (currentParticipant) =>
      currentParticipant.id === participantId ||
      (!!normalizedEmail && currentParticipant.email.trim().toLowerCase() === normalizedEmail),
  );

  return isActiveRegistration(participant);
}

export async function cancelRegistration(eventId: number, participantId: number) {
  let lastError: unknown = null;

  const cancelAttempts: Array<() => Promise<void>> = [
    () =>
      apiFetch<void>(`/events/${eventId}/participants/${participantId}`, {
        method: "DELETE",
      }),
    () =>
      apiFetch<void>(`/events/${eventId}/participants/cancel?participantId=${participantId}`, {
        method: "DELETE",
      }),
  ];

  for (const attemptCancel of cancelAttempts) {
    try {
      await attemptCancel();

      if (!(await registrationStillActive(eventId, participantId))) {
        return;
      }
    } catch (err) {
      lastError = err;
      if (!(err instanceof ApiError) || ![403, 404, 405].includes(err.status)) {
        throw err;
      }
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new Error("A API respondeu, mas a inscrição continua ativa no servidor.");
}
