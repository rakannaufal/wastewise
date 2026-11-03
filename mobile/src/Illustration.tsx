import { Image } from "react-native";
import type { ImageSourcePropType } from "react-native";
// Add approved local illustrations with static require() entries; Metro must see each file.
const sources: Record<string, ImageSourcePropType> = {};
export default function Illustration({
  slot,
  alt,
}: {
  slot: string;
  alt: string;
}) {
  return sources[slot] ? (
    <Image
      source={sources[slot]}
      accessibilityLabel={alt}
      style={{ width: "100%", height: 220 }}
      resizeMode="contain"
    />
  ) : null;
}
