import { strict as assert } from "node:assert";
import { test } from "node:test";
import { jpegLocation } from "./photo-location.ts";

function fixture(little = true) {
  const buffer = new ArrayBuffer(164);
  const v = new DataView(buffer);
  v.setUint16(0, 0xffd8);
  v.setUint16(2, 0xffe1);
  v.setUint16(4, 158);
  v.setUint32(6, 0x45786966);
  v.setUint16(10, 0);
  const base = 12;
  v.setUint16(base, little ? 0x4949 : 0x4d4d);
  v.setUint16(base + 2, 42, little);
  v.setUint32(base + 4, 8, little);
  v.setUint16(20, 1, little);
  v.setUint16(22, 0x8825, little);
  v.setUint16(24, 4, little);
  v.setUint32(26, 1, little);
  v.setUint32(30, 26, little);
  v.setUint16(38, 4, little);
  for (let i = 0; i < 4; i++) {
    const row = 40 + i * 12;
    const ref = i % 2 === 0;
    v.setUint16(row, i + 1, little);
    v.setUint16(row + 2, ref ? 2 : 5, little);
    v.setUint32(row + 4, ref ? 2 : 3, little);
    if (ref) v.setUint8(row + 8, i === 0 ? 83 : 69);
    else v.setUint32(row + 8, i === 1 ? 80 : 104, little);
  }
  for (const [start, values] of [
    [92, [6, 12, 0]],
    [116, [106, 48, 0]],
  ] as const)
    for (let i = 0; i < 3; i++) {
      v.setUint32(start + i * 8, values[i], little);
      v.setUint32(start + i * 8 + 4, 1, little);
    }
  return buffer;
}
test("GPS preserves southern latitude, both TIFF byte orders, unknown precision/time", () => {
  for (const little of [true, false])
    assert.deepEqual(jpegLocation(fixture(little)), {
      latitude: -6.2,
      longitude: 106.8,
      location_source: "photo_exif",
      location_recorded_at: null,
      location_accuracy_m: null,
    });
});
test("missing, truncated and out-of-segment GPS produce no fabricated coordinates", () => {
  assert.equal(jpegLocation(new ArrayBuffer(0)), null);
  assert.equal(jpegLocation(fixture().slice(0, 100)), null);
  const invalid = fixture();
  new DataView(invalid).setUint32(60, 10000, true);
  assert.equal(jpegLocation(invalid), null);
  const zero = fixture();
  new DataView(zero).setUint32(96, 0, true);
  assert.equal(jpegLocation(zero), null);
  const outside = fixture();
  new DataView(outside).setUint16(4, 70);
  assert.equal(jpegLocation(outside), null);
});
