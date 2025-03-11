/// <reference types="vite/client" />

// Add Web Speech API type declarations
interface Window {
  SpeechRecognition: any;
  webkitSpeechRecognition: any;
}
