import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../Auth";
import { Brand } from "../ui";

const schema = (recovery: boolean) =>
  z.object({
    email: recovery
      ? z.string().optional()
      : z.email("Masukkan email yang valid"),
    password: z.string().optional(),
    full_name: z.string().optional(),
  });
type Values = z.infer<ReturnType<typeof schema>>;
export default function Login() {
  const [register, setRegister] = useState(false);
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [forgot, setForgot] = useState(
    window.location.pathname === "/auth/forgot-password",
  );
  const [message, setMessage] = useState("");
  const [confirmation, setConfirmation] = useState(false);
  const {
    login,
    registerAccount,
    resetPassword,
    updatePassword,
    resendConfirmation,
    provider,
    recovery,
    error: authError,
    retry,
    loading,
  } = useAuth();
  const {
    register: field,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema(recovery)) });
  async function submit(values: Values) {
    setError("");
    setMessage("");
    try {
      if (recovery) {
        await updatePassword(values.password || "");
        setMessage("Kata sandi diperbarui. Masuk dengan kata sandi baru.");
      } else if (forgot) {
        await resetPassword(values.email || "");
        setMessage(
          "Jika email terdaftar, tautan pemulihan akan dikirim. Periksa kotak masuk dan spam.",
        );
      } else if (register) {
        const pending = await registerAccount(
          values.email || "",
          values.password || "",
          values.full_name || "",
        );
        setConfirmation(pending);
        if (pending)
          setMessage(
            "Periksa email untuk konfirmasi akun. Setelah dikonfirmasi, kembali ke sini dan masuk. Jika sudah terdaftar, gunakan Masuk atau Lupa kata sandi.",
          );
      } else {
        await login(values.email || "", values.password || "");
      }
    } catch (error) {
      setError((error as Error).message);
    }
  }
  return (
    <div className="auth-page">
      <section className="auth-story">
        <Brand />
        <div className="auth-story-copy">
          <span className="eyebrow">Mulai dari satu pilihan baik</span>
          <h1>
            Kenali sampahnya.
            <br />
            Tentukan langkahnya.
          </h1>
          <p>
            Dari foto menjadi panduan memilah. Catat laporan, pantau penanganan,
            beri material kesempatan berikutnya.
          </p>
        </div>
        <div
          className="material-collage"
          aria-label="Contoh material dari dataset"
        >
          <img
            src="/materials/plastic.jpg"
            alt="Contoh botol plastik dari dataset"
          />
          <img src="/materials/paper.jpg" alt="Contoh kertas dari dataset" />
          <img
            src="/materials/biological.jpg"
            alt="Contoh sampah organik dari dataset"
          />
        </div>
        <p className="caption">
          Contoh material · Dataset Garbage Classification, Mostafa Abla
        </p>
        <div className="auth-foot">
          <span>12 kategori material</span>
          <span>Satu kebiasaan lebih baik</span>
        </div>
      </section>
      <main className="auth-form">
        <div className="mobile-brand">
          <Brand />
        </div>
        <div>
          <span className="eyebrow">Ruang untuk perubahan kecil</span>
          <h2>
            {recovery
              ? "Buat kata sandi baru"
              : forgot
                ? "Pulihkan akunmu"
                : register
                  ? "Mulai bersama WasteWise"
                  : "Selamat datang kembali"}
          </h2>
          <p className="muted">
            {recovery
              ? "Gunakan kata sandi kuat yang belum pernah dipakai."
              : forgot
                ? "Masukkan email akun untuk menerima tautan pemulihan."
                : register
                  ? "Buat akun untuk mencatat dan memantau laporan."
                  : "Masuk untuk melanjutkan langkah baikmu."}
          </p>
          <form onSubmit={handleSubmit(submit)}>
            {register && (
              <label>
                Nama lengkap
                <input
                  {...field("full_name")}
                  autoComplete="name"
                  minLength={3}
                  maxLength={255}
                  required
                />
              </label>
            )}
            {!recovery && (
              <label>
                Email
                <input
                  {...field("email")}
                  type="email"
                  autoComplete="email"
                  placeholder="nama@contoh.com"
                  aria-invalid={!!errors.email}
                />
                {errors.email && (
                  <small className="field-error">{errors.email.message}</small>
                )}
              </label>
            )}
            {(!forgot || recovery) && (
              <label>
                {recovery ? "Kata sandi baru" : "Kata sandi"}
                <div className="password-input">
                  <input
                    {...field("password")}
                    type={show ? "text" : "password"}
                    autoComplete={
                      register || recovery ? "new-password" : "current-password"
                    }
                    required
                  />
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={
                      show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"
                    }
                    onClick={() => setShow(!show)}
                  >
                    {show ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>
              </label>
            )}
            {(register || recovery) && (
              <p className="caption">
                Minimal 8 karakter: huruf besar, huruf kecil, angka, simbol.
                Maksimal 72 byte.
              </p>
            )}
            {(error || authError) && (
              <p className="error" role="alert">
                {error || authError}
              </p>
            )}
            {authError && (
              <button type="button" className="text-button" onClick={retry}>
                Coba hubungkan kembali
              </button>
            )}
            {message && (
              <p className="next-action" role="status">
                {message}
              </p>
            )}
            <button
              className="button primary full"
              disabled={isSubmitting || loading}
            >
              {isSubmitting
                ? "Memproses…"
                : recovery
                  ? "Simpan kata sandi baru"
                  : forgot
                    ? "Kirim tautan pemulihan"
                    : register
                      ? "Buat akun"
                      : "Masuk"}
              <ArrowRight size={18} />
            </button>
          </form>
          {!recovery && (
            <p className="auth-switch">
              {register ? "Sudah punya akun?" : "Belum punya akun?"}{" "}
              <button
                className="text-button"
                onClick={() => {
                  setRegister(!register);
                  setForgot(false);
                  setError("");
                  setMessage("");
                  setConfirmation(false);
                }}
              >
                {register ? "Masuk" : "Daftar sekarang"}
              </button>
            </p>
          )}
          {provider === "supabase" && !recovery && (
            <p className="auth-switch">
              <button
                className="text-button"
                onClick={() => {
                  setForgot(!forgot);
                  setRegister(false);
                  setError("");
                  setMessage("");
                }}
              >
                {forgot ? "Kembali masuk" : "Lupa kata sandi?"}
              </button>
            </p>
          )}
          {confirmation && (
            <button
              className="text-button"
              disabled={isSubmitting}
              onClick={handleSubmit(async (values) => {
                setError("");
                try {
                  await resendConfirmation(values.email || "");
                  setMessage(
                    "Permintaan konfirmasi diterima. Periksa email dan spam.",
                  );
                } catch (e) {
                  setError((e as Error).message);
                }
              })}
            >
              Kirim ulang konfirmasi
            </button>
          )}
          <p className="caption session-note">
            {provider === "supabase"
              ? "Login email melalui Supabase. Keluar dari akun setelah menggunakan perangkat bersama."
              : "Untuk keamanan, masuk kembali setelah halaman dimuat ulang."}{" "}
            Foto laporan tersedia bagi pemilik dan pengelola.
          </p>
        </div>
        <p className="auth-copyright">WasteWise · Pilah dengan tepat.</p>
      </main>
    </div>
  );
}
