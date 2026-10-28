#!/usr/bin/env bash
set -euo pipefail

# Invoked only after Firebase emulators:exec has started the local DEMO services.
if [[ "${GCLOUD_PROJECT:-}" != "demo-lazo" ||
      "${FIRESTORE_EMULATOR_HOST:-}" != "127.0.0.1:8080" ||
      "${FIREBASE_AUTH_EMULATOR_HOST:-}" != "127.0.0.1:9099" ]]; then
  echo 'Native smoke requires demo-lazo and local Firebase emulators.' >&2
  exit 1
fi

task_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
task_artifacts="$task_root/.tools/mobile-smoke"
task_platform="${SMOKE_PLATFORM:-android}"
mkdir -p "$task_artifacts"

# Fail before building the app if the callable is not ready or misconfigured.
cd "$task_root"
node backend/scripts/smoke-ping.mjs --emulator

case "$task_platform" in
  android)
    task_device="emulator-${EMULATOR_PORT:-5554}"
    task_ping_config="config/dev.emulator.json"
    adb -s "$task_device" get-state
    ;;
  ios)
    task_device="${SMOKE_IOS_DEVICE:?SMOKE_IOS_DEVICE must name a booted simulator}"
    task_ping_config="config/dev.emulator.ios.json"
    xcrun simctl list devices booted | grep -q "$task_device"
    ;;
  *)
    echo "Unsupported SMOKE_PLATFORM: $task_platform" >&2
    exit 1
    ;;
esac

cd "$task_root/apps/mobile"
flutter test integration_test/system_ping_test.dart \
  --flavor dev \
  --dart-define-from-file="$task_ping_config" \
  --device-id "$task_device" \
  --timeout 10m \
  --reporter expanded 2>&1 | tee "$task_artifacts/$task_platform-dev-ping.log"

# Launch only: without Firebase configuration staging/prod must fail closed.
# This is NOT evidence of a connection to their real Firebase projects.
for task_flavor in staging prod; do
  flutter test integration_test/unconfigured_launch_test.dart \
    --flavor "$task_flavor" \
    --device-id "$task_device" \
    --timeout 10m \
    --reporter expanded 2>&1 | tee "$task_artifacts/$task_platform-$task_flavor-unconfigured.log"
done
