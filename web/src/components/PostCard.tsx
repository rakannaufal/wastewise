import { memo, useEffect, useState } from "react";
import {
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Heart, MessageCircle, MapPin } from "lucide-react";
import { api } from "../api";
import { useAuth } from "../Auth";
import { categoryName, date, Failure } from "../ui";
import PostMenu from "./PostMenu";
import type { Feed, Post } from "../../../shared/community";
function PostCard({ post, detail = false }: { post: Post; detail?: boolean }) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const [error, setError] = useState<Error | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [flagging, setFlagging] = useState(false);
  const [liked, setLiked] = useState(post.liked_by_me);
  const [likes, setLikes] = useState(post.like_count);
  const [liking, setLiking] = useState(false);
  const [pop, setPop] = useState(0);
  const [editing, setEditing] = useState(false);
  const [caption, setCaption] = useState(post.caption);
  const [reason, setReason] = useState("");
  const { user } = useAuth();
  useEffect(() => setImageFailed(false), [post.image_url]);
  useEffect(() => {
    setLiked(post.liked_by_me);
    setLikes(post.like_count);
  }, [post.liked_by_me, post.like_count]);
  async function like() {
    if (!user) {
      navigate(
        `/login?returnTo=${encodeURIComponent(`/community/${post.id}`)}`,
      );
      return;
    }
    if (liking) return;
    const before = { liked, likes };
    const next = !liked;
    setLiked(next);
    setLikes(Math.max(0, likes + (next ? 1 : -1)));
    setLiking(true);
    setError(null);
    if (next) setPop((v) => v + 1);
    try {
      await api(`/api/v1/community/posts/${post.id}/like`, {
        method: next ? "PUT" : "DELETE",
      });
      const patch = (p: Post) =>
        p.id === post.id
          ? {
              ...p,
              liked_by_me: next,
              like_count: Math.max(0, before.likes + (next ? 1 : -1)),
            }
          : p;
      client.setQueriesData<InfiniteData<Feed>>(
        { queryKey: ["community", "feed"] },
        (old) =>
          old
            ? {
                ...old,
                pages: old.pages.map((page) => ({
                  ...page,
                  posts: page.posts.map(patch),
                })),
              }
            : old,
      );
      client.setQueriesData<Feed>(
        { queryKey: ["community", "preview"] },
        (old) => (old ? { ...old, posts: old.posts.map(patch) } : old),
      );
      client.setQueriesData<Post>({ queryKey: ["community", "post"] }, (old) =>
        old ? patch(old) : old,
      );
    } catch (e) {
      setLiked(before.liked);
      setLikes(before.likes);
      setError(e as Error);
    } finally {
      setLiking(false);
    }
  }
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
      setFlagging(false);
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
        <PostMenu
          owner={post.is_owner}
          disabled={action.isPending}
          edit={() => {
            setCaption(post.caption);
            setEditing(!editing);
            setFlagging(false);
          }}
          remove={() => {
            if (
              window.confirm(
                "Hapus posting dari komunitas? Laporan tetap tersimpan di riwayat.",
              )
            )
              mutate("", "DELETE");
          }}
          report={() => {
            if (!user)
              navigate(
                `/login?returnTo=${encodeURIComponent(`/community/${post.id}`)}`,
              );
            else {
              setFlagging(!flagging);
              setEditing(false);
            }
          }}
        />
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
            decoding="async"
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
        {post.caption && (
          <p
            className={
              detail ? "post-caption" : "post-caption post-caption-preview"
            }
          >
            {post.caption}
          </p>
        )}
        {!detail && post.caption.length > 140 && (
          <Link className="text-button" to={`/community/${post.id}`}>
            Baca selengkapnya
          </Link>
        )}
        <p className="post-location">
          <MapPin size={16} />
          {post.location_label || "Nama wilayah belum terverifikasi"}
        </p>
        <small>
          GPS {post.latitude.toFixed(6)}, {post.longitude.toFixed(6)}
          {post.location_accuracy_m !== null
            ? ` · ±${Math.round(post.location_accuracy_m)} m`
            : ""}
        </small>
        <Link
          className="text-button"
          to={`/map?lat=${post.latitude}&lng=${post.longitude}`}
        >
          Lihat di peta
        </Link>
        <div className="post-actions">
          <button
            className={liked ? "like-action is-liked" : "like-action"}
            disabled={liking || post.state !== "published"}
            aria-pressed={liked}
            onClick={() => void like()}
          >
            <Heart
              key={pop}
              className={liked && pop ? "heart-pop" : ""}
              size={23}
              fill={liked ? "currentColor" : "none"}
            />
            {likes} suka
          </button>
          <Link to={`/community/${post.id}`}>
            <MessageCircle size={21} />
            {post.comment_count} komentar
          </Link>
        </div>
        <>
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
                  maxLength={5000}
                  onChange={(e) => setCaption(e.target.value)}
                />
              </label>
              <button className="button primary" disabled={action.isPending}>
                Simpan deskripsi
              </button>
            </form>
          )}
          {user && flagging && (
            <div className="post-inline-form">
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
            </div>
          )}
          {detail && user?.role === "admin" && (
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
              <button className="button secondary" disabled={action.isPending}>
                {post.state === "hidden"
                  ? "Pulihkan posting"
                  : "Sembunyikan posting"}
              </button>
            </form>
          )}
        </>
        {error && <Failure error={error} />}
      </div>
    </article>
  );
}

export default memo(PostCard);
