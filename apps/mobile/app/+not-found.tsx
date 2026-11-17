import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function NotFound() {
  return <SafeAreaView style={styles.safe}><View style={styles.content}><Text style={styles.code}>404</Text><Text style={styles.title}>Lost in the universe.</Text><Pressable onPress={() => router.replace("/")} style={styles.button}><Text style={styles.buttonText}>Back to Chess Universe</Text></Pressable></View></SafeAreaView>;
}
const styles = StyleSheet.create({ safe:{flex:1,backgroundColor:"#08152D"}, content:{flex:1,alignItems:"center",justifyContent:"center",padding:28}, code:{color:"#F2C064",fontWeight:"900",letterSpacing:3}, title:{color:"#F9F3E8",fontSize:32,fontWeight:"900",marginTop:10}, button:{backgroundColor:"#F2C064",paddingHorizontal:20,paddingVertical:14,borderRadius:16,marginTop:28}, buttonText:{color:"#08152D",fontWeight:"900"} });
