import type { ParticipantStatus } from "@/types";

export default function StatusParticipante({
  status,
}: {
  status: ParticipantStatus;
}) {
  const base =
    "inline-flex items-center rounded-full px-2 py-0.5 text-[11.5px] font-bold ring-1 ring-inset";

  if (status === "PENDING") {
    return (
      <span className={`${base} bg-amber-500/10 text-amber-300 ring-amber-500/25`}>
        Pendente
      </span>
    );
  }

  if (status === "APPROVED") {
    return (
      <span className={`${base} bg-emerald-500/10 text-emerald-400 ring-emerald-500/25`}>
        Aprovado
      </span>
    );
  }

  return (
    <span className={`${base} bg-red-500/10 text-red-400 ring-red-500/25`}>
      Rejeitado
    </span>
  );
}
