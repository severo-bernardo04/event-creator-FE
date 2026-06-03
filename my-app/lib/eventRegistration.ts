import { ApiError, apiFetch } from "@/lib/api";
import type { AuthUser } from "@/types";

export type RegistrationStatusHint = "PENDING" | "APPROVED" | "REJECTED";

export type RegistrationCheck = {
  emailInscrito?: boolean;
  inscrito?: boolean;
  registered?: boolean;
  isRegistered?: boolean;
  exists?: boolean;
  status?: string;
};

const REGISTRATION_CACHE_PREFIX = "event_registration";

function registrationCacheKey(eventId: number | string, email: string) {
  return `${REGISTRATION_CACHE_PREFIX}:${eventId}:${email.trim().toLowerCase()}`;
}

function pickBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "sim", "yes", "1"].includes(normalized)) return true;
    if (["false", "nao", "não", "no", "0"].includes(normalized)) return false;
  }
  return false;
}

export function isAlreadyRegisteredError(err: unknown) {
  if (err instanceof ApiError && err.status === 409) return true;
  const message = err instanceof Error ? err.message.toLowerCase() : "";
  return (
    message.includes("já está inscrito") ||
    message.includes("ja esta inscrito") ||
    message.includes("already registered") ||
    message.includes("duplicate")
  );
}

export function getRegistrationDetailHref(
  eventId: number | string,
  status?: RegistrationStatusHint | null,
) {
  if (!status) return `/eventos/${eventId}`;
  return `/eventos/${eventId}?registered=1&status=${status}`;
}

export function rememberEventRegistration(
  eventId: number | string,
  email: string | undefined | null,
  status?: string | null,
) {
  if (typeof window === "undefined" || !email) return;
  const normalizedStatus: RegistrationStatusHint =
    status === "APPROVED" || status === "REJECTED" || status === "PENDING"
      ? status
      : "PENDING";
  window.localStorage.setItem(registrationCacheKey(eventId, email), normalizedStatus);
}

export function forgetEventRegistration(
  eventId: number | string,
  email: string | undefined | null,
) {
  if (typeof window === "undefined" || !email) return;
  window.localStorage.removeItem(registrationCacheKey(eventId, email));
}

export function getRememberedEventRegistration(
  eventId: number | string,
  email: string | undefined | null,
): RegistrationStatusHint | null {
  if (typeof window === "undefined" || !email) return null;
  const value = window.localStorage.getItem(registrationCacheKey(eventId, email));
  return value === "APPROVED" || value === "REJECTED" || value === "PENDING"
    ? value
    : null;
}

export async function checkEventRegistration(eventId: number | string, email: string) {
  const data = await apiFetch<RegistrationCheck | boolean | string>(
    `/events/${eventId}/participants/check-email?email=${encodeURIComponent(email)}`,
    { method: "GET" },
  );

  if (pickBoolean(data)) return true;
  if (!data || typeof data !== "object") return false;

  return (
    pickBoolean(data.emailInscrito) ||
    pickBoolean(data.inscrito) ||
    pickBoolean(data.registered) ||
    pickBoolean(data.isRegistered) ||
    pickBoolean(data.exists)
  );
}

export async function createEventRegistration(eventId: number | string, user: AuthUser) {
  await apiFetch(`/events/${eventId}/participants?userId=${user.userId}`, {
    method: "POST",
  });
}
