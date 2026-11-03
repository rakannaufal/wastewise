import { useRef, useState } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ChevronLeft, MapPin, Smile, X } from "lucide-react";
import { api } from "../api";
import { useAuth } from "../Auth";
import { Failure, Loading } from "../ui";
import RegionFilters, { communityParams } from "../components/RegionFilters";
import PostCard from "../components/PostCard";
import CommentThread from "../components/CommentThread";
import type { Feed, Post, Comment, Comments } from "../../../shared/community";
export default function Community() {
  const [params, setParams] = useSearchParams();
  const filter = communityParams(params).toString();
  const { user } = useAuth();
  const feed = useInfiniteQuery({
    queryKey: ["community", "feed", user?.id, filter],
    initialPageParam: "",
    queryFn: ({ pageParam, signal }) =>
      api<Feed>(
        `/api/v1/community/feed?${filter}&per_page=10${pageParam ? "&cursor=" + encodeURIComponent(pageParam) : ""}`,
        { signal },
      ),
    getNextPageParam: (page) => page.next_cursor || undefined,
    refetchInterval: (q) =>
      q.state.data?.pages.some((p) =>
        p.posts.some((x) => x.state === "processing"),
      )
        ? 2000
        : 60000,
  });
  const posts = feed.data?.pages.flatMap((p) => p.posts) || [];
  return (
    <>
      <div className="page-heading feed-heading">
        <div>
          <h1>Komunitas</h1>
          <p>Foto dan kabar dari lingkunganmu.</p>
        </div>
        <Link className="text-button" to={"/map?" + params.toString()}>
          <MapPin size={18} />
          Lihat peta
        </Link>
      </div>
      <div className="feed-order">
        <label htmlFor="feed-order">Urutan posting</label>
        <select
          id="feed-order"
          value={params.get("order") === "oldest" ? "oldest" : "newest"}
          onChange={(e) => {
            const next = new URLSearchParams(params);
            next.set("order", e.target.value);
            setParams(next);
          }}
        >
          <option value="newest">Terbaru</option>
          <option value="oldest">Terlama</option>
        </select>
      </div>
      <RegionFilters />
      <section aria-label="Posting komunitas">
        {feed.error && posts.length > 0 && (
          <Failure
            error={feed.error}
            retry={() =>
              void (feed.isFetchNextPageError
                ? feed.fetchNextPage()
                : feed.refetch())
            }
          />
        )}
        {feed.isPending ? (
          <div className="feed-list" aria-label="Memuat posting" role="status">
            {[0, 1].map((i) => (
              <div key={i} className="post-skeleton" aria-hidden="true">
                <div />
                <div />
                <div />
              </div>
            ))}
            <span className="sr-only">Memuat posting…</span>
          </div>
        ) : feed.error && !posts.length ? (
          <Failure error={feed.error} retry={() => void feed.refetch()} />
        ) : posts.length === 0 ? (
          <div className="community-empty">
            <MapPin size={32} />
            <h2>Belum ada cerita di sini.</h2>
            <p>
              Coba wilayah lain, atau buat laporan pertamamu. Laporan Ditolak
              tidak ditampilkan.
            </p>
            <Link className="button secondary" to="/reports/new">
              Foto sampah di sekitarmu
            </Link>
          </div>
        ) : (
          <div className="feed-list">
            {posts.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
            {feed.hasNextPage && (
              <button
                className="button secondary"
                disabled={feed.isFetchingNextPage}
                onClick={() => void feed.fetchNextPage()}
              >
                {feed.isFetchingNextPage
                  ? "Memuat…"
                  : feed.isFetchNextPageError
                    ? "Coba muat berikutnya"
                    : "Lihat laporan berikutnya"}
              </button>
            )}
          </div>
        )}
      </section>
    </>
  );
}
export function PostDetail() {
  const { id } = useParams();
  const client = useQueryClient();
  const { user } = useAuth();
  const [body, setBody] = useState("");
  const [target, setTarget] = useState<{ id: string; author: string } | null>(
    null,
  );
  const input = useRef<HTMLTextAreaElement>(null);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const post = useQuery({
    queryKey: ["community", "post", user?.id, id],
    queryFn: ({ signal }) =>
      api<Post>(`/api/v1/community/posts/${id}`, { signal }),
    refetchInterval: (q) =>
      q.state.data?.state === "processing" ? 2000 : 60000,
  });
  const comments = useInfiniteQuery({
    queryKey: ["community", "comments", user?.id, id],
    initialPageParam: "",
    queryFn: ({ pageParam, signal }) =>
      api<Comments>(
        `/api/v1/community/posts/${id}/comments${pageParam ? "?cursor=" + encodeURIComponent(pageParam) : ""}`,
        { signal },
      ),
    getNextPageParam: (p) => p.next_cursor || undefined,
    enabled: post.data?.state === "published",
  });
  const send = useMutation({
    mutationFn: () =>
      api(`/api/v1/community/posts/${id}/comments`, {
        method: "POST",
        body: JSON.stringify({
          body,
          request_id: requestId,
          parent_id: target?.id ?? null,
        }),
      }),
    onSuccess: () => {
      setBody("");
      setTarget(null);
      setRequestId(crypto.randomUUID());
      void client.invalidateQueries({ queryKey: ["community"] });
    },
  });
  const remove = useMutation({
    mutationFn: (commentId: string) =>
      api(`/api/v1/community/comments/${commentId}`, { method: "DELETE" }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ["community"] }),
  });
  return (
    <div className="post-detail">
      <Link to="/app" className="icon-button" aria-label="Kembali ke beranda">
        <ChevronLeft size={24} />
      </Link>
      {post.isPending ? (
        <Loading />
      ) : post.error ? (
        <Failure error={post.error} retry={() => void post.refetch()} />
      ) : (
        <PostCard post={post.data} detail />
      )}
      {post.data?.state === "published" && (
        <section className="comments">
          <h2>Percakapan</h2>
          {target && (
            <div className="reply-target">
              Membalas {target.author}
              <button
                className="icon-button"
                aria-label="Batalkan balasan"
                onClick={() => {
                  setTarget(null);
                  setBody("");
                  setRequestId(crypto.randomUUID());
                }}
              >
                <X size={18} />
              </button>
            </div>
          )}
          {user ? (
            <form
              className="comment-composer"
              onSubmit={(e) => {
                e.preventDefault();
                send.mutate();
              }}
            >
              <Smile size={24} aria-hidden="true" />
              <label className="sr-only" htmlFor="comment-body">
                Komentar
              </label>
              <textarea
                ref={input}
                id="comment-body"
                placeholder="Tambahkan komentar…"
                rows={1}
                value={body}
                onChange={(e) => {
                  setBody(e.target.value);
                  setRequestId(crypto.randomUUID());
                }}
                maxLength={1000}
                required
              />
              <button
                className="text-button"
                aria-label="Kirim komentar"
                disabled={send.isPending || !body.trim()}
              >
                {send.isPending ? "Mengirim…" : "Kirim"}
              </button>
            </form>
          ) : (
            <Link
              className="button secondary"
              to={`/login?returnTo=${encodeURIComponent(`/community/${id}`)}`}
            >
              Masuk untuk berkomentar
            </Link>
          )}
          {send.error && <Failure error={send.error} />}{" "}
          {remove.error && <Failure error={remove.error} />}{" "}
          {comments.isPending ? (
            <Loading />
          ) : comments.error ? (
            <Failure
              error={comments.error}
              retry={() => void comments.refetch()}
            />
          ) : (
            <>
              {comments.data.pages
                .flatMap((p) => p.comments)
                .map((c) => (
                  <CommentThread
                    key={c.id}
                    comment={c}
                    postId={id!}
                    busy={remove.isPending}
                    reply={(root: Comment, author: string) => {
                      if (!user) {
                        window.location.assign(
                          `/login?returnTo=${encodeURIComponent(`/community/${id}`)}`,
                        );
                        return;
                      }
                      setTarget({ id: root.id, author });
                      setBody(`@${author} `);
                      setRequestId(crypto.randomUUID());
                      input.current?.focus();
                    }}
                    remove={(item) => {
                      if (
                        window.confirm(
                          item.parent_id === null && item.reply_count > 0
                            ? "Hapus komentar beserta semua balasannya?"
                            : "Hapus komentar ini?",
                        )
                      )
                        remove.mutate(item.id);
                    }}
                  />
                ))}
              {comments.hasNextPage && (
                <button
                  className="button secondary"
                  onClick={() => void comments.fetchNextPage()}
                  disabled={comments.isFetchingNextPage}
                >
                  Komentar sebelumnya
                </button>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
