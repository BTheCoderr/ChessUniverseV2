class AuthManager {
    constructor() {
        this.user = null;
        this.isLoading = false;
        this.listeners = [];
        
        // Initialize the UI
        this.initializeAuthUI();
        this.setupEventListeners();
    }

    initializeAuthUI() {
        // Initialize UI elements
        this.loginForm = document.getElementById('loginForm');
        this.registerForm = document.getElementById('registerForm');
        this.logoutBtn = document.getElementById('logoutBtn');
        this.userDisplayEl = document.getElementById('userDisplay');
        this.balanceEl = document.getElementById('userBalance');
        this.authButtons = document.querySelectorAll('.auth-button');
        this.userMenuElements = document.querySelectorAll('.user-menu-item');
    }

    setupEventListeners() {
        // Login form submission
        if (this.loginForm) {
            this.loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Register form submission
        if (this.registerForm) {
            this.registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegister();
            });
        }

        // Logout button click
        if (this.logoutBtn) {
            this.logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        }

        // Quick login buttons
        document.querySelectorAll('[data-testuser]').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const username = button.getAttribute('data-username');
                const password = button.getAttribute('data-password');
                if (username && password) {
                    this.loginAsTestUser(username, password);
                }
            });
        });
    }

    async handleLogin() {
        try {
            // Get form data
            const formData = new FormData(this.loginForm);
            const username = formData.get('username');
            const password = formData.get('password');
            
            // Simple validation
            if (!username || !password) {
                this.showError('Please enter both username and password.');
                return;
            }
            
            this.isLoading = true;
            
            // Make login request
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password }),
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Login successful
                this.user = data.user;
                this.showSuccess('Login successful!');
                
                // Update UI
                this.updateUIAfterLogin(this.user);
                
                // Close login modal
                if (typeof closeModal === 'function') {
                    closeModal('loginModal');
                }
                
                // Notify listeners
                this.notifyAuthChange();
            } else {
                // Login failed
                this.showError(data.message || 'Login failed. Please check your credentials.');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('An unexpected error occurred. Please try again.');
        } finally {
            this.isLoading = false;
        }
    }

    async handleRegister() {
        try {
            // Get form data
            const formData = new FormData(this.registerForm);
            const username = formData.get('username');
            const email = formData.get('email');
            const password = formData.get('password');
            const confirmPassword = formData.get('confirmPassword');
            
            // Simple validation
            if (!username || !email || !password || !confirmPassword) {
                this.showError('Please fill all fields.');
                return;
            }
            
            if (password !== confirmPassword) {
                this.showError('Passwords do not match.');
                return;
            }
            
            this.isLoading = true;
            
            // Make register request
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email, password, confirmPassword }),
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Registration successful
                this.user = data.user;
                this.showSuccess('Registration successful! You are now logged in.');
                
                // Update UI
                this.updateUIAfterLogin(this.user);
                
                // Close register modal
                if (typeof closeModal === 'function') {
                    closeModal('registerModal');
                }
                
                // Notify listeners
                this.notifyAuthChange();
            } else {
                // Registration failed
                this.showError(data.message || 'Registration failed. Please try again.');
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showError('An unexpected error occurred. Please try again.');
        } finally {
            this.isLoading = false;
        }
    }

    async handleLogout() {
        try {
            this.isLoading = true;
            
            // Make logout request
            const response = await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });
            
            if (response.ok) {
                // Logout successful
                this.user = null;
                this.showSuccess('Logout successful.');
                
                // Update UI
                this.updateUIAfterLogout();
                
                // Notify listeners
                this.notifyAuthChange();
            } else {
                // Logout failed
                const data = await response.json();
                this.showError(data.message || 'Logout failed. Please try again.');
            }
        } catch (error) {
            console.error('Logout error:', error);
            this.showError('An unexpected error occurred. Please try again.');
        } finally {
            this.isLoading = false;
        }
    }

    updateUIAfterLogout() {
        // Update display elements
        if (this.userDisplayEl) {
            this.userDisplayEl.textContent = 'Guest';
        }
        
        if (this.balanceEl) {
            this.balanceEl.textContent = '0';
        }
        
        // Show/hide auth buttons
        this.authButtons.forEach(button => {
            if (button.classList.contains('guest-only')) {
                button.classList.remove('hidden');
            } else if (button.classList.contains('user-only')) {
                button.classList.add('hidden');
            }
        });
        
        // Hide user menu items
        this.userMenuElements.forEach(element => {
            element.classList.add('hidden');
        });
        
        // Update auth-dependent elements
        this.updateAuthDependentElements();
    }

    async checkAuthStatus() {
        try {
            this.isLoading = true;
            
            // Check if user is logged in
            const response = await fetch('/api/auth/me', {
                method: 'GET',
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.user) {
                    // User is logged in
                    this.user = data.user;
                    this.updateUIAfterLogin(this.user);
                } else {
                    // User is not logged in
                    this.user = null;
                    this.updateUIAfterLogout();
                }
            } else {
                // Error checking auth status
                this.user = null;
                this.updateUIAfterLogout();
            }
            
            // Notify listeners
            this.notifyAuthChange();
            
            return this.user;
        } catch (error) {
            console.error('Auth status check error:', error);
            this.user = null;
            this.updateUIAfterLogout();
            return null;
        } finally {
            this.isLoading = false;
        }
    }

    async createTestAccount() {
        try {
            this.isLoading = true;
            
            // Create test account
            const response = await fetch('/api/auth/test-account', {
                method: 'POST',
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Test account created and logged in
                this.user = data.user;
                this.showSuccess('Test account created! You are now logged in.');
                
                // Update UI
                this.updateUIAfterLogin(this.user);
                
                // Close login modal
                if (typeof closeModal === 'function') {
                    closeModal('loginModal');
                }
                
                // Notify listeners
                this.notifyAuthChange();
                
                return this.user;
            } else {
                // Creation failed
                this.showError(data.message || 'Failed to create test account. Please try again.');
                return null;
            }
        } catch (error) {
            console.error('Test account creation error:', error);
            this.showError('An unexpected error occurred. Please try again.');
            return null;
        } finally {
            this.isLoading = false;
        }
    }

    async loginAsTestUser(username, password) {
        try {
            this.isLoading = true;
            
            // Make login request
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password }),
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Login successful
                this.user = data.user;
                this.showSuccess(`Logged in as ${username}!`);
                
                // Update UI
                this.updateUIAfterLogin(this.user);
                
                // Close login modal
                if (typeof closeModal === 'function') {
                    closeModal('loginModal');
                }
                
                // Notify listeners
                this.notifyAuthChange();
                
                return this.user;
            } else {
                // Login failed
                this.showError(data.message || 'Login failed. Please try again.');
                return null;
            }
        } catch (error) {
            console.error('Test login error:', error);
            this.showError('An unexpected error occurred. Please try again.');
            return null;
        } finally {
            this.isLoading = false;
        }
    }

    updateUIAfterLogin(user) {
        // Update display elements
        if (this.userDisplayEl) {
            this.userDisplayEl.textContent = user.username;
        }
        
        if (this.balanceEl) {
            this.balanceEl.textContent = user.balance.toString();
        }
        
        // Show/hide auth buttons
        this.authButtons.forEach(button => {
            if (button.classList.contains('guest-only')) {
                button.classList.add('hidden');
            } else if (button.classList.contains('user-only')) {
                button.classList.remove('hidden');
            }
        });
        
        // Show user menu items
        this.userMenuElements.forEach(element => {
            element.classList.remove('hidden');
        });
        
        // Update auth-dependent elements
        this.updateAuthDependentElements();
    }

    updateUI() {
        if (this.user) {
            this.updateUIAfterLogin(this.user);
        } else {
            this.updateUIAfterLogout();
        }
    }

    updateAuthDependentElements() {
        // Update elements that depend on auth status
        document.querySelectorAll('[data-requires-auth]').forEach(element => {
            if (this.isAuthenticated()) {
                element.classList.remove('disabled');
                element.removeAttribute('disabled');
            } else {
                element.classList.add('disabled');
                element.setAttribute('disabled', 'disabled');
            }
        });
    }

    isAuthenticated() {
        return !!this.user;
    }

    addAuthChangeListener(listener) {
        this.listeners.push(listener);
    }

    notifyAuthChange() {
        this.listeners.forEach(listener => {
            try {
                listener(this.isAuthenticated(), this.user);
            } catch (error) {
                console.error('Error in auth change listener:', error);
            }
        });
    }
    
    showNotification(message, type) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            type === 'error' ? 'bg-red-500' : 'bg-green-500'
        } text-white opacity-0 transition-opacity duration-300`;
        notification.textContent = message;
        
        // Add to document
        document.body.appendChild(notification);
        
        // Fade in
        setTimeout(() => {
            notification.classList.add('opacity-100');
        }, 10);
        
        // Fade out and remove
        setTimeout(() => {
            notification.classList.remove('opacity-100');
            notification.classList.add('opacity-0');
            
            // Remove from document
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }
}

// Export the AuthManager class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
} else {
    window.AuthManager = AuthManager;
}