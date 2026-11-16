import { router } from "expo-router";
import { useEffect,useState } from "react";
import { ActivityIndicator,Alert,Linking,Pressable,ScrollView,StyleSheet,Text,TextInput,View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { isSupabaseConfigured,supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { clearStoredData } from "@/lib/storage";
import { PUBLIC_APP_URL } from "@/lib/deepLinks";
type Mode="signin"|"signup"|"forgot";type Profile={username:string;rating:number;wins:number;losses:number;draws:number};
export default function Account(){const {session,loading}=useSession();const [mode,setMode]=useState<Mode>("signin");const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [username,setUsername]=useState("");const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);const [profile,setProfile]=useState<Profile|null>(null);
useEffect(()=>{const client=supabase;if(!client||!session){setProfile(null);return}void client.from("profiles").select("username,rating,wins,losses,draws").eq("id",session.user.id).single().then(({data})=>setProfile(data as Profile|null))},[session?.user.id]);
const submit=async()=>{const client=supabase;if(!client)return;setBusy(true);setMessage("");if(mode==="forgot"){const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:PUBLIC_APP_URL});setMessage(error?.message??"If that account exists, use the email link in your browser to choose a new password, then sign in here.");setBusy(false);return}if(mode==="signup"){const {error}=await client.auth.signUp({email,password,options:{data:{username},emailRedirectTo:PUBLIC_APP_URL}});setMessage(error?.message??"Account created. Confirm your email in your browser if prompted, then sign in here.");setBusy(false);return}const {error}=await client.auth.signInWithPassword({email,password});setMessage(error?.message??"Signed in.");setBusy(false)};

