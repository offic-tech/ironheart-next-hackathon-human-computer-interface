const sessions = new Map<string, string>();

export function setAttendeeSession(sessionId: string, botId: string) {
  sessions.set(sessionId, botId);
}

export function getAttendeeSessionBotId(sessionId: string) {
  return sessions.get(sessionId);
}
