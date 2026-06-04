import { ApiError, apiFetch } from "@/lib/api";
import type { AuthUser } from "@/types";

export type RegistrationStatusHint = "PENDING" | "APPROVED" | "REJECTED";

export type RegistrationCheck = {
  data?: RegistrationCheck;
  result?: RegistrationCheck;
  registration?: RegistrationCheck;
  participant?: RegistrationCheck;
  emailInscrito?: boolean;
  inscrito?: boolean;
  registered?: boolean;
  isRegistered?: boolean;
  exists?: boolean;
  status?: string;
};

const REGISTRATION_CACHE_PREFIX = "event_registration";
export const EVENT_REGISTRATION_CHANGED = "event-registration-changed";

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

function pickActiveStatus(status: unknown) {
  const normalized = typeof status === "string" ? status.trim().toUpperCase() : "";
  return normalized === "PENDING" || normalized === "APPROVED";
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

export function notifyEventRegistrationChanged(eventId?: number | string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(EVENT_REGISTRATION_CHANGED, {
      detail: eventId == null ? null : { eventId: String(eventId) },
    }),
  );
}

export async function checkEventRegistration(eventId: number | string, email: string) {
  const data = await apiFetch<RegistrationCheck | boolean | string>(
    `/events/${eventId}/participants/check-email?email=${encodeURIComponent(email)}`,
    { method: "GET" },
  );

  if (pickBoolean(data)) return true;
  if (!data || typeof data !== "object") return false;

  const nested =
    data.data ??
    data.result ??
    data.registration ??
    data.participant;

  const directCheck =
    pickBoolean(data.emailInscrito) ||
    pickBoolean(data.inscrito) ||
    pickBoolean(data.registered) ||
    pickBoolean(data.isRegistered) ||
    pickBoolean(data.exists) ||
    pickActiveStatus(data.status);

  if (directCheck) return true;

  if (nested && typeof nested === "object") {
    return (
      pickBoolean(nested.emailInscrito) ||
      pickBoolean(nested.inscrito) ||
      pickBoolean(nested.registered) ||
      pickBoolean(nested.isRegistered) ||
      pickBoolean(nested.exists) ||
      pickActiveStatus(nested.status)
    );
  }

  return false;
}

export async function createEventRegistration(eventId: number | string, user: AuthUser) {
  await apiFetch(`/events/${eventId}/participants?userId=${user.userId}`, {
    method: "POST",
  });
}
