class ThemeManager {
    constructor() {
        this.themes = {
            classic: {
                name: 'Classic',
                lightSquare: '#f0d9b5',
                darkSquare: '#b58863',
                highlightColor: 'rgba(155, 199, 0, 0.41)',
                lastMoveColor: 'rgba(155, 199, 0, 0.41)',
                checkColor: 'rgba(255, 0, 0, 0.2)',
                pieceTheme: 'classic'
            },
            modern: {
                name: 'Modern',
                lightSquare: '#e8ebef',
                darkSquare: '#7c93b2',
                highlightColor: 'rgba(0, 121, 191, 0.3)',
                lastMoveColor: 'rgba(0, 121, 191, 0.3)',
                checkColor: 'rgba(220, 53, 69, 0.3)',
                pieceTheme: 'modern'
            },
            tournament: {
                name: 'Tournament',
                lightSquare: '#eeeed2',
                darkSquare: '#769656',
                highlightColor: 'rgba(255, 255, 0, 0.5)',
                lastMoveColor: 'rgba(255, 255, 0, 0.5)',
                checkColor: 'rgba(255, 0, 0, 0.3)',
                pieceTheme: 'tournament'
            },
            neon: {
                name: 'Neon',
                lightSquare: '#2c2c2c',
                darkSquare: '#1a1a1a',
                highlightColor: 'rgba(0, 255, 255, 0.3)',
                lastMoveColor: 'rgba(0, 255, 255, 0.3)',
                checkColor: 'rgba(255, 0, 128, 0.3)',
                pieceTheme: 'neon'
            }
        };
        
        this.currentTheme = 'classic';
        this.customThemes = {};
        
        this.init();
    }

    init() {
        // Load saved theme preferences
        this.loadPreferences();
        
        // Apply current theme
        this.applyTheme(this.currentTheme);
        
        // Setup theme selector if it exists
        this.setupThemeSelector();
    }

    applyTheme(themeName) {
        const theme = this.themes[themeName] || this.customThemes[themeName];
        if (!theme) return false;
        
        this.currentTheme = themeName;
        
        // Update CSS variables
        document.documentElement.style.setProperty('--light-square', theme.lightSquare);
        document.documentElement.style.setProperty('--dark-square', theme.darkSquare);
        document.documentElement.style.setProperty('--highlight-color', theme.highlightColor);
        document.documentElement.style.setProperty('--last-move-color', theme.lastMoveColor);
        document.documentElement.style.setProperty('--check-color', theme.checkColor);
        
        // Update piece theme
        this.updatePieceTheme(theme.pieceTheme);
        
        // Save preferences
        this.savePreferences();
        
        // Emit theme change event
        this.emitThemeChange(theme);
        
        return true;
    }

    updatePieceTheme(pieceTheme) {
        const board = document.querySelector('.chessboard');
        if (board) {
            board.setAttribute('data-piece-theme', pieceTheme);
            
            // Update all piece images
            document.querySelectorAll('.piece').forEach(piece => {
                const pieceType = piece.getAttribute('data-piece');
                if (pieceType) {
                    // Check if the theme directory exists, if not, fallback to the root pieces directory
                    fetch(`/images/pieces/${pieceTheme}/${pieceType}.svg`)
                        .then(response => {
                            if (response.ok) {
                                // Theme directory exists, use it
                                piece.style.backgroundImage = `url('/images/pieces/${pieceTheme}/${pieceType}.svg')`;
                            } else {
                                // Fallback to the root pieces directory
                                piece.style.backgroundImage = `url('/images/pieces/${pieceType}.svg')`;
                                console.log(`Using fallback path for ${pieceType}: /images/pieces/${pieceType}.svg`);
                            }
                        })
                        .catch(() => {
                            // Error occurred, use fallback
                            piece.style.backgroundImage = `url('/images/pieces/${pieceType}.svg')`;
                            console.log(`Fallback to root path for ${pieceType}: /images/pieces/${pieceType}.svg`);
                        });
                }
            });
        }
    }

    getAvailableThemes() {
        return {
            ...this.themes,
            ...this.customThemes
        };
    }

    getCurrentTheme() {
        return this.themes[this.currentTheme] || this.customThemes[this.currentTheme];
    }

    addCustomTheme(name, theme) {
        // Validate theme object
        if (!this.validateTheme(theme)) {
            throw new Error('Invalid theme configuration');
        }
        
        // Add theme to custom themes
        this.customThemes[name] = {
            name,
            ...theme
        };
        
        // Update theme selector
        this.updateThemeSelector();
        
        return true;
    }

    validateTheme(theme) {
        const required = ['lightSquare', 'darkSquare', 'highlightColor', 'lastMoveColor', 'checkColor', 'pieceTheme'];
        return required.every(prop => prop in theme);
    }

    setupThemeSelector() {
        const selector = document.getElementById('themeSelector');
        if (!selector) return;
        
        // Clear existing options
        selector.innerHTML = '';
        
        // Add theme options
        this.updateThemeSelector(selector);
        
        // Add change event listener
        selector.addEventListener('change', (e) => {
            this.applyTheme(e.target.value);
        });
    }

    updateThemeSelector(selector = document.getElementById('themeSelector')) {
        if (!selector) return;
        
        // Get all themes
        const allThemes = this.getAvailableThemes();
        
        // Create options
        Object.entries(allThemes).forEach(([id, theme]) => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = theme.name;
            option.selected = id === this.currentTheme;
            selector.appendChild(option);
        });
    }

    loadPreferences() {
        try {
            const saved = localStorage.getItem('chessThemePreferences');
            if (saved) {
                const preferences = JSON.parse(saved);
                this.currentTheme = preferences.currentTheme || 'classic';
                this.customThemes = preferences.customThemes || {};
            }
        } catch (error) {
            console.error('Error loading theme preferences:', error);
        }
    }

    savePreferences() {
        try {
            localStorage.setItem('chessThemePreferences', JSON.stringify({
                currentTheme: this.currentTheme,
                customThemes: this.customThemes
            }));
        } catch (error) {
            console.error('Error saving theme preferences:', error);
        }
    }

    emitThemeChange(theme) {
        const event = new CustomEvent('themeChange', {
            detail: {
                theme: theme,
                name: this.currentTheme
            }
        });
        document.dispatchEvent(event);
    }

    // Preview methods for theme customization
    previewTheme(theme) {
        const originalTheme = this.currentTheme;
        this.applyTheme('preview');
        this.themes.preview = theme;
        
        return () => {
            delete this.themes.preview;
            this.applyTheme(originalTheme);
        };
    }

    // Export theme to JSON
    exportTheme(themeName) {
        const theme = this.themes[themeName] || this.customThemes[themeName];
        if (!theme) return null;
        
        return JSON.stringify(theme, null, 2);
    }

    // Import theme from JSON
    importTheme(name, themeJson) {
        try {
            const theme = JSON.parse(themeJson);
            if (this.validateTheme(theme)) {
                return this.addCustomTheme(name, theme);
            }
        } catch (error) {
            console.error('Error importing theme:', error);
            return false;
        }
    }
}

// Export the ThemeManager class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeManager;
} else {
    window.ThemeManager = ThemeManager;
} 