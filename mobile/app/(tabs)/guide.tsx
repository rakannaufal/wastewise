import { useState } from "react";
import { Image, Text, View } from "react-native";
import { categories, Input, Screen, styles } from "../../src/ui";
import { materialGraphics } from "../../src/materialGraphics";
export default function Guide() {
  const [search, setSearch] = useState("");
  const matches = categories.filter((c) =>
    `${c.name} ${c.family}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <Screen>
      <Text style={styles.title}>Panduan memilah</Text>
      <Text style={styles.text}>
        Beda bahan, beda penanganan. Ikuti aturan fasilitas setempat.
      </Text>
      <Input label="Cari material" value={search} onChangeText={setSearch} />
      {matches.length === 0 && (
        <Text style={styles.text}>
          Material belum ditemukan. Coba kata lain.
        </Text>
      )}
      {matches.map((category) => (
        <View key={category.id} style={styles.panel}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            <Image
              source={materialGraphics[category.id]}
              style={{ width: 88, height: 88, borderRadius: 12 }}
              resizeMode="contain"
              accessibilityLabel={`Ilustrasi ${category.name.toLowerCase()}`}
            />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.label}>{category.family.toUpperCase()}</Text>
              <Text style={styles.heading}>{category.name}</Text>
            </View>
          </View>
          <Text style={styles.text}>{category.description}</Text>
          <View style={styles.action}>
            <Text style={styles.text}>{category.action}</Text>
          </View>
        </View>
      ))}
    </Screen>
  );
}
