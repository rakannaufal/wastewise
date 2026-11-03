import { Text } from "react-native";
import { router } from "expo-router";
import { Button, Screen, styles } from "../src/ui";
export default function Missing() {
  return (
    <Screen>
      <Text style={[styles.title, { fontSize: 72, lineHeight: 88 }]}>404</Text>
      <Text style={styles.heading}>Halaman belum ditemukan.</Text>
      <Text style={styles.text}>
        Tautannya mungkin berubah. Kembali ke beranda untuk melanjutkan.
      </Text>
      <Button title="Kembali ke beranda" onPress={() => router.replace("/")} />
    </Screen>
  );
}
