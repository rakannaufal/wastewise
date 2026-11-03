import { useState } from "react";
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Text,
  View,
} from "react-native";
import { useSession } from "../src/session";
import { Button, ErrorText, Input, Screen, styles } from "../src/ui";
export default function Login() {
  const {
    login,
    registerAccount,
    resendConfirmation,
    config,
    error: authError,
    retry,
  } = useSession();
  const [register, setRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmation, setConfirmation] = useState(false);
  async function submit() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (register) {
        const pending = await registerAccount(
          email.trim(),
          password,
          name.trim(),
        );
        setConfirmation(pending);
        if (pending)
          setMessage(
            "Periksa email dan spam untuk konfirmasi akun. Setelah dikonfirmasi, kembali dan masuk. Jika sudah terdaftar, gunakan Masuk.",
          );
      } else await login(email.trim(), password);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Screen>
        <Text style={[styles.heading, { color: "#215B3C", marginTop: 30 }]}>
          WasteWise.
        </Text>
        <View style={{ marginVertical: 24, gap: 12 }}>
          <Text style={styles.title}>
            {register ? "Mulai langkah baikmu." : "Selamat datang kembali."}
          </Text>
          <Text style={styles.text}>
            Kenali sampahnya. Tentukan langkahnya.
          </Text>
        </View>
        {register && (
          <Input
            label="Nama lengkap"
            value={name}
            onChangeText={setName}
            autoComplete="name"
          />
        )}
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        <Input
          label="Kata sandi"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete={register ? "new-password" : "current-password"}
        />
        {register && (
          <Text style={styles.text}>
            Minimal 8 karakter dengan huruf besar, huruf kecil, angka, dan
            simbol. Maksimal 72 byte.
          </Text>
        )}
        <ErrorText message={error || authError} />
        {authError && (
          <Button title="Coba hubungkan kembali" secondary onPress={retry} />
        )}
        {message ? (
          <Text accessibilityRole="alert" style={styles.text}>
            {message}
          </Text>
        ) : null}
        <Button
          title={busy ? "Memproses…" : register ? "Buat akun" : "Masuk"}
          onPress={submit}
          disabled={
            busy || !email || !password || (register && name.trim().length < 3)
          }
        />
        <Button
          secondary
          title={
            register ? "Sudah punya akun? Masuk" : "Belum punya akun? Daftar"
          }
          onPress={() => {
            setRegister(!register);
            setError("");
            setMessage("");
            setConfirmation(false);
          }}
        />
        {confirmation && (
          <Button
            title="Kirim ulang konfirmasi"
            secondary
            disabled={busy}
            onPress={async () => {
              setBusy(true);
              setError("");
              try {
                await resendConfirmation(email);
                setMessage(
                  "Permintaan konfirmasi diterima. Periksa email dan spam.",
                );
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          />
        )}
        {config?.provider === "supabase" && (
          <Button
            title="Lupa kata sandi?"
            secondary
            onPress={() => {
              Linking.openURL(`${config.web_url}/auth/forgot-password`).catch(
                () => setError("Halaman pemulihan tidak dapat dibuka."),
              );
            }}
          />
        )}
        <Text style={[styles.text, { fontSize: 12, marginTop: 20 }]}>
          Foto laporan dan GPS presisi yang dikirim akan terlihat publik. Sesi
          disimpan di penyimpanan aman perangkat.
        </Text>
      </Screen>
    </KeyboardAvoidingView>
  );
}
