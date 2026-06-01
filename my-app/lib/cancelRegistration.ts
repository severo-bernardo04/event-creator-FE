import { ApiError, apiFetch } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";

export async function cancelRegistration(eventId: number, participantId: number) {
  let lastError: unknown = null;

  try {
    return await apiFetch<void>(`/events/${eventId}/participants/cancel`, {
      method: "DELETE",
    });
  } catch (err) {
    lastError = err;
    if (!(err instanceof ApiError) || ![403, 404, 405].includes(err.status)) {
      throw err;
    }
  }

  try {
    return await apiFetch<void>(`/events/${eventId}/participants/cancel`, {
      method: "DELETE",      headers: {
        "X-Participant-Id": participantId.toString(),
      },
    });
  } catch (err) {
    lastError = err;
    if (!(err instanceof ApiError) || ![403, 404, 405].includes(err.status)) {
      throw err;
    }
  }

  if (getAuthUser()?.role !== "ADMIN") {
    throw lastError instanceof Error ? lastError : new Error("Erro ao cancelar inscrição.");
  }

  return apiFetch<void>(`/events/${eventId}/participants/${participantId}`, {
    method: "DELETE",
  });
}
