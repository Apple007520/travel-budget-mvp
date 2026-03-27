#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT=3015
PID_FILE="$PROJECT_DIR/.runtime/dev.pid"

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

PIDS_ON_PORT="$(lsof -ti tcp:"$PORT" 2>/dev/null || true)"
if [[ -n "$PIDS_ON_PORT" ]]; then
  while IFS= read -r PORT_PID; do
    [[ -z "$PORT_PID" ]] && continue
    kill "$PORT_PID" >/dev/null 2>&1 || true
    sleep 1
    if kill -0 "$PORT_PID" >/dev/null 2>&1; then
      kill -9 "$PORT_PID" >/dev/null 2>&1 || true
    fi
    stopped=1
  done <<< "$PIDS_ON_PORT"
fi

if [[ "$stopped" -eq 1 ]]; then
  echo "Dev server stopped (port $PORT)."
else
  echo "No running dev server found on port $PORT."
fi
