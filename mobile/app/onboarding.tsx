import Illustration from "../src/Illustration";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { Button, Screen, styles } from "../src/ui";
export default function Onboarding() {
  return (
    <Screen>
      <Text style={[styles.title, { fontSize: 30, lineHeight: 38 }]}>
        Mulai dari sekitarmu.
      </Text>
      <Illustration
        slot="onboarding-community"
        alt="Komunitas merawat lingkungan"
      />
      {[
        {
          title: "Foto, lalu kenali",
          copy: "Kamera atau galeri memicu AI otomatis. Tidak perlu memilih kategori secara manual.",
        },
        {
          title: "Lokasi dengan izinmu",
          copy: "GPS kamera atau metadata galeri melengkapi laporan. Galeri tanpa GPS memerlukan konfirmasi lokasi saat unggah.",
        },
        {
          title: "Pahami publikasi laporan",
          copy: "Laporan baru otomatis dibagikan. Foto, deskripsi opsional, dan GPS presisi terlihat oleh publik, termasuk pengunjung tanpa akun. Laporan Ditolak tidak ditampilkan.",
        },
        {
          title: "Dukung langkah berikutnya",
          copy: "Ikuti status, jelajahi peta, beri suka atau komentar yang membantu. Hindari informasi pribadi pada foto dan deskripsi.",
        },
      ].map((s) => (
        <View key={s.title} style={styles.panel}>
          <Text style={styles.heading}>{s.title}</Text>
          <Text style={styles.text}>{s.copy}</Text>
        </View>
      ))}
      <Button
        title="Mulai menggunakan WasteWise"
        onPress={() => router.replace("/")}
      />
    </Screen>
  );
}
