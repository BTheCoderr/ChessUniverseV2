import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { puzzles } from "@/lib/puzzles";

export default function Puzzles() {
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [solved, setSolved] = useState(false);
  const puzzle = puzzles[index];

  const answer = (correct: boolean) => {
    if (correct) {
      setSolved(true);
      setFeedback(puzzle.success);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      setFeedback(puzzle.wrongMove);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };

  const next = () => {
    setIndex((index + 1) % puzzles.length);
    setFeedback(null);
    setSolved(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>← Universe</Text></Pressable>
        <Text style={styles.eyebrow}>TRAIN · {index + 1}/{puzzles.length}</Text>
        <Text style={styles.title}>{puzzle.title}</Text>
        <Text style={styles.prompt}>{puzzle.prompt}</Text>

        <View style={styles.position}>
          <Text style={styles.positionLabel}>POSITION</Text>
          <Text style={styles.fen}>{puzzle.fen}</Text>
          <Text style={styles.hint}>Interactive puzzle board is next. For now, test the coaching behavior below.</Text>
        </View>

        <Text style={styles.question}>What did your calculation show?</Text>
        <View style={styles.answers}>
          <Pressable style={styles.answer} onPress={() => answer(true)}><Text style={styles.answerTitle}>I found the forcing idea</Text><Text style={styles.answerText}>Check my line and explain why it works.</Text></Pressable>
          <Pressable style={styles.answer} onPress={() => answer(false)}><Text style={styles.answerTitle}>I chose another move</Text><Text style={styles.answerText}>Explain what I missed before I try again.</Text></Pressable>
        </View>

        {feedback && <View style={[styles.feedback, solved && styles.solved]}><Text style={styles.feedbackLabel}>{solved ? "WHY IT WORKS" : "WHY NOT"}</Text><Text style={styles.feedbackText}>{feedback}</Text></View>}
        {solved && <Pressable onPress={next} style={styles.next}><Text style={styles.nextText}>Next puzzle →</Text></Pressable>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0b0e0f" }, content: { padding: 22, paddingBottom: 40 },
  back: { color: "#9ca7a3", fontSize: 15, fontWeight: "700", marginTop: 8 },
  eyebrow: { color: "#d7ff4a", fontSize: 11, fontWeight: "900", letterSpacing: 2, marginTop: 38 },
  title: { color: "#f5f7f0", fontSize: 37, fontWeight: "900", letterSpacing: -1.3, marginTop: 7 },
  prompt: { color: "#a3adaa", fontSize: 17, lineHeight: 25, marginTop: 9 },
  position: { backgroundColor: "#151a1b", borderRadius: 20, padding: 18, marginTop: 24, borderWidth: 1, borderColor: "#273031" },
  positionLabel: { color: "#d7ff4a", fontSize: 10, fontWeight: "900", letterSpacing: 1.6 }, fen: { color: "#dfe4dd", fontSize: 12, marginTop: 10 },
  hint: { color: "#71807a", fontSize: 12, lineHeight: 18, marginTop: 12 }, question: { color: "#f5f7f0", fontSize: 18, fontWeight: "800", marginTop: 26 },
  answers: { gap: 10, marginTop: 12 }, answer: { backgroundColor: "#111617", borderRadius: 17, padding: 16, borderWidth: 1, borderColor: "#263031" },
  answerTitle: { color: "#f5f7f0", fontSize: 15, fontWeight: "800" }, answerText: { color: "#84908c", fontSize: 12, marginTop: 4 },
  feedback: { backgroundColor: "#251c17", borderRadius: 18, padding: 18, marginTop: 16, borderWidth: 1, borderColor: "#624c3e" },
  solved: { backgroundColor: "#172016", borderColor: "#4f663d" }, feedbackLabel: { color: "#d7ff4a", fontSize: 10, fontWeight: "900", letterSpacing: 1.6 },
  feedbackText: { color: "#e0e5de", fontSize: 14, lineHeight: 21, marginTop: 8 }, next: { backgroundColor: "#d7ff4a", borderRadius: 16, padding: 16, marginTop: 16, alignItems: "center" },
  nextText: { color: "#0b0e0f", fontSize: 15, fontWeight: "900" },
});
