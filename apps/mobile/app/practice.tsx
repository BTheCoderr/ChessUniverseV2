import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PracticeGame } from "@/components/PracticeGame";

export default function Practice() {
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content}>
    <Pressable onPress={()=>router.back()} hitSlop={16}><Text style={styles.back}>← Universe</Text></Pressable>
    <Text style={styles.eyebrow}>PLAY</Text><Text style={styles.title}>Practice</Text>
    <Text style={styles.description}>Play White against the native practice opponent. Beginner deliberately makes mistakes; higher levels increasingly favor tactical moves.</Text>
    <PracticeGame />
    <Text style={styles.note}>The mobile opponent is intentionally paced instead of replying instantly. Full Stockfish integration can replace this local fallback without changing the Practice UI.</Text>
  </ScrollView></SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:"#0b0e0f"},content:{padding:14,paddingBottom:40},back:{color:"#9ca7a3",fontSize:15,fontWeight:"700",margin:8},eyebrow:{color:"#d7ff4a",fontSize:11,fontWeight:"900",letterSpacing:2,marginHorizontal:8,marginTop:22},title:{color:"#f5f7f0",fontSize:38,fontWeight:"900",letterSpacing:-1.4,marginHorizontal:8,marginTop:5},description:{color:"#929d99",fontSize:14,lineHeight:21,marginHorizontal:8,marginTop:7,marginBottom:18},note:{color:"#75817c",fontSize:12,lineHeight:18,margin:10,marginTop:18}});
