import { useEffect, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import type { Post } from "../../shared/community";
import { api } from "./api";
import { categoryName, statusName, styles, colors, ErrorText } from "./ui";
export default function PostCard({
  post,
  reload,
  detail = false,
}: {
  post: Post;
  reload: () => void;
  detail?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [post.image_url]);
  async function like() {
    setBusy(true);
    setError("");
    try {
      await api(`/api/v1/community/posts/${post.id}/like`, {
        method: post.liked_by_me ? "DELETE" : "PUT",
      });
      reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <View
      style={{
        backgroundColor: "#fff",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: "hidden",
        marginBottom: 16,
      }}
    >
      <View style={{ padding: 16, gap: 5 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <Text
            style={[styles.heading, { flex: 1, fontSize: 16, lineHeight: 24 }]}
          >
            {post.author_name}
          </Text>
          <Text
            style={[styles.label, { color: colors.accent, maxWidth: "45%" }]}
          >
            {statusName[post.status]}
          </Text>
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
        <Text
          numberOfLines={detail ? undefined : 3}
          style={[styles.text, { color: colors.ink }]}
        >
          {post.caption}
        </Text>
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
          GPS {post.latitude.toFixed(5)}, {post.longitude.toFixed(5)}
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
            accessibilityLabel={
              post.liked_by_me ? "Batalkan suka" : "Sukai posting"
            }
            accessibilityState={{ selected: post.liked_by_me, disabled: busy }}
            disabled={busy || post.state !== "published"}
            onPress={() => void like()}
            style={{
              minHeight: 44,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Ionicons
              name={post.liked_by_me ? "heart" : "heart-outline"}
              color={colors.accent}
              size={24}
            />
            <Text style={styles.text}>{post.like_count} suka</Text>
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
