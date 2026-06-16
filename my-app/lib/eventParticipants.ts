// Auxilia na busca e comparacao de participantes por e-mail.
import type { ApiEventNorm, ApiParticipantNorm } from "@/lib/eventsFromApi";

type ParticipantStatusNorm = "PENDING" | "APPROVED" | "REJECTED";

export function getParticipantForEmail(
  event: ApiEventNorm,
  email?: string | null,
): ApiParticipantNorm | null {
  if (!email) return null;
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;

  return (
    event.participants.find(
      (participant) => participant.email.trim().toLowerCase() === normalizedEmail,
    ) ?? null
  );
}

export function getParticipantStatus(
  participant?: ApiParticipantNorm | null,
): ParticipantStatusNorm | null {
  if (!participant) return null;
  return (participant.status as ParticipantStatusNorm | undefined) ?? "APPROVED";
}

export function isActiveRegistration(participant?: ApiParticipantNorm | null) {
  const status = getParticipantStatus(participant);
  return status === "APPROVED" || status === "PENDING";
}

export function isApprovedRegistration(participant?: ApiParticipantNorm | null) {
  return getParticipantStatus(participant) === "APPROVED";
}

export function isPendingRegistration(participant?: ApiParticipantNorm | null) {
  return getParticipantStatus(participant) === "PENDING";
}

export function canViewPrivateEventInfo(
  event: ApiEventNorm,
  participant?: ApiParticipantNorm | null,
) {
  return !event.private || isApprovedRegistration(participant);
}

export function participantStatusLabel(participant?: ApiParticipantNorm | null) {
  const status = getParticipantStatus(participant);
  if (status === "PENDING") return "Inscrição pendente";
  if (status === "APPROVED") return "Inscrição confirmada";
  if (status === "REJECTED") return "Inscrição não aprovada";
  return "Não inscrito";
}
