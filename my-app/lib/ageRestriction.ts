// Calcula regras de idade minima para eventos restritos.
import type { AuthUser } from "@/types";

export function calculateAge(dateOfBirth?: string | null) {
  if (!dateOfBirth) return null;

  const birth = new Date(`${dateOfBirth.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  const hasNotHadBirthday =
    monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate());

  if (hasNotHadBirthday) age -= 1;

  return age;
}

export function isAdult(user: Pick<AuthUser, "dataNascimento"> | null | undefined) {
  const age = calculateAge(user?.dataNascimento);
  return age == null ? null : age >= 18;
}

export function getAdultEventRestrictionMessage(
  event: { majority18?: boolean | null },
  user: Pick<AuthUser, "dataNascimento"> | null | undefined,
) {
  if (!event.majority18) return null;
  if (!user) return null;

  const adult = isAdult(user);
  if (adult === false) {
    return "Este evento é +18. Sua conta não pode se inscrever neste evento.";
  }

  if (adult === null) {
    return "Este evento é +18. Atualize sua data de nascimento no perfil para se inscrever.";
  }

  return null;
}
