class BettingSystem {
    constructor() {
        this.currentBet = 0;
        this.userBalance = 1000; // Default starting balance
        this.minimumBet = 10;
        this.maximumBet = 1000;
        this.betPlaced = false;
        
        // Initialize UI elements
        this.balanceElement = document.getElementById('userBalance');
        this.betInput = document.getElementById('betAmount');
        this.placeBetBtn = document.getElementById('placeBetBtn');
        
        this.setupEventListeners();
        this.updateBalanceDisplay();
    }

    setupEventListeners() {
        this.placeBetBtn.addEventListener('click', () => this.placeBet());
        this.betInput.addEventListener('input', () => this.validateBetAmount());
    }

    validateBetAmount() {
        const amount = parseInt(this.betInput.value);
        const isValid = amount >= this.minimumBet && 
                       amount <= this.maximumBet && 
                       amount <= this.userBalance;
        
        this.placeBetBtn.disabled = !isValid;
        return isValid;
    }

    placeBet() {
        const amount = parseInt(this.betInput.value);
        if (!this.validateBetAmount()) {
            this.showError('Invalid bet amount');
            return false;
        }

        this.currentBet = amount;
        this.userBalance -= amount;
        this.betPlaced = true;
        this.updateBalanceDisplay();
        this.disableBetting();
        
        // Emit event for game to start
        const event = new CustomEvent('betPlaced', { detail: { amount: this.currentBet } });
        document.dispatchEvent(event);
        
        return true;
    }

    resolveBet(won) {
        if (!this.betPlaced) return;
        
        if (won) {
            const winnings = this.currentBet * 2; // Simple 2x payout
            this.userBalance += winnings;
            this.showSuccess(`You won ${winnings} coins!`);
        }
        
        this.currentBet = 0;
        this.betPlaced = false;
        this.updateBalanceDisplay();
        this.enableBetting();
        
        // Save balance to localStorage
        this.saveBalance();
    }

    updateBalanceDisplay() {
        if (this.balanceElement) {
            this.balanceElement.textContent = this.userBalance;
        }
    }

    disableBetting() {
        this.betInput.disabled = true;
        this.placeBetBtn.disabled = true;
    }

    enableBetting() {
        this.betInput.disabled = false;
        this.betInput.value = '';
        this.placeBetBtn.disabled = false;
    }

    showError(message) {
        // You can implement your preferred error display method
        alert(message);
    }

    showSuccess(message) {
        // You can implement your preferred success display method
        alert(message);
    }

    saveBalance() {
        localStorage.setItem('userBalance', this.userBalance.toString());
    }

    loadBalance() {
        const savedBalance = localStorage.getItem('userBalance');
        if (savedBalance) {
            this.userBalance = parseInt(savedBalance);
            this.updateBalanceDisplay();
        }
    }

    // Daily bonus feature
    claimDailyBonus() {
        const lastBonusDate = localStorage.getItem('lastBonusDate');
        const today = new Date().toDateString();
        
        if (lastBonusDate !== today) {
            const bonus = 100; // Daily bonus amount
            this.userBalance += bonus;
            this.updateBalanceDisplay();
            this.saveBalance();
            
            localStorage.setItem('lastBonusDate', today);
            this.showSuccess(`Daily bonus of ${bonus} coins claimed!`);
            return true;
        }
        
        this.showError('Daily bonus already claimed');
        return false;
    }
}

// Export the BettingSystem class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BettingSystem;
} else {
    window.BettingSystem = BettingSystem;
} 