import { jpegLocation } from "../../shared/photo-location";
import type { LocationEvidence } from "./types";

export async function preparePhoto(file: File) {
  const location = jpegLocation(await file.arrayBuffer());
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error("Pemrosesan foto tidak tersedia pada browser ini.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (value) =>
          value
            ? resolve(value)
            : reject(new Error("Foto tidak dapat diproses.")),
        "image/jpeg",
        0.82,
      ),
    );
    if (blob.size > 5 * 1024 * 1024)
      throw new Error("Foto masih terlalu besar setelah dikompresi.");
    return {
      file: new File([blob], "sampah.jpg", { type: "image/jpeg" }),
      location,
    };
  } finally {
    bitmap.close();
  }
}

export function currentLocation(): Promise<LocationEvidence> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(
        new Error(
          "GPS tidak didukung browser ini. Gunakan HP dengan izin lokasi.",
        ),
      );
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (position.coords.accuracy > 50) {
          reject(
            new Error(
              "Lokasi belum akurat (lebih dari 50 meter). Coba lagi di tempat terbuka.",
            ),
          );
          return;
        }
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          location_source: "device_upload_confirmed",
          location_recorded_at: new Date(position.timestamp).toISOString(),
          location_accuracy_m: position.coords.accuracy,
          confirmed: true,
        });
      },
      () =>
        reject(
          new Error("GPS belum tersedia. Aktifkan izin lokasi lalu coba lagi."),
        ),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
  });
}
