/**
 * Unified Navigation Component for Chess Universe
 * 
 * This script provides a consistent navigation experience across all chess interfaces.
 * It adds the navigation bar to each page and highlights the current page.
 */

class ChessNavigation {
  constructor() {
    this.currentPage = this.getCurrentPage();
    this.init();
  }
  
  init() {
    // Create navigation bar when DOM is loaded
    document.addEventListener('DOMContentLoaded', () => {
      this.createNavigationBar();
      this.setupEventListeners();
      
      // Check authentication status if authManager exists
      if (window.authManager) {
        window.authManager.checkAuthStatus().then(() => {
          this.updateAuthDisplay();
        });
      }
    });
  }
  
  getCurrentPage() {
    // Get the current page name from the URL
    const path = window.location.pathname;
    const pageName = path.split('/').pop() || 'index.html';
    return pageName;
  }
  
  createNavigationBar() {
    // Create the navigation HTML
    const navHTML = `
      <div class="chess-nav">
        <div class="chess-nav-container">
          <div class="chess-nav-logo">
            <h1>Chess Universe</h1>
          </div>
          
          <div class="chess-nav-links">
            <a href="index.html" class="chess-nav-link ${this.currentPage === 'index.html' ? 'active' : ''}">Main Chess</a>
            <a href="ai-chess.html" class="chess-nav-link ${this.currentPage === 'ai-chess.html' ? 'active' : ''}">AI Chess</a>
            <a href="modular-chess.html" class="chess-nav-link ${this.currentPage === 'modular-chess.html' ? 'active' : ''}">Modular Chess</a>
            <a href="simple-chess.html" class="chess-nav-link ${this.currentPage === 'simple-chess.html' ? 'active' : ''}">Simple Chess</a>
            <a href="magicHorse.html" class="chess-nav-link ${this.currentPage === 'magicHorse.html' ? 'active' : ''}">Magic Horse</a>
            <a href="test-castle-wars.html" class="chess-nav-link ${this.currentPage === 'test-castle-wars.html' ? 'active' : ''}">Castle Wars</a>
            <a href="chess-map.html" class="chess-nav-link ${this.currentPage === 'chess-map.html' ? 'active' : ''}">Chess Map</a>
          </div>
          
          <div class="chess-nav-auth">
            <span class="chess-nav-username" id="nav-username">Guest</span>
            <span class="chess-nav-balance" id="nav-balance">0 coins</span>
            <button id="nav-login-btn" class="btn chess-nav-btn">Login</button>
            <button id="nav-register-btn" class="btn chess-nav-btn">Register</button>
            <button id="nav-logout-btn" class="btn chess-nav-btn" style="display:none;">Logout</button>
          </div>
          
          <button class="chess-nav-mobile-toggle" id="nav-mobile-toggle">
            ☰
          </button>
        </div>
        
        <div class="chess-nav-dropdown" id="nav-dropdown">
          <div class="chess-nav-links">
            <a href="index.html" class="chess-nav-dropdown-link ${this.currentPage === 'index.html' ? 'active' : ''}">Main Chess</a>
            <a href="ai-chess.html" class="chess-nav-dropdown-link ${this.currentPage === 'ai-chess.html' ? 'active' : ''}">AI Chess</a>
            <a href="modular-chess.html" class="chess-nav-dropdown-link ${this.currentPage === 'modular-chess.html' ? 'active' : ''}">Modular Chess</a>
            <a href="simple-chess.html" class="chess-nav-dropdown-link ${this.currentPage === 'simple-chess.html' ? 'active' : ''}">Simple Chess</a>
            <a href="magicHorse.html" class="chess-nav-dropdown-link ${this.currentPage === 'magicHorse.html' ? 'active' : ''}">Magic Horse</a>
            <a href="test-castle-wars.html" class="chess-nav-dropdown-link ${this.currentPage === 'test-castle-wars.html' ? 'active' : ''}">Castle Wars</a>
            <a href="chess-map.html" class="chess-nav-dropdown-link ${this.currentPage === 'chess-map.html' ? 'active' : ''}">Chess Map</a>
          </div>
          
          <div class="chess-nav-auth">
            <button id="nav-mobile-login-btn" class="btn chess-nav-btn">Login</button>
            <button id="nav-mobile-register-btn" class="btn chess-nav-btn">Register</button>
            <button id="nav-mobile-logout-btn" class="btn chess-nav-btn" style="display:none;">Logout</button>
          </div>
        </div>
        
        <div class="chess-nav-current-page">
          Currently viewing: ${this.getPageTitle()}
        </div>
      </div>
    `;
    
    // Insert the navigation at the beginning of the body
    const firstChild = document.body.firstChild;
    const navElement = document.createElement('div');
    navElement.innerHTML = navHTML;
    
    document.body.insertBefore(navElement, firstChild);
    
    // Add style link to the head if it doesn't exist
    if (!document.querySelector('link[href="css/navigation.css"]')) {
      const linkElement = document.createElement('link');
      linkElement.rel = 'stylesheet';
      linkElement.href = 'css/navigation.css';
      document.head.appendChild(linkElement);
    }
  }
  
