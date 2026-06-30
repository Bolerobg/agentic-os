#!/bin/bash
cd "/Users/bolero/Documents/agentic-os"

lsof -ti:8080 | xargs kill 2>/dev/null
sleep 1

echo "🚀 Starting Agentic OS v2.0..."
python3 server.py --port 8080 &
SERVER_PID=$!

for i in {1..20}; do
  if curl -s http://127.0.0.1:8080/api/status > /dev/null 2>&1; then
    break
  fi
  sleep 1
done

open http://127.0.0.1:8080

echo ""
echo "✅ Agentic OS — http://127.0.0.1:8080"
echo "   4 agents · 57 skills · 3 LLM APIs"
echo "   PID: $SERVER_PID"
echo ""

wait $SERVER_PID
