import { router } from "expo-router";
import { useEffect,useState } from "react";
import { ActivityIndicator,Alert,Linking,Pressable,ScrollView,StyleSheet,Text,TextInput,View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { isSupabaseConfigured,supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { clearStoredData } from "@/lib/storage";
import { PUBLIC_APP_URL } from "@/lib/deepLinks";
import { validateAuthInput } from "@/lib/authValidation";
type Mode="signin"|"signup"|"forgot";type Profile={username:string;rating:number;wins:number;losses:number;draws:number};
export default function Account(){const {session,loading}=useSession();const [mode,setMode]=useState<Mode>("signin");const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [username,setUsername]=useState("");const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);const [profile,setProfile]=useState<Profile|null>(null);
useEffect(()=>{const client=supabase;if(!client||!session){setProfile(null);return}void client.from("profiles").select("username,rating,wins,losses,draws").eq("id",session.user.id).single().then(({data})=>setProfile(data as Profile|null))},[session?.user.id]);
const submit=async()=>{const client=supabase;if(!client||busy)return;const problem=validateAuthInput(mode,email,password,username);if(problem){setMessage(problem);return}setBusy(true);setMessage("");try{
   if(mode==="forgot"){const {error}=await client.auth.resetPasswordForEmail(email.trim(),{redirectTo:PUBLIC_APP_URL});setMessage(error?.message??"If that account exists, use the email link in your browser to choose a new password, then sign in here.");return}
   if(mode==="signup"){const {error}=await client.auth.signUp({email:email.trim(),password,options:{data:{username:username.trim()},emailRedirectTo:PUBLIC_APP_URL}});setMessage(error?.message??"Account created. Confirm your email in your browser if prompted, then sign in here.");return}
   const {error}=await client.auth.signInWithPassword({email:email.trim(),password});setMessage(error?.message??"Signed in.");
 }catch(error){setMessage(error instanceof Error?error.message:"Unable to connect. Please try again.");}finally{setBusy(false)}};

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
if(loading)return <SafeAreaView style={s.safe}><ActivityIndicator color="#F2C064" style={{marginTop:80}}/></SafeAreaView>;
return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.content}><Pressable testID="back" accessibilityRole="button" accessibilityLabel="Back" hitSlop={12} onPress={()=>router.back()}><Text style={s.back}>← Universe</Text></Pressable><Text style={s.eyebrow}>ACCOUNT</Text>{!isSupabaseConfigured||!supabase?<View style={s.card}><Text style={s.title}>Online services unavailable</Text><Text style={s.muted}>Accounts and online play are temporarily unavailable in this build. Practice, Puzzles, Academy and Legends still work offline.</Text></View>:session?<View style={s.card}><Text style={s.title}>{profile?.username??session.user.user_metadata.username??"Player"}</Text><Text style={s.email}>{session.user.email}</Text>{profile&&<><Text style={s.rating}>{profile.rating}</Text><Text style={s.ratingLabel}>RATING</Text><View style={s.stats}><Stat n={profile.wins} label="Wins"/><Stat n={profile.losses} label="Losses"/><Stat n={profile.draws} label="Draws"/></View></>}<Pressable testID="account-signout" accessibilityRole="button" disabled={busy} style={s.secondary} onPress={()=>{const client=supabase;if(client)void client.auth.signOut()}}><Text style={s.secondaryText}>Sign out</Text></Pressable>
<View style={s.dangerZone}>
  <Text style={s.dangerTitle}>Delete account</Text>
  <Text style={s.dangerDescription}>Permanently delete your account and saved progress. You can still play offline without an account.</Text>
  <Pressable testID="account-delete" accessibilityRole="button" accessibilityLabel="Delete account" disabled={busy} onPress={confirmDelete} style={[s.deleteButton,busy&&s.disabled]}>
    <Text style={s.deleteText}>{busy?"Working…":"Delete my account"}</Text>
  </Pressable>
</View>
{message?<Text style={s.error}>{message}</Text>:null}</View>:<View style={s.card}><Text style={s.title}>{mode==="signin"?"Welcome back":mode==="signup"?"Join Chess Universe":"Reset password"}</Text>{mode==="signup"&&<TextInput testID="account-username" accessibilityLabel="Username" autoComplete="username-new" textContentType="username" autoCorrect={false} value={username} onChangeText={setUsername} placeholder="Username" placeholderTextColor="#A6B7CB" autoCapitalize="none" style={s.input}/>}<TextInput testID="account-email" accessibilityLabel="Email" autoComplete="email" textContentType="emailAddress" autoCorrect={false} value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor="#A6B7CB" keyboardType="email-address" autoCapitalize="none" style={s.input}/>{mode!=="forgot"&&<TextInput testID="account-password" accessibilityLabel="Password" autoComplete={mode==="signup"?"new-password":"current-password"} textContentType={mode==="signup"?"newPassword":"password"} value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor="#A6B7CB" secureTextEntry style={s.input}/>}<Pressable testID="account-submit" accessibilityRole="button" accessibilityState={{disabled:busy,busy}} disabled={busy} style={s.primary} onPress={()=>void submit()}><Text style={s.primaryText}>{busy?"Working…":mode==="signin"?"Sign in":mode==="signup"?"Create account":"Send recovery link"}</Text></Pressable>{message?<Text testID="account-message" accessibilityLiveRegion="polite" style={s.message}>{message}</Text>:null}<View style={s.links}>{mode==="signin"?<><Pressable onPress={()=>setMode("forgot")}><Text style={s.link}>Forgot password?</Text></Pressable><Pressable onPress={()=>setMode("signup")}><Text style={s.link}>Need an account? Sign up</Text></Pressable></>:<Pressable onPress={()=>setMode("signin")}><Text style={s.link}>Back to sign in</Text></Pressable>}</View></View>}<View style={s.infoLinks}><Pressable accessibilityRole="link" onPress={()=>void openInfo("/privacy")}><Text style={s.infoLink}>Privacy Policy</Text></Pressable><Pressable accessibilityRole="link" onPress={()=>void openInfo("/terms")}><Text style={s.infoLink}>Terms</Text></Pressable><Pressable accessibilityRole="link" onPress={()=>void openInfo("/support")}><Text style={s.infoLink}>Support</Text></Pressable></View></ScrollView></SafeAreaView>}
function Stat({n,label}:{n:number;label:string}){return <View style={s.stat}><Text style={s.statN}>{n}</Text><Text style={s.statLabel}>{label}</Text></View>}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:"#08152D"},content:{padding:22,paddingBottom:44},back:{color:"#A6B7CB",fontSize:15,fontWeight:"700",marginTop:8},eyebrow:{color:"#F2C064",fontSize:11,fontWeight:"900",letterSpacing:2,marginTop:34,marginBottom:10},card:{backgroundColor:"#11233F",borderWidth:1,borderColor:"#2F4563",borderRadius:24,padding:20},title:{color:"#F9F3E8",fontSize:28,fontWeight:"900"},muted:{color:"#A6B7CB",fontSize:14,lineHeight:21,marginTop:10},email:{color:"#A6B7CB",fontSize:13,marginTop:5},rating:{color:"#F2C064",fontSize:42,fontWeight:"900",marginTop:22},ratingLabel:{color:"#91A6C1",fontSize:9,fontWeight:"900",letterSpacing:1.5},stats:{flexDirection:"row",gap:8,marginTop:18},stat:{flex:1,backgroundColor:"#0C1C34",borderRadius:14,padding:13},statN:{color:"#F9F3E8",fontSize:20,fontWeight:"900"},statLabel:{color:"#91A6C1",fontSize:10,marginTop:3},input:{backgroundColor:"#0C1C34",borderWidth:1,borderColor:"#2F4563",borderRadius:14,color:"#F9F3E8",padding:15,fontSize:15,marginTop:11},primary:{backgroundColor:"#F2C064",borderRadius:14,padding:15,alignItems:"center",marginTop:14},primaryText:{color:"#08152D",fontSize:14,fontWeight:"900"},secondary:{borderWidth:1,borderColor:"#415677",borderRadius:14,padding:14,alignItems:"center",marginTop:20},secondaryText:{color:"#F9F3E8",fontSize:13,fontWeight:"800"},message:{color:"#DCE4EF",fontSize:12,lineHeight:18,marginTop:12},dangerZone:{marginTop:26,paddingTop:18,borderTopWidth:1,borderTopColor:"#2F4563"},
dangerTitle:{color:"#F9F3E8",fontSize:16,fontWeight:"900"},
dangerDescription:{color:"#A6B7CB",fontSize:12,lineHeight:19,marginTop:7},
deleteButton:{borderWidth:1,borderColor:"#8f4641",backgroundColor:"#291b1a",padding:14,borderRadius:14,alignItems:"center",marginTop:14},
deleteText:{color:"#ffaaa3",fontSize:13,fontWeight:"900"},
disabled:{opacity:.5},
error:{color:"#ffaaa3",fontSize:12,lineHeight:18,marginTop:12},
links:{gap:12,marginTop:18},link:{color:"#F2C064",fontSize:13,fontWeight:"800"},infoLinks:{flexDirection:"row",justifyContent:"space-around",gap:10,marginTop:24},infoLink:{color:"#F2C064",fontSize:12,fontWeight:"800"}});
