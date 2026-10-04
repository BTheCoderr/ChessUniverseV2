import { router, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ChallengeEntry() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SafeAreaView style={styles.safe}><View style={styles.content}><Text style={styles.eyebrow}>CHALLENGE</Text><Text style={styles.title}>You’ve been challenged.</Text><Text style={styles.text}>Game {id ?? ""} is ready to hand off to the native online lobby.</Text><Pressable onPress={() => router.replace({ pathname: "/online", params: { challenge: id } })} style={styles.button}><Text style={styles.buttonText}>Open challenge</Text></Pressable></View></SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:"#0b0e0f"},content:{flex:1,justifyContent:"center",padding:26},eyebrow:{color:"#d7ff4a",fontWeight:"900",letterSpacing:2},title:{color:"#f5f7f0",fontSize:38,fontWeight:"900",marginTop:10},text:{color:"#929d99",fontSize:16,lineHeight:23,marginTop:12},button:{backgroundColor:"#d7ff4a",padding:16,borderRadius:18,alignItems:"center",marginTop:28},buttonText:{color:"#0b0e0f",fontWeight:"900",fontSize:16}});
