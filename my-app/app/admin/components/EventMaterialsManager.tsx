"use client";

import { useState } from "react";
import {
  CheckCircle2,
  File,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  Pencil,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { uploadMaterial, deleteMaterial, approveMaterial, updateMaterial } from "@/lib/eventMaterials";
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
  const [editingId, setEditingId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EventMaterialDTO>({
    title: "",
    description: "",
    fileType: "PDF",
  });
  const [editFile, setEditFile] = useState<File | null>(null);

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

  const validateFileSize = (file: File) => {
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      setError("Arquivo muito grande (máximo 50MB).");
      return false;
    }

    return true;
  };

  const handleEditFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!validateFileSize(file)) return;

    setEditFile(file);
    setError(null);
  };

  const closeForm = () => {
    setIsOpen(false);
    setError(null);
  };

  const resetForm = () => {
    setForm({ title: "", description: "", fileType: "PDF" });
    setSelectedFile(null);
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

      onMaterialsChange([...materials, newMaterial]);
      resetForm();
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

  const handleApprove = async (materialId: number) => {
    try {
      const approved = await approveMaterial(eventId, materialId);
      onMaterialsChange(materials.map((m) => (m.id === materialId ? approved : m)));
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
  };

  const startEditing = (material: EventMaterial) => {
    setEditingId(material.id);
    setEditFile(null);
    setError(null);
    setEditForm({
      title: material.title,
      description: material.description || "",
      fileType: material.fileType,
      link: material.fileType === "LINK" ? material.fileUrl : "",
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditFile(null);
    setError(null);
  };

  const handleUpdate = async (materialId: number) => {
    if (!editForm.title.trim()) {
      setError("Informe um título.");
      return;
    }

    if (editForm.fileType === "LINK" && !editForm.link?.trim()) {
      setError("Informe um URL válido.");
      return;
    }

    setUpdatingId(materialId);
    setError(null);

    try {
      const updated = await updateMaterial(eventId, materialId, {
        ...editForm,
        file: editFile || undefined,
      });
      onMaterialsChange(materials.map((m) => (m.id === materialId ? updated : m)));
      cancelEditing();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setUpdatingId(null);
    }
  };

  if (!isAdmin) return null;

  const approvedCount = materials.filter((material) => material.isApproved).length;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/45 p-4 sm:p-6">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Gerenciar materiais</h3>
          <p className="mt-1 text-sm text-slate-500">
            Organize arquivos, links e aprovações vinculados ao evento.
          </p>
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Novo material
        </button>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <SummaryPill label="Total" value={materials.length} />
        <SummaryPill label="Aprovados" value={approvedCount} tone="green" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(280px,360px)_1fr]">
        <aside
          className={`rounded-xl border border-slate-800 bg-slate-950/40 p-4 ${
            isOpen ? "block" : "hidden lg:block"
          }`}
        >
          <div className="mb-4 flex items-start gap-3">
            <span className="rounded-lg bg-primary/10 p-2 text-primary">
              <Upload className="h-4 w-4" />
            </span>
            <div>
              <h4 className="font-semibold text-white">Adicionar material</h4>
              <p className="mt-1 text-xs text-slate-500">Arquivos até 50MB ou links externos.</p>
            </div>
          </div>

          <div className="space-y-3">
            <FieldLabel label="Título">
              <input
                type="text"
                placeholder="Ex.: Apostila do workshop"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500"
              />
            </FieldLabel>

            <FieldLabel label="Descrição">
              <textarea
                placeholder="Opcional"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="w-full resize-none rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500"
              />
            </FieldLabel>

            <FieldLabel label="Tipo">
              <select
                value={form.fileType}
                onChange={(e) => {
                  setSelectedFile(null);
                  setForm({
                    ...form,
                    link: "",
                    fileType: e.target.value as EventMaterialDTO["fileType"],
                  });
                }}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
              >
                <option value="PDF">PDF</option>
                <option value="IMAGE">Imagem</option>
                <option value="DOCUMENT">Documento Office</option>
                <option value="LINK">Link externo</option>
              </select>
            </FieldLabel>

            {form.fileType === "LINK" ? (
              <FieldLabel label="URL">
                <input
                  type="url"
                  placeholder="https://exemplo.com"
                  value={form.link || ""}
                  onChange={(e) => setForm({ ...form, link: e.target.value })}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                />
              </FieldLabel>
            ) : (
              <FieldLabel label="Arquivo">
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
                  className="w-full rounded-lg border border-dashed border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-400 file:mr-3 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-200 hover:border-slate-600"
                />
                {selectedFile && (
                  <p className="mt-2 truncate text-xs text-slate-500">{selectedFile.name}</p>
                )}
              </FieldLabel>
            )}

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                <p className="text-xs font-semibold text-red-300">{error}</p>
              </div>
            )}

            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
              <button
                onClick={closeForm}
                className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
              >
                <Upload className="h-4 w-4" />
                {uploading ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          {materials.length ? (
            <div className="grid gap-3 xl:grid-cols-2">
              {materials.map((material) => (
                <MaterialAdminCard
                  key={material.id}
                  material={material}
                  isEditing={editingId === material.id}
                  editForm={editForm}
                  editFile={editFile}
                  updating={updatingId === material.id}
                  onEditFormChange={setEditForm}
                  onEditFileSelect={handleEditFileSelect}
                  onStartEdit={startEditing}
                  onCancelEdit={cancelEditing}
                  onUpdate={handleUpdate}
                  onApprove={handleApprove}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950/30 p-6 text-center">
              <FileText className="h-10 w-10 text-slate-600" />
              <p className="mt-3 font-semibold text-white">Nenhum material cadastrado</p>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                Use o formulário para anexar PDFs, imagens, documentos ou links úteis para os participantes.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function SummaryPill({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: number;
  tone?: "slate" | "green" | "amber";
}) {
  const toneClass =
    tone === "green"
      ? "border-green-500/20 bg-green-500/10 text-green-300"
      : tone === "amber"
        ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
        : "border-slate-800 bg-slate-950/40 text-slate-300";

  return (
    <div className={`rounded-xl border px-4 py-3 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function MaterialAdminCard({
  material,
  isEditing,
  editForm,
  editFile,
  updating,
  onEditFormChange,
  onEditFileSelect,
  onStartEdit,
  onCancelEdit,
  onUpdate,
  onApprove,
  onDelete,
}: {
  material: EventMaterial;
  isEditing: boolean;
  editForm: EventMaterialDTO;
  editFile: File | null;
  updating: boolean;
  onEditFormChange: (form: EventMaterialDTO) => void;
  onEditFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onStartEdit: (material: EventMaterial) => void;
  onCancelEdit: () => void;
  onUpdate: (materialId: number) => void;
  onApprove: (materialId: number) => void;
  onDelete: (materialId: number) => void;
}) {
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

  const typeLabel = {
    PDF: "PDF",
    IMAGE: "Imagem",
    DOCUMENT: "Documento",
    LINK: "Link",
  }[material.fileType];

  return (
    <article className="flex min-w-0 flex-col justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/40 p-4 transition hover:bg-slate-950/70">
      {isEditing ? (
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900">
              {icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-white">Editar material</p>
              <p className="mt-1 text-xs text-slate-500">Atualize as informações e salve as mudanças.</p>
            </div>
          </div>

          <FieldLabel label="Título">
            <input
              type="text"
              value={editForm.title}
              onChange={(e) => onEditFormChange({ ...editForm, title: e.target.value })}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500"
            />
          </FieldLabel>

          <FieldLabel label="Descrição">
            <textarea
              value={editForm.description}
              onChange={(e) => onEditFormChange({ ...editForm, description: e.target.value })}
              rows={3}
              className="w-full resize-none rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500"
            />
          </FieldLabel>

          <FieldLabel label="Tipo">
            <select
              value={editForm.fileType}
              onChange={(e) =>
                onEditFormChange({
                  ...editForm,
                  link: "",
                  fileType: e.target.value as EventMaterialDTO["fileType"],
                })
              }
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
            >
              <option value="PDF">PDF</option>
              <option value="IMAGE">Imagem</option>
              <option value="DOCUMENT">Documento Office</option>
              <option value="LINK">Link externo</option>
            </select>
          </FieldLabel>

          {editForm.fileType === "LINK" ? (
            <FieldLabel label="URL">
              <input
                type="url"
                placeholder="https://exemplo.com"
                value={editForm.link || ""}
                onChange={(e) => onEditFormChange({ ...editForm, link: e.target.value })}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500"
              />
            </FieldLabel>
          ) : (
            <FieldLabel label="Substituir arquivo">
              <input
                type="file"
                onChange={onEditFileSelect}
                accept={
                  editForm.fileType === "PDF"
                    ? ".pdf"
                    : editForm.fileType === "IMAGE"
                      ? "image/*"
                      : ".doc,.docx,.xls,.xlsx,.ppt,.pptx"
                }
                className="w-full rounded-lg border border-dashed border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-400 file:mr-3 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-200 hover:border-slate-600"
              />
              <p className="mt-2 truncate text-xs text-slate-500">
                {editFile ? editFile.name : material.fileName || "Arquivo atual será mantido"}
              </p>
            </FieldLabel>
          )}
        </div>
      ) : (
        <div className="flex min-w-0 gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900">
            {icon}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="min-w-0 break-words font-semibold text-white">{material.title}</h4>
              {material.isApproved && (
                <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[11px] font-bold text-green-300">
                  Aprovado
                </span>
              )}
            </div>

            {material.description && (
              <p className="mt-1 line-clamp-2 break-words text-sm text-slate-400">
                {material.description}
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              <span>{typeLabel}</span>
              {material.fileName && (
                <>
                  <span>•</span>
                  <span className="max-w-[220px] truncate">{material.fileName}</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-2 border-t border-slate-800 pt-3">
        {isEditing ? (
          <>
            <button
              onClick={onCancelEdit}
              disabled={updating}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              Cancelar
            </button>
            <button
              onClick={() => onUpdate(material.id)}
              disabled={updating}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {updating ? "Salvando..." : "Salvar"}
            </button>
          </>
        ) : (
          <>
            {!material.isApproved && (
              <button
                onClick={() => onApprove(material.id)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-green-500/10 px-3 py-2 text-xs font-semibold text-green-300 transition hover:bg-green-500/20"
              >
                <CheckCircle2 className="h-4 w-4" />
                Aprovar
              </button>
            )}
            <button
              onClick={() => onStartEdit(material)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-700"
            >
              <Pencil className="h-4 w-4" />
              Editar
            </button>
            <button
              onClick={() => onDelete(material.id)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/20"
            >
              <Trash2 className="h-4 w-4" />
              Remover
            </button>
          </>
        )}
      </div>
    </article>
  );
}
