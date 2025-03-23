document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    try {
        // Initialize chess app components
        window.themeManager = new ThemeManager();
        window.soundManager = new SoundManager();
        window.authManager = new AuthManager();
        
        // Initialize main application
        const chessApp = new ChessApp();
        window.chessApp = chessApp;
        
        // Check authentication status
        await window.authManager.checkAuthStatus();
        
        // Initialize additional components as needed
        if (document.getElementById('claim-bonus-btn')) {
            setupDailyBonusButton();
        }
        
        // Setup modal close buttons
        setupModalCloseButtons();
        
        // Initialize tooltips
        initializeTooltips();
        
        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Error initializing application:', error);
        showErrorMessage('Failed to initialize application. Please refresh the page.');
    }
}

function setupDailyBonusButton() {
    const bonusBtn = document.getElementById('claim-bonus-btn');
    bonusBtn.addEventListener('click', async () => {
        try {
            const response = await fetch('/api/user/claim-bonus', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showSuccessMessage(data.message);
                // Update user balance
                if (window.authManager) {
                    window.authManager.updateUI();
                }
            } else {
                showErrorMessage(data.message);
            }
        } catch (error) {
            console.error('Error claiming daily bonus:', error);
            showErrorMessage('Failed to claim daily bonus');
        }
    });
}

function setupModalCloseButtons() {
    document.querySelectorAll('.close-btn, [data-close-modal]').forEach(button => {
        button.addEventListener('click', () => {
            const modalId = button.closest('.modal').id;
            closeModal(modalId);
        });
    });
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
    }
}

function initializeTooltips() {
    document.querySelectorAll('[data-tooltip]').forEach(element => {
        const tooltipText = element.getAttribute('data-tooltip');
        const tooltipElement = document.createElement('div');
        tooltipElement.className = 'tooltip-text';
        tooltipElement.textContent = tooltipText;
        
        element.classList.add('tooltip');
        element.appendChild(tooltipElement);
    });
}

function showSuccessMessage(message) {
    showNotification(message, 'success');
}

function showErrorMessage(message) {
    showNotification(message, 'error');
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Remove notification after 5 seconds
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
}

// Make functions available globally
window.openModal = openModal;
window.closeModal = closeModal;
window.showSuccessMessage = showSuccessMessage;
window.showErrorMessage = showErrorMessage; 