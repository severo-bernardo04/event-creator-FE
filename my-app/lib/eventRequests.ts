// Funcoes para buscar e atualizar solicitacoes relacionadas aos eventos.
import { apiFetch } from "@/lib/api";
import { normalizeEventList, type ApiEventNorm } from "@/lib/eventsFromApi";

const EVENT_PAGE_SIZE = 100;
const MAX_EVENT_PAGES = 100;

function readNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function getPageInfo(data: unknown) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { currentPage: 0, totalPages: null };
  }

  const payload = data as Record<string, unknown>;
  const pageMeta =
    payload.page && typeof payload.page === "object" && !Array.isArray(payload.page)
      ? (payload.page as Record<string, unknown>)
      : null;

  const currentPage =
    readNumber(payload.number) ??
    readNumber(payload.pageNumber) ??
    readNumber(payload.currentPage) ??
    readNumber(payload.page) ??
    readNumber(pageMeta?.number) ??
    0;

  const totalPages =
    readNumber(payload.totalPages) ??
    readNumber(payload.pages) ??
    readNumber(pageMeta?.totalPages);

  return {
    currentPage: Math.max(0, Math.floor(currentPage)),
    totalPages: totalPages == null ? null : Math.max(1, Math.floor(totalPages)),
  };
}

function dedupeEvents(events: ApiEventNorm[]) {
  const seen = new Set<number>();
  const out: ApiEventNorm[] = [];

  for (const event of events) {
    if (seen.has(event.id)) continue;
    seen.add(event.id);
    out.push(event);
  }

  return out;
}

export async function fetchAllEvents(): Promise<ApiEventNorm[]> {
  let firstPage: unknown;

  try {
    firstPage = await apiFetch<unknown>(`/events?page=0&size=${EVENT_PAGE_SIZE}`, {
      method: "GET",
    });
  } catch {
    firstPage = await apiFetch<unknown>("/events", { method: "GET" });
  }

  const events = normalizeEventList(firstPage);
  const { currentPage, totalPages } = getPageInfo(firstPage);
  const allEvents = [...events];

  if (totalPages != null) {
    if (totalPages <= 1) {
      return dedupeEvents(allEvents);
    }

    const pagesToFetch = Math.min(totalPages, MAX_EVENT_PAGES);
    const pageRequests: Promise<ApiEventNorm[]>[] = [];

    for (let page = 0; page < pagesToFetch; page += 1) {
      if (page === currentPage) continue;
      pageRequests.push(
        apiFetch<unknown>(`/events?page=${page}&size=${EVENT_PAGE_SIZE}`, {
          method: "GET",
        }).then(normalizeEventList),
      );
    }

    const remainingPages = await Promise.all(pageRequests);
    return dedupeEvents([...allEvents, ...remainingPages.flat()]);
  }

  const seenIds = new Set(allEvents.map((event) => event.id));

  for (let page = currentPage + 1; page < MAX_EVENT_PAGES; page += 1) {
    const pageEvents = normalizeEventList(
      await apiFetch<unknown>(`/events?page=${page}&size=${EVENT_PAGE_SIZE}`, {
        method: "GET",
      }),
    );

    const newEvents = pageEvents.filter((event) => !seenIds.has(event.id));

    for (const event of newEvents) {
      seenIds.add(event.id);
      allEvents.push(event);
    }

    if (pageEvents.length < EVENT_PAGE_SIZE || newEvents.length === 0) {
      break;
    }
  }

  return allEvents;
}
