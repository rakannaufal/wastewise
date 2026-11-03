import { useState } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Heart, MessageCircle, MapPin, Camera } from "lucide-react";
import { api } from "../api";
import { useAuth } from "../Auth";
import { categoryName, date, Failure, Loading, StatusBadge } from "../ui";
import RegionFilters, { communityParams } from "../components/RegionFilters";
import type { Feed, Post, Comments } from "../../../shared/community";
export function PostCard({
  post,
  detail = false,
}: {
  post: Post;
  detail?: boolean;
}) {
  const client = useQueryClient();
  const [error, setError] = useState<Error | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [caption, setCaption] = useState(post.caption);
  const [reason, setReason] = useState("");
  const { user } = useAuth();
  const action = useMutation({
    mutationFn: async ({
      path,
      method,
      body,
    }: {
      path: string;
      method: string;
      body?: object;
    }) =>
      api(`/api/v1/${path}`, {
        method,
        body: body ? JSON.stringify(body) : undefined,
      }),
    onSuccess: () => {
      setError(null);
      setEditing(false);
      setReason("");
      void client.invalidateQueries({ queryKey: ["community"] });
    },
    onError: (e) => setError(e),
  });
  const mutate = (suffix: string, method: string, body?: object) =>
    action.mutate({
      path: `community/posts/${post.id}${suffix}`,
      method,
      body,
    });
  return (
    <article className="post-card">
      <header>
        <span className="avatar" aria-hidden="true">
          {post.author_name[0]}
        </span>
        <div>
          <strong>{post.author_name}</strong>
          <small>{date(post.created_at)}</small>
        </div>
        <StatusBadge value={post.status} />
      </header>
      {post.image_url && !imageFailed ? (
        <Link
          to={`/community/${post.id}`}
          aria-label={`Lihat foto ${categoryName(post.category)}`}
        >
          <img
            className="post-photo"
            src={post.image_url}
            alt={`Sampah ${categoryName(post.category)}`}
            loading="lazy"
            width="720"
            height="540"
            onError={() => setImageFailed(true)}
          />
        </Link>
      ) : (
        <div className="post-processing" role="status">
          {imageFailed
            ? "Foto belum dapat dimuat. Coba muat ulang posting."
            : post.state === "processing"
              ? "Foto sedang disiapkan. Laporanmu sudah tersimpan."
              : post.state === "hidden"
                ? "Posting disembunyikan moderator."
                : "Publikasi sudah dicabut. Laporan privat tetap tersimpan."}
        </div>
      )}
      <div className="post-body">
        <div className="post-material">
          {categoryName(post.category)}
          {post.classification_state === "needs_review" && (
            <small> · Menunggu review AI</small>
          )}
        </div>
        <p className="post-caption">{post.caption}</p>
        <p className="post-location">
          <MapPin size={16} />
          {post.location_label || "Nama wilayah belum terverifikasi"}
        </p>
        <small>
          GPS {post.latitude.toFixed(5)}, {post.longitude.toFixed(5)}
          {post.location_accuracy_m !== null
            ? ` · ±${Math.round(post.location_accuracy_m)} m`
            : ""}
        </small>
        <div className="post-actions">
          <button
            disabled={action.isPending || post.state !== "published"}
            aria-pressed={post.liked_by_me}
            onClick={() => mutate("/like", post.liked_by_me ? "DELETE" : "PUT")}
          >
            <Heart
              size={21}
              fill={post.liked_by_me ? "currentColor" : "none"}
            />
            {post.like_count} suka
          </button>
          <Link to={`/community/${post.id}`}>
            <MessageCircle size={21} />
            {post.comment_count} komentar
          </Link>
        </div>
        {detail && (
          <>
            {post.is_owner && (
              <div className="post-owner">
                <button
                  className="text-button"
                  onClick={() => setEditing(!editing)}
                >
                  Edit deskripsi
                </button>
                <button
                  className="text-button"
                  disabled={action.isPending}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Tarik foto dan GPS dari komunitas? Laporan privat tetap tersimpan.",
                      )
                    )
                      mutate("", "DELETE");
                  }}
                >
                  Batalkan publikasi
                </button>
              </div>
            )}
            {editing && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  mutate("", "PATCH", { caption, revision: post.revision });
                }}
              >
                <label>
                  Deskripsi
                  <textarea
                    value={caption}
                    minLength={10}
                    maxLength={5000}
                    onChange={(e) => setCaption(e.target.value)}
                    required
                  />
                </label>
                <button className="button primary" disabled={action.isPending}>
                  Simpan deskripsi
                </button>
              </form>
            )}
            <details>
              <summary>Laporkan konten</summary>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  action.mutate({
                    path: "community/flags",
                    method: "POST",
                    body: { post_id: post.id, reason },
                  });
                }}
              >
                <label>
                  Alasan
                  <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    minLength={5}
                    maxLength={1000}
                    required
                  />
                </label>
                <button
                  className="button secondary"
                  disabled={action.isPending}
                >
                  Kirim ke moderator
                </button>
              </form>
            </details>
            {user?.role === "admin" && (
              <form
                className="moderation"
                onSubmit={(e) => {
                  e.preventDefault();
                  action.mutate({
                    path: `admin/community/posts/${post.id}`,
                    method: "PATCH",
                    body: {
                      state: post.state === "hidden" ? "published" : "hidden",
                      reason,
                      revision: post.revision,
                    },
                  });
                }}
              >
                <label>
                  Alasan moderasi
                  <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    minLength={5}
                    maxLength={1000}
                    required
                  />
                </label>
                <button
                  className="button secondary"
                  disabled={action.isPending}
                >
                  {post.state === "hidden"
                    ? "Pulihkan posting"
                    : "Sembunyikan posting"}
                </button>
              </form>
            )}
          </>
        )}
        {error && <Failure error={error} />}
      </div>
    </article>
  );
}
export default function Community() {
  const [params] = useSearchParams();
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
      <div className="page-heading">
        <div>
          <h1>Kabar dari sekitar.</h1>
          <p>Temukan laporan, dukung langkah baik di lingkunganmu.</p>
        </div>
        <Link className="button primary" to="/reports/new">
          <Camera size={18} />
          Buat laporan
        </Link>
      </div>
      <div className="community-layout">
        <div>
          <RegionFilters />
          {feed.isPending ? (
            <Loading />
          ) : feed.error ? (
            <Failure error={feed.error} retry={() => void feed.refetch()} />
          ) : posts.length === 0 ? (
            <div className="community-empty">
              <MapPin size={32} />
              <h2>Belum ada cerita di sini.</h2>
              <p>
                Coba wilayah lain, atau bagikan laporan pertamamu. Laporan
                privat tidak tampil di beranda.
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
                    : "Lihat laporan berikutnya"}
                </button>
              )}
            </div>
          )}
        </div>
        <aside className="community-aside">
          <h2>
            Lingkunganmu,
            <br />
            langkah kecilmu.
          </h2>
          <p>
            AI membantu mengenali material. Pengelola menindaklanjuti laporan.
            Kamu bisa mengikuti perkembangannya.
          </p>
          <Link to={"/map?" + params.toString()}>Jelajahi peta</Link>
          <p className="privacy-note">
            Posting hanya terlihat oleh pengguna yang masuk. GPS presisi ikut
            terlihat saat kamu memilih membagikan laporan.
          </p>
          <Link to="/onboarding">Cara memakai WasteWise</Link>
        </aside>
      </div>
    </>
  );
}
export function PostDetail() {
  const { id } = useParams();
  const client = useQueryClient();
  const { user } = useAuth();
  const [body, setBody] = useState("");
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
        body: JSON.stringify({ body, request_id: requestId }),
      }),
    onSuccess: () => {
      setBody("");
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
      <Link to="/app">Kembali ke beranda</Link>
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
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send.mutate();
            }}
          >
            <label>
              Komentar
              <textarea
                value={body}
                onChange={(e) => {
                  setBody(e.target.value);
                  setRequestId(crypto.randomUUID());
                }}
                maxLength={1000}
                required
              />
            </label>
            <button
              className="button primary"
              disabled={send.isPending || !body.trim()}
            >
              {send.isPending ? "Mengirim…" : "Kirim komentar"}
            </button>
          </form>
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
                  <article key={c.id} className="comment">
                    <strong>{c.author_name}</strong>
                    <small>{date(c.created_at)}</small>
                    <p>{c.body}</p>
                    {(c.is_owner || user?.role === "admin") && (
                      <button
                        className="text-button"
                        disabled={remove.isPending}
                        onClick={() => {
                          if (window.confirm("Hapus komentar ini?"))
                            remove.mutate(c.id);
                        }}
                      >
                        Hapus komentar
                      </button>
                    )}
                  </article>
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
