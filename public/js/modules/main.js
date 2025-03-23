/**
 * Chess Application Entry Point
 * Initializes the modular chess application
 */
import ChessApp from './app.js';

// Initialize the application when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing Chess Application...');
  
  // Create a new chess app instance with default configuration
  window.chessApp = new ChessApp({
    // Default configuration
    playerColor: 'black',
    startPosition: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1',
    
    // Configure sound paths using the preloaded audio elements
    sounds: {
      move: document.getElementById('move-sound')?.src || '/audio/Move.mp3',
      capture: document.getElementById('capture-sound')?.src || '/audio/Capture.mp3',
      check: document.getElementById('check-sound')?.src || '/audio/Check.mp3',
      checkmate: document.getElementById('check-sound')?.src || '/audio/Checkmate.mp3', // Reuse check sound if no specific one
      castle: document.getElementById('castle-sound')?.src || '/audio/Castle.mp3',
      promote: document.getElementById('promote-sound')?.src || '/audio/Promote.mp3',
      draw: document.getElementById('game-end-sound')?.src || '/audio/Draw.mp3',
      error: document.getElementById('error-sound')?.src || '/audio/Error.mp3',
      start: document.getElementById('game-end-sound')?.src || '/audio/GameStart.mp3' // Reuse end sound if no specific one
    }
  });
  
  // Set up sound control UI elements
  setupSoundControls();
  
  console.log('Chess Application ready');
});

/**
 * Set up sound control UI elements
 */
function setupSoundControls() {
  const soundToggle = document.getElementById('sound-toggle');
  const volumeSlider = document.getElementById('volume-slider');
  
  if (soundToggle && window.chessApp && window.chessApp.soundManager) {
    // Initialize checkbox state from sound manager
    soundToggle.checked = window.chessApp.soundManager.getSettings().enabled;
    
    // Add change event listener
    soundToggle.addEventListener('change', () => {
      const newState = window.chessApp.soundManager.toggleSound();
      console.log(`Sound ${newState ? 'enabled' : 'disabled'}`);
      
      // Play a sound to demonstrate the change if enabled
      if (newState) {
        window.chessApp.soundManager.play('move');
      }
    });
  }
  
  if (volumeSlider && window.chessApp && window.chessApp.soundManager) {
    // Initialize slider value from sound manager
    volumeSlider.value = window.chessApp.soundManager.getSettings().volume * 100;
    
    // Add input event listener
    volumeSlider.addEventListener('input', () => {
      const volume = volumeSlider.value / 100;
      window.chessApp.soundManager.setVolume(volume);
      console.log(`Volume set to ${volume}`);
      
      // Play a sound to demonstrate the volume level
      window.chessApp.soundManager.play('move');
    });
  }
} 