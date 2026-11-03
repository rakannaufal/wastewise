import manifest from "../../../shared/assets/manifest.json";
export default function Illustration({
  slot,
  alt,
}: {
  slot: string;
  alt: string;
}) {
  const files: Record<string, string | null> = manifest.illustrations.files;
  const source = files[slot];
  return source ? (
    <img
      className="editorial-illustration"
      src={source}
      alt={alt}
      loading="lazy"
      width="640"
      height="480"
    />
  ) : null;
}
