// Tipos e funcoes relacionados ao historico de alteracoes dos eventos.
export type EventHistoryFieldChange = {
    field: string;
    from: string;
    to: string;
};

export type EventHistoryItem = {
    id: string;
    eventId: number;
    changedAt: string;
    changedBy: string;
    changes: EventHistoryFieldChange[];
};

export type EventHistoryFieldDefinition<T extends object> = {
    key: keyof T;
    label: string;
    format?: (value: T[keyof T]) => string;
};

const STORAGE_PREFIX = "event-history:";
const MAX_ITEMS_PER_EVENT = 50;

function storageKey(eventId: number) {
    return `${STORAGE_PREFIX}${eventId}`;
}

function readRaw(eventId: number): unknown {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(storageKey(eventId));
    if (!raw) return [];
    try {
        return JSON.parse(raw);
    } catch {
        return [];
    }
}

function isItem(value: unknown): value is EventHistoryItem {
    if (!value || typeof value !== "object") return false;
    const item = value as Record<string, unknown>;
    return (
        typeof item.id === "string" &&
        typeof item.eventId === "number" &&
        typeof item.changedAt === "string" &&
        typeof item.changedBy === "string" &&
        Array.isArray(item.changes)
    );
}

export function getEventHistory(eventId: number): EventHistoryItem[] {
    const raw = readRaw(eventId);
    if (!Array.isArray(raw)) return [];
    return raw
        .filter(isItem)
        .sort((a, b) => Date.parse(b.changedAt) - Date.parse(a.changedAt));
}

export function addEventHistory(
    eventId: number,
    changedBy: string,
    changes: EventHistoryFieldChange[],
) {
    if (typeof window === "undefined") return;
    if (!changes.length) return;

    const current = getEventHistory(eventId);
    const item: EventHistoryItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        eventId,
        changedAt: new Date().toISOString(),
        changedBy: changedBy.trim() || "Usuário desconhecido",
        changes,
    };
    const next = [item, ...current].slice(0, MAX_ITEMS_PER_EVENT);
    window.localStorage.setItem(storageKey(eventId), JSON.stringify(next));
}

function defaultFormat(value: unknown) {
    if (typeof value === "boolean") return value ? "Sim" : "Não";
    if (value == null) return "";
    return String(value);
}

export function buildEventHistoryChanges<T extends object>(
    before: T,
    after: T,
    fields: EventHistoryFieldDefinition<T>[],
): EventHistoryFieldChange[] {
    return fields.flatMap((field) => {
        const from = field.format
            ? field.format(before[field.key])
            : defaultFormat(before[field.key]);
        const to = field.format
            ? field.format(after[field.key])
            : defaultFormat(after[field.key]);

        if (from === to) return [];

        return [
            {
                field: field.label,
                from,
                to,
            },
        ];
    });
}
