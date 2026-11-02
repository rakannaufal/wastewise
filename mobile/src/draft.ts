import { Directory, File, Paths } from "expo-file-system";
import { Platform } from "react-native";
import type { PhotoDraft } from "../../shared/contracts";
import type { Photo } from "./photo";

export type LocalDraft = {
  photo: Photo | null;
  remote: PhotoDraft | null;
  description: string;
  requestId: string;
  finalKey: string;
  expiresAt: number;
};
let capture: Photo | null = null;
export function setCapture(photo: Photo) {
  capture = photo;
}
export function consumeCapture() {
  const photo = capture;
  capture = null;
  return photo;
}
const storageKey = (owner: string, edit: string) =>
  `wastewise.draft.${owner}.${edit || "new"}`;
function recordFile(owner: string, edit: string) {
  return new File(
    Paths.document,
    "wastewise-drafts",
    owner,
    `${edit || "new"}.json`,
  );
}
export function deletePhoto(owner: string, uri?: string) {
  if (Platform.OS === "web" || !uri) return;
  const directory = new Directory(Paths.document, "wastewise-drafts", owner);
  if (uri.startsWith(directory.uri + "/") && uri.endsWith(".jpg")) {
    const file = new File(uri);
    if (file.exists) file.delete();
  }
}
export function loadDraft(owner: string, edit = ""): LocalDraft | null {
  try {
    const file = Platform.OS === "web" ? null : recordFile(owner, edit);
    const raw = file
      ? file.exists
        ? file.textSync()
        : null
      : sessionStorage.getItem(storageKey(owner, edit));
    const value = raw ? (JSON.parse(raw) as LocalDraft) : null;
    if (value && value.expiresAt > Date.now()) return value;
    if (value) removeDraft(owner, edit);
  } catch {
    removeDraft(owner, edit);
  }
  return null;
}
export function saveDraft(owner: string, edit: string, value: LocalDraft) {
  if (Platform.OS === "web")
    sessionStorage.setItem(storageKey(owner, edit), JSON.stringify(value));
  else {
    const dir = new Directory(Paths.document, "wastewise-drafts", owner);
    dir.create({ idempotent: true, intermediates: true });
    const file = recordFile(owner, edit);
    const previous = file.exists
      ? (JSON.parse(file.textSync()) as LocalDraft)
      : null;
    file.write(JSON.stringify(value));
    if (previous?.photo?.uri !== value.photo?.uri)
      deletePhoto(owner, previous?.photo?.uri);
  }
}
export function removeDraft(owner: string, edit = "") {
  if (Platform.OS === "web") sessionStorage.removeItem(storageKey(owner, edit));
  else {
    const file = recordFile(owner, edit);
    if (file.exists) {
      let previous: LocalDraft | null = null;
      try {
        previous = JSON.parse(file.textSync()) as LocalDraft;
      } catch {
        /* Corrupt records are discarded; account cleanup removes unknown photos. */
      }
      deletePhoto(owner, previous?.photo?.uri);
      file.delete();
    }
  }
}
export function clearDraft() {
  capture = null;
  if (Platform.OS === "web") {
    for (const key of Object.keys(sessionStorage))
      if (key.startsWith("wastewise.draft.")) sessionStorage.removeItem(key);
  } else {
    const directory = new Directory(Paths.document, "wastewise-drafts");
    if (directory.exists) directory.delete();
  }
}
