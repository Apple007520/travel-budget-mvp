#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="$PROJECT_DIR/.runtime/timer.pid"

stopped=0

if [[ -f "$PID_FILE" ]]; then
  PID="$(cat "$PID_FILE")"
  if [[ -n "${PID:-}" ]] && kill -0 "$PID" >/dev/null 2>&1; then
    kill "$PID" >/dev/null 2>&1 || true
    sleep 1
    if kill -0 "$PID" >/dev/null 2>&1; then
      kill -9 "$PID" >/dev/null 2>&1 || true
    fi
    stopped=1
  fi
  rm -f "$PID_FILE"
fi

if [[ "$stopped" -eq 1 ]]; then
  echo "Timer stopped."
else
  echo "No running timer process found."
fi
