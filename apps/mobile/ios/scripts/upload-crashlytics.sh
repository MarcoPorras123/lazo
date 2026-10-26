#!/bin/sh
set -eu
case "${LAZO_ENV:-}" in staging|prod) ;; *) exit 0 ;; esac
source_file="${PROJECT_DIR}/config/${LAZO_ENV}/GoogleService-Info.plist"
# Unconfigured builds show a setup screen and must not contact Crashlytics.
if [ ! -f "$source_file" ]; then exit 0; fi
if [ "${PLATFORM_NAME:-}" = "iphonesimulator" ]; then exit 0; fi
if [ -n "${PODS_ROOT:-}" ] && [ -f "${PODS_ROOT}/FirebaseCrashlytics/run" ]; then
  "${PODS_ROOT}/FirebaseCrashlytics/run"
else
  runner="${BUILD_DIR%/Build/*}/SourcePackages/checkouts/firebase-ios-sdk/Crashlytics/run"
  if [ ! -f "$runner" ]; then
    echo "Crashlytics SDK script missing; finish FlutterFire configuration before a real build." >&2
    exit 1
  fi
  "$runner"
fi
