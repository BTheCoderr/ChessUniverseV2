import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const modes = [
  { title: "Practice", subtitle: "Play locally or train against Stockfish", route: "/practice", badge: "PLAY" },
  { title: "Puzzles", subtitle: "Calculate, defend, and understand every move", route: "/puzzles", badge: "TRAIN" },
  { title: "Academy", subtitle: "Learn openings, tactics, strategy, and endgames", route: "/academy", badge: "LEARN" },
  { title: "Online", subtitle: "Classic games, challenges, and Battle Chess", route: "/online", badge: "LIVE" },
] as const;

export default function HomeScreen() {
  const open = (route: string) => {
    void Haptics.selectionAsync();
    router.push(route as never);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.brandRow}>
          <View>
            <Text style={styles.eyebrow}>CHESS UNIVERSE</Text>
            <Text style={styles.title}>Your board.{"\n"}Your universe.</Text>
          </View>
          <View style={styles.mark}><Text style={styles.markText}>♞</Text></View>
        </View>

        <Text style={styles.intro}>Play. Train. Learn. Compete. Your Chess Universe progress follows you everywhere.</Text>

        <View style={styles.cards}>
          {modes.map((mode) => (
            <Pressable key={mode.title} onPress={() => open(mode.route)} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
              <View style={styles.cardTop}>
                <Text style={styles.badge}>{mode.badge}</Text>
                <Text style={styles.arrow}>↗</Text>
              </View>
              <Text style={styles.cardTitle}>{mode.title}</Text>
              <Text style={styles.cardSubtitle}>{mode.subtitle}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable onPress={() => open("/games")} style={styles.library}>
          <Text style={styles.libraryTitle}>My Games</Text>
          <Text style={styles.libraryText}>Replay games, review positions, and keep improving.</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0b0e0f" },
  content: { padding: 22, paddingBottom: 42 },
  brandRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginTop: 14 },
  eyebrow: { color: "#d7ff4a", fontSize: 13, fontWeight: "900", letterSpacing: 2.4 },
  title: { color: "#f5f7f0", fontSize: 42, lineHeight: 44, fontWeight: "900", marginTop: 10, letterSpacing: -1.8 },
  mark: { width: 58, height: 58, borderRadius: 18, backgroundColor: "#d7ff4a", alignItems: "center", justifyContent: "center" },
  markText: { color: "#0b0e0f", fontSize: 35 },
  intro: { color: "#9ca7a3", fontSize: 16, lineHeight: 24, marginTop: 22, marginBottom: 24, maxWidth: 350 },
  cards: { gap: 12 },
  card: { backgroundColor: "#151a1b", borderWidth: 1, borderColor: "#263031", borderRadius: 24, padding: 20, minHeight: 148 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  badge: { color: "#d7ff4a", fontSize: 11, fontWeight: "900", letterSpacing: 1.8 },
  arrow: { color: "#6f7c78", fontSize: 22 },
  cardTitle: { color: "#f5f7f0", fontSize: 27, fontWeight: "900", marginTop: 22 },
  cardSubtitle: { color: "#9ca7a3", fontSize: 14, lineHeight: 20, marginTop: 5 },
  library: { marginTop: 16, borderRadius: 22, padding: 19, borderWidth: 1, borderColor: "#d7ff4a55", backgroundColor: "#101516" },
  libraryTitle: { color: "#f5f7f0", fontSize: 19, fontWeight: "800" },
  libraryText: { color: "#89938f", fontSize: 13, marginTop: 5 },
});
