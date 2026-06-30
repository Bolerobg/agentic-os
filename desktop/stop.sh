#!/bin/bash
PID=$(lsof -ti:8080)
if [ -n "$PID" ]; then
  kill $PID 2>/dev/null
  echo "🛑 Agentic OS stopped (PID: $PID)"
else
  echo "Agentic OS is not running"
fi
