import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { api } from "./api";
import { useSession } from "./session";
import type { Feed, Post } from "../../shared/community";
import { filterQuery } from "../../shared/filters";
export { emptyFilters, filterQuery } from "../../shared/filters";
export type { CommunityFilters as Filters } from "../../shared/filters";
import type { CommunityFilters } from "../../shared/filters";
export function useFeed(filters: CommunityFilters) {
  const { user } = useSession();
  const generation = useRef(0);
  const previous = useRef("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [pageError, setPageError] = useState("");
  const [version, setVersion] = useState(0);
  const query = filterQuery(filters);
  const account = user?.id;
  const processing = posts.some((p) => p.state === "processing");
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useFocusEffect(
    useCallback(() => {
      reload();
      const timer = setInterval(reload, processing ? 2000 : 60000);
      return () => clearInterval(timer);
    }, [reload, processing]),
  );
  useEffect(() => {
    generation.current++;
    const controller = new AbortController();
    const identity = `${account}:${query}`;
    if (previous.current !== identity) {
      setPosts([]);
      setCursor(null);
      previous.current = identity;
    }
    setLoading(true);
    setLoadingMore(false);
    setError("");
    setPageError("");
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
    return () => {
      controller.abort();
      generation.current++;
    };
  }, [query, version, account]);
  async function more() {
    if (!cursor || loading || loadingMore) return;
    const current = generation.current;
    setLoadingMore(true);
    setPageError("");
    try {
      const r = await api<Feed>(
        `/api/v1/community/feed?per_page=10&${query}&cursor=${encodeURIComponent(cursor)}`,
      );
      if (current !== generation.current) return;
      setPosts((v) => [
        ...v,
        ...r.posts.filter((p) => !v.some((x) => x.id === p.id)),
      ]);
      setCursor(r.next_cursor);
    } catch (e) {
      if (current === generation.current) setPageError((e as Error).message);
    } finally {
      if (current === generation.current) setLoadingMore(false);
    }
  }
  return {
    posts,
    cursor,
    loading,
    loadingMore,
    error,
    pageError,
    reload,
    more,
  };
}
