import { Stack, Redirect, useSegments } from "expo-router";
import { SessionProvider, useSession } from "../src/session";
import { Loading } from "../src/ui";
import { StatusBar } from "expo-status-bar";
function Router() {
  const { user, loading } = useSession();
  const segments = useSegments();
  if (loading) return <Loading />;
  if (!user && segments[0] !== "login") return <Redirect href="/login" />;
  if (user && segments[0] === "login") return <Redirect href="/" />;
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" />
        <Stack.Screen name="new-report" options={{ presentation: "modal" }} />
        <Stack.Screen name="report/[id]" />
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