  setupEventListeners() {
    // Mobile navigation toggle
    const mobileToggle = document.getElementById('nav-mobile-toggle');
    const dropdown = document.getElementById('nav-dropdown');
    
    if (mobileToggle && dropdown) {
      mobileToggle.addEventListener('click', () => {
        dropdown.classList.toggle('active');
      });
    }
    
    // Auth buttons
    const loginBtn = document.getElementById('nav-login-btn');
    const mobileLoginBtn = document.getElementById('nav-mobile-login-btn');
    const registerBtn = document.getElementById('nav-register-btn');
    const mobileRegisterBtn = document.getElementById('nav-mobile-register-btn');
    const logoutBtn = document.getElementById('nav-logout-btn');
    const mobileLogoutBtn = document.getElementById('nav-mobile-logout-btn');
    
    // Login button
    [loginBtn, mobileLoginBtn].forEach(btn => {
      if (btn) {
        btn.addEventListener('click', () => {
          if (typeof openModal === 'function') {
            openModal('login-modal');
          } else {
            window.location.href = 'index.html?action=login';
          }
        });
      }
    });
    
    // Register button
    [registerBtn, mobileRegisterBtn].forEach(btn => {
      if (btn) {
        btn.addEventListener('click', () => {
          if (typeof openModal === 'function') {
            openModal('register-modal');
          } else {
            window.location.href = 'index.html?action=register';
          }
        });
      }
    });
    
    // Logout button
    [logoutBtn, mobileLogoutBtn].forEach(btn => {
      if (btn) {
        btn.addEventListener('click', () => {
          if (window.authManager) {
            window.authManager.handleLogout();
          } else {
            // Simple logout - clear any auth tokens and reload
            localStorage.removeItem('authToken');
            sessionStorage.removeItem('authToken');
            window.location.reload();
          }
        });
      }
    });
    
    // Listen for auth changes if authManager exists
    if (window.authManager) {
      window.authManager.addAuthChangeListener(() => {
        this.updateAuthDisplay();
      });
    }
  }
  
  updateAuthDisplay() {
    const isAuthenticated = window.authManager?.isAuthenticated?.() || false;
    const user = window.authManager?.getCurrentUser?.() || { username: 'Guest', balance: 0 };
    
    // Get elements
    const usernameEl = document.getElementById('nav-username');
    const balanceEl = document.getElementById('nav-balance');
    const loginBtn = document.getElementById('nav-login-btn');
    const mobileLoginBtn = document.getElementById('nav-mobile-login-btn');
    const registerBtn = document.getElementById('nav-register-btn');
    const mobileRegisterBtn = document.getElementById('nav-mobile-register-btn');
    const logoutBtn = document.getElementById('nav-logout-btn');
    const mobileLogoutBtn = document.getElementById('nav-mobile-logout-btn');
    
    // Update elements based on auth state
    if (isAuthenticated) {
      // User is logged in
      if (usernameEl) usernameEl.textContent = user.username;
      if (balanceEl) balanceEl.textContent = `${user.balance || 0} coins`;
      
      // Show logout, hide login/register
      if (loginBtn) loginBtn.style.display = 'none';
      if (mobileLoginBtn) mobileLoginBtn.style.display = 'none';
      if (registerBtn) registerBtn.style.display = 'none';
      if (mobileRegisterBtn) mobileRegisterBtn.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'inline-block';
      if (mobileLogoutBtn) mobileLogoutBtn.style.display = 'inline-block';
    } else {
      // User is not logged in
      if (usernameEl) usernameEl.textContent = 'Guest';
      if (balanceEl) balanceEl.textContent = '0 coins';
      
      // Show login/register, hide logout
      if (loginBtn) loginBtn.style.display = 'inline-block';
      if (mobileLoginBtn) mobileLoginBtn.style.display = 'inline-block';
      if (registerBtn) registerBtn.style.display = 'inline-block';
      if (mobileRegisterBtn) mobileRegisterBtn.style.display = 'inline-block';
      if (logoutBtn) logoutBtn.style.display = 'none';
      if (mobileLogoutBtn) mobileLogoutBtn.style.display = 'none';
    }
  }
  
  getPageTitle() {
    // Map file names to readable titles
    const pageTitles = {
      'index.html': 'Main Chess',
      'ai-chess.html': 'AI Chess Game',
      'modular-chess.html': 'Modular Chess',
      'simple-chess.html': 'Simple Chess',
      'magicHorse.html': 'Magic Horse Challenge',
      'test-castle-wars.html': 'Castle Wars Challenge',
      'chess-map.html': 'Chess App Guide',
    };
    
    return pageTitles[this.currentPage] || this.currentPage;
  }
}

// Initialize the chess navigation
const chessNav = new ChessNavigation(); 