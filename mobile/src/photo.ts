import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";
export type Photo = { uri: string; name: string; type: string };
export async function pickPhoto(camera = false): Promise<Photo | null> {
  const permission = camera
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted)
    throw new Error(
      "Izin foto ditolak. Izinkan akses dari pengaturan atau pilih cara lain.",
    );
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ["images"],
    quality: 0.85,
    allowsEditing: false,
  };
  const result = camera
    ? await ImagePicker.launchCameraAsync(options)
    : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled) return null;
  const image = result.assets[0];
  if (image.fileSize && image.fileSize > 5 * 1024 * 1024)
    throw new Error("Foto maksimal 5 MiB. Pilih foto yang lebih kecil.");
  return {
    uri: image.uri,
    name: image.fileName || "material.jpg",
    type: image.mimeType || "image/jpeg",
  };
}
export async function appendPhoto(form: FormData, photo: Photo) {
  if (Platform.OS === "web")
    form.append("image", await (await fetch(photo.uri)).blob(), photo.name);
  else form.append("image", photo as unknown as Blob);
}
