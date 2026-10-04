# Mobile architecture

The Expo app is a native client, not a WebView wrapper.

- `chess.ts`: native chess.js rules boundary
- `supabase.ts`: persisted React Native Supabase session
- `storage.ts`: AsyncStorage-backed local progress/game storage
- `deepLinks.ts`: Chess Universe challenge URL parsing
- web-only DOM/localStorage/Capacitor modules stay outside this app

Backend contracts should remain compatible with the existing authoritative Supabase multiplayer implementation. Secrets and service-role credentials must remain server-side.
