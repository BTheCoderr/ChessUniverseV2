class TimerManager {
    constructor(config) {
        this.config = {
            initial: config?.initial || 600, // 10 minutes in seconds
            increment: config?.increment || 0,
            warningTime: config?.warningTime || 30, // Warning when 30 seconds left
            updateInterval: config?.updateInterval || 100 // Update every 100ms
        };
        
        this.timers = {
            white: this.config.initial,
            black: this.config.initial
        };
        
        this.activeColor = null;
        this.isRunning = false;
        this.callbacks = {
            onTick: null,
            onTimeout: null,
            onWarning: null
        };
        
        this.warningIssued = {
            white: false,
            black: false
        };
        
        this.interval = null;
    }

    start(color) {
        if (this.isRunning) this.stop();
        
        this.activeColor = color;
        this.isRunning = true;
        this.lastTick = Date.now();
        
        this.interval = setInterval(() => this.tick(), this.config.updateInterval);
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.isRunning = false;
        this.activeColor = null;
    }

    tick() {
        if (!this.isRunning || !this.activeColor) return;
        
        const now = Date.now();
        const elapsed = (now - this.lastTick) / 1000;
        this.lastTick = now;
        
        // Update active timer
        this.timers[this.activeColor] = Math.max(0, this.timers[this.activeColor] - elapsed);
        
        // Check for timeout
        if (this.timers[this.activeColor] <= 0) {
            this.handleTimeout();
            return;
        }
        
        // Check for warning
        if (!this.warningIssued[this.activeColor] && 
            this.timers[this.activeColor] <= this.config.warningTime) {
            this.handleWarning();
        }
        
        // Call tick callback
        if (this.callbacks.onTick) {
            this.callbacks.onTick({
                color: this.activeColor,
                time: this.timers[this.activeColor],
                formatted: this.formatTime(this.timers[this.activeColor])
            });
        }
    }

    switchTimer() {
        if (!this.isRunning) return;
        
        // Add increment to the player who just moved
        if (this.config.increment > 0 && this.activeColor) {
            this.timers[this.activeColor] += this.config.increment;
        }
        
        // Switch active color
        this.activeColor = this.activeColor === 'white' ? 'black' : 'white';
        this.lastTick = Date.now();
    }

    handleTimeout() {
        this.stop();
        if (this.callbacks.onTimeout) {
            this.callbacks.onTimeout({
                color: this.activeColor,
                time: 0
            });
        }
    }

    handleWarning() {
        this.warningIssued[this.activeColor] = true;
        if (this.callbacks.onWarning) {
            this.callbacks.onWarning({
                color: this.activeColor,
                time: this.timers[this.activeColor]
            });
        }
    }

    getTime(color) {
        return {
            seconds: this.timers[color],
            formatted: this.formatTime(this.timers[color])
        };
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        const tenths = Math.floor((seconds * 10) % 10);
        
        // Show tenths of seconds when less than 10 seconds remain
        if (seconds < 10) {
            return `${remainingSeconds}.${tenths}`;
        }
        
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    setCallback(event, callback) {
        if (event in this.callbacks) {
            this.callbacks[event] = callback;
        }
    }

    reset() {
        this.stop();
        this.timers = {
            white: this.config.initial,
            black: this.config.initial
        };
        this.warningIssued = {
            white: false,
            black: false
        };
    }

    pause() {
        if (this.isRunning) {
            this.stop();
            return true;
        }
        return false;
    }

    resume() {
        if (!this.isRunning && this.activeColor) {
            this.start(this.activeColor);
            return true;
        }
        return false;
    }

    setTime(color, seconds) {
        if (color in this.timers) {
            this.timers[color] = Math.max(0, seconds);
            return true;
        }
        return false;
    }

    addTime(color, seconds) {
        if (color in this.timers) {
            this.timers[color] = Math.max(0, this.timers[color] + seconds);
            return true;
        }
        return false;
    }

    getState() {
        return {
            isRunning: this.isRunning,
            activeColor: this.activeColor,
            timers: { ...this.timers },
            config: { ...this.config }
        };
    }
}

// Export the TimerManager class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TimerManager;
} else {
    window.TimerManager = TimerManager;
} 