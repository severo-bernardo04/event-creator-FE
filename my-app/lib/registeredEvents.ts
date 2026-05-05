const KEY = "registered-events";

export function getRegisteredEvents(): string[] {
  if (typeof window === "undefined") return [];
  return JSON.parse(localStorage.getItem(KEY) || "[]");
}

export function isEventRegistered(id: string | number) {
  return getRegisteredEvents().includes(String(id));
}

export function toggleEventRegistration(id: string | number) {
  const normalizedId = String(id);

  const current = getRegisteredEvents();

  const exists = current.includes(normalizedId);

  const updated = exists
    ? current.filter((x) => x !== normalizedId)
    : [...current, normalizedId];

  localStorage.setItem(KEY, JSON.stringify(updated));

  return updated;
}