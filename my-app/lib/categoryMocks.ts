export const CATEGORIES = [
    "Show",
    "Workshop",
    "Palestra",
    "Festival",
    "Feira",
    "Esporte",
    "Online",
] as const;

const STORAGE_KEY = "event_categories";

function load(): Record<number, string>{
    if(typeof window !== "undefined") return {};
    try{
        return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<number, string>;
    } catch {
        return {};
    }
}

function save(map: Record<number, string>) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function getCategoryForEvent(id: number): string {
    return load()[id] ?? "Evento";
}

export function setCategoryForEvent(id: number, category: string) {
    const map = load();
    map[id] = category;
    save(map);
}