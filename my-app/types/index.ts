export type AuthUser = {
  userId: number;
  name: string;
  email: string;
  role: "ADMIN" | "USER" | string;
  token: string;
  cpf?: string;  // opcional para não quebrar quem já tem dados sem cpf
  dataNascimento?: string | null;
};

export type ParticipantStatus = "PENDING" | "APPROVED" | "REJECTED";

export type Participant = {
  id: number;
  name: string;
  email: string;
  phone: string;
  cpf?: string;
  status: ParticipantStatus;
  createdAt?: string;
};

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

export type Speaker = {
  id?: number;
  name: string;
  bio?: string | null;
  topics?: string[];
  agenda?: string | null;
};

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

export type ParticipantDTO = {
  name: string;
  email: string;
  phone: string;
  cpf: string;
};

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

export type EventMaterialDTO = {
  title: string;
  description: string;
  fileType: "PDF" | "IMAGE" | "DOCUMENT" | "LINK";
  file?: File; // para upload
  link?: string; // para links externos
};