const deleteAccount=async()=>{
  const client=supabase;
  if(!client||!session||busy)return;
  setBusy(true);
  setMessage("");
  try{
    // The server validates the JWT and deletes only the authenticated user.
    const {data,error}=await client.functions.invoke<{ok?:boolean;error?:string}>("delete-account",{body:{}});
    if(error)throw new Error("Account deletion failed. Please check your connection and try again.");
    if(data?.ok!==true)throw new Error(data?.error??"The server did not confirm account deletion.");
  }catch(error){
    setMessage(error instanceof Error?error.message:"Unable to delete your account. Please try again.");
    setBusy(false);
    return;
  }

  // Clear locally cached learning and game data only AFTER the server confirms deletion.
  let localCleanupFailed=false;
  try{await clearStoredData()}catch{localCleanupFailed=true}

  // Local sign-out clears the stored session even if Supabase cannot revoke
  // the deleted user's refresh token. Verify local state, not the network error.
  let localSessionCleared=false;
  try{
    await client.auth.signOut({scope:"local"});
    const {data:{session:storedSession}}=await client.auth.getSession();
    localSessionCleared=!storedSession;
  }catch{
    // Account deletion already succeeded on the server; don't retry deletion.
  }
  if(!localSessionCleared){
    setBusy(false);
    Alert.alert("Account deleted","Your account was deleted, but the app could not confirm that its saved login was cleared. Please remove and reinstall the app before another person uses this device.");
    return;
  }

  setProfile(null);
  setBusy(false);
  Alert.alert(
    "Account deleted",
    localCleanupFailed
      ?"Your account was deleted, but some offline data could not be cleared. Remove and reinstall the app to erase the remaining device data."
      :"Your account and saved progress have been deleted. Completed matches may remain without identifying you.",
    [{text:"OK",onPress:()=>router.replace("/")}]
  );
};
const confirmDelete=()=>{
  if(busy||!session)return;
  Alert.alert(
    "Permanently delete account?",
    "This deletes your Chess Universe account, profile, synced progress, and local app progress. Active games will be removed; completed matches may remain de-identified. This cannot be undone.",
    [
      {text:"Cancel",style:"cancel"},
      {text:"Delete account",style:"destructive",onPress:()=>void deleteAccount()}
    ]
  );
};
const openInfo=async(path:"/privacy"|"/terms"|"/support")=>{
  try{await Linking.openURL(PUBLIC_APP_URL+path)}
  catch{setMessage("Could not open link. Visit "+PUBLIC_APP_URL+path)}
};
if(loading)return <SafeAreaView style={s.safe}><ActivityIndicator color="#d7ff4a" style={{marginTop:80}}/></SafeAreaView>;
return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.content}><Pressable onPress={()=>router.back()}><Text style={s.back}>← Universe</Text></Pressable><Text style={s.eyebrow}>ACCOUNT</Text>{!isSupabaseConfigured||!supabase?<View style={s.card}><Text style={s.title}>Connection ready</Text><Text style={s.muted}>Add the existing Chess Universe Supabase URL and publishable key to the Expo environment before the first device build.</Text></View>:session?<View style={s.card}><Text style={s.title}>{profile?.username??session.user.user_metadata.username??"Player"}</Text><Text style={s.email}>{session.user.email}</Text>{profile&&<><Text style={s.rating}>{profile.rating}</Text><Text style={s.ratingLabel}>RATING</Text><View style={s.stats}><Stat n={profile.wins} label="Wins"/><Stat n={profile.losses} label="Losses"/><Stat n={profile.draws} label="Draws"/></View></>}<Pressable disabled={busy} style={s.secondary} onPress={()=>{const client=supabase;if(client)void client.auth.signOut()}}><Text style={s.secondaryText}>Sign out</Text></Pressable>
<View style={s.dangerZone}>
  <Text style={s.dangerTitle}>Delete account</Text>
  <Text style={s.dangerDescription}>Permanently delete your account and saved progress. You can still play offline without an account.</Text>
  <Pressable accessibilityRole="button" accessibilityLabel="Delete account" disabled={busy} onPress={confirmDelete} style={[s.deleteButton,busy&&s.disabled]}>
    <Text style={s.deleteText}>{busy?"Working…":"Delete my account"}</Text>
  </Pressable>
</View>
{message?<Text style={s.error}>{message}</Text>:null}</View>:<View style={s.card}><Text style={s.title}>{mode==="signin"?"Welcome back":mode==="signup"?"Join Chess Universe":"Reset password"}</Text>{mode==="signup"&&<TextInput value={username} onChangeText={setUsername} placeholder="Username" placeholderTextColor="#697570" autoCapitalize="none" style={s.input}/>}<TextInput value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor="#697570" keyboardType="email-address" autoCapitalize="none" style={s.input}/>{mode!=="forgot"&&<TextInput value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor="#697570" secureTextEntry style={s.input}/>}<Pressable disabled={busy} style={s.primary} onPress={()=>void submit()}><Text style={s.primaryText}>{busy?"Working…":mode==="signin"?"Sign in":mode==="signup"?"Create account":"Send recovery link"}</Text></Pressable>{message?<Text style={s.message}>{message}</Text>:null}<View style={s.links}>{mode==="signin"?<><Pressable onPress={()=>setMode("forgot")}><Text style={s.link}>Forgot password?</Text></Pressable><Pressable onPress={()=>setMode("signup")}><Text style={s.link}>Need an account? Sign up</Text></Pressable></>:<Pressable onPress={()=>setMode("signin")}><Text style={s.link}>Back to sign in</Text></Pressable>}</View></View>}<View style={s.infoLinks}><Pressable accessibilityRole="link" onPress={()=>void openInfo("/privacy")}><Text style={s.infoLink}>Privacy Policy</Text></Pressable><Pressable accessibilityRole="link" onPress={()=>void openInfo("/terms")}><Text style={s.infoLink}>Terms</Text></Pressable><Pressable accessibilityRole="link" onPress={()=>void openInfo("/support")}><Text style={s.infoLink}>Support</Text></Pressable></View></ScrollView></SafeAreaView>}
function Stat({n,label}:{n:number;label:string}){return <View style={s.stat}><Text style={s.statN}>{n}</Text><Text style={s.statLabel}>{label}</Text></View>}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:"#0b0e0f"},content:{padding:22,paddingBottom:44},back:{color:"#9ca7a3",fontSize:15,fontWeight:"700",marginTop:8},eyebrow:{color:"#d7ff4a",fontSize:11,fontWeight:"900",letterSpacing:2,marginTop:34,marginBottom:10},card:{backgroundColor:"#151a1b",borderWidth:1,borderColor:"#273031",borderRadius:24,padding:20},title:{color:"#f5f7f0",fontSize:28,fontWeight:"900"},muted:{color:"#909b97",fontSize:14,lineHeight:21,marginTop:10},email:{color:"#8d9894",fontSize:13,marginTop:5},rating:{color:"#d7ff4a",fontSize:42,fontWeight:"900",marginTop:22},ratingLabel:{color:"#74807b",fontSize:9,fontWeight:"900",letterSpacing:1.5},stats:{flexDirection:"row",gap:8,marginTop:18},stat:{flex:1,backgroundColor:"#0f1415",borderRadius:14,padding:13},statN:{color:"#f5f7f0",fontSize:20,fontWeight:"900"},statLabel:{color:"#74807b",fontSize:10,marginTop:3},input:{backgroundColor:"#0e1314",borderWidth:1,borderColor:"#2a3433",borderRadius:14,color:"#f5f7f0",padding:15,fontSize:15,marginTop:11},primary:{backgroundColor:"#d7ff4a",borderRadius:14,padding:15,alignItems:"center",marginTop:14},primaryText:{color:"#0b0e0f",fontSize:14,fontWeight:"900"},secondary:{borderWidth:1,borderColor:"#3a4643",borderRadius:14,padding:14,alignItems:"center",marginTop:20},secondaryText:{color:"#f5f7f0",fontSize:13,fontWeight:"800"},message:{color:"#c8d0cc",fontSize:12,lineHeight:18,marginTop:12},dangerZone:{marginTop:26,paddingTop:18,borderTopWidth:1,borderTopColor:"#36403c"},
dangerTitle:{color:"#f5f7f0",fontSize:16,fontWeight:"900"},
dangerDescription:{color:"#909b97",fontSize:12,lineHeight:19,marginTop:7},
deleteButton:{borderWidth:1,borderColor:"#8f4641",backgroundColor:"#291b1a",padding:14,borderRadius:14,alignItems:"center",marginTop:14},
deleteText:{color:"#ffaaa3",fontSize:13,fontWeight:"900"},
disabled:{opacity:.5},
error:{color:"#ffaaa3",fontSize:12,lineHeight:18,marginTop:12},
links:{gap:12,marginTop:18},link:{color:"#d7ff4a",fontSize:13,fontWeight:"800"},infoLinks:{flexDirection:"row",justifyContent:"space-around",gap:10,marginTop:24},infoLink:{color:"#d7ff4a",fontSize:12,fontWeight:"800"}});
