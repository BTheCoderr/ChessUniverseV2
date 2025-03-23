class TournamentManager {
    constructor() {
        this.tournaments = [];
        this.currentFilters = {
            status: 'all',
            upcoming: false,
            past: false
        };
        
        this.setupEventListeners();
        this.loadTournaments();
    }
    
    setupEventListeners() {
        // Tournament filters
        document.querySelectorAll('[data-tournament-filter]').forEach(filter => {
            filter.addEventListener('change', () => this.handleFilterChange());
        });
        
        // Create tournament button
        const createBtn = document.getElementById('create-tournament-btn');
        if (createBtn) {
            createBtn.addEventListener('click', () => this.showCreateTournamentModal());
        }
        
        // Tournament form submission
        const tournamentForm = document.getElementById('create-tournament-form');
        if (tournamentForm) {
            tournamentForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleTournamentFormSubmit(e.target);
            });
        }
    }
    
    async loadTournaments() {
        try {
            const tournamentsList = document.getElementById('tournaments-list');
            if (!tournamentsList) return;
            
            tournamentsList.innerHTML = '<div class="loading-spinner">Loading tournaments...</div>';
            
            // Build query string based on filters
            const queryParams = new URLSearchParams();
            if (this.currentFilters.status !== 'all') {
                queryParams.append('status', this.currentFilters.status);
            }
            if (this.currentFilters.upcoming) {
                queryParams.append('upcoming', 'true');
            }
            if (this.currentFilters.past) {
                queryParams.append('past', 'true');
            }
            
            const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
            
            // Fetch tournaments
            const response = await fetch(`/api/tournament${queryString}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('Failed to load tournaments');
            }
            
            const data = await response.json();
            this.tournaments = data.tournaments || [];
            
            this.renderTournaments();
        } catch (error) {
            console.error('Error loading tournaments:', error);
            this.showError('Failed to load tournaments');
        }
    }
    
    renderTournaments() {
        const tournamentsList = document.getElementById('tournaments-list');
        if (!tournamentsList) return;
        
        // Clear list
        tournamentsList.innerHTML = '';
        
        if (this.tournaments.length === 0) {
            tournamentsList.innerHTML = `
                <div class="no-tournaments-message">
                    <p>No tournaments available with the selected filters.</p>
                </div>
            `;
            return;
        }
        
        // Render each tournament
        this.tournaments.forEach(tournament => {
            tournamentsList.appendChild(this.createTournamentCard(tournament));
        });
    }
    
    createTournamentCard(tournament) {
        const card = document.createElement('div');
        card.className = 'tournament-card';
        card.dataset.tournamentId = tournament.id;
        
        const currentParticipants = tournament.currentParticipants || 0;
        const registrationStart = new Date(tournament.registrationStart);
        const registrationEnd = new Date(tournament.registrationEnd);
        const tournamentStart = new Date(tournament.tournamentStart);
        
        card.innerHTML = `
            <div class="tournament-card-header">
                <h3 class="tournament-card-title">${tournament.name}</h3>
                <span class="tournament-card-status status-${tournament.status}">${this.formatStatus(tournament.status)}</span>
            </div>
            <div class="tournament-card-details">
                <div class="tournament-card-detail">
                    <span class="detail-label">Variant:</span>
                    <span class="detail-value">${this.formatVariant(tournament.gameVariant)}</span>
                </div>
                <div class="tournament-card-detail">
                    <span class="detail-label">Entry Fee:</span>
                    <span class="detail-value">${tournament.entryFee} coins</span>
                </div>
                <div class="tournament-card-detail">
                    <span class="detail-label">Prize Pool:</span>
                    <span class="detail-value">${tournament.prizePool || 0} coins</span>
                </div>
                <div class="tournament-card-detail">
                    <span class="detail-label">Participants:</span>
                    <span class="detail-value">${currentParticipants}/${tournament.maxParticipants}</span>
                </div>
                <div class="tournament-card-detail">
                    <span class="detail-label">Starts:</span>
                    <span class="detail-value">${this.formatDate(tournamentStart)}</span>
                </div>
            </div>
            <div class="tournament-card-actions">
                <button class="btn btn-primary view-tournament-btn" data-tournament-id="${tournament.id}">
                    View Details
                </button>
                ${tournament.status === 'registration' ? `
                    <button class="btn btn-accent join-tournament-btn" data-tournament-id="${tournament.id}">
                        Join Tournament
                    </button>
                ` : ''}
            </div>
        `;
        
        // Add event listeners
        card.querySelector('.view-tournament-btn').addEventListener('click', () => {
            this.showTournamentDetails(tournament.id);
        });
        
        const joinBtn = card.querySelector('.join-tournament-btn');
        if (joinBtn) {
            joinBtn.addEventListener('click', () => {
                this.joinTournament(tournament.id);
            });
        }
        
        return card;
    }
    
    async showTournamentDetails(tournamentId) {
        try {
            const response = await fetch(`/api/tournament/${tournamentId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('Failed to load tournament details');
            }
            
            const data = await response.json();
            const tournament = data.tournament;
            
            // Create modal content
            const modalContent = document.createElement('div');
            modalContent.className = 'tournament-details-content';
            
            modalContent.innerHTML = `
                <div class="tournament-info">
                    <h2>${tournament.name}</h2>
                    <p>${tournament.description || 'No description provided.'}</p>
                    
                    <div class="tournament-details-grid">
                        <div class="detail-item">
                            <span class="detail-label">Status:</span>
                            <span class="detail-value status-${tournament.status}">${this.formatStatus(tournament.status)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Game Variant:</span>
                            <span class="detail-value">${this.formatVariant(tournament.gameVariant)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Entry Fee:</span>
                            <span class="detail-value">${tournament.entryFee} coins</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Prize Pool:</span>
                            <span class="detail-value">${tournament.prizePool || 0} coins</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Registration:</span>
                            <span class="detail-value">
                                ${this.formatDate(new Date(tournament.registrationStart))} - 
                                ${this.formatDate(new Date(tournament.registrationEnd))}
                            </span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Tournament Start:</span>
                            <span class="detail-value">${this.formatDate(new Date(tournament.tournamentStart))}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Created By:</span>
                            <span class="detail-value">${tournament.createdBy}</span>
                        </div>
                    </div>
                    
                    <div class="tournament-actions">
                        ${tournament.status === 'registration' ? `
                            <button class="btn btn-primary join-tournament-btn" data-tournament-id="${tournament.id}">
                                Join Tournament
                            </button>
                        ` : ''}
                        <button class="btn btn-outline" data-close-modal>Close</button>
                    </div>
                    
                    <div class="tournament-participants">
                        <h3>Participants (${tournament.participants.length}/${tournament.maxParticipants})</h3>
                        ${tournament.participants.length > 0 ? `
                            <div class="participants-list">
                                ${tournament.participants.map(p => `
                                    <div class="participant-item">
                                        <span class="participant-name">${p.username}</span>
                                        <span class="participant-status ${p.status}">${p.status}</span>
                                    </div>
                                `).join('')}
                            </div>
                        ` : `
                            <div class="no-participants-message">
                                <p>No participants have joined yet.</p>
                            </div>
                        `}
                    </div>
                </div>
            `;
            
            // Show the modal
            const modalElement = document.getElementById('tournament-details-modal');
            const modalContentContainer = modalElement.querySelector('.modal-content');
            modalContentContainer.innerHTML = '';
            modalContentContainer.appendChild(modalContent);
            
            // Add event listener to join button
            const joinBtn = modalContentContainer.querySelector('.join-tournament-btn');
            if (joinBtn) {
                joinBtn.addEventListener('click', () => {
                    this.joinTournament(tournament.id);
                    modalElement.classList.add('hidden');
                });
            }
            
            modalElement.classList.remove('hidden');
        } catch (error) {
            console.error('Error showing tournament details:', error);
            this.showError('Failed to load tournament details');
        }
    }
    
    async joinTournament(tournamentId) {
        try {
            // Check authentication
            if (!window.authManager || !window.authManager.isAuthenticated) {
                this.showError('You must be logged in to join a tournament');
                return;
            }
            
            const response = await fetch(`/api/tournament/${tournamentId}/join`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.showSuccess(data.message);
                // Refresh tournaments
                this.loadTournaments();
            } else {
                this.showError(data.message);
            }
        } catch (error) {
            console.error('Error joining tournament:', error);
            this.showError('Failed to join tournament');
        }
    }
    
    showCreateTournamentModal() {
        const modalElement = document.getElementById('create-tournament-modal');
        if (modalElement) {
            modalElement.classList.remove('hidden');
        }
    }
    
    async handleTournamentFormSubmit(form) {
        try {
            const formData = new FormData(form);
            const tournamentData = {};
            
            formData.forEach((value, key) => {
                tournamentData[key] = value;
            });
            
            const response = await fetch('/api/tournament', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(tournamentData),
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.showSuccess(data.message);
                // Close modal and refresh
                document.getElementById('create-tournament-modal').classList.add('hidden');
                form.reset();
                this.loadTournaments();
            } else {
                this.showError(data.message);
            }
        } catch (error) {
            console.error('Error creating tournament:', error);
            this.showError('Failed to create tournament');
        }
    }
    
    handleFilterChange() {
        // Get filter values
        const statusFilter = document.querySelector('[data-tournament-filter="status"]');
        const upcomingFilter = document.querySelector('[data-tournament-filter="upcoming"]');
        const pastFilter = document.querySelector('[data-tournament-filter="past"]');
        
        this.currentFilters = {
            status: statusFilter ? statusFilter.value : 'all',
            upcoming: upcomingFilter ? upcomingFilter.checked : false,
            past: pastFilter ? pastFilter.checked : false
        };
        
        this.loadTournaments();
    }
    
    formatStatus(status) {
        switch(status) {
            case 'registration':
                return 'Registration Open';
            case 'active':
                return 'In Progress';
            case 'completed':
                return 'Completed';
            default:
                return status.charAt(0).toUpperCase() + status.slice(1);
        }
    }
    
    formatVariant(variant) {
        switch(variant) {
            case 'traditional':
                return 'Traditional Chess';
            case 'level2':
                return 'Level 2 Chess';
            case 'level3':
                return 'Level 3 Chess';
            case 'level4':
                return 'Level 4 Chess';
            case 'battleChess':
                return 'Battle Chess';
            case 'customSetup':
                return 'Custom Setup';
            default:
                return variant;
        }
    }
    
    formatDate(date) {
        return new Date(date).toLocaleDateString();
    }
    
    showError(message) {
        if (window.showErrorMessage) {
            window.showErrorMessage(message);
        } else {
            alert(message);
        }
    }
    
    showSuccess(message) {
        if (window.showSuccessMessage) {
            window.showSuccessMessage(message);
        } else {
            alert(message);
        }
    }
}

// Initialize tournament manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if we're on the tournaments page
    if (document.getElementById('tournaments-container')) {
        window.tournamentManager = new TournamentManager();
    }
}); 