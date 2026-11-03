import { useFonts } from "expo-font";
import { Text } from "react-native";
import type { ErrorBoundaryProps } from "expo-router";
import { Stack, Redirect, useSegments } from "expo-router";
import { SessionProvider, useSession } from "../src/session";
import { Loading, Button, Screen, styles } from "../src/ui";
import { StatusBar } from "expo-status-bar";
function Router() {
  const [fontsLoaded, fontError] = useFonts({
    Caveat_700: require("../assets/fonts/caveat-700.ttf"),
    Manrope_400: require("../assets/fonts/manrope-400.ttf"),
    Manrope_500: require("../assets/fonts/manrope-500.ttf"),
    Manrope_600: require("../assets/fonts/manrope-600.ttf"),
    Manrope_700: require("../assets/fonts/manrope-700.ttf"),
  });
  const { user, loading } = useSession();
  const segments = useSegments();
  if (loading || (!fontsLoaded && !fontError)) return <Loading />;
  if (!user && segments[0] !== "login" && segments[0] !== "onboarding")
    return <Redirect href="/login" />;
  if (user && segments[0] === "login") return <Redirect href="/" />;
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" />
        <Stack.Screen name="new-report" options={{ presentation: "modal" }} />
        <Stack.Screen
          name="camera"
          options={{ presentation: "fullScreenModal" }}
        />
        <Stack.Screen name="report/[id]" />
        <Stack.Screen name="post/[id]" />
        <Stack.Screen name="onboarding" />
      </Stack>
    </>
  );
}
export default function Layout() {
  return (
    <SessionProvider>
      <Router />
    </SessionProvider>
  );
}

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <Screen>
      <Text style={styles.title}>Halaman mengalami gangguan.</Text>
      <Text style={styles.text}>
        Data belum dapat ditampilkan. Coba lagi; draft laporan tetap tersimpan
        di perangkat selama masa berlakunya.
      </Text>
      <Button title="Coba kembali" onPress={() => void retry()} />
    </Screen>
  );
}
