class AchievementManager {
    constructor() {
        this.achievements = {
            firstWin: {
                id: 'firstWin',
                title: 'First Victory',
                description: 'Win your first game',
                icon: 'trophy',
                reward: 100,
                progress: 0,
                target: 1,
                completed: false
            },
            winStreak: {
                id: 'winStreak',
                title: 'Winning Streak',
                description: 'Win 5 games in a row',
                icon: 'fire',
                reward: 500,
                progress: 0,
                target: 5,
                completed: false
            },
            masterTactician: {
                id: 'masterTactician',
                title: 'Master Tactician',
                description: 'Win a game with no mistakes or blunders',
                icon: 'lightbulb',
                reward: 300,
                progress: 0,
                target: 1,
                completed: false
            },
            quickVictory: {
                id: 'quickVictory',
                title: 'Lightning Strike',
                description: 'Win a game in under 20 moves',
                icon: 'bolt',
                reward: 200,
                progress: 0,
                target: 1,
                completed: false
            },
            openingMaster: {
                id: 'openingMaster',
                title: 'Opening Master',
                description: 'Win 10 games with the same opening',
                icon: 'book',
                reward: 400,
                progress: 0,
                target: 10,
                completed: false,
                data: {}
            },
            timeManager: {
                id: 'timeManager',
                title: 'Time Manager',
                description: 'Win a game with more than 50% of your time remaining',
                icon: 'clock',
                reward: 250,
                progress: 0,
                target: 1,
                completed: false
            },
            comebackKing: {
                id: 'comebackKing',
                title: 'Comeback King',
                description: 'Win a game after being down material by 5 points or more',
                icon: 'crown',
                reward: 350,
                progress: 0,
                target: 1,
                completed: false
            },
            grandmaster: {
                id: 'grandmaster',
                title: 'Grandmaster',
                description: 'Reach a rating of 2000',
                icon: 'star',
                reward: 1000,
                progress: 0,
                target: 2000,
                completed: false
            }
        };

        this.rewards = {
            currency: 0,
            unlockedThemes: ['classic'],
            unlockedPieces: ['classic'],
            badges: []
        };

        this.callbacks = {
            onAchievementUnlocked: null,
            onRewardClaimed: null,
            onProgressUpdated: null
        };

        this.loadProgress();
    }

    checkAchievement(gameData) {
        const unlockedAchievements = [];

        // First Win
        if (!this.achievements.firstWin.completed && gameData.result === 'win') {
            this.achievements.firstWin.progress = 1;
            if (this.updateProgress('firstWin')) {
                unlockedAchievements.push(this.achievements.firstWin);
            }
        }

        // Winning Streak
        if (gameData.result === 'win') {
            this.achievements.winStreak.progress++;
            if (this.updateProgress('winStreak')) {
                unlockedAchievements.push(this.achievements.winStreak);
            }
        } else {
            this.achievements.winStreak.progress = 0;
        }

        // Master Tactician
        if (gameData.result === 'win' && gameData.mistakes === 0 && gameData.blunders === 0) {
            this.achievements.masterTactician.progress = 1;
            if (this.updateProgress('masterTactician')) {
                unlockedAchievements.push(this.achievements.masterTactician);
            }
        }

        // Quick Victory
        if (gameData.result === 'win' && gameData.moves.length < 40) {
            this.achievements.quickVictory.progress = 1;
            if (this.updateProgress('quickVictory')) {
                unlockedAchievements.push(this.achievements.quickVictory);
            }
        }

        // Opening Master
        if (gameData.result === 'win' && gameData.opening) {
            this.achievements.openingMaster.data[gameData.opening] = 
                (this.achievements.openingMaster.data[gameData.opening] || 0) + 1;
            
            const maxOpeningWins = Math.max(...Object.values(this.achievements.openingMaster.data));
            this.achievements.openingMaster.progress = maxOpeningWins;
            
            if (this.updateProgress('openingMaster')) {
                unlockedAchievements.push(this.achievements.openingMaster);
            }
        }

        // Time Manager
        if (gameData.result === 'win' && gameData.timeRemaining > gameData.totalTime * 0.5) {
            this.achievements.timeManager.progress = 1;
            if (this.updateProgress('timeManager')) {
                unlockedAchievements.push(this.achievements.timeManager);
            }
        }

        // Comeback King
        if (gameData.result === 'win' && gameData.maxDisadvantage <= -5) {
            this.achievements.comebackKing.progress = 1;
            if (this.updateProgress('comebackKing')) {
                unlockedAchievements.push(this.achievements.comebackKing);
            }
        }

        // Grandmaster
        if (gameData.rating >= 2000) {
            this.achievements.grandmaster.progress = gameData.rating;
            if (this.updateProgress('grandmaster')) {
                unlockedAchievements.push(this.achievements.grandmaster);
            }
        }

        this.saveProgress();
        return unlockedAchievements;
    }

