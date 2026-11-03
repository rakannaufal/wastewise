import Ionicons from "@expo/vector-icons/Ionicons";
import { BackButton, IconAction, confirmAction } from "../../src/BrandHeader";
import { useCallback, useEffect, useRef, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as Crypto from "expo-crypto";
import { api } from "../../src/api";
import {
  Button,
  ErrorText,
  Loading,
  Screen,
  styles,
  colors,
} from "../../src/ui";
import PostCard from "../../src/PostCard";
import CommentThread from "../../src/CommentThread";
import type { Post, Comment, Comments } from "../../../shared/community";
export default function PostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [target, setTarget] = useState<{ id: string; author: string } | null>(
    null,
  );
  const [version, setVersion] = useState(0);
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);
  const [requestId, setRequestId] = useState(() => Crypto.randomUUID());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const p = await api<Post>(`/api/v1/community/posts/${id}`);
      setPost(p);
      if (p.state === "published") {
        const c = await api<Comments>(`/api/v1/community/posts/${id}/comments`);
        setComments(c.comments);
        setCursor(c.next_cursor);
      }
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (!post) return;
    const timer = setInterval(
      () => void load(),
      post.state === "processing" ? 2000 : 60000,
    );
    return () => clearInterval(timer);
  }, [post?.state, load]);
  async function mutate(path: string, method: string, data?: object) {
    setBusy(true);
    setError("");
    try {
      await api(`/api/v1/${path}`, {
        method,
        body: data ? JSON.stringify(data) : undefined,
      });
      if (path.endsWith("/comments") && method === "POST") {
        setBody("");
        setTarget(null);
        setRequestId(Crypto.randomUUID());
      }
      await load();
      setVersion((v) => v + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function more() {
    if (!cursor) return;
    setBusy(true);
    try {
      const r = await api<Comments>(
        `/api/v1/community/posts/${id}/comments?cursor=${encodeURIComponent(cursor)}`,
      );
      setComments((v) => [...v, ...r.comments]);
      setCursor(r.next_cursor);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <BackButton
        onPress={() =>
          router.canGoBack() ? router.back() : router.replace("/")
        }
      />
      <ErrorText message={error} />
      {!post ? (
        error ? (
          <Button title="Coba kembali" onPress={() => void load()} />
        ) : (
          <Loading />
        )
      ) : (
        <>
          <PostCard post={post} reload={() => void load()} detail />
          {post.state === "published" && (
            <>
              <Text style={styles.heading}>Percakapan</Text>
              {target && (
                <View
                  style={[
                    styles.row,
                    {
                      justifyContent: "space-between",
                      backgroundColor: "#edf3ee",
                      paddingLeft: 12,
                      borderRadius: 8,
                    },
                  ]}
                >
                  <Text style={styles.label}>Membalas {target.author}</Text>
                  <IconAction
                    name="close"
                    label="Batalkan balasan"
                    onPress={() => {
                      setTarget(null);
                      setBody("");
                      setRequestId(Crypto.randomUUID());
                    }}
                  />
                </View>
              )}
              <View
                style={[
                  styles.row,
                  {
                    gap: 10,
                    borderTopWidth: 1,
                    borderBottomWidth: 1,
                    borderColor: colors.border,
                    paddingVertical: 10,
                  },
                ]}
              >
                <Ionicons
                  name="happy-outline"
                  size={25}
                  color={colors.muted}
                  accessible={false}
                />
                <TextInput
                  ref={input}
                  accessibilityLabel="Komentar"
                  placeholder="Tambahkan komentar…"
                  placeholderTextColor={colors.muted}
                  multiline
                  value={body}
                  maxLength={1000}
                  style={[
                    styles.text,
                    {
                      flex: 1,
                      minHeight: 44,
                      maxHeight: 120,
                      paddingVertical: 10,
                      color: colors.ink,
                    },
                  ]}
                  onChangeText={(v) => {
                    setBody(v);
                    setRequestId(Crypto.randomUUID());
                  }}
                />
                <IconAction
                  name="send-outline"
                  label={busy ? "Mengirim komentar" : "Kirim komentar"}
                  disabled={busy || !body.trim()}
                  onPress={() =>
                    void mutate(`community/posts/${id}/comments`, "POST", {
                      body,
                      request_id: requestId,
                      parent_id: target?.id ?? null,
                    })
                  }
                />
              </View>
              {comments.map((c) => (
                <CommentThread
                  key={c.id}
                  comment={c}
                  postId={id}
                  version={version}
                  busy={busy}
                  reply={(root, author) => {
                    setTarget({ id: root.id, author });
                    setBody(`@${author} `);
                    setRequestId(Crypto.randomUUID());
                    input.current?.focus();
                  }}
                  remove={(item) =>
                    confirmAction(
                      "Hapus komentar?",
                      item.parent_id === null && item.reply_count > 0
                        ? "Komentar beserta semua balasannya tidak akan terlihat lagi."
                        : "Komentar tidak akan terlihat lagi.",
                      () =>
                        void mutate(`community/comments/${item.id}`, "DELETE"),
                    )
                  }
                />
              ))}
              {cursor && (
                <Button
                  secondary
                  title="Komentar sebelumnya"
                  disabled={busy}
                  onPress={() => void more()}
                />
              )}
            </>
          )}
        </>
      )}
    </Screen>
  );
}
