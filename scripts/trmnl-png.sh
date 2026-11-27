#!/usr/bin/env bash
# Screenshots dist/trmnl.html into dist/trmnl.png, at the exact size of the
# panel, with a headless Chrome. Run after `bun run build`.
#
#   scripts/trmnl-png.sh                      # uses google-chrome (GitHub runners)
#   CHROME=/path/to/chrome scripts/trmnl-png.sh
#
# The PNG is removed again if it does not have the expected size: better no
# image than a cropped one on the wall.
set -euo pipefail
cd "$(dirname "$0")/.."

"${CHROME:-google-chrome}" --headless --no-sandbox --hide-scrollbars \
  --force-device-scale-factor=1 --window-size=1872,1404 \
  --screenshot="$PWD/dist/trmnl.png" "file://$PWD/dist/trmnl.html"

bun scripts/trmnl.ts --check-png dist/trmnl.png || { rm -f dist/trmnl.png; exit 1; }
