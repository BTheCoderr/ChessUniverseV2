/**
 * Sound Manager Module
 * Handles audio playback for chess game events
 */
export default class SoundManager {
  constructor(config = {}) {
    // Configuration with defaults
    this.config = {
      enabled: true,
      volume: 0.5,
      sounds: {
        move: '/audio/Move.mp3',
        capture: '/audio/Capture.mp3',
        check: '/audio/Check.mp3',
        checkmate: '/audio/Checkmate.mp3',
        castle: '/audio/Castle.mp3',
        promote: '/audio/Promote.mp3',
        draw: '/audio/Draw.mp3',
        error: '/audio/Error.mp3',
        start: '/audio/GameStart.mp3',
        ...config.sounds
      },
      ...config
    };
    
    // Audio elements store
    this.audioElements = {};
    
    // Initialize
    this.init();
  }
  
  /**
   * Initialize the sound manager
   */
  init() {
    try {
      // Preload all sounds
      this.preloadSounds();
      
      // Load saved preferences
      this.loadPreferences();
      
      console.log('Sound manager initialized');
      return true;
    } catch (error) {
      console.error('Error initializing sound manager:', error);
      return false;
    }
  }
  
  /**
   * Preload all sound files
   */
  preloadSounds() {
    Object.entries(this.config.sounds).forEach(([key, url]) => {
      if (!url) return;
      
      try {
        const audio = new Audio(url);
        audio.preload = 'auto';
        audio.volume = this.config.volume;
        
        // Add to audio elements store
        this.audioElements[key] = audio;
      } catch (error) {
        console.error(`Error preloading sound ${key} from ${url}:`, error);
      }
    });
  }
  
  /**
   * Play a sound
   */
  play(sound) {
    if (!this.config.enabled) return false;
    
    const audio = this.audioElements[sound];
    if (!audio) {
      console.warn(`Sound not found: ${sound}`);
      return false;
    }
    
    try {
      // Reset sound to beginning if it's already playing
      audio.currentTime = 0;
      
      // Set volume (in case it changed)
      audio.volume = this.config.volume;
      
      // Play the sound
      const playPromise = audio.play();
      
      // Handle play promise (modern browsers return a promise)
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error(`Error playing sound ${sound}:`, error);
        });
      }
      
      return true;
    } catch (error) {
      console.error(`Error playing sound ${sound}:`, error);
      return false;
    }
  }
  
  /**
   * Play sound for a chess move
   */
  playMoveSound(move) {
    if (!this.config.enabled || !move) return;
    
    if (move.flags?.includes('c')) {
      // Capture
      this.play('capture');
    } else if (move.flags?.includes('k') || move.flags?.includes('q')) {
      // Castling (kingside or queenside)
      this.play('castle');
    } else if (move.flags?.includes('p')) {
      // Promotion
      this.play('promote');
    } else if (move.san?.includes('#')) {
      // Checkmate
      this.play('checkmate');
    } else if (move.san?.includes('+')) {
      // Check
      this.play('check');
    } else {
      // Regular move
      this.play('move');
    }
  }
  
  /**
   * Enable or disable sounds
   */
  toggleSound() {
    this.config.enabled = !this.config.enabled;
    this.savePreferences();
    return this.config.enabled;
  }
  
  /**
   * Set the volume level
   */
  setVolume(volume) {
    if (volume < 0 || volume > 1 || isNaN(volume)) {
      console.error('Invalid volume level, must be between 0 and 1');
      return false;
    }
    
    this.config.volume = volume;
    
    // Update volume for all audio elements
    Object.values(this.audioElements).forEach(audio => {
      audio.volume = volume;
    });
    
    this.savePreferences();
    return true;
  }
  
  /**
   * Save preferences to localStorage
   */
  savePreferences() {
    try {
      const preferences = {
        enabled: this.config.enabled,
        volume: this.config.volume
      };
      
      localStorage.setItem('soundPreferences', JSON.stringify(preferences));
    } catch (error) {
      console.error('Error saving sound preferences:', error);
    }
  }
  
  /**
   * Load preferences from localStorage
   */
  loadPreferences() {
    try {
      const savedPreferences = localStorage.getItem('soundPreferences');
      
      if (savedPreferences) {
        const preferences = JSON.parse(savedPreferences);
        
        if (preferences.enabled !== undefined) {
          this.config.enabled = preferences.enabled;
        }
        
        if (preferences.volume !== undefined) {
          this.config.volume = preferences.volume;
        }
      }
    } catch (error) {
      console.error('Error loading sound preferences:', error);
    }
  }
  
  /**
   * Get current settings
   */
  getSettings() {
    return {
      enabled: this.config.enabled,
      volume: this.config.volume
    };
  }
} 