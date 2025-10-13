#!/bin/bash

set -e

REVLOG_FILE="packages/binding/__tests__/revlog.csv"
if [ ! -f "$REVLOG_FILE" ]; then
    echo "📥 Downloading revlog.csv for tests..."
    mkdir -p "$(dirname "$REVLOG_FILE")"
    curl -L -o "$REVLOG_FILE" "https://github.com/open-spaced-repetition/fsrs-rs/files/15046782/revlog.csv"
    echo "✅ revlog.csv downloaded successfully"
else
    echo "✅ revlog.csv already exists, skipping download"
fi