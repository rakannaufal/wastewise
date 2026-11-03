import { useCallback, useEffect, useRef, useState } from "react";
import { useActiveScreen } from "./useActiveScreen";
import { api } from "./api";
import { useSession } from "./session";
import type { Feed, Post } from "../../shared/community";
import { filterQuery } from "../../shared/filters";
export { emptyFilters, filterQuery } from "../../shared/filters";
export type { CommunityFilters as Filters } from "../../shared/filters";
import type { CommunityFilters } from "../../shared/filters";
export function useFeed(filters: CommunityFilters) {
  const { user } = useSession();
  const active = useActiveScreen();
  const pending = useRef(false);
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
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(
      () => {
        if (!pending.current) reload();
      },
      processing ? 2000 : 60000,
    );
    return () => clearInterval(timer);
  }, [active, processing, reload]);
  useEffect(() => {
    if (!active) return;
    pending.current = true;
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
        if (!controller.signal.aborted) {
          pending.current = false;
          setLoading(false);
        }
      });
    return () => {
      controller.abort();
      pending.current = false;
      generation.current++;
    };
  }, [active, query, version, account]);
  async function more() {
    if (!active || !cursor || loading || loadingMore) return;
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
