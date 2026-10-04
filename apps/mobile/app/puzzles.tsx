import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PositionBoard } from "@/components/PositionBoard";
import { puzzles } from "@/lib/puzzles";

export default function Puzzles() {
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [solved, setSolved] = useState(false);
  const puzzle = puzzles[index];

  const correct = () => { setSolved(true); setFeedback(puzzle.success); void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); };
  const wrong = () => { setFeedback(puzzle.wrongMove); void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); };
  const next = () => { setIndex((index + 1) % puzzles.length); setFeedback(null); setSolved(false); };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>← Universe</Text></Pressable>
        <Text style={styles.eyebrow}>TRAIN · {index + 1}/{puzzles.length}</Text>
        <Text style={styles.title}>{puzzle.title}</Text>
        <Text style={styles.prompt}>{puzzle.prompt}</Text>
        <View style={styles.boardWrap}><PositionBoard key={puzzle.id} fen={puzzle.fen} expectedMove={puzzle.solution[0]} onCorrect={correct} onWrong={wrong} locked={solved} /></View>
        <Text style={styles.instruction}>{solved ? "Solved." : "Play the move directly on the board."}</Text>
        {feedback && <View style={[styles.feedback, solved && styles.solved]}><Text style={styles.feedbackLabel}>{solved ? "WHY IT WORKS" : "WHY NOT"}</Text><Text style={styles.feedbackText}>{feedback}</Text></View>}
        {solved && <Pressable onPress={next} style={styles.next}><Text style={styles.nextText}>Next puzzle →</Text></Pressable>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0b0e0f" }, content: { padding: 22, paddingBottom: 40 }, back: { color: "#9ca7a3", fontSize: 15, fontWeight: "700", marginTop: 8 },
  eyebrow: { color: "#d7ff4a", fontSize: 11, fontWeight: "900", letterSpacing: 2, marginTop: 30 }, title: { color: "#f5f7f0", fontSize: 35, fontWeight: "900", letterSpacing: -1.2, marginTop: 6 },
  prompt: { color: "#a3adaa", fontSize: 16, lineHeight: 23, marginTop: 7 }, boardWrap: { marginTop: 22 }, instruction: { color: "#77837e", fontSize: 12, textAlign: "center", marginTop: 10 },
  feedback: { backgroundColor: "#251c17", borderRadius: 18, padding: 18, marginTop: 16, borderWidth: 1, borderColor: "#624c3e" }, solved: { backgroundColor: "#172016", borderColor: "#4f663d" },
  feedbackLabel: { color: "#d7ff4a", fontSize: 10, fontWeight: "900", letterSpacing: 1.6 }, feedbackText: { color: "#e0e5de", fontSize: 14, lineHeight: 21, marginTop: 8 },
  next: { backgroundColor: "#d7ff4a", borderRadius: 16, padding: 16, marginTop: 16, alignItems: "center" }, nextText: { color: "#0b0e0f", fontSize: 15, fontWeight: "900" },
});
