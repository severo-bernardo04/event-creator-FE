// Formata datas e horarios dos eventos para exibicao.
/**
 * Verifica se um evento já começou
 */
export function isEventStarted(date: string, time: string | null): boolean {
  try {
    const timeStr = time ? time.padEnd(8, ":00") : "00:00:00";
    const eventDateTime = new Date(`${date}T${timeStr}`);
    return eventDateTime < new Date();
  } catch {
    return false;
  }
}

/**
 * Verifica se o cancelamento é permitido
 */
export function canCancelRegistration(date: string, time: string | null): boolean {
  return !isEventStarted(date, time);
}

/**
 * Retorna mensagem amigável sobre disponibilidade de cancelamento
 */
export function getCancelationMessage(date: string, time: string | null): string {
  if (isEventStarted(date, time)) {
    return "O evento já começou. Não é possível cancelar.";
  }
  return "Você pode cancelar sua inscrição até o início do evento.";
}

