import { Text, View } from "react-native";
import { router } from "expo-router";
import { useSession } from "../../src/session";
import { Button, Screen, styles } from "../../src/ui";

export default function Profile() {
  const { user, logout } = useSession();
  return (
    <Screen>
      <Text style={styles.title}>Profil akun</Text>
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
        <Text style={styles.heading}>Kamu menentukan publikasinya.</Text>
        <Text style={styles.text}>
          Laporan privat terlihat oleh pemilik dan pengelola. Posting yang
          dibagikan memperlihatkan foto dan GPS presisi kepada pengguna yang
          masuk. Hapus laporan melalui halaman detail bila tidak diperlukan
          lagi.
        </Text>
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
    </Screen>
  );
}
