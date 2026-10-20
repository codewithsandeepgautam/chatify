"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { toast } from "sonner";
import { kindOfMime } from "@/lib/serialize";
import type { ConversationDTO, LastMessageDTO, MessageDTO, UserDTO } from "@/types";

type MsgState = { items: MessageDTO[]; hasMore: boolean; loading: boolean };

const sortConvs = (list: ConversationDTO[]) =>
  [...list].sort((a, b) => +new Date(b.lastMessageAt) - +new Date(a.lastMessageAt));

function lastFromMessage(m: MessageDTO): LastMessageDTO {
  const att = m.attachments[0];
  return {
    text: m.text || (m.attachments.length > 1 ? `${m.attachments.length} files` : att?.name ?? ""),
    senderId: m.sender?.id ?? null,
    kind: m.type === "system" ? "system" : att ? kindOfMime(att.mime) : "text",
    createdAt: m.createdAt,
  };
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Kuch galat hua");
  return data as T;
}

const jsonInit = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: body === undefined ? undefined : JSON.stringify(body),
});

/**
 * Poori chat ki state + realtime (socket.io) + actions ek jagah.
 * UI components sirf is hook se data lete hain.
 */
export function useChat(me: UserDTO) {
  const [conversations, setConversations] = useState<ConversationDTO[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, MsgState>>({});
  const [online, setOnline] = useState<Set<string>>(new Set());
  const [typing, setTyping] = useState<Record<string, string[]>>({});
  const [connected, setConnected] = useState(true);

  const socketRef = useRef<Socket | null>(null);
  const activeRef = useRef<string | null>(null);
  const convsRef = useRef<ConversationDTO[]>([]);
  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const messagesRef = useRef<Record<string, MsgState>>({});
  const olderInFlight = useRef(new Set<string>());
  convsRef.current = conversations;
  messagesRef.current = messages;

  /* ---------- conversations ---------- */
  const fetchConversations = useCallback(async () => {
    try {
      const { conversations } = await api<{ conversations: ConversationDTO[] }>("/api/conversations");
      setConversations(conversations);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Chats load nahi hui");
    } finally {
      setLoadingList(false);
    }
  }, []);

  const upsertConversation = useCallback((c: ConversationDTO, keepUnread = true) => {
    setConversations((prev) => {
      const old = prev.find((x) => x.id === c.id);
      const merged = old && keepUnread ? { ...c, unread: old.unread } : c;
      return sortConvs(old ? prev.map((x) => (x.id === c.id ? merged : x)) : [...prev, merged]);
    });
  }, []);

  const removeConversation = useCallback((id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    setActiveId((cur) => (cur === id ? null : cur));
    if (activeRef.current === id) activeRef.current = null;
  }, []);

  /* ---------- messages ---------- */
  const markRead = useCallback(async (conversationId: string) => {
    setConversations((prev) => prev.map((c) => (c.id === conversationId && c.unread ? { ...c, unread: 0 } : c)));
    fetch(`/api/conversations/${conversationId}/read`, { method: "POST" }).catch(() => {});
  }, []);

  const loadMessages = useCallback(async (conversationId: string, force = false) => {
    const s = messagesRef.current[conversationId];
    if (!force && s && (s.items.length || s.loading)) return;
    setMessages((prev) => ({
      ...prev,
      [conversationId]: { items: prev[conversationId]?.items ?? [], hasMore: prev[conversationId]?.hasMore ?? false, loading: true },
    }));
    try {
      const data = await api<{ messages: MessageDTO[]; hasMore: boolean }>(`/api/conversations/${conversationId}/messages?limit=30`);
      setMessages((prev) => ({ ...prev, [conversationId]: { items: data.messages, hasMore: data.hasMore, loading: false } }));
    } catch (e) {
      setMessages((prev) => ({ ...prev, [conversationId]: { items: [], hasMore: false, loading: false } }));
      toast.error(e instanceof Error ? e.message : "Messages load nahi hue");
    }
  }, []);

  const loadOlder = useCallback(async (conversationId: string) => {
    const s = messagesRef.current[conversationId];
    if (!s || !s.hasMore || !s.items.length || olderInFlight.current.has(conversationId)) return;
    olderInFlight.current.add(conversationId);
    const before = s.items[0].id;
    setMessages((prev) => ({ ...prev, [conversationId]: { ...prev[conversationId], loading: true } }));
    try {
      const data = await api<{ messages: MessageDTO[]; hasMore: boolean }>(
        `/api/conversations/${conversationId}/messages?limit=30&before=${before}`
      );
      setMessages((prev) => {
        const cur = prev[conversationId];
        const have = new Set((cur?.items ?? []).map((m) => m.id));
        const older = data.messages.filter((m) => !have.has(m.id));
        return { ...prev, [conversationId]: { items: [...older, ...(cur?.items ?? [])], hasMore: data.hasMore, loading: false } };
      });
    } catch {
      setMessages((prev) => ({ ...prev, [conversationId]: { ...prev[conversationId], loading: false } }));
    } finally {
      olderInFlight.current.delete(conversationId);
    }
  }, []);

  const handleIncoming = useCallback(
    (m: MessageDTO) => {
      const isMine = m.sender?.id === me.id;
      const isActive = activeRef.current === m.conversationId && document.visibilityState === "visible";

      setMessages((prev) => {
        const s = prev[m.conversationId];
        if (!s || s.items.some((x) => x.id === m.id)) return prev;
        return { ...prev, [m.conversationId]: { ...s, items: [...s.items, m] } };
      });

      if (!convsRef.current.some((c) => c.id === m.conversationId)) {
        fetchConversations(); // naye chat ka pehla message
        return;
      }
      setConversations((prev) =>
        sortConvs(
          prev.map((c) =>
            c.id !== m.conversationId
              ? c
              : {
                  ...c,
                  lastMessage: lastFromMessage(m),
                  lastMessageAt: m.createdAt,
                  unread: !isMine && m.type === "text" && !isActive ? c.unread + 1 : c.unread,
                }
          )
        )
      );
      if (!isMine && m.type === "text" && isActive) markRead(m.conversationId);
    },
    [me.id, fetchConversations, markRead]
  );

  /* ---------- socket ---------- */
  useEffect(() => {
    fetchConversations();
    const socket = io({ withCredentials: true });
    socketRef.current = socket;
    let first = true;

    socket.on("connect", () => {
      setConnected(true);
      if (!first) {
        // reconnect: jo miss hua use sync karo
        fetchConversations();
        if (activeRef.current) loadMessages(activeRef.current, true);
      }
      first = false;
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("presence:list", (ids: string[]) => setOnline(new Set(ids)));
    socket.on("presence:update", ({ userId, online: on }: { userId: string; online: boolean }) =>
      setOnline((prev) => {
        const n = new Set(prev);
        if (on) n.add(userId);
        else n.delete(userId);
        return n;
      })
    );

    socket.on("typing", ({ conversationId, userId, isTyping }: { conversationId: string; userId: string; isTyping: boolean }) => {
      if (userId === me.id) return;
      const key = `${conversationId}:${userId}`;
      clearTimeout(typingTimers.current[key]);
      const remove = () =>
        setTyping((prev) => {
          const list = (prev[conversationId] ?? []).filter((u) => u !== userId);
          return { ...prev, [conversationId]: list };
        });
      if (isTyping) {
        setTyping((prev) => {
          const list = prev[conversationId] ?? [];
          return list.includes(userId) ? prev : { ...prev, [conversationId]: [...list, userId] };
        });
        typingTimers.current[key] = setTimeout(remove, 4000); // safety: stop event miss ho jaye to
      } else remove();
    });

    socket.on("message:new", ({ message }: { message: MessageDTO }) => handleIncoming(message));
    socket.on("message:read", ({ conversationId, userId }: { conversationId: string; userId: string }) =>
      setMessages((prev) => {
        const s = prev[conversationId];
        if (!s) return prev;
        return {
          ...prev,
          [conversationId]: {
            ...s,
            items: s.items.map((m) =>
              m.sender?.id !== userId && !m.readBy.includes(userId) ? { ...m, readBy: [...m.readBy, userId] } : m
            ),
          },
        };
      })
    );
    socket.on("conversation:new", ({ conversation }: { conversation: ConversationDTO }) => upsertConversation(conversation));
    socket.on("conversation:update", ({ conversation }: { conversation: ConversationDTO }) => upsertConversation(conversation));
    socket.on("conversation:removed", ({ id }: { id: string }) => removeConversation(id));

    const timers = typingTimers.current;
    return () => {
      socket.disconnect();
      Object.values(timers).forEach(clearTimeout);
    };
  }, [me.id, fetchConversations, handleIncoming, loadMessages, upsertConversation, removeConversation]);

  // tab wapas visible ho to active chat ko read mark karo
  useEffect(() => {
    const onVisible = () => {
      const id = activeRef.current;
      if (document.visibilityState === "visible" && id && convsRef.current.find((c) => c.id === id)?.unread) markRead(id);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [markRead]);

  // unread total tab title me
  useEffect(() => {
    const total = conversations.reduce((n, c) => n + c.unread, 0);
    document.title = total ? `(${total}) Chatly` : "Chatly — Realtime Chat";
  }, [conversations]);

  /* ---------- actions ---------- */
  const selectConversation = useCallback(
    (id: string | null) => {
      activeRef.current = id;
      setActiveId(id);
      if (!id) return;
      loadMessages(id);
      if (convsRef.current.find((c) => c.id === id)?.unread) markRead(id);
    },
    [loadMessages, markRead]
  );

  const openDirect = useCallback(
    async (userId: string) => {
      const { conversation } = await api<{ conversation: ConversationDTO }>("/api/conversations", jsonInit("POST", { type: "direct", userId }));
      upsertConversation(conversation);
      selectConversation(conversation.id);
    },
    [upsertConversation, selectConversation]
  );

  const createGroup = useCallback(
    async (name: string, memberIds: string[]) => {
      const { conversation } = await api<{ conversation: ConversationDTO }>(
        "/api/conversations",
        jsonInit("POST", { type: "group", name, memberIds })
      );
      upsertConversation(conversation);
      selectConversation(conversation.id);
    },
    [upsertConversation, selectConversation]
  );

  const updateGroup = useCallback(
    async (id: string, patch: { name?: string; addMemberIds?: string[]; removeMemberId?: string }) => {
      const { conversation } = await api<{ conversation: ConversationDTO }>(`/api/conversations/${id}`, jsonInit("PATCH", patch));
      upsertConversation(conversation);
    },
    [upsertConversation]
  );

  const leaveGroup = useCallback(
    async (id: string) => {
      await api(`/api/conversations/${id}`, { method: "DELETE" });
      removeConversation(id);
    },
    [removeConversation]
  );

  /** Pehle files upload (MongoDB me), phir message create */
  const sendMessage = useCallback(
    async (conversationId: string, text: string, files: File[]) => {
      const attachmentIds: string[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("conversationId", conversationId);
        const { attachment } = await api<{ attachment: { id: string } }>("/api/upload", { method: "POST", body: fd });
        attachmentIds.push(attachment.id);
      }
      const { message } = await api<{ message: MessageDTO }>(
        `/api/conversations/${conversationId}/messages`,
        jsonInit("POST", { text, attachmentIds })
      );
      handleIncoming(message); // socket event aane par duplicate nahi banega (id se dedupe)
    },
    [handleIncoming]
  );

  const emitTyping = useCallback((conversationId: string, isTyping: boolean) => {
    socketRef.current?.emit("typing", { conversationId, isTyping });
  }, []);

  return {
    conversations,
    loadingList,
    activeId,
    messages,
    online,
    typing,
    connected,
    selectConversation,
    loadMessages,
    loadOlder,
    openDirect,
    createGroup,
    updateGroup,
    leaveGroup,
    sendMessage,
    emitTyping,
  };
}

export type ChatApi = ReturnType<typeof useChat>;
