import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PracticeGame } from "@/components/PracticeGame";

export default function Practice() {
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content}>
    <Pressable onPress={()=>router.back()} hitSlop={16}><Text style={styles.back}>← Universe</Text></Pressable>
    <Text style={styles.eyebrow}>PLAY</Text><Text style={styles.title}>Practice</Text>
    <Text style={styles.description}>Chess Universe begins with Black moving first. Play the computer or pass the phone between two local players. Choose your difficulty and time control.</Text>
    <PracticeGame />
    <Text style={styles.note}>The native computer opponent uses a lightweight local chess engine. Full Stockfish analysis is currently available on the website, not yet in the iOS app.</Text>
  </ScrollView></SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:"#08152D"},content:{padding:14,paddingBottom:40},back:{color:"#A6B7CB",fontSize:15,fontWeight:"700",margin:8},eyebrow:{color:"#F2C064",fontSize:11,fontWeight:"900",letterSpacing:2,marginHorizontal:8,marginTop:22},title:{color:"#F9F3E8",fontSize:38,fontWeight:"900",letterSpacing:-1.4,marginHorizontal:8,marginTop:5},description:{color:"#A6B7CB",fontSize:14,lineHeight:21,marginHorizontal:8,marginTop:7,marginBottom:18},note:{color:"#91A6C1",fontSize:12,lineHeight:18,margin:10,marginTop:18}});
