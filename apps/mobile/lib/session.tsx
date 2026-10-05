import type { Session } from "@supabase/supabase-js";
import { createContext,useContext,useEffect,useState,type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
type SessionState={session:Session|null;loading:boolean};
const SessionContext=createContext<SessionState>({session:null,loading:true});
export function SessionProvider({children}:{children:ReactNode}){const [session,setSession]=useState<Session|null>(null);const [loading,setLoading]=useState(true);useEffect(()=>{if(!supabase){setLoading(false);return}let mounted=true;void supabase.auth.getSession().then(({data})=>{if(mounted){setSession(data.session);setLoading(false)}});const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>{setSession(next);setLoading(false)});return()=>{mounted=false;subscription.unsubscribe()}},[]);return <SessionContext.Provider value={{session,loading}}>{children}</SessionContext.Provider>}
export function useSession(){return useContext(SessionContext)}
