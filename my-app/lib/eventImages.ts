import { apiFetch } from "@/lib/api";

export async function uploadEventImage(eventId: number, image: File) {
  const formData = new FormData();

  formData.append("image", image);
  formData.append("file", image);

  return apiFetch<unknown>(`/events/${eventId}/image`, {
    method: "POST",
    body: formData,
  });
}
