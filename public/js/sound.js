class SoundManager {
    constructor() {
        this.sounds = {};
        this.isMuted = false;
        this.volume = 0.5;
        
        // Define sound effects
        this.soundEffects = {
            move: '/sounds/move.mp3',
            capture: '/sounds/capture.mp3',
            check: '/sounds/check.mp3',
            checkmate: '/sounds/checkmate.mp3',
            draw: '/sounds/draw.mp3',
            gameStart: '/sounds/game-start.mp3',
            gameEnd: '/sounds/game-end.mp3',
            error: '/sounds/error.mp3',
            notification: '/sounds/notification.mp3',
            lowTime: '/sounds/low-time.mp3'
        };
        
        this.init();
    }

    async init() {
        try {
            // Load all sound effects
            for (const [name, path] of Object.entries(this.soundEffects)) {
                const audio = new Audio(path);
                audio.preload = 'auto';
                this.sounds[name] = audio;
            }
            
            // Load user preferences
            this.loadPreferences();
            
            // Setup volume control
            this.setupVolumeControl();
        } catch (error) {
            console.error('Error initializing sound manager:', error);
        }
    }

    play(soundName) {
        if (this.isMuted || !this.sounds[soundName]) return;
        
        try {
            const sound = this.sounds[soundName];
            sound.volume = this.volume;
            
            // Stop and reset the sound if it's already playing
            sound.currentTime = 0;
            
            // Play the sound
            sound.play().catch(error => {
                console.error(`Error playing sound ${soundName}:`, error);
            });
        } catch (error) {
            console.error(`Error playing sound ${soundName}:`, error);
        }
    }

    playMove(moveDetails) {
        if (this.isMuted) return;
        
        if (moveDetails.san.includes('#')) {
            this.play('checkmate');
        } else if (moveDetails.san.includes('+')) {
            this.play('check');
        } else if (moveDetails.captured) {
            this.play('capture');
        } else {
            this.play('move');
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        this.savePreferences();
        return this.isMuted;
    }

    setVolume(value) {
        this.volume = Math.max(0, Math.min(1, value));
        this.savePreferences();
    }

    setupVolumeControl() {
        const volumeControl = document.getElementById('volumeControl');
        if (volumeControl) {
            volumeControl.value = this.volume * 100;
            volumeControl.addEventListener('input', (e) => {
                this.setVolume(e.target.value / 100);
            });
        }
    }

    loadPreferences() {
        try {
            const preferences = JSON.parse(localStorage.getItem('soundPreferences'));
            if (preferences) {
                this.isMuted = preferences.isMuted ?? false;
                this.volume = preferences.volume ?? 0.5;
            }
        } catch (error) {
            console.error('Error loading sound preferences:', error);
        }
    }

    savePreferences() {
        try {
            localStorage.setItem('soundPreferences', JSON.stringify({
                isMuted: this.isMuted,
                volume: this.volume
            }));
        } catch (error) {
            console.error('Error saving sound preferences:', error);
        }
    }

    preloadSounds() {
        Object.values(this.sounds).forEach(sound => {
            sound.load();
        });
    }
}

// Export the SoundManager class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SoundManager;
} else {
    window.SoundManager = SoundManager;
} 