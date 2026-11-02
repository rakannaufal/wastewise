export function authMessage(error: {
  message: string;
  code?: string;
  status?: number;
}) {
  const messages: Record<string, string> = {
    invalid_credentials: "Email atau kata sandi salah.",
    email_not_confirmed:
      "Konfirmasi email terlebih dahulu. Periksa kotak masuk dan folder spam.",
    email_address_invalid: "Gunakan alamat email yang valid.",
    email_address_not_authorized:
      "Pengiriman email belum tersedia untuk alamat ini. Hubungi pengelola.",
    signup_disabled: "Pendaftaran sedang ditutup. Hubungi pengelola.",
    weak_password:
      "Gunakan kata sandi minimal 8 karakter dengan huruf besar, kecil, angka, dan simbol.",
    user_already_exists:
      "Email sudah terdaftar. Masuk atau gunakan pemulihan kata sandi.",
    over_email_send_rate_limit:
      "Batas pengiriman email tercapai. Tunggu sebelum mencoba lagi.",
    over_request_rate_limit:
      "Terlalu banyak percobaan. Tunggu sebelum mencoba lagi.",
    otp_expired: "Tautan konfirmasi kedaluwarsa. Minta email baru.",
    same_password: "Gunakan kata sandi yang berbeda dari sebelumnya.",
  };
  if (error.code && messages[error.code]) return messages[error.code];
  if (error.status === 429) return messages.over_request_rate_limit;
  if (error.status && error.status >= 500)
    return "Layanan email sedang terganggu. Coba kembali nanti.";
  return "Autentikasi belum berhasil. Periksa koneksi, email, dan kata sandi lalu coba kembali.";
}

export function validPassword(value: string) {
  const bytes = Array.from(value).reduce((sum, char) => {
    const point = char.codePointAt(0) || 0;
    return (
      sum + (point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4)
    );
  }, 0);
  return (
    value.length >= 8 &&
    bytes <= 72 &&
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value) &&
    /[0-9]/.test(value) &&
    /[^a-zA-Z0-9]/.test(value)
  );
}
