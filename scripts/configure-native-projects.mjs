import { existsSync, readFileSync, writeFileSync } from "node:fs";

const iosInfo = "ios/App/App/Info.plist";
const androidManifest = "android/app/src/main/AndroidManifest.xml";

function patchIos() {
  if (!existsSync(iosInfo)) return false;

  let content = readFileSync(iosInfo, "utf8");
  if (content.includes("<string>chessuniverse</string>")) return true;

  const marker = "</dict>\n</plist>";
  const block = [
    "  <key>CFBundleURLTypes</key>",
    "  <array>",
    "    <dict>",
    "      <key>CFBundleURLName</key>",
    "      <string>com.bthecoderr.chessuniverse</string>",
    "      <key>CFBundleURLSchemes</key>",
    "      <array>",
    "        <string>chessuniverse</string>",
    "      </array>",
    "    </dict>",
    "  </array>",
  ].join("\n");

  if (!content.includes(marker)) {
    throw new Error("Could not find the iOS Info.plist insertion point.");
  }

  content = content.replace(marker, `${block}\n${marker}`);
  writeFileSync(iosInfo, content);
  return true;
}

function patchAndroid() {
  if (!existsSync(androidManifest)) return false;

  let content = readFileSync(androidManifest, "utf8");
  if (content.includes('android:scheme="chessuniverse"')) return true;

  const marker = "</activity>";
  const block = [
    "            <intent-filter>",
    "                <action android:name=\"android.intent.action.VIEW\" />",
    "                <category android:name=\"android.intent.category.DEFAULT\" />",
    "                <category android:name=\"android.intent.category.BROWSABLE\" />",
    "                <data android:scheme=\"chessuniverse\" android:host=\"challenge\" />",
    "            </intent-filter>",
  ].join("\n");

  if (!content.includes(marker)) {
    throw new Error("Could not find the Android activity insertion point.");
  }

  content = content.replace(marker, `${block}\n        ${marker}`);
  writeFileSync(androidManifest, content);
  return true;
}

const ios = patchIos();
const android = patchAndroid();

if (!ios && !android) {
  console.log("No native projects found yet. Run the Capacitor platform init scripts first.");
} else {
  console.log(`Native URL scheme configured: iOS=${ios} Android=${android}`);
}
