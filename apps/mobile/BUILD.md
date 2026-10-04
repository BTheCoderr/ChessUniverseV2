# First TestFlight build

The Expo client foundation is committed on `feat/expo-mobile`. No Netlify deployment is part of this workflow.

From `apps/mobile`:

```bash
npm install
npx expo-doctor
npx eas-cli login
npx eas-cli init
```

After EAS creates/links the project, put the generated project ID into the build environment as `EXPO_PUBLIC_EAS_PROJECT_ID` and add the public Supabase values:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Then:

```bash
npx eas-cli build --platform ios --profile production
npx eas-cli submit --platform ios --latest
```

The first phone build should verify launch, native home navigation, the playable Practice board, haptics, safe areas, and back navigation before the remaining web features are ported.
