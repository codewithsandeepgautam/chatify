"use client";

import { useEffect, useState } from "react";
import type { UserDTO } from "@/types";

/** Debounced user search (query khali ho to saare users) */
export function useUserSearch(query: string, enabled = true) {
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const ctrl = new AbortController();
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users?q=${encodeURIComponent(query)}`, { signal: ctrl.signal });
        if (res.ok) setUsers((await res.json()).users);
      } catch {
        /* aborted */
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, enabled]);

  return { users, loading };
}
