#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_DIR="$PROJECT_DIR/.runtime"
PID_FILE="$PID_DIR/timer.pid"
LOG_DIR="$PROJECT_DIR/.runtime/logs"
LOG_FILE="$LOG_DIR/timer.log"
ENV_FILE="$PROJECT_DIR/.env.timer"

mkdir -p "$PID_DIR" "$LOG_DIR"

# Always restart: stop existing timer process first.
"$PROJECT_DIR/scripts/timer-stop.sh" >/dev/null 2>&1 || true

cd "$PROJECT_DIR"

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is not installed."
  exit 1
fi

if [[ -f "$ENV_FILE" ]]; then
  # Auto-load timer env vars (e.g. CITY_DATA_SYNC_URL / CRON_TZ).
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
  echo "==> Loaded env from $ENV_FILE"
else
  echo "==> Env file not found, skip: $ENV_FILE"
fi

echo "==> Running one-time sync before scheduler..."
npm run crawl

echo "==> Starting timer daemon..."
nohup npm run timer >"$LOG_FILE" 2>&1 &
NEW_PID=$!
echo "$NEW_PID" >"$PID_FILE"

sleep 1
if kill -0 "$NEW_PID" >/dev/null 2>&1; then
  echo "Timer started successfully."
  echo "PID: $NEW_PID"
  echo "Log: $LOG_FILE"
else
  echo "Failed to start timer. Check log:"
  echo "$LOG_FILE"
  exit 1
fi
