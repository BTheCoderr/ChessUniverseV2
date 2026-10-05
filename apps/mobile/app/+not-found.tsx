import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function NotFound() {
  return <SafeAreaView style={styles.safe}><View style={styles.content}><Text style={styles.code}>404</Text><Text style={styles.title}>Lost in the universe.</Text><Pressable onPress={() => router.replace("/")} style={styles.button}><Text style={styles.buttonText}>Back to Chess Universe</Text></Pressable></View></SafeAreaView>;
}
const styles = StyleSheet.create({ safe:{flex:1,backgroundColor:"#0b0e0f"}, content:{flex:1,alignItems:"center",justifyContent:"center",padding:28}, code:{color:"#d7ff4a",fontWeight:"900",letterSpacing:3}, title:{color:"#f5f7f0",fontSize:32,fontWeight:"900",marginTop:10}, button:{backgroundColor:"#d7ff4a",paddingHorizontal:20,paddingVertical:14,borderRadius:16,marginTop:28}, buttonText:{color:"#0b0e0f",fontWeight:"900"} });
