const gameConfig = {
    // Socket.IO Configuration
    socket: {
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
        // Add more Socket.IO options as needed
    },

    // Game Settings
    game: {
        timeControls: {
            bullet: { initial: 60, increment: 0 },
            blitz: { initial: 180, increment: 2 },
            rapid: { initial: 600, increment: 5 },
            classical: { initial: 1800, increment: 10 }
        },
        defaultTimeControl: 'rapid',
        
        // Rating ranges for matchmaking
        ratingRanges: [
            { min: -Infinity, max: 1200, name: 'Beginner' },
            { min: 1200, max: 1500, name: 'Intermediate' },
            { min: 1500, max: 1800, name: 'Advanced' },
            { min: 1800, max: 2100, name: 'Expert' },
            { min: 2100, max: Infinity, name: 'Master' }
        ],
        
        // Default rating for new players
        defaultRating: 1200,
        
        // K-factor for rating calculations
        kFactors: {
            new: 40,      // First 30 games
            provisional: 20, // Games 31-100
            established: 10  // After 100 games
        },
        
        // Matchmaking settings
        matchmaking: {
            initialRange: 200,   // Initial rating range to search
            expandRate: 100,     // How much to expand range per interval
            expandInterval: 10000, // Interval to expand range (ms)
            maxRange: 400        // Maximum rating difference
        },
        
        // Game rules
        rules: {
            drawOffers: {
                minMoves: 10,     // Minimum moves before draw can be offered
                cooldown: 10000   // Time between draw offers (ms)
            },
            resignation: {
                confirmationRequired: true
            },
            disconnection: {
                gracePeriod: 30000, // Time to reconnect before forfeit
                maxDisconnections: 2 // Maximum disconnections per game
            }
        },
        
        // Analysis settings
        analysis: {
            depth: 20,           // Default analysis depth
            multiPV: 3,          // Number of alternative moves to analyze
            enabled: true        // Whether analysis is enabled
        }
    },

    // Virtual Currency Settings
    currency: {
        startingAmount: 1000,
        dailyBonus: 100,
        minBet: 10,
        maxBet: 1000,
        // Multipliers for different bet types
        multipliers: {
            win: 2.0,
            draw: 1.5,
            firstMove: 1.2,
            checkmate: 1.5
        }
    },

    // Chat Settings
    chat: {
        maxLength: 500,
        rateLimit: {
            messages: 5,
            interval: 10000
        },
        filters: {
            enabled: true,
            // Add more filter options as needed
        }
    },

    // Performance Settings
    performance: {
        moveDelay: 100,      // Minimum delay between moves (ms)
        maxMoveHistory: 1000, // Maximum moves to keep in history
        cacheSize: 1000      // Maximum positions to cache
    }
};

// Export the configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = gameConfig;
} else {
    window.gameConfig = gameConfig;
} 