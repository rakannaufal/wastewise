import { Text } from "react-native";
import { router } from "expo-router";
import { Button, Screen, styles } from "../../src/ui";
export default function Capture() {
  return (
    <Screen>
      <Text style={styles.title}>Foto sampah di sekitarmu.</Text>
      <Button
        title="Buka kamera"
        onPress={() =>
          router.push({ pathname: "/camera", params: { origin: "tab" } })
        }
      />
      <Button
        secondary
        title="Pilih dari galeri"
        onPress={() => router.push("/new-report")}
      />
    </Screen>
  );
}
