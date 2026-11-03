import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { Comment, Comments } from "../../shared/community";
import { api } from "./api";
import { useSession } from "./session";
import { IconAction } from "./BrandHeader";
import { Button, ErrorText, Loading, styles, colors } from "./ui";
export default function CommentThread({
  comment,
  postId,
  version,
  reply,
  remove,
  busy,
}: {
  comment: Comment;
  postId: string;
  version: number;
  reply: (root: Comment, author: string) => void;
  remove: (comment: Comment) => void;
  busy: boolean;
}) {
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Comment[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void api<Comments>(
      `/api/v1/community/posts/${postId}/comments?parent_id=${comment.id}`,
      { signal: controller.signal },
    )
      .then((r) => {
        setItems(r.comments);
        setCursor(r.next_cursor);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError((e as Error).message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [open, postId, comment.id, version, retry]);
  async function more() {
    if (loading || !cursor) return;
    setLoading(true);
    setError("");
    try {
      const r = await api<Comments>(
        `/api/v1/community/posts/${postId}/comments?parent_id=${comment.id}&cursor=${encodeURIComponent(cursor)}`,
      );
      setItems((old) => [...old, ...r.comments]);
      setCursor(r.next_cursor);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  function item(c: Comment) {
    return (
      <View
        key={c.id}
        style={[styles.row, { alignItems: "flex-start", paddingVertical: 10 }]}
      >
        <View
          style={{
            width: 30,
            height: 30,
            borderRadius: 15,
            backgroundColor: "#E4EFE5",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={styles.label}>{c.author_name[0]}</Text>
        </View>
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={[styles.text, { fontFamily: "Manrope_700" }]}>
            {c.author_name}
          </Text>
          <Text style={[styles.text, { color: colors.ink }]}>{c.body}</Text>
          <Text style={styles.label}>
            {new Date(c.created_at).toLocaleDateString("id-ID")}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Balas komentar ${c.author_name}`}
            onPress={() => reply(comment, c.author_name)}
            style={{
              minHeight: 44,
              justifyContent: "center",
              alignSelf: "flex-start",
              paddingRight: 16,
            }}
          >
            <Text style={[styles.label, { color: colors.accent }]}>Balas</Text>
          </Pressable>
        </View>
        {(c.is_owner || user?.role === "admin") && (
          <IconAction
            name="trash-outline"
            destructive
            label="Hapus komentar"
            disabled={busy}
            onPress={() => remove(c)}
          />
        )}
      </View>
    );
  }
  return (
    <View style={{ borderBottomWidth: 1, borderColor: colors.border }}>
      {item(comment)}
      {comment.reply_count > 0 && (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen(!open)}
          style={{ minHeight: 44, justifyContent: "center", marginLeft: 40 }}
        >
          <Text style={[styles.label, { color: colors.accent }]}>
            {open
              ? "Sembunyikan balasan"
              : `Lihat ${comment.reply_count} balasan`}
          </Text>
        </Pressable>
      )}
      {open && (
        <View
          style={{
            marginLeft: 20,
            paddingLeft: 10,
            borderLeftWidth: 1,
            borderColor: colors.border,
          }}
        >
          {loading && !items.length ? <Loading /> : items.map(item)}
          <ErrorText message={error} />
          {error && (
            <Button
              secondary
              title="Coba muat balasan"
              onPress={() => setRetry((v) => v + 1)}
            />
          )}
          {cursor && (
            <Button
              secondary
              title="Balasan sebelumnya"
              disabled={loading}
              onPress={() => void more()}
            />
          )}
        </View>
      )}
    </View>
  );
}
