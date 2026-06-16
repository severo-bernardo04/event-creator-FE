// Dados do usuário autenticado salvos no contexto da aplicação.
export type AuthUser = {
  userId: number;
  name: string;
  email: string;
  // Aceita ADMIN/USER e mantém string para não quebrar outros perfis vindos da API.
  role: "ADMIN" | "USER" | string;
  token: string;
  cpf?: string; // Opcional para não quebrar quem já tem dados sem CPF.
  dataNascimento?: string | null;
};

// Status possíveis de uma inscrição em evento privado.
export type ParticipantStatus = "PENDING" | "APPROVED" | "REJECTED";

// Representa uma pessoa inscrita em um evento.
export type Participant = {
  id: number;
  name: string;
  email: string;
  phone: string;
  cpf?: string;
  status: ParticipantStatus;
  createdAt?: string;
};

// Modelo principal de evento usado nas telas da aplicação.
export type Event = {
  id: number;
  title: string;
  description: string | null;
  date: string;
  time: string | null;
  location: string | null;
  maxParticipants: number;
  majority18: boolean;
  participants: Participant[];
  category?: string | null;
  imageUrl?: string | null;
  speakers?: Speaker[];
};

// Dados dos palestrantes vinculados a um evento.
export type Speaker = {
  id?: number;
  name: string;
  bio?: string | null;
  topics?: string[];
  agenda?: string | null;
};

// Dados enviados para criar ou editar um evento na API.
export type EventDTO = {
  title: string;
  description: string | null;
  date: string;
  time: string | null;
  location: string;
  maxParticipants: number;
  majority18: boolean;
  category?: string | null;
  speakers?: Speaker[];
};

// Dados enviados para inscrever um participante em um evento.
export type ParticipantDTO = {
  name: string;
  email: string;
  phone: string;
  cpf: string;
};

// Material complementar anexado a um evento.
export type EventMaterial = {
  id: number;
  eventId: number;
  title: string;
  description: string;
  fileUrl: string;
  fileName: string;
  fileType: "PDF" | "IMAGE" | "DOCUMENT" | "LINK";
  fileSize?: number; // em bytes
  uploadedBy: string; // nome do admin
  uploadedAt: string; // ISO date
  isApproved: boolean;
};

// Dados usados ao cadastrar um novo material no evento.
export type EventMaterialDTO = {
  title: string;
  description: string;
  fileType: "PDF" | "IMAGE" | "DOCUMENT" | "LINK";
  file?: File; // para upload
  link?: string; // para links externos
};
