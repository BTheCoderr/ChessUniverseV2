import * as Linking from "expo-linking";
import { router,Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SessionProvider } from "@/lib/session";
import { challengeIdFromUrl } from "@/lib/deepLinks";
function DeepLinkRouter(){useEffect(()=>{const route=(url:string|null)=>{const id=challengeIdFromUrl(url);if(id)router.push({pathname:"/challenge/[id]",params:{id}} as never)};void Linking.getInitialURL().then(route);const sub=Linking.addEventListener("url",event=>route(event.url));return()=>sub.remove()},[]);return null}
export default function RootLayout(){return <SafeAreaProvider><SessionProvider><DeepLinkRouter/><StatusBar style="light"/><Stack screenOptions={{headerShown:false,contentStyle:{backgroundColor:"#0b0e0f"},animation:"fade"}}/></SessionProvider></SafeAreaProvider>}
