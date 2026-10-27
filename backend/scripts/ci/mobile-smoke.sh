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
task_device="emulator-${EMULATOR_PORT:-5554}"
mkdir -p "$task_artifacts"

# Fail before building the app if the callable is not ready or misconfigured.
cd "$task_root"
node backend/scripts/smoke-ping.mjs --emulator
adb -s "$task_device" get-state

cd "$task_root/apps/mobile"
flutter test integration_test/system_ping_test.dart \
  --flavor dev \
  --dart-define-from-file=config/dev.emulator.json \
  --device-id "$task_device" \
  --timeout 10m \
  --reporter expanded 2>&1 | tee "$task_artifacts/flutter-test.log"
