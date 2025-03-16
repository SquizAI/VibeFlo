#!/bin/bash

echo "================================"
echo "🚀 VibeFlo Comprehensive Testing Suite"
echo "================================"
echo "This script will run a series of tests to ensure the application is functioning correctly."
echo "Each test will automatically check for errors and provide detailed feedback."
echo

# Check if the app is running
check_app_running() {
  for PORT in 5173 5174 5175; do
    if lsof -i :$PORT &>/dev/null; then
      echo "✅ App is running on port $PORT"
      return 0
    fi
  done
  
  echo "⚠️ App is not running. Starting it now..."
  npm run dev &
  APP_PID=$!
  
  # Wait for app to start
  for i in {1..10}; do
    sleep 1
    for PORT in 5173 5174 5175; do
      if lsof -i :$PORT &>/dev/null; then
        echo "✅ App started on port $PORT"
        return 0
      fi
    done
  done
  
  echo "❌ Failed to start app. Please start it manually with 'npm run dev'"
  return 1
}

# Function to display countdown
countdown() {
  local secs=$1
  while [ $secs -gt 0 ]; do
    echo -ne "⏱️ Proceeding in $secs seconds...\r"
    sleep 1
    : $((secs--))
  done
  echo -e "                              \r"
}

# Main testing sequence
main() {
  echo "📋 Step 1: Checking if app is running..."
  check_app_running
  if [ $? -ne 0 ]; then
    exit 1
  fi
  
  echo
  echo "📋 Step 2: Running basic console error check..."
  ./check_console.sh
  echo
  
  echo "📋 Step 3: Running canvas movement and zoom test..."
  countdown 5
  ./check_canvas_movement.sh
  echo
  
  echo "📋 Step 4: Final validation and summary..."
  # Use curl to fetch the app and check for basic functionality
  PORT=""
  for p in 5173 5174 5175; do
    if lsof -i :$p &>/dev/null; then
      PORT=$p
      break
    fi
  done
  
  curl -s "http://localhost:$PORT" > /dev/null
  if [ $? -ne 0 ]; then
    echo "❌ Basic app loading test failed"
  else
    echo "✅ Basic app loading test passed"
  fi
  
  echo
  echo "================================"
  echo "✨ Testing complete!"
  echo "================================"
  echo "If you encountered any issues, please check the console logs in Chrome DevTools."
  echo "For canvas movement issues, try the following:"
  echo "1. Hold SPACEBAR and then try dragging with the mouse"
  echo "2. Try using the middle mouse button to pan"
  echo "3. Use CTRL/CMD + mouse wheel to zoom"
  echo "4. Click the zoom buttons in the bottom left corner"
  echo
}

# Run the main function
main 