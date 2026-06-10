export type AttendeeSessionMetadata = {
  botId: string;
  meetingUrl?: string;
  state?: string;
  createdAt: string;
};

const sessions = new Map<string, AttendeeSessionMetadata>();

export function setAttendeeSession(sessionId: string, metadata: Omit<AttendeeSessionMetadata, "createdAt">) {
  sessions.set(sessionId, {
    ...metadata,
    createdAt: new Date().toISOString(),
  });
}

export function getAttendeeSessionBotId(sessionId: string) {
  return sessions.get(sessionId)?.botId;
}

export function getAttendeeSession(sessionId: string) {
  return sessions.get(sessionId);
}
