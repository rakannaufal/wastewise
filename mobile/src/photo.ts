import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { File, Directory, Paths } from "expo-file-system";
import { randomUUID } from "expo-crypto";
import { Platform } from "react-native";
import type { LocationEvidence } from "../../shared/contracts";
import { jpegLocation } from "../../shared/photo-location";

export type Photo = {
  uri: string;
  name: string;
  type: string;
  width: number;
  height: number;
  source: "camera" | "gallery";
  capturedAt: string | null;
  location: LocationEvidence | null;
};
export async function pickPhoto(): Promise<Photo | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted)
    throw new Error(
      "Izin galeri ditolak. Aktifkan akses foto dari pengaturan.",
    );
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 1,
    allowsEditing: false,
    exif: true,
  });
  if (result.canceled) return null;
  const image = result.assets[0];
  if (image.fileSize && image.fileSize > 30 * 1024 * 1024)
    throw new Error("Foto maksimal 30 MiB sebelum kompresi.");
  const exif = image.exif as Record<string, unknown> | null;
  let location: LocationEvidence | null = null;
  if (
    typeof exif?.GPSLatitude === "number" &&
    typeof exif?.GPSLongitude === "number"
  ) {
    const latitude =
      Math.abs(exif.GPSLatitude) *
      (exif.GPSLatitudeRef === "S" || exif.GPSLatitude < 0 ? -1 : 1);
    const longitude =
      Math.abs(exif.GPSLongitude) *
      (exif.GPSLongitudeRef === "W" || exif.GPSLongitude < 0 ? -1 : 1);
    if (
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      Math.abs(latitude) <= 90 &&
      Math.abs(longitude) <= 180
    )
      location = {
        latitude,
        longitude,
        location_source: "photo_exif",
        location_recorded_at: null,
        location_accuracy_m: null,
      };
  }
  if (!location && Platform.OS === "web")
    location = jpegLocation(await (await fetch(image.uri)).arrayBuffer());
  return {
    uri: image.uri,
    name: image.fileName || "sampah.jpg",
    type: image.mimeType || "image/jpeg",
    width: image.width,
    height: image.height,
    source: "gallery",
    capturedAt: null,
    location,
  };
}
export async function preparePhoto(
  photo: Photo,
  owner: string,
): Promise<Photo> {
  const context = ImageManipulator.manipulate(photo.uri, {
    maxWidth: 1600,
    maxHeight: 1600,
  });
  const longest = Math.max(photo.width, photo.height);
  if (longest > 1600)
    context.resize(
      photo.width >= photo.height ? { width: 1600 } : { height: 1600 },
    );
  const image = await context.renderAsync();
  try {
    const saved = await image.saveAsync({
      format: SaveFormat.JPEG,
      compress: 0.82,
    });
    let uri = saved.uri;
    if (Platform.OS !== "web") {
      const directory = new Directory(
        Paths.document,
        "wastewise-drafts",
        owner,
      );
      directory.create({ idempotent: true, intermediates: true });
      const destination = new File(directory, `${randomUUID()}.jpg`);
      new File(uri).copy(destination);
      uri = destination.uri;
      if (destination.size > 5 * 1024 * 1024) {
        destination.delete();
        throw new Error(
          "Foto masih terlalu besar. Ambil ulang dengan resolusi lebih rendah.",
        );
      }
    }
    return {
      ...photo,
      uri,
      name: "sampah.jpg",
      type: "image/jpeg",
      width: saved.width,
      height: saved.height,
    };
  } finally {
    image.release();
    context.release();
  }
}
export async function appendPhoto(form: FormData, photo: Photo) {
  if (Platform.OS === "web")
    form.append("image", await (await fetch(photo.uri)).blob(), photo.name);
  else
    // Expo SDK 58 fetch serializes File.bytes(); legacy URI parts are rejected.
    form.append("image", new File(photo.uri));
}
