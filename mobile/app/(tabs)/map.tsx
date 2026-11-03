import { useState } from "react";
import { Text } from "react-native";
import { Screen, styles } from "../../src/ui";
import CommunityMap from "../../src/CommunityMap";
import CommunityFilters from "../../src/CommunityFilters";
import { emptyFilters, filterQuery } from "../../src/community";
export default function MapScreen() {
  const [filters, setFilters] = useState(emptyFilters);
  return (
    <Screen>
      <Text style={styles.title}>Peta lingkungan.</Text>
      <Text style={styles.text}>
        Jelajahi laporan yang dibagikan, dari kota sampai kelurahan.
      </Text>
      <CommunityFilters value={filters} onChange={setFilters} />
      <CommunityMap query={filterQuery(filters)} />
    </Screen>
  );
}
