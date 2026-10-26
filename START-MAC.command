#!/bin/bash
cd -- "$(dirname -- "$0")"
if ! command -v node >/dev/null 2>&1; then
 echo "Install Node.js 24 LTS from https://nodejs.org, then try again."
 open "https://nodejs.org/en/download"
 read -r -p "Press Enter to close..."
 exit 1
fi
node local-test.js
read -r -p "Press Enter to close..."
