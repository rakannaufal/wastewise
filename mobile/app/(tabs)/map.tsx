import { useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { BackButton } from "../../src/BrandHeader";
import { parsePostId } from "../../../shared/community";
import { styles } from "../../src/ui";
import CommunityMap from "../../src/CommunityMap";
import CommunityFilters from "../../src/CommunityFilters";
import { emptyFilters, filterQuery } from "../../src/community";
export default function MapScreen() {
  const [filters, setFilters] = useState(emptyFilters);
  const { lat, lng, post } = useLocalSearchParams<{
    lat?: string;
    lng?: string;
    post?: string;
  }>();
  const sourcePost = parsePostId(post);
  const latitude = Number(lat),
    longitude = Number(lng);
  const focus =
    lat &&
    lng &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
      ? { latitude, longitude }
      : undefined;
  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <View
        style={{
          padding: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        {sourcePost && (
          <BackButton
            label="Kembali ke posting"
            onPress={() => {
              router.setParams({ post: undefined });
              router.dismissTo(`/post/${sourcePost}`);
            }}
          />
        )}
        <View style={{ flex: 1 }}>
          <CommunityFilters value={filters} onChange={setFilters} />
        </View>
      </View>
      <CommunityMap query={filterQuery(filters)} focus={focus} />
    </SafeAreaView>
  );
}
