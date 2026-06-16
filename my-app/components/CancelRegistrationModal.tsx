"use client";

// Modal usado para confirmar o cancelamento de uma inscricao.
import { useState } from "react";
import { AlertCircle, Loader } from "lucide-react";

type CancelRegistrationModalProps = {
    isOpen: boolean;
    eventTitle: string;
    isLoading: boolean;
    onConfirm: () => Promise<void>;
    onCancel: () => void;
    canCancel: boolean;
};

export default function CancelRegistrationModal({
                                                    isOpen,
                                                    eventTitle,
                                                    isLoading,
                                                    onConfirm,
                                                    onCancel,
                                                    canCancel,
                                                }: CancelRegistrationModalProps) {
    const [error, setError] = useState<string | null>(null);

    const handleConfirm = async () => {
        try {
            setError(null);
            await onConfirm();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erro ao cancelar inscrição.");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="max-h-[90vh] w-full max-w-[420px] overflow-auto rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
                <div className="mb-4 flex items-start gap-3">
                    <div className="flex-shrink-0">
                        <AlertCircle className="h-6 w-6 text-amber-500" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-lg font-bold text-white">Cancelar Inscrição?</h2>
                        <p className="mt-1 text-sm text-slate-400">
                            Você está prestes a cancelar sua inscrição em <span className="font-semibold">{eventTitle}</span>.
                        </p>
                    </div>
                </div>

                <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                    <p className="text-sm text-amber-100">
                        ⚠️ <strong>Aviso:</strong> Esta ação é irreversível. Você precisará se inscrever novamente se desistir.
                    </p>
                </div>

                {!canCancel && (
                    <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                        <p className="text-sm text-red-300">
                            ❌ O evento já começou. Não é possível cancelar a inscrição.
                        </p>
                    </div>
                )}

                {error && (
                    <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                        <p className="text-sm text-red-300">{error}</p>
                    </div>
                )}

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        disabled={isLoading}
                        className="rounded-lg border border-slate-600 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Continuar Inscrito
                    </button>

                    <button
                        onClick={handleConfirm}
                        disabled={isLoading || !canCancel}
                        className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <>
                                <Loader className="h-4 w-4 animate-spin" />
                                Cancelando...
                            </>
                        ) : (
                            "Sim, Cancelar Inscrição"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}