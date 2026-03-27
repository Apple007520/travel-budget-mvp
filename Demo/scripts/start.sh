#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT=3015
PID_DIR="$PROJECT_DIR/.runtime"
PID_FILE="$PID_DIR/dev.pid"
LOG_DIR="$PROJECT_DIR/.runtime/logs"
LOG_FILE="$LOG_DIR/dev.log"

mkdir -p "$PID_DIR" "$LOG_DIR"

# Always restart: stop existing process first.
"$PROJECT_DIR/scripts/stop.sh" >/dev/null 2>&1 || true

cd "$PROJECT_DIR"

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is not installed."
  exit 1
fi

nohup npm run dev -- --hostname 0.0.0.0 --port "$PORT" >"$LOG_FILE" 2>&1 &
NEW_PID=$!
echo "$NEW_PID" >"$PID_FILE"

sleep 1
if kill -0 "$NEW_PID" >/dev/null 2>&1; then
  echo "Dev server restarted successfully."
  echo "PID: $NEW_PID"
  echo "Port: $PORT"
  echo "URL: http://localhost:$PORT"
  echo "Log: $LOG_FILE"
else
  echo "Failed to start dev server. Check log:"
  echo "$LOG_FILE"
  exit 1
fi
