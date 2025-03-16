#!/bin/bash

echo "================================"
echo "🔍 Automated Console Error Check"
echo "================================"

# Check if the app is running
APP_RUNNING=false
for PORT in 5173 5174 5175; do
  if lsof -i :$PORT &>/dev/null; then
    APP_RUNNING=true
    APP_PORT=$PORT
    break
  fi
done

if [ "$APP_RUNNING" = false ]; then
  echo "⚠️ App is not running. Starting it now..."
  # Start the app in the background
  npm run dev &
  APP_PID=$!
  
  # Wait for app to start
  sleep 5
  
  # Check which port it's using
  for PORT in 5173 5174 5175; do
    if lsof -i :$PORT &>/dev/null; then
      APP_PORT=$PORT
      APP_RUNNING=true
      break
    fi
  done
  
  if [ "$APP_RUNNING" = false ]; then
    echo "❌ Failed to start app. Please start it manually with 'npm run dev'"
    exit 1
  fi
fi

echo "✅ App is running on port $APP_PORT"

# Function to run Chrome with specific options
run_chrome_with_logging() {
  local url=$1
  local log_file=$2
  
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # MacOS
    open -a "Google Chrome" --args --enable-logging --v=1 --log-net-log="$log_file" "$url"
  else
    # Linux/Windows
    google-chrome --enable-logging --v=1 --log-net-log="$log_file" "$url" &
  fi
}

# Create temp file for logs
LOG_FILE=$(mktemp)
CONSOLE_LOG=$(mktemp)

echo "🌐 Loading the app and capturing console output..."

# Run Chrome with logging enabled
run_chrome_with_logging "http://localhost:$APP_PORT" "$LOG_FILE"

# Give the app time to load and generate errors
sleep 5

# Capture any errors from Chrome's console
if [[ "$OSTYPE" == "darwin"* ]]; then
  # MacOS logs
  Chrome_LOG_DIR="$HOME/Library/Application Support/Google/Chrome/chrome_debug.log"
  if [ -f "$Chrome_LOG_DIR" ]; then
    cat "$Chrome_LOG_DIR" | grep -i "error\|exception\|warning" > "$CONSOLE_LOG"
  fi
else
  # Linux/Windows logs
  cat "$HOME/.config/google-chrome/chrome_debug.log" | grep -i "error\|exception\|warning" > "$CONSOLE_LOG"
fi

# Check if we captured any errors
if [ -s "$CONSOLE_LOG" ]; then
  echo "❌ Found errors in the console:"
  cat "$CONSOLE_LOG"
  ERROR_COUNT=$(wc -l < "$CONSOLE_LOG")
  echo "Total errors/warnings found: $ERROR_COUNT"
else
  echo "✅ No console errors detected! App is running cleanly."
fi

# Use curl to fetch the app and check for network errors
echo "🔍 Checking for network errors..."
curl -s "http://localhost:$APP_PORT" > /dev/null
if [ $? -ne 0 ]; then
  echo "❌ Network error: Failed to load the app"
else
  echo "✅ App loads successfully with no network errors"
fi

# Cleanup
rm -f "$LOG_FILE" "$CONSOLE_LOG"

echo "================================"
echo "✨ Console check complete!"
echo "================================"

# Open Chrome Developer Tools for manual inspection if needed
echo "🔧 Opening Chrome DevTools for further inspection..."
open -a "Google Chrome" "http://localhost:$APP_PORT"
sleep 1
osascript -e 'tell application "Google Chrome" to activate' -e 'tell application "System Events" to keystroke "j" using {command down, option down}'

echo "👉 Press Ctrl+C when you're done examining the DevTools console" 