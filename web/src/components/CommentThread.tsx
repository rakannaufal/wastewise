import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { api } from "../api";
import { useAuth } from "../Auth";
import { date, Failure, Loading } from "../ui";
import type { Comment, Comments } from "../../../shared/community";
export default function CommentThread({
  comment,
  postId,
  reply,
  remove,
  busy,
}: {
  comment: Comment;
  postId: string;
  reply: (root: Comment, author: string) => void;
  remove: (comment: Comment) => void;
  busy: boolean;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const replies = useInfiniteQuery({
    queryKey: ["community", "replies", user?.id, postId, comment.id],
    initialPageParam: "",
    queryFn: ({ pageParam, signal }) =>
      api<Comments>(
        `/api/v1/community/posts/${postId}/comments?parent_id=${comment.id}${pageParam ? "&cursor=" + encodeURIComponent(pageParam) : ""}`,
        { signal },
      ),
    getNextPageParam: (p) => p.next_cursor || undefined,
    enabled: open,
  });
  function item(c: Comment) {
    return (
      <article className="comment" key={c.id}>
        <span className="avatar" aria-hidden="true">
          {c.author_name[0]}
        </span>
        <div className="comment-content">
          <strong>{c.author_name}</strong>
          <small>{date(c.created_at)}</small>
          <p>{c.body}</p>
          <button
            className="text-button comment-reply"
            onClick={() => reply(comment, c.author_name)}
          >
            Balas
          </button>
        </div>
        {(c.is_owner || user?.role === "admin") && (
          <button
            className="icon-button"
            aria-label="Hapus komentar"
            disabled={busy}
            onClick={() => remove(c)}
          >
            <Trash2 size={18} />
          </button>
        )}
      </article>
    );
  }
  return (
    <div className="comment-thread">
      {item(comment)}
      {comment.reply_count > 0 && (
        <button
          className="text-button thread-toggle"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open
            ? "Sembunyikan balasan"
            : `Lihat ${comment.reply_count} balasan`}
        </button>
      )}
      {open && (
        <div className="comment-replies">
          {replies.isPending ? (
            <Loading />
          ) : replies.error ? (
            <Failure
              error={replies.error}
              retry={() => void replies.refetch()}
            />
          ) : (
            <>
              {replies.data.pages.flatMap((p) => p.comments).map(item)}
              {replies.hasNextPage && (
                <button
                  className="text-button"
                  disabled={replies.isFetchingNextPage}
                  onClick={() => void replies.fetchNextPage()}
                >
                  Balasan sebelumnya
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
