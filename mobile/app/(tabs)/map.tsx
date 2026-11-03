import { useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { styles } from "../../src/ui";
import CommunityMap from "../../src/CommunityMap";
import CommunityFilters from "../../src/CommunityFilters";
import { emptyFilters, filterQuery } from "../../src/community";
export default function MapScreen() {
  const [filters, setFilters] = useState(emptyFilters);
  const { lat, lng } = useLocalSearchParams<{ lat?: string; lng?: string }>();
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
      <View style={{ padding: 16 }}>
        <CommunityFilters
          title="Peta lingkungan"
          value={filters}
          onChange={setFilters}
        />
      </View>
      <CommunityMap query={filterQuery(filters)} focus={focus} />
    </SafeAreaView>
  );
}
