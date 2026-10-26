#!/bin/sh
set -eu

# Xcode LAZO_ENV is bound to the selected scheme. Files contain registration
# configuration only; never place service-account credentials here.
case "${LAZO_ENV:-}" in dev|staging|prod) ;; *) echo "Missing LAZO_ENV" >&2; exit 1 ;; esac
source_file="${PROJECT_DIR}/config/${LAZO_ENV}/GoogleService-Info.plist"
destination="${BUILT_PRODUCTS_DIR}/${PRODUCT_NAME}.app/GoogleService-Info.plist"
if [ -f "$source_file" ]; then
  /usr/bin/plutil -lint "$source_file" >/dev/null
  /bin/cp "$source_file" "$destination"
else
  echo "Firebase ${LAZO_ENV}: registration pending; no live configuration bundled."
fi
