import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = { eyebrow: string; title: string; description: string };

export function ModePlaceholder({ eyebrow, title, description }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Pressable onPress={() => router.back()} hitSlop={16}><Text style={styles.back}>← Universe</Text></Pressable>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        <View style={styles.panel}>
          <Text style={styles.panelLabel}>NATIVE PORT</Text>
          <Text style={styles.panelTitle}>Foundation ready.</Text>
          <Text style={styles.panelText}>This screen is wired into the Expo app. Next we move the existing Chess Universe engine and data flow here without changing the production web app.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#08152D" },
  content: { flex: 1, padding: 22 },
  back: { color: "#A6B7CB", fontSize: 15, fontWeight: "700", marginTop: 8 },
  eyebrow: { color: "#F2C064", fontSize: 12, fontWeight: "900", letterSpacing: 2.2, marginTop: 46 },
  title: { color: "#F9F3E8", fontSize: 43, fontWeight: "900", letterSpacing: -1.5, marginTop: 8 },
  description: { color: "#A6B7CB", fontSize: 17, lineHeight: 25, marginTop: 12 },
  panel: { marginTop: 34, backgroundColor: "#11233F", borderColor: "#2F4563", borderWidth: 1, borderRadius: 24, padding: 22 },
  panelLabel: { color: "#F2C064", fontSize: 11, fontWeight: "900", letterSpacing: 1.7 },
  panelTitle: { color: "#F9F3E8", fontSize: 23, fontWeight: "900", marginTop: 14 },
  panelText: { color: "#A6B7CB", fontSize: 14, lineHeight: 21, marginTop: 7 },
});
