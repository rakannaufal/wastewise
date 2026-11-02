import { useEffect, useState } from "react";
import { Camera, Upload } from "lucide-react";
export function PhotoInput({
  file,
  onChange,
  preview = "",
  disabled = false,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  preview?: string;
  disabled?: boolean;
}) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (!file) return;
    const value = URL.createObjectURL(file);
    setUrl(value);
    return () => URL.revokeObjectURL(value);
  }, [file]);
  return (
    <div className="photo-input">
      {(file && url) || preview ? (
        <img
          className="photo-preview"
          src={file && url ? url : preview}
          alt="Pratinjau foto yang dipilih"
        />
      ) : (
        <div className="photo-placeholder">
          <Camera size={32} strokeWidth={1.5} />
          <strong>Satu foto, langkah lebih jelas.</strong>
          <span>
            Letakkan satu objek di tengah.
            <br />
            Gunakan cahaya cukup dan latar sederhana.
          </span>
        </div>
      )}
      <label className="button secondary full">
        <Upload size={18} />
        {file || preview ? "Ganti foto" : "Pilih foto"}
        <input
          type="file"
          disabled={disabled}
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(event) => {
            const value = event.target.files?.[0];
            setError("");
            if (
              value &&
              (value.size > 30 * 1024 * 1024 ||
                !["image/jpeg", "image/png", "image/webp"].includes(value.type))
            ) {
              setError(
                "Gunakan JPEG, PNG, atau WebP maksimal 30 MiB sebelum kompresi.",
              );
              event.target.value = "";
              return;
            }
            onChange(value || null);
            event.target.value = "";
          }}
        />
      </label>
      <p className="caption">
        JPEG, PNG, WebP · Foto dikompresi sebelum dikirim
      </p>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
