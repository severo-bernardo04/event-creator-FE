"use client";

// Componente simples para mensagens temporarias na tela.
import { useEffect } from "react";
import { CheckCircle2, X } from "lucide-react";

type ToastProps = {
  open: boolean;
  title?: string;
  message: string;
  onClose: () => void;
  duration?: number;
};

export default function Toast({
  open,
  title = "Sucesso",
  message,
  onClose,
  duration = 4000,
}: ToastProps) {
  useEffect(() => {
    if (!open) return;

    const timer = window.setTimeout(() => {
      onClose();
    }, duration);

    return () => window.clearTimeout(timer);
  }, [open, duration, onClose]);

  if (!open || !message) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[200] sm:bottom-auto sm:left-auto sm:right-6 sm:top-6 sm:w-[380px]">
      <div
        role="status"
        aria-live="polite"
        className="flex items-start gap-3 rounded-2xl border border-emerald-400/40 bg-emerald-500/15 p-4 text-emerald-50 shadow-2xl shadow-black/40 backdrop-blur-md"
      >
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />

        <div className="min-w-0 flex-1">
          <p className="text-sm font-black">{title}</p>
          <p className="mt-1 break-words text-sm leading-5 text-emerald-100">
            {message}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-emerald-100 hover:bg-white/10"
          aria-label="Fechar aviso"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}