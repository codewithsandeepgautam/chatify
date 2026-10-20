import type { Server } from "socket.io";

/** server.js me bana hua socket.io instance (API routes isi process me chalte hain) */
export const getIO = () => (globalThis as { io?: Server }).io ?? null;

export const userRooms = (ids: unknown[]) => ids.map((id) => `user:${String(id)}`);

export function emitToUsers(ids: unknown[], event: string, payload: unknown) {
  if (!ids.length) return;
  getIO()?.to(userRooms(ids)).emit(event, payload);
}

/** In users ke saare sockets ko conversation room (typing indicator) me daalo */
export function joinConversationRoom(ids: unknown[], conversationId: string) {
  if (!ids.length) return;
  getIO()?.in(userRooms(ids)).socketsJoin(`conv:${conversationId}`);
}

export function leaveConversationRoom(ids: unknown[], conversationId: string) {
  if (!ids.length) return;
  getIO()?.in(userRooms(ids)).socketsLeave(`conv:${conversationId}`);
}
