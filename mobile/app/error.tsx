import Illustration from "../src/Illustration";
import { Text } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Button, Screen, styles } from "../src/ui";
const messages: Record<string, string> = {
  "400": "Periksa permintaanmu sebelum mencoba kembali.",
  "401": "Sesi berakhir. Masuk kembali untuk melanjutkan.",
  "403": "Akunmu belum memiliki akses ke halaman ini.",
  "404": "Halaman yang dicari belum ditemukan.",
  "408": "Waktu tunggu habis. Periksa koneksi internet.",
  "413": "Ukuran foto maksimal 5 MiB.",
  "422": "Periksa isian dan lokasi laporanmu.",
  "429": "Terlalu banyak permintaan. Tunggu sejenak.",
  "500": "Terjadi gangguan pada layanan. Coba beberapa saat lagi.",
  "502": "Server pendukung belum tersambung.",
  "503": "Layanan sedang belum tersedia.",
  "504": "Server membutuhkan waktu. Coba kembali.",
};
export default function ErrorScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const status = code && /^[45]\d{2}$/.test(code) ? code : "500";
  return (
    <Screen>
      <Illustration
        slot={status.startsWith("5") ? "error-5xx" : "error-4xx"}
        alt=""
      />
      <Text
        style={[
          styles.title,
          { fontFamily: "Caveat_700", fontSize: 80, lineHeight: 96 },
        ]}
      >
        {status}
      </Text>
      <Text style={styles.heading}>Belum bisa dilanjutkan.</Text>
      <Text style={styles.text}>
        {messages[status] || messages[status.startsWith("5") ? "500" : "400"]}
      </Text>
      <Button
        title={status === "401" ? "Masuk kembali" : "Kembali ke beranda"}
        onPress={() => router.replace(status === "401" ? "/login" : "/")}
      />
    </Screen>
  );
}
