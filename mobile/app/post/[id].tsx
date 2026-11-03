import Ionicons from "@expo/vector-icons/Ionicons";
import { BackButton, IconAction } from "../../src/BrandHeader";
import { useCallback, useEffect, useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as Crypto from "expo-crypto";
import { api } from "../../src/api";
import { useSession } from "../../src/session";
import {
  Button,
  ErrorText,
  Input,
  Loading,
  Screen,
  styles,
  colors,
} from "../../src/ui";
import PostCard from "../../src/PostCard";
import type { Post, Comment, Comments } from "../../../shared/community";
export default function PostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [caption, setCaption] = useState("");
  const [editing, setEditing] = useState(false);
  const [reason, setReason] = useState("");
  const [flagging, setFlagging] = useState(false);
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
        setRequestId(Crypto.randomUUID());
      }
      setEditing(false);
      await load();
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
          {post.is_owner && (
            <>
              <View style={[styles.row, { justifyContent: "flex-end" }]}>
                <IconAction
                  name="create-outline"
                  label="Edit deskripsi"
                  onPress={() => {
                    setCaption(post.caption);
                    setEditing(!editing);
                  }}
                />
                <IconAction
                  name="trash-outline"
                  destructive
                  label="Batalkan publikasi"
                  disabled={busy}
                  onPress={() =>
                    Alert.alert(
                      "Tarik posting?",
                      "Foto dan GPS dihapus dari komunitas. Laporan privat tetap tersimpan.",
                      [
                        { text: "Batal", style: "cancel" },
                        {
                          text: "Tarik posting",
                          style: "destructive",
                          onPress: () =>
                            void mutate(`community/posts/${id}`, "DELETE"),
                        },
                      ],
                    )
                  }
                />
              </View>
              {editing && (
                <>
                  <Input
                    label="Deskripsi posting"
                    multiline
                    value={caption}
                    onChangeText={setCaption}
                    maxLength={5000}
                  />
                  <Button
                    title="Simpan deskripsi"
                    disabled={busy || caption.trim().length > 5000}
                    onPress={() =>
                      void mutate(`community/posts/${id}`, "PATCH", {
                        caption,
                        revision: post.revision,
                      })
                    }
                  />
                </>
              )}
            </>
          )}
          {post.state === "published" && (
            <>
              <Text style={styles.heading}>Percakapan</Text>
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
                    })
                  }
                />
              </View>
              {comments.map((c) => (
                <View
                  key={c.id}
                  style={[
                    styles.row,
                    {
                      alignItems: "flex-start",
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      backgroundColor: "#E4EFE5",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={[styles.label, { color: colors.accent }]}>
                      {c.author_name[0]}
                    </Text>
                  </View>
                  <View style={{ flex: 1, gap: 5 }}>
                    <Text
                      style={[
                        styles.text,
                        { fontFamily: "Manrope_700", color: colors.ink },
                      ]}
                    >
                      {c.author_name}
                    </Text>
                    <Text style={[styles.text, { color: colors.ink }]}>
                      {c.body}
                    </Text>
                    <Text style={styles.label}>
                      {new Date(c.created_at).toLocaleDateString("id-ID")}
                    </Text>
                  </View>
                  {(c.is_owner || user?.role === "admin") && (
                    <IconAction
                      name="trash-outline"
                      destructive
                      label="Hapus komentar"
                      disabled={busy}
                      onPress={() =>
                        Alert.alert(
                          "Hapus komentar?",
                          "Komentar tidak akan terlihat lagi.",
                          [
                            { text: "Batal", style: "cancel" },
                            {
                              text: "Hapus",
                              style: "destructive",
                              onPress: () =>
                                void mutate(
                                  `community/comments/${c.id}`,
                                  "DELETE",
                                ),
                            },
                          ],
                        )
                      }
                    />
                  )}
                </View>
              ))}
              {cursor && (
                <Button
                  secondary
                  title="Komentar sebelumnya"
                  disabled={busy}
                  onPress={() => void more()}
                />
              )}
              <IconAction
                name="flag-outline"
                label="Laporkan konten"
                onPress={() => setFlagging(!flagging)}
              />
              {flagging && (
                <>
                  <Input
                    label="Alasan laporan konten"
                    value={reason}
                    onChangeText={setReason}
                    maxLength={1000}
                  />
                  <Button
                    secondary
                    title="Laporkan ke moderator"
                    disabled={busy || reason.trim().length < 5}
                    onPress={() =>
                      void mutate("community/flags", "POST", {
                        post_id: id,
                        reason,
                      })
                    }
                  />
                </>
              )}
            </>
          )}
        </>
      )}
    </Screen>
  );
}
