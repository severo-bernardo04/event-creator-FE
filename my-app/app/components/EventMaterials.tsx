"use client";

import { useEffect, useState } from "react";
import { FileText, Image as ImageIcon, File, Link as LinkIcon, Download, LoaderCircle } from "lucide-react";
import { getMaterialsByEventId } from "@/lib/eventMaterials";
import { getErrorMessage } from "@/lib/errors";
import type { EventMaterial } from "@/types";

type EventMaterialsProps = {
  eventId: number;
  isApproved: boolean;
};

export default function EventMaterials({ eventId, isApproved }: EventMaterialsProps) {
  const [materials, setMaterials] = useState<EventMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isApproved) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const data = await getMaterialsByEventId(eventId);
        setMaterials(data);
      } catch (err: unknown) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [eventId, isApproved]);

  if (!isApproved) {
    return (
      <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-6">
        <p className="break-words text-sm font-semibold text-amber-100">
          Os materiais do evento estarão disponíveis após sua inscrição.
        </p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-800 bg-slate-900/45 p-4 sm:p-6">
        <div className="flex items-center justify-center gap-2 py-8">
          <LoaderCircle className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-slate-400">Carregando materiais...</span>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 sm:p-6">
        <p className="break-words text-sm text-red-300">{error}</p>
      </section>
    );
  }

  if (!materials.length) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/30 p-5 text-center sm:p-8">
        <FileText className="mx-auto h-10 w-10 text-slate-600" />
        <p className="mt-3 break-words text-sm text-slate-400">
          O organizador ainda não disponibilizou materiais para este evento.
        </p>
      </section>
    );
  }

  return (
    <section className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/45 p-4 sm:p-6">
      <h2 className="mb-4 break-words text-lg font-bold text-white">Materiais do Evento</h2>

      <div className="space-y-3">
        {materials.map((material) => (
          <MaterialCard key={material.id} material={material} />
        ))}
      </div>
    </section>
  );
}

function MaterialCard({ material }: { material: EventMaterial }) {
  const icon =
    material.fileType === "PDF" ? (
      <FileText className="h-5 w-5 text-red-400" />
    ) : material.fileType === "IMAGE" ? (
      <ImageIcon className="h-5 w-5 text-blue-400" />
    ) : material.fileType === "DOCUMENT" ? (
      <File className="h-5 w-5 text-orange-400" />
    ) : (
      <LinkIcon className="h-5 w-5 text-green-400" />
    );

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownload = () => {
    if (material.fileType === "LINK") {
      window.open(material.fileUrl, "_blank");
    } else {
      const a = document.createElement("a");
      a.href = material.fileUrl;
      a.download = material.fileName;
      a.click();
    }
  };

  return (
    <div className="flex min-w-0 items-start justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3 transition hover:bg-slate-950/70 sm:gap-4 sm:p-4">
      <div className="flex min-w-0 flex-1 gap-3">
        <div className="shrink-0 pt-0.5">{icon}</div>

        <div className="min-w-0 flex-1">
          <h3 className="break-words font-semibold text-white">{material.title}</h3>

          {material.description && (
            <p className="mt-1 line-clamp-2 break-words text-sm text-slate-400">{material.description}</p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span>{formatFileSize(material.fileSize)}</span>
            <span>•</span>
            <span>
              {new Date(material.uploadedAt).toLocaleDateString("pt-BR", {
                month: "short",
                day: "numeric",
              })}
            </span>
            {material.uploadedBy && (
              <>
                <span>•</span>
                <span className="break-words">por {material.uploadedBy}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={handleDownload}
        className="shrink-0 rounded-lg bg-primary/10 p-2.5 text-primary transition hover:bg-primary/20"
        title={material.fileType === "LINK" ? "Abrir link" : "Baixar arquivo"}
      >
        <Download className="h-4 w-4" />
      </button>
    </div>
  );
}
