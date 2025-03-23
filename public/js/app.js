// Main application entry point
document.addEventListener('DOMContentLoaded', () => {
    console.log('Chess Universe App Initializing...');
    
    // Initialize authentication system
    if (typeof AuthManager !== 'undefined') {
        window.authManager = new AuthManager();
        window.authManager.checkAuthStatus().then(() => {
            console.log('Authentication status checked');
        }).catch(err => {
            console.error('Error checking auth status:', err);
        });
    }
    
    // Initialize tooltips for auth-required buttons
    initTooltips();
    
    // Initialize auth-required elements
    initAuthRequiredElements();
    
    console.log('Chess Universe App Initialized');
});

// Initialize tooltips for elements that require authentication
function initTooltips() {
    const authRequiredButtons = document.querySelectorAll('[data-auth-tooltip]');
    
    authRequiredButtons.forEach(button => {
        // Add event listeners for tooltip
        button.addEventListener('mouseenter', (e) => {
            const tooltipText = e.target.getAttribute('data-auth-tooltip');
            if (!tooltipText) return;
            
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip absolute bg-gray-800 text-white text-xs rounded py-1 px-2 -top-8 left-1/2 transform -translate-x-1/2 z-50';
            tooltip.innerText = tooltipText;
            tooltip.id = 'auth-tooltip';
            
            // Add arrow
            const arrow = document.createElement('div');
            arrow.className = 'arrow-down absolute -bottom-1 left-1/2 transform -translate-x-1/2';
            arrow.style.width = '0';
            arrow.style.height = '0';
            arrow.style.borderLeft = '5px solid transparent';
            arrow.style.borderRight = '5px solid transparent';
            arrow.style.borderTop = '5px solid #1f2937';
            
            tooltip.appendChild(arrow);
            button.style.position = 'relative';
            button.appendChild(tooltip);
        });
        
        button.addEventListener('mouseleave', () => {
            const tooltip = document.getElementById('auth-tooltip');
            if (tooltip) {
                tooltip.remove();
            }
        });
    });
}

// Initialize elements that require authentication
function initAuthRequiredElements() {
    const authRequiredElements = document.querySelectorAll('[data-requires-auth="true"]');
    
    authRequiredElements.forEach(element => {
        element.addEventListener('click', (e) => {
            // Check if user is authenticated
            if (!window.authManager || !window.authManager.isAuthenticated()) {
                e.preventDefault();
                e.stopPropagation();
                
                // Show login modal
                if (typeof openModal === 'function') {
                    openModal('loginModal');
                } else {
                    alert('Please log in to access this feature');
                }
                
                return false;
            }
        });
    });
}

// Make helper functions available globally
window.openModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
    }
};

window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
    }
};

window.loginAsTestUser = function(username, password) {
    if (window.authManager) {
        window.authManager.loginAsTestUser(username, password);
    } else {
        console.error('Auth manager not initialized');
    }
}; 