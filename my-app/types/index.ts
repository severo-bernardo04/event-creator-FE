export type AuthUser = {
  userId: number;
  name: string;
  email: string;
  role: "ADMIN" | "USER" | string;
  token: string;
  cpf: string;
};

export type Participant = {
  id: number;
  name: string;
  email: string;
  phone: string;
  cpf?: string;
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
};

export type ParticipantDTO = {
  name: string;
  email: string;
  phone: string;
  cpf: string;
};
