import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { api } from "./api";
import type { Feed, Post } from "../../shared/community";
export type Filters = { codes: string[]; category: string; status: string };
export const emptyFilters: Filters = { codes: [], category: "", status: "" };
export function filterQuery(filters: Filters) {
  const p = new URLSearchParams();
  const code = filters.codes.filter(Boolean).at(-1);
  if (code) p.set("region_code", code);
  if (filters.category) p.set("category", filters.category);
  if (filters.status) p.set("status", filters.status);
  return p.toString();
}
export function useFeed(filters: Filters) {
  const generation = useRef(0);
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const query = filterQuery(filters);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useFocusEffect(
    useCallback(() => {
      reload();
      const timer = setInterval(reload, 60000);
      return () => clearInterval(timer);
    }, [reload]),
  );
  useEffect(() => {
    generation.current++;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    api<Feed>(`/api/v1/community/feed?per_page=10&${query}`, {
      signal: controller.signal,
    })
      .then((r) => {
        if (!controller.signal.aborted) {
          setPosts(r.posts);
          setCursor(r.next_cursor);
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError((e as Error).message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [query, version]);
  async function more() {
    if (!cursor || loading) return;
    const version = generation.current;
    setLoading(true);
    try {
      const r = await api<Feed>(
        `/api/v1/community/feed?per_page=10&${query}&cursor=${encodeURIComponent(cursor)}`,
      );
      if (version !== generation.current) return;
      setPosts((v) => [
        ...v,
        ...r.posts.filter((p) => !v.some((x) => x.id === p.id)),
      ]);
      setCursor(r.next_cursor);
    } catch (e) {
      if (version === generation.current) setError((e as Error).message);
    } finally {
      if (version === generation.current) setLoading(false);
    }
  }
  return { posts, cursor, loading, error, reload, more };
}
