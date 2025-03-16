#!/bin/bash

echo "================================"
echo "🔍 Canvas Movement and Zoom Test"
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
  npm run dev &
  APP_PID=$!
  sleep 5
  
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

# Create a temporary JavaScript file to test canvas movement
TEMP_JS=$(mktemp)
cat > "$TEMP_JS" << 'EOL'
// Script to test canvas movement and zoom functionality
console.log('🔍 Starting canvas movement and zoom test...');

// Wait for the app to load fully
setTimeout(() => {
  try {
    // Find the canvas element
    const canvasViewport = document.querySelector('.canvas-viewport');
    const canvas = document.querySelector('.canvas');
    
    if (!canvasViewport || !canvas) {
      console.error('❌ Canvas elements not found');
      return;
    }
    
    console.log('✅ Canvas elements found');
    
    // Test variables
    let spaceDragWorking = false;
    let zoomWorking = false;
    let viewportDragWorking = false;
    
    // Check if CSS classes are defined correctly
    const styles = window.getComputedStyle(canvas);
    if (styles.position === 'absolute' && styles.transform.includes('matrix')) {
      console.log('✅ Canvas styling is correct');
    } else {
      console.error('❌ Canvas styling is incorrect. Transform:', styles.transform, 'Position:', styles.position);
    }
    
    // Test space + drag functionality
    console.log('🧪 Testing SPACE + drag...');
    
    // Simulate pressing spacebar
    const keydownEvent = new KeyboardEvent('keydown', {
      key: ' ',
      code: 'Space',
      bubbles: true
    });
    document.dispatchEvent(keydownEvent);
    
    // Check if the space key adds the correct class
    setTimeout(() => {
      if (document.body.classList.contains('space-pressed')) {
        console.log('✅ Space key adds correct class to body');
        spaceDragWorking = true;
      } else {
        console.error('❌ Space key does not add class to body');
      }
      
      // Release spacebar
      const keyupEvent = new KeyboardEvent('keyup', {
        key: ' ',
        code: 'Space',
        bubbles: true
      });
      document.dispatchEvent(keyupEvent);
      
      // Check if the class is removed
      setTimeout(() => {
        if (!document.body.classList.contains('space-pressed')) {
          console.log('✅ Space key class removed correctly');
        } else {
          console.error('❌ Space key class not removed');
        }
        
        // Test zooming functionality
        console.log('🧪 Testing zoom functionality...');
        
        // Get current transform
        const initialTransform = window.getComputedStyle(canvas).transform;
        
        // Find the zoom controls
        const zoomControls = document.querySelector('.zoom-controls');
        const zoomInButton = zoomControls ? zoomControls.querySelector('button:first-child') : null;
        
        if (zoomInButton) {
          console.log('✅ Zoom controls found');
          
          // Click the zoom in button
          zoomInButton.click();
          
          // Check if transform changed
          setTimeout(() => {
            const newTransform = window.getComputedStyle(canvas).transform;
            if (newTransform !== initialTransform) {
              console.log('✅ Zoom in button works - transform changed');
              zoomWorking = true;
            } else {
              console.error('❌ Zoom in button click did not change transform');
            }
            
            // Final summary
            console.log('==================================');
            console.log('📋 Canvas Movement and Zoom Test Results:');
            console.log(`Space + Drag: ${spaceDragWorking ? '✅ Working' : '❌ Not working'}`);
            console.log(`Zoom Controls: ${zoomWorking ? '✅ Working' : '❌ Not working'}`);
            console.log('==================================');
            console.log('💡 Recommended debugging steps if issues found:');
            console.log('1. Check event listeners on canvasRef and document body');
            console.log('2. Inspect CSS classes: .canvas-drag-mode and .space-pressed');
            console.log('3. Verify transform styles are being applied correctly');
            console.log('4. Ensure mouse events bubble properly and aren\'t stopped prematurely');
            console.log('==================================');
          }, 500);
        } else {
          console.error('❌ Zoom controls not found');
        }
      }, 100);
    }, 100);
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}, 3000);
EOL

# Open Chrome with the app and inject our test script
echo "🌐 Opening Chrome and running canvas movement tests..."
open -a "Google Chrome" "http://localhost:$APP_PORT"

# Wait for Chrome to load
sleep 3

# Use AppleScript to open DevTools and run our test script
osascript << EOL
tell application "Google Chrome"
  activate
  -- Open DevTools
  tell application "System Events" to keystroke "j" using {command down, option down}
  delay 1
  -- Open Console tab
  tell application "System Events" to keystroke "j" using {command down}
  delay 1
  -- In Console, paste and execute script
  tell application "System Events"
    keystroke "v" using {command down}
    delay 0.5
    keystroke return
  end tell
end tell
EOL

# Cleanup
rm -f "$TEMP_JS"

echo "✨ Canvas movement test complete!"
echo "👉 Check the Chrome DevTools console for results"
echo "================================" 