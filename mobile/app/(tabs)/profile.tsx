import { useState } from "react";
import { Switch, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useSession } from "../../src/session";
import { BrandHeader } from "../../src/BrandHeader";
import { Button, Screen, colors, styles } from "../../src/ui";

export default function Profile() {
  const { user, logout, deleteAccount, updatePublicName } = useSession();
  const [showDelete, setShowDelete] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [updatingPublicName, setUpdatingPublicName] = useState(false);
  const [publicNameError, setPublicNameError] = useState("");

  async function changePublicNameVisibility(visible: boolean) {
    setUpdatingPublicName(true);
    setPublicNameError("");
    try {
      await updatePublicName(visible);
    } catch (error) {
      setPublicNameError((error as Error).message);
    } finally {
      setUpdatingPublicName(false);
    }
  }

  async function submitDelete() {
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteAccount(password);
      router.replace("/login");
    } catch (error) {
      setDeleteError((error as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Screen>
      <BrandHeader />
      <View style={styles.panel}>
        <Text style={styles.label}>NAMA LENGKAP</Text>
        <Text style={styles.heading}>{user?.full_name}</Text>
        <Text style={styles.label}>EMAIL</Text>
        <Text style={styles.text}>{user?.email}</Text>
        <Text style={styles.label}>PERAN</Text>
        <Text style={styles.text}>
          {user?.role === "admin" ? "Pengelola" : "Pelapor"}
        </Text>
      </View>
      <View style={styles.action}>
        <Text style={styles.heading}>Pahami publikasi laporan.</Text>
        <Text style={styles.text}>
          Laporan baru bersifat privat. Foto dan lokasi presisi tampil kepada
          publik hanya jika kamu memilih untuk membagikannya. Lokasi berasal
          dari pelapor dan tidak diverifikasi. Laporan Ditolak tidak ditampilkan.
          Hapus laporan melalui halaman detail bila tidak diperlukan lagi.
        </Text>
      </View>
      <View style={styles.panel}>
        <Text style={styles.heading}>Nama di komunitas</Text>
        <Text style={styles.text}>
          Pengaturan ini berlaku untuk posting yang sudah dan akan kamu
          bagikan. Email tetap privat; komentarmu tetap tampil sebagai “Warga”.
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Switch
            accessibilityLabel="Tampilkan nama akun pada postingan komunitas"
            value={user?.public_name_visible ?? false}
            disabled={updatingPublicName}
            onValueChange={(visible) => void changePublicNameVisibility(visible)}
            trackColor={{ false: "#DCE4DC", true: "#215B3C" }}
            thumbColor="#FFFFFF"
          />
          <Text style={styles.text}>Tampilkan nama akun pada postingan komunitas</Text>
        </View>
        {publicNameError ? (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {publicNameError}
          </Text>
        ) : null}
      </View>
      <Button
        secondary
        title="Buka laporan"
        onPress={() => router.push("/reports")}
      />
      <Button
        secondary
        title="Panduan memilah"
        onPress={() => router.push("/guide")}
      />
      <Button
        secondary
        title="Cara menggunakan WasteWise"
        onPress={() => router.push("/onboarding")}
      />
      <Button
        title="Keluar dari akun"
        onPress={() => {
          void logout();
        }}
      />
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingTop: 22,
          gap: 12,
        }}
      >
        <Text accessibilityRole="header" style={styles.heading}>
          Hapus akun
        </Text>
        <Text style={styles.text}>
          Akun, laporan, draft, posting, komentar, dan suka akan dihapus. Foto
          masuk antrean penghapusan; tautan yang sudah terbit dapat berlaku
          sampai 15 menit dan salinan unduhan tidak dapat ditarik.
        </Text>
        {!showDelete ? (
          <Button
            danger
            title="Hapus akun permanen"
            onPress={() => setShowDelete(true)}
          />
        ) : (
          <View style={{ gap: 12 }}>
            <TextInput
              accessibilityLabel="Kata sandi saat ini"
              placeholder="Kata sandi saat ini"
              secureTextEntry
              autoComplete="current-password"
              value={password}
              onChangeText={setPassword}
              style={styles.input}
            />
            <TextInput
              accessibilityLabel="Ketik HAPUS AKUN untuk melanjutkan"
              placeholder="Ketik HAPUS AKUN"
              autoCapitalize="characters"
              value={confirmation}
              onChangeText={setConfirmation}
              style={styles.input}
            />
            {deleteError ? (
              <Text accessibilityLiveRegion="polite" style={styles.error}>
                {deleteError}
              </Text>
            ) : null}
            <Button
              secondary
              title="Batalkan"
              disabled={deleting}
              onPress={() => {
                setShowDelete(false);
                setPassword("");
                setConfirmation("");
                setDeleteError("");
              }}
            />
            <Button
              danger
              title={deleting ? "Menghapus akun…" : "Hapus permanen"}
              disabled={
                deleting || !password || confirmation !== "HAPUS AKUN"
              }
              onPress={() => void submitDelete()}
            />
          </View>
        )}
      </View>
    </Screen>
  );
}
