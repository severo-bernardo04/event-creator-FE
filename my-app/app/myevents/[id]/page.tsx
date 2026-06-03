import { redirect } from "next/navigation";

export default async function MyEventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/eventos/${id}`);
}
