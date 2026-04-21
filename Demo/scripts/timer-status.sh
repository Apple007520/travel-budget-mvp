#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="$PROJECT_DIR/.runtime/timer.pid"
LOG_FILE="$PROJECT_DIR/.runtime/logs/timer.log"

echo "Timer status:"

if [[ -f "$PID_FILE" ]]; then
  PID="$(cat "$PID_FILE")"
  if [[ -n "${PID:-}" ]] && kill -0 "$PID" >/dev/null 2>&1; then
    echo "  state: running"
    echo "  pid: $PID"
  else
    echo "  state: not running (stale pid file)"
    echo "  pid_file: $PID_FILE"
  fi
else
  echo "  state: not running"
fi

if [[ -f "$LOG_FILE" ]]; then
  echo "  log: $LOG_FILE"
  echo ""
  echo "Last 20 log lines:"
  tail -n 20 "$LOG_FILE"
else
  echo "  log: (not found) $LOG_FILE"
fi
