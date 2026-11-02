import type { LocationEvidence } from "./contracts";

/** Read bounded TIFF GPS fields; malformed metadata is absent evidence. */
export function jpegLocation(buffer: ArrayBuffer): LocationEvidence | null {
  try {
    let view = new DataView(buffer);
    if (view.getUint16(0) !== 0xffd8) return null;
    let offset = 2;
    while (offset + 4 < view.byteLength) {
      const marker = view.getUint16(offset);
      if (marker === 0xffda || marker === 0xffd9) return null;
      const length = view.getUint16(offset + 2);
      if (length < 2 || offset + length + 2 > view.byteLength) return null;
      if (marker === 0xffe1 && view.getUint32(offset + 4) === 0x45786966) {
        view = new DataView(buffer, offset + 4, length - 2);
        if (view.getUint16(4) !== 0) return null;
        const base = 6;
        const little = view.getUint16(base) === 0x4949;
        if (view.getUint16(base + 2, little) !== 42) return null;
        const ifd = base + view.getUint32(base + 4, little);
        const entries = view.getUint16(ifd, little);
        if (entries > 512) return null;
        let gps = 0;
        for (let i = 0; i < entries; i++) {
          const row = ifd + 2 + i * 12;
          if (view.getUint16(row, little) === 0x8825)
            gps = base + view.getUint32(row + 8, little);
        }
        if (!gps) return null;
        const count = view.getUint16(gps, little);
        if (count > 64) return null;
        const values: Record<number, number | string> = {};
        for (let i = 0; i < count; i++) {
          const row = gps + 2 + i * 12;
          const tag = view.getUint16(row, little);
          const type = view.getUint16(row + 2, little);
          const size = view.getUint32(row + 4, little);
          if ((tag === 1 || tag === 3) && type === 2 && size === 2)
            values[tag] = String.fromCharCode(view.getUint8(row + 8));
          if ((tag === 2 || tag === 4) && type === 5 && size === 3) {
            const start = base + view.getUint32(row + 8, little);
            const rational = (p: number) =>
              view.getUint32(p, little) / view.getUint32(p + 4, little);
            values[tag] =
              rational(start) +
              rational(start + 8) / 60 +
              rational(start + 16) / 3600;
          }
        }
        if (
          !["N", "S"].includes(String(values[1])) ||
          !["E", "W"].includes(String(values[3]))
        )
          return null;
        const latitude = Number(values[2]) * (values[1] === "S" ? -1 : 1);
        const longitude = Number(values[4]) * (values[3] === "W" ? -1 : 1);
        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude) ||
          Math.abs(latitude) > 90 ||
          Math.abs(longitude) > 180
        )
          return null;
        return {
          latitude,
          longitude,
          location_source: "photo_exif",
          location_recorded_at: null,
          location_accuracy_m: null,
        };
      }
      offset += length + 2;
    }
  } catch {
    return null;
  }
  return null;
}
