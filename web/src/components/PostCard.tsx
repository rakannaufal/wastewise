import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Heart, MessageCircle, MapPin, Pencil, Trash2 } from "lucide-react";
import { api } from "../api";
import { useAuth } from "../Auth";
import { categoryName, date, Failure } from "../ui";
import type { Post } from "../../../shared/community";
export default function PostCard({
  post,
  detail = false,
}: {
  post: Post;
  detail?: boolean;
}) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const [error, setError] = useState<Error | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [caption, setCaption] = useState(post.caption);
  const [reason, setReason] = useState("");
  const { user } = useAuth();
  useEffect(() => setImageFailed(false), [post.image_url]);
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
            disabled={action.isPending || post.state !== "published"}
            aria-pressed={post.liked_by_me}
            onClick={() =>
              user
                ? mutate("/like", post.liked_by_me ? "DELETE" : "PUT")
                : navigate(
                    `/login?returnTo=${encodeURIComponent(`/community/${post.id}`)}`,
                  )
            }
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
                  className="icon-button"
                  aria-label="Edit deskripsi"
                  title="Edit deskripsi"
                  onClick={() => setEditing(!editing)}
                >
                  <Pencil size={19} />
                </button>
                <button
                  className="icon-button"
                  aria-label="Batalkan publikasi"
                  title="Batalkan publikasi"
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
                  <Trash2 size={19} />
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
                    maxLength={5000}
                    onChange={(e) => setCaption(e.target.value)}
                  />
                </label>
                <button className="button primary" disabled={action.isPending}>
                  Simpan deskripsi
                </button>
              </form>
            )}
            {user && (
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
            )}
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