    updateProgress(achievementId) {
        const achievement = this.achievements[achievementId];
        if (!achievement || achievement.completed) return false;

        if (this.callbacks.onProgressUpdated) {
            this.callbacks.onProgressUpdated(achievement);
        }

        if (achievement.progress >= achievement.target && !achievement.completed) {
            achievement.completed = true;
            if (this.callbacks.onAchievementUnlocked) {
                this.callbacks.onAchievementUnlocked(achievement);
            }
            return true;
        }

        return false;
    }

    claimReward(achievementId) {
        const achievement = this.achievements[achievementId];
        if (!achievement || !achievement.completed || achievement.rewardClaimed) {
            return false;
        }

        this.rewards.currency += achievement.reward;
        achievement.rewardClaimed = true;

        if (this.callbacks.onRewardClaimed) {
            this.callbacks.onRewardClaimed(achievement);
        }

        this.saveProgress();
        return true;
    }

    getProgress(achievementId) {
        const achievement = this.achievements[achievementId];
        if (!achievement) return null;

        return {
            current: achievement.progress,
            target: achievement.target,
            percentage: (achievement.progress / achievement.target) * 100,
            completed: achievement.completed,
            rewardClaimed: achievement.rewardClaimed
        };
    }

    getAllProgress() {
        return Object.keys(this.achievements).reduce((progress, id) => {
            progress[id] = this.getProgress(id);
            return progress;
        }, {});
    }

    getUnlockedAchievements() {
        return Object.values(this.achievements).filter(a => a.completed);
    }

    getPendingRewards() {
        return Object.values(this.achievements)
            .filter(a => a.completed && !a.rewardClaimed);
    }

    setCallback(event, callback) {
        if (this.callbacks.hasOwnProperty(event)) {
            this.callbacks[event] = callback;
        }
    }

    unlockTheme(themeId) {
        if (!this.rewards.unlockedThemes.includes(themeId)) {
            this.rewards.unlockedThemes.push(themeId);
            this.saveProgress();
            return true;
        }
        return false;
    }

    unlockPieceSet(pieceSetId) {
        if (!this.rewards.unlockedPieces.includes(pieceSetId)) {
            this.rewards.unlockedPieces.push(pieceSetId);
            this.saveProgress();
            return true;
        }
        return false;
    }

    awardBadge(badgeId, title, description) {
        const badge = {
            id: badgeId,
            title: title,
            description: description,
            dateAwarded: new Date().toISOString()
        };

        this.rewards.badges.push(badge);
        this.saveProgress();
        return badge;
    }

    getCurrency() {
        return this.rewards.currency;
    }

    spendCurrency(amount) {
        if (amount <= this.rewards.currency) {
            this.rewards.currency -= amount;
            this.saveProgress();
            return true;
        }
        return false;
    }

    loadProgress() {
        try {
            const saved = localStorage.getItem('chessAchievements');
            if (saved) {
                const data = JSON.parse(saved);
                this.achievements = {...this.achievements, ...data.achievements};
                this.rewards = {...this.rewards, ...data.rewards};
            }
        } catch (error) {
            console.error('Error loading achievements:', error);
        }
    }

    saveProgress() {
        try {
            localStorage.setItem('chessAchievements', JSON.stringify({
                achievements: this.achievements,
                rewards: this.rewards
            }));
        } catch (error) {
            console.error('Error saving achievements:', error);
        }
    }

    resetProgress() {
        Object.values(this.achievements).forEach(achievement => {
            achievement.progress = 0;
            achievement.completed = false;
            achievement.rewardClaimed = false;
            if (achievement.data) {
                achievement.data = {};
            }
        });

        this.rewards = {
            currency: 0,
            unlockedThemes: ['classic'],
            unlockedPieces: ['classic'],
            badges: []
        };

        this.saveProgress();
    }

    exportProgress() {
        return JSON.stringify({
            achievements: this.achievements,
            rewards: this.rewards,
            exportDate: new Date().toISOString()
        }, null, 2);
    }

    importProgress(progressJson) {
        try {
            const imported = JSON.parse(progressJson);
            if (imported.achievements && imported.rewards) {
                this.achievements = imported.achievements;
                this.rewards = imported.rewards;
                this.saveProgress();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error importing progress:', error);
            return false;
        }
    }
}

// Export the AchievementManager class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AchievementManager;
} else {
    window.AchievementManager = AchievementManager;
} 