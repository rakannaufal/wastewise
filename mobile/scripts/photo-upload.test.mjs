import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import test from "node:test";

const root = new URL("../../", import.meta.url);
const require = createRequire(new URL("web/package.json", root));
const ts = require("typescript");

// Execute the installed Expo serializer; only unavailable device file I/O is substituted.
function load(relative, dependencies = {}) {
  const filename = fileURLToPath(new URL(relative, root));
  const module = { exports: {} };
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  vm.runInNewContext(
    outputText,
    {
      module,
      exports: module.exports,
      Blob,
      TextEncoder,
      Uint8Array,
      FormData,
      require(name) {
        assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
        return dependencies[name];
      },
    },
    { filename },
  );
  return module.exports;
}

class NativeFormData {
  constructor() {
    this._parts = [];
  }
}
load("mobile/node_modules/expo/src/winter/FormData.ts").installFormDataPatch(
  NativeFormData,
);
const { convertFormDataAsync } = load(
  "mobile/node_modules/expo/src/winter/fetch/convertFormData.ts",
  {
    "../../utils/blobUtils": load(
      "mobile/node_modules/expo/src/utils/blobUtils.ts",
    ),
  },
);
const image = readFileSync(new URL("web/public/materials/plastic.jpg", root));
const uri = "file:///private/wastewise-drafts/test/photo.jpg";
class NativeFile {
  constructor(value) {
    assert.equal(value, uri);
    this.name = "photo.jpg";
    this.type = "image/jpeg";
  }
  async bytes() {
    return new Uint8Array(image);
  }
}
function photoModule(platform) {
  return load("mobile/src/photo.ts", {
    "expo-image-picker": {},
    "expo-image-manipulator": {},
    "expo-file-system": { File: NativeFile },
    "expo-crypto": {},
    "react-native": { Platform: { OS: platform } },
    "../../shared/photo-location": {},
  });
}

test("Expo SDK 58 rejects the legacy native URI upload before making a request", async () => {
  const form = new NativeFormData();
  form.append("image", { uri, type: "image/jpeg", name: "photo.jpg" });
  await assert.rejects(
    convertFormDataAsync(form),
    /Unsupported FormDataPart implementation/,
  );
});

test("native camera/gallery photo bytes survive the installed Expo multipart serializer", async () => {
  const form = new NativeFormData();
  await photoModule("ios").appendPhoto(form, {
    uri,
    name: "photo.jpg",
    type: "image/jpeg",
  });
  form.append("photo_source", "camera");
  const { body, boundary } = await convertFormDataAsync(form);
  const encoded = Buffer.from(body);
  assert.ok(
    encoded.includes(image),
    "Original normalized image bytes must reach the request",
  );
  assert.match(
    encoded.toString("latin1"),
    /name="image"; filename="photo.jpg"/,
  );
  assert.match(encoded.toString("latin1"), /content-type: image\/jpeg/);
  assert.match(encoded.toString("latin1"), /name="photo_source"\r\n\r\ncamera/);
  const parsed = await new Response(body, {
    headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
  }).formData();
  assert.equal(parsed.get("image").type, "image/jpeg");
  assert.deepEqual(Buffer.from(await parsed.get("image").arrayBuffer()), image);
});
