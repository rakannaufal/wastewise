import { memo, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Image,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import type { Post } from "../../shared/community";
import { api } from "./api";
import PostMenu from "./PostMenu";
import { confirmAction } from "./BrandHeader";
import { Button, Input, categoryName, styles, colors, ErrorText } from "./ui";
function PostCard({
  post,
  reload,
  detail = false,
}: {
  post: Post;
  reload: () => void;
  detail?: boolean;
}) {
  const [liked, setLiked] = useState(post.liked_by_me);
  const [likes, setLikes] = useState(post.like_count);
  const [editing, setEditing] = useState(false);
  const [flagging, setFlagging] = useState(false);
  const [caption, setCaption] = useState(post.caption);
  const [reason, setReason] = useState("");
  const scale = useRef(new Animated.Value(1)).current;
  const reduced = useRef(false);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) reduced.current = v;
    });
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (v) => {
        reduced.current = v;
      },
    );
    return () => {
      mounted = false;
      subscription.remove();
      scale.stopAnimation();
    };
  }, [scale]);
  useEffect(() => {
    setLiked(post.liked_by_me);
    setLikes(post.like_count);
  }, [post.liked_by_me, post.like_count]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [post.image_url]);
  async function like() {
    if (busy) return;
    const before = { liked, likes };
    const next = !liked;
    setLiked(next);
    setLikes(Math.max(0, likes + (next ? 1 : -1)));
    setBusy(true);
    setError("");
    if (next && !reduced.current) {
      scale.stopAnimation();
      scale.setValue(1);
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.22,
          duration: 100,
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.spring(scale, {
          toValue: 1,
          speed: 20,
          bounciness: 6,
          useNativeDriver: Platform.OS !== "web",
        }),
      ]).start();
    }
    try {
      await api(`/api/v1/community/posts/${post.id}/like`, {
        method: next ? "PUT" : "DELETE",
      });
    } catch (e) {
      setLiked(before.liked);
      setLikes(before.likes);
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function action(path: string, method: string, body?: object) {
    setBusy(true);
    setError("");
    try {
      await api(`/api/v1/${path}`, {
        method,
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      setEditing(false);
      setFlagging(false);
      setReason("");
      reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <View
      testID={`post-${post.id}`}
      style={{
        backgroundColor: "#fff",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: "hidden",
        marginBottom: 16,
      }}
    >
      <View style={{ padding: 16, gap: 5, zIndex: 5 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <Text
            style={[
              styles.heading,
              {
                flex: 1,
                fontSize: 16,
                lineHeight: 24,
                fontFamily: "Manrope_600",
              },
            ]}
          >
            {post.author_name}
          </Text>
          <PostMenu
            owner={post.is_owner}
            disabled={busy}
            edit={() => {
              setCaption(post.caption);
              setEditing(!editing);
              setFlagging(false);
            }}
            remove={() =>
              confirmAction(
                "Tarik posting?",
                "Foto dan GPS dihapus dari komunitas. Laporan privat tetap tersimpan.",
                () => void action(`community/posts/${post.id}`, "DELETE"),
              )
            }
            report={() => {
              setFlagging(!flagging);
              setEditing(false);
            }}
          />
        </View>
        <Text style={styles.label}>
          {new Date(post.created_at).toLocaleDateString("id-ID")}
        </Text>
      </View>
      {post.image_url && !failed ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Buka foto dan percakapan"
          onPress={() => router.push(`/post/${post.id}`)}
        >
          <Image
            source={{ uri: post.image_url }}
            style={{
              width: "100%",
              aspectRatio: 4 / 3,
              backgroundColor: "#edf2ec",
            }}
            resizeMode="contain"
            accessibilityLabel={`Sampah ${categoryName(post.category)}`}
            onError={() => setFailed(true)}
          />
        </Pressable>
      ) : (
        <View style={{ padding: 28, backgroundColor: "#edf2ec" }}>
          <Text style={styles.text}>
            {failed
              ? "Foto belum dapat dimuat. Tarik beranda untuk memperbarui tautan."
              : post.state === "processing"
                ? "Foto sedang disiapkan. Laporan sudah tersimpan."
                : post.state === "hidden"
                  ? "Posting disembunyikan moderator."
                  : "Publikasi sudah dicabut."}
          </Text>
        </View>
      )}
      <View style={{ padding: 16, gap: 12 }}>
        <Text style={[styles.label, { color: colors.accent }]}>
          {categoryName(post.category)}
          {post.classification_state === "needs_review"
            ? " · Perlu review"
            : ""}
        </Text>
        {post.caption ? (
          <Text
            numberOfLines={detail ? undefined : 3}
            style={[styles.text, { color: colors.ink }]}
          >
            {post.caption}
          </Text>
        ) : null}
        {!detail && post.caption.length > 140 && (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/post/${post.id}`)}
            style={{ minHeight: 44, justifyContent: "center" }}
          >
            <Text style={[styles.label, { color: colors.accent }]}>
              Baca selengkapnya
            </Text>
          </Pressable>
        )}
        <Text style={styles.text}>
          {post.location_label || "Nama wilayah belum terverifikasi"}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Lihat lokasi di peta"
          onPress={() =>
            router.push({
              pathname: "/map",
              params: { lat: post.latitude, lng: post.longitude },
            })
          }
          style={{
            minHeight: 44,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Ionicons name="location-outline" size={18} color={colors.accent} />
          <Text style={[styles.label, { color: colors.accent }]}>
            Lihat di peta
          </Text>
        </Pressable>
        <Text style={styles.label}>
          GPS {post.latitude.toFixed(6)}, {post.longitude.toFixed(6)}
          {post.location_accuracy_m !== null
            ? ` · ±${Math.round(post.location_accuracy_m)} m`
            : ""}
        </Text>
        <View
          style={{
            flexDirection: "row",
            gap: 22,
            borderTopWidth: 1,
            borderColor: colors.border,
            paddingTop: 8,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={liked ? "Batalkan suka" : "Sukai posting"}
            accessibilityState={{ selected: liked, disabled: busy }}
            disabled={busy || post.state !== "published"}
            onPress={() => void like()}
            style={{
              minHeight: 44,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Animated.View style={{ transform: [{ scale }] }}>
              <Ionicons
                name={liked ? "heart" : "heart-outline"}
                color={liked ? "#C62546" : colors.muted}
                size={25}
              />
            </Animated.View>
            <Text style={[styles.text, liked && { color: "#C62546" }]}>
              {likes} suka
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/post/${post.id}`)}
            style={{
              minHeight: 44,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Ionicons
              name="chatbubble-outline"
              color={colors.accent}
              size={23}
            />
            <Text style={styles.text}>{post.comment_count} komentar</Text>
          </Pressable>
        </View>
        {editing && (
          <View style={{ gap: 10 }}>
            <Input
              label="Deskripsi posting"
              value={caption}
              multiline
              maxLength={5000}
              onChangeText={setCaption}
            />
            <Button
              title="Simpan deskripsi"
              disabled={busy}
              onPress={() =>
                void action(`community/posts/${post.id}`, "PATCH", {
                  caption,
                  revision: post.revision,
                })
              }
            />
          </View>
        )}
        {flagging && (
          <View style={{ gap: 10 }}>
            <Input
              label="Alasan laporan konten"
              value={reason}
              maxLength={1000}
              onChangeText={setReason}
            />
            <Button
              secondary
              title="Laporkan ke moderator"
              disabled={busy || reason.trim().length < 5}
              onPress={() =>
                void action("community/flags", "POST", {
                  post_id: post.id,
                  reason,
                })
              }
            />
          </View>
        )}
        <ErrorText message={error} />
      </View>
    </View>
  );
}

export function PostSkeleton() {
  return (
    <View
      accessibilityLabel="Memuat posting"
      style={[styles.panel, { marginBottom: 16 }]}
    >
      <View
        style={{ height: 32, backgroundColor: "#E4EBE4", borderRadius: 8 }}
      />
      <View
        style={{
          aspectRatio: 4 / 3,
          backgroundColor: "#E4EBE4",
          borderRadius: 8,
        }}
      />
      <View
        style={{ height: 48, backgroundColor: "#E4EBE4", borderRadius: 8 }}
      />
    </View>
  );
}

export default memo(PostCard);
