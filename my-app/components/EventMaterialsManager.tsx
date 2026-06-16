"use client";

// Gerencia o cadastro e a listagem de materiais de eventos.
import { useState } from "react";
import { Upload, Trash2 } from "lucide-react";
import { uploadMaterial, deleteMaterial } from "@/lib/eventMaterials";
import { getErrorMessage } from "@/lib/errors";
import type { EventMaterial, EventMaterialDTO } from "@/types";

type EventMaterialsManagerProps = {
    eventId: number;
    materials: EventMaterial[];
    onMaterialsChange: (materials: EventMaterial[]) => void;
    isAdmin: boolean;
};

export default function EventMaterialsManager({
                                                  eventId,
                                                  materials,
                                                  onMaterialsChange,
                                                  isAdmin,
                                              }: EventMaterialsManagerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState<EventMaterialDTO>({
        title: "",
        description: "",
        fileType: "PDF",
    });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const maxSize = 50 * 1024 * 1024; // 50MB
        if (file.size > maxSize) {
            setError("Arquivo muito grande (máximo 50MB).");
            return;
        }

        setSelectedFile(file);
        setError(null);
    };

    const handleUpload = async () => {
        if (!form.title.trim()) {
            setError("Informe um título.");
            return;
        }

        if (form.fileType === "LINK") {
            if (!form.link?.trim()) {
                setError("Informe um URL válido.");
                return;
            }
        } else {
            if (!selectedFile) {
                setError("Selecione um arquivo.");
                return;
            }
        }

        setUploading(true);
        setError(null);

        try {
            const newMaterial = await uploadMaterial(eventId, {
                ...form,
                file: selectedFile || undefined,
            });

            onMaterialsChange([...materials, { ...newMaterial, isApproved: true }]);
            setForm({ title: "", description: "", fileType: "PDF" });
            setSelectedFile(null);
            setIsOpen(false);
        } catch (err: unknown) {
            setError(getErrorMessage(err));
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (materialId: number) => {
        if (!confirm("Tem certeza que deseja remover este material?")) return;

        try {
            await deleteMaterial(eventId, materialId);
            onMaterialsChange(materials.filter((m) => m.id !== materialId));
        } catch (err: unknown) {
            setError(getErrorMessage(err));
        }
    };

    if (!isAdmin) return null;

    return (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/45 p-6">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="font-bold text-white">Gerenciar Materiais</h3>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:brightness-110"
                >
                    <Upload className="h-4 w-4" />
                    Novo Material
                </button>
            </div>

            {isOpen && (
                <div className="mb-4 space-y-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                    <input
                        type="text"
                        placeholder="Título do material"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                    />

                    <textarea
                        placeholder="Descrição (opcional)"
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        rows={2}
                        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500 resize-none"
                    />

                    <select
                        value={form.fileType}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                fileType: e.target.value as EventMaterialDTO["fileType"],
                            })
                        }
                        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
                    >
                        <option value="PDF">PDF</option>
                        <option value="IMAGE">Imagem</option>
                        <option value="DOCUMENT">Documento (Office)</option>
                        <option value="LINK">Link Externo</option>
                    </select>

                    {form.fileType === "LINK" ? (
                        <input
                            type="url"
                            placeholder="https://exemplo.com"
                            value={form.link || ""}
                            onChange={(e) => setForm({ ...form, link: e.target.value })}
                            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                        />
                    ) : (
                        <input
                            type="file"
                            onChange={handleFileSelect}
                            accept={
                                form.fileType === "PDF"
                                    ? ".pdf"
                                    : form.fileType === "IMAGE"
                                        ? "image/*"
                                        : ".doc,.docx,.xls,.xlsx,.ppt,.pptx"
                            }
                            className="w-full text-sm text-slate-400"
                        />
                    )}

                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleUpload}
                            disabled={uploading}
                            className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                        >
                            {uploading ? "Enviando..." : "Upload"}
                        </button>
                    </div>
                </div>
            )}

            {error && (
                <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                    <p className="text-xs font-semibold text-red-400">{error}</p>
                </div>
            )}

            <div className="space-y-2">
                {materials.map((material) => (
                    <div
                        key={material.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3"
                    >
                        <div>
                            <p className="font-semibold text-white">{material.title}</p>
                            <p className="text-xs text-slate-500">{material.fileName}</p>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleDelete(material.id)}
                                className="rounded-lg bg-red-500/10 p-1 text-red-400 hover:bg-red-500/20"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}