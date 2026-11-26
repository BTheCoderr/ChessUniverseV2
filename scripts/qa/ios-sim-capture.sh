#!/usr/bin/env bash
# Boot a fresh iOS simulator, install the Release simulator build of Chess Universe,
# run the Maestro suite and record the whole session.
#   APP=/path/ChessUniverse.app scripts/qa/ios-sim-capture.sh "iPhone 16 Pro Max" iphone-6.9
set -euo pipefail
DEVICE_NAME="$1"; LABEL="$2"
ROOT="${GITHUB_WORKSPACE:-$(cd "$(dirname "$0")/../.." && pwd)}"
OUT="$ROOT/qa-captures/native-ios/$LABEL"
mkdir -p "$OUT"
: "${APP:?APP must point to the built .app}"

TYPE=$(xcrun simctl list devicetypes -j | python3 -c 'import json,sys; n=sys.argv[1]; print(next(d["identifier"] for d in json.load(sys.stdin)["devicetypes"] if d["name"]==n))' "$DEVICE_NAME")
RUNTIME=$(xcrun simctl list runtimes -j | python3 -c 'import json,sys; r=[x for x in json.load(sys.stdin)["runtimes"] if x.get("isAvailable") and x.get("platform")=="iOS"]; print(sorted(r,key=lambda x:[int(p) for p in x["version"].split(".")])[-1]["identifier"])')
UDID=$(xcrun simctl create "QA $LABEL" "$TYPE" "$RUNTIME")
echo "Simulator $DEVICE_NAME ($RUNTIME) -> $UDID"
xcrun simctl boot "$UDID"
xcrun simctl bootstatus "$UDID" -b
xcrun simctl ui "$UDID" appearance dark || true
xcrun simctl status_bar "$UDID" override --time "9:41" --dataNetwork wifi --wifiMode active --wifiBars 3 \
  --cellularMode active --cellularBars 4 --batteryState charged --batteryLevel 100 || true
xcrun simctl install "$UDID" "$APP"
# Let SpringBoard settle before Maestro installs its XCTest driver.
sleep 20

{
  echo "device=$DEVICE_NAME"; echo "runtime=$RUNTIME"; echo "udid=$UDID"
  echo "app=$(basename "$APP")"
  echo "bundle_version=$(/usr/libexec/PlistBuddy -c 'Print CFBundleShortVersionString' "$APP/Info.plist")"
  echo "bundle_build=$(/usr/libexec/PlistBuddy -c 'Print CFBundleVersion' "$APP/Info.plist")"
  echo "bundle_id=$(/usr/libexec/PlistBuddy -c 'Print CFBundleIdentifier' "$APP/Info.plist")"
  echo "captured_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "source=NATIVE iOS SIMULATOR (Expo Release build, not the website)"
} > "$OUT/capture-info.txt"

xcrun simctl io "$UDID" recordVideo --codec=h264 --force "$OUT/$LABEL-native-gameplay.mp4" &
REC=$!
sleep 3
STATUS=0
for ATTEMPT in 1 2; do
  STATUS=0
  (cd "$OUT" && maestro --device "$UDID" test "$ROOT/apps/mobile/.maestro" \
    --format junit --output "$OUT/maestro-report.xml" --debug-output "$OUT/maestro-debug" \
    --test-output-dir "$OUT/maestro-output") || STATUS=$?
  # Retry only when Maestro never produced a report (XCTest driver failed to start);
  # real flow failures are reported, not retried.
  if [ -s "$OUT/maestro-report.xml" ]; then break; fi
  echo "Maestro driver did not start (attempt $ATTEMPT); retrying after a simulator app relaunch."
  xcrun simctl terminate "$UDID" com.bthecoderr.chessuniverse || true
  sleep 15
done
kill -INT "$REC" || true
wait "$REC" || true
# Collect named takeScreenshot captures (Maestro 1.x writes to cwd, 2.x to --test-output-dir).
mkdir -p "$OUT/screens"
find "$OUT" -path "$OUT/screens" -prune -o -name '[0-9][0-9]*.png' -print | while read -r f; do
  cp "$f" "$OUT/screens/$LABEL-native-$(basename "$f")"
done
# Failure screenshots, if any, stay under maestro-debug/ and maestro-output/.
ls -1 "$OUT/screens" || true
xcrun simctl spawn "$UDID" log show --last 15m --predicate 'process == "ChessUniverse"' --style compact > "$OUT/app-log.txt" 2>/dev/null || true
xcrun simctl shutdown "$UDID" || true
echo "maestro_exit=$STATUS" >> "$OUT/capture-info.txt"
exit "$STATUS"
