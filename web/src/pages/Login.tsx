import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../Auth";
import SiteHeader from "../components/SiteHeader";
import { validPassword } from "../../../shared/auth-errors";

const passwordPolicyError =
  "Gunakan minimal 8 karakter dengan huruf besar, huruf kecil, angka, dan simbol. Maksimal 72 byte UTF-8.";
const schema = (recovery: boolean, register: boolean, forgot: boolean) =>
  z.object({
    email: recovery
      ? z.string().optional()
      : z.email("Masukkan email yang valid"),
    password:
      register || recovery
        ? z.string().refine(validPassword, passwordPolicyError)
        : forgot
          ? z.string().optional()
          : z.string().min(1, "Masukkan kata sandi."),
    full_name: register
      ? z.string().trim().min(3, "Nama lengkap minimal 3 karakter.")
      : z.string().optional(),
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
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema(recovery, register, forgot)),
  });
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
    <>
      <SiteHeader compact />
      <div className="auth-page">
        <section className="auth-story">
          <div className="auth-story-copy">
            <p className="auth-story-title">
              Kenali sampahnya.
              <br />
              Tentukan langkahnya.
            </p>
            <p>
              Kenali material dari foto, buat laporan, lalu pantau tindak
              lanjutnya.
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
            <span>Laporan privat secara default</span>
          </div>
        </section>
        <main className="auth-form">
          <div className="auth-form-content">
            <h1>
              {recovery
                ? "Buat kata sandi baru"
                : forgot
                  ? "Pulihkan akunmu"
                  : register
                    ? "Buat akun WasteWise"
                    : "Selamat datang kembali"}
            </h1>
            <p className="muted">
              {recovery
                ? "Gunakan kata sandi kuat yang belum pernah dipakai."
                : forgot
                  ? "Masukkan email akun untuk menerima tautan pemulihan."
                  : register
                    ? "Simpan laporanmu dan pantau tindak lanjutnya."
                    : "Masuk untuk melihat laporan dan tindak lanjutnya."}
            </p>
            <form onSubmit={handleSubmit(submit)}>
              {register && (
                <label htmlFor="auth-full-name">
                  Nama lengkap
                  <input
                    id="auth-full-name"
                    {...field("full_name")}
                    autoComplete="name"
                    minLength={3}
                    maxLength={255}
                    required
                    aria-invalid={!!errors.full_name}
                    aria-describedby={errors.full_name ? "auth-name-error" : undefined}
                  />
                  {errors.full_name && (
                    <small id="auth-name-error" className="field-error">
                      {errors.full_name.message}
                    </small>
                  )}
                </label>
              )}
              {!recovery && (
                <label htmlFor="auth-email">
                  Email
                  <input
                    id="auth-email"
                    {...field("email")}
                    type="email"
                    autoComplete="email"
                    placeholder="Masukkan alamat email"
                    required
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? "auth-email-error" : undefined}
                  />
                  {errors.email && (
                    <small id="auth-email-error" className="field-error">
                      {errors.email.message}
                    </small>
                  )}
                </label>
              )}
              {(!forgot || recovery) && (
                <label htmlFor="auth-password">
                  {recovery ? "Kata sandi baru" : "Kata sandi"}
                  <div className="password-input">
                    <input
                      id="auth-password"
                      {...field("password")}
                      type={show ? "text" : "password"}
                      autoComplete={
                        register || recovery
                          ? "new-password"
                          : "current-password"
                      }
                      placeholder={
                        recovery
                          ? "Buat kata sandi baru"
                          : register
                            ? "Buat kata sandi yang kuat"
                            : "Masukkan kata sandi"
                      }
                      required
                      aria-invalid={!!errors.password}
                      aria-describedby={
                        errors.password
                          ? "auth-password-error"
                          : register || recovery
                            ? "auth-password-hint"
                            : undefined
                      }
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
                  {errors.password && (
                    <small id="auth-password-error" className="field-error">
                      {errors.password.message}
                    </small>
                  )}
                </label>
              )}
              {(register || recovery) && (
                <p id="auth-password-hint" className="caption">
                  Kata sandi minimal 8 karakter, dengan huruf besar, huruf
                  kecil, angka, dan simbol. Maksimal 72 byte UTF-8.
                </p>
              )}
              {(error || authError) && (
                <div className="error auth-form-error" role="alert">
                  <AlertCircle size={18} aria-hidden="true" />
                  <span>{error || authError}</span>
                  {authError && (
                    <button
                      type="button"
                      className="text-button"
                      onClick={retry}
                    >
                      Coba lagi
                    </button>
                  )}
                </div>
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
                  type="button"
                  className="text-button"
                  onClick={() => {
                    setRegister(!register);
                    setForgot(false);
                    setError("");
                    setMessage("");
                    setConfirmation(false);
                    clearErrors();
                  }}
                >
                  {register ? "Masuk" : "Daftar sekarang"}
                </button>
              </p>
            )}
            {provider === "supabase" && !recovery && (
              <p className="auth-switch">
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    setForgot(!forgot);
                    setRegister(false);
                    setError("");
                    setMessage("");
                    clearErrors();
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
                ? "Autentikasi email dikelola oleh Supabase. Keluar setelah selesai jika memakai perangkat bersama."
                : "Mode lokal hanya menyimpan sesi di memori browser. Masuk kembali setelah halaman dimuat ulang."}
            </p>
            <p className="caption privacy-note">
              Laporan privat sampai kamu memilih untuk membagikannya. Saat
              dibagikan, foto turunan, deskripsi, kategori/status, dan lokasi
              presisi dapat dilihat publik.
            </p>
          </div>
          <p className="auth-copyright">WasteWise · Pilah dengan tepat.</p>
        </main>
      </div>
    </>
  );
}
