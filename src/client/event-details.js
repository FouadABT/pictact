// Event Details Page JavaScript

class EventDetails {
    constructor() {
        this.eventId = this.getEventIdFromURL();
        this.isParticipating = false;
        this.initializeEventHandlers();
        this.startLiveUpdates();
        this.loadEventData();
    }

    getEventIdFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id') || 'demo-event';
    }

    initializeEventHandlers() {
        const joinBtn = document.getElementById('joinEventBtn');
        if (joinBtn) {
            joinBtn.addEventListener('click', this.handleJoinEvent.bind(this));
        }

        // Handle leaderboard clicks
        const leaderboardLinks = document.querySelectorAll('.view-full-leaderboard');
        leaderboardLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.showFullLeaderboard();
            });
        });
    }

    async handleJoinEvent() {
        const joinBtn = document.getElementById('joinEventBtn');
        
        if (this.isParticipating) {
            // Already participating - go to submission interface
            this.openSubmissionInterface();
            return;
        }

        // Show loading state
        joinBtn.innerHTML = `
            <span class="btn-spinner"></span>
            <span>Joining...</span>
        `;
        joinBtn.disabled = true;

        try {
            // Simulate API call to join event
            await this.simulateAPICall('join-event', { eventId: this.eventId });
            
            // Update UI to show participation
            this.isParticipating = true;
            this.updateParticipationStatus();
            
            // Show success message
            this.showNotification('Successfully joined the event! 🎉', 'success');
            
        } catch (error) {
            console.error('Failed to join event:', error);
            this.showNotification('Failed to join event. Please try again.', 'error');
            
            // Reset button
            joinBtn.innerHTML = `
                <span class="btn-icon">🚀</span>
                <span>Join Event</span>
            `;
            joinBtn.disabled = false;
        }
    }

    updateParticipationStatus() {
        const joinBtn = document.getElementById('joinEventBtn');
        const statusMessage = document.querySelector('.status-message');
        
        // Update button to show participation options
        joinBtn.innerHTML = `
            <span class="btn-icon">📸</span>
            <span>Start Hunting</span>
        `;
        joinBtn.disabled = false;
        joinBtn.className = 'btn btn-success btn-lg participation-btn';
        
        // Update status message
        if (statusMessage) {
            statusMessage.innerHTML = `
                <span class="status-icon">✅</span>
                <span>You're participating!</span>
            `;
            statusMessage.className = 'status-message participating';
        }
    }

    openSubmissionInterface() {
        // This would typically navigate to a submission page or open a modal
        this.showNotification('Opening photo submission interface...', 'info');
        
        // For demo purposes, create a simple submission modal
        this.createSubmissionModal();
    }

    createSubmissionModal() {
        const modal = document.createElement('div');
        modal.className = 'submission-modal-overlay';
        modal.innerHTML = `
            <div class="submission-modal">
                <div class="modal-header">
                    <h2>Submit Your Photo</h2>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-content">
                    <div class="upload-area">
                        <div class="upload-placeholder">
                            <div class="upload-icon">📸</div>
                            <div class="upload-text">Click to upload or drag and drop</div>
                            <div class="upload-subtext">JPEG, PNG up to 10MB</div>
                        </div>
                        <input type="file" class="file-input" accept="image/*" multiple>
                    </div>
                    
                    <div class="submission-form">
                        <div class="form-group">
                            <label class="form-label">Category</label>
                            <select class="form-select">
                                <option>Art Deco facades</option>
                                <option>Modern glass structures</option>
                                <option>Historic stone archways</option>
                                <option>Unique rooftop designs</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Location</label>
                            <input type="text" class="form-input" placeholder="Where did you take this photo?">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Description (Optional)</label>
                            <textarea class="form-input" rows="3" placeholder="Tell us about this architectural element..."></textarea>
                        </div>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-outline">Cancel</button>
                    <button class="btn btn-primary">Submit Photo</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Handle modal close
        const closeBtn = modal.querySelector('.modal-close');
        const cancelBtn = modal.querySelector('.btn-outline');
        
        [closeBtn, cancelBtn].forEach(btn => {
            btn.addEventListener('click', () => {
                document.body.removeChild(modal);
            });
        });

        // Handle outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });

        // Handle file upload
        const fileInput = modal.querySelector('.file-input');
        const uploadArea = modal.querySelector('.upload-area');
        
        uploadArea.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileUpload(e.target.files, uploadArea);
            }
        });
    }

    handleFileUpload(files, uploadArea) {
        const file = files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                uploadArea.innerHTML = `
                    <div class="uploaded-image">
                        <img src="${e.target.result}" alt="Uploaded photo" style="max-width: 100%; max-height: 200px; border-radius: 8px;">
                        <div class="upload-success">
                            <span class="success-icon">✅</span>
                            <span>Photo uploaded successfully!</span>
                        </div>
                    </div>
                `;
            };
            reader.readAsDataURL(file);
        }
    }

    showFullLeaderboard() {
        // This would typically navigate to a full leaderboard page
        this.showNotification('Opening full leaderboard...', 'info');
    }

    async loadEventData() {
        try {
            // Simulate loading event data from API
            const eventData = await this.simulateAPICall('get-event', { eventId: this.eventId });
            this.updateEventDisplay(eventData);
        } catch (error) {
            console.error('Failed to load event data:', error);
        }
    }

    updateEventDisplay(eventData) {
        // Update dynamic content based on real event data
        // For demo, we'll just update the participant count
        const participantElements = document.querySelectorAll('.stat-number');
        if (participantElements[0]) {
            // Simulate increasing participant count
            let count = parseInt(participantElements[0].textContent);
            participantElements[0].textContent = count + Math.floor(Math.random() * 5);
        }
    }

    startLiveUpdates() {
        // Update leaderboard and stats every 30 seconds
        setInterval(() => {
            this.updateLiveData();
        }, 30000);

        // Update timer every minute
        setInterval(() => {
            this.updateTimer();
        }, 60000);
    }

    updateLiveData() {
        // Simulate live data updates
        this.updateParticipantCount();
        this.updateLeaderboard();
        this.updateActivity();
    }

    updateParticipantCount() {
        const participantStat = document.querySelector('.stat-card .stat-number');
        if (participantStat) {
            let current = parseInt(participantStat.textContent);
            participantStat.textContent = current + Math.floor(Math.random() * 3);
        }
    }

    updateLeaderboard() {
        // Simulate small score changes in leaderboard
        const scoreElements = document.querySelectorAll('.player-score');
        scoreElements.forEach(element => {
            let score = parseInt(element.textContent);
            element.textContent = (score + Math.floor(Math.random() * 10)) + ' pts';
        });
    }

    updateActivity() {
        // Add new activity items
        const activityFeed = document.querySelector('.activity-feed');
        if (activityFeed && Math.random() > 0.7) {
            const activities = [
                { user: '@NewHunter', action: 'joined the event', icon: '👋' },
                { user: '@PhotoMaster', action: 'submitted a photo', icon: '📸' },
                { user: '@ArchExplorer', action: 'earned 50 points', icon: '🏆' }
            ];
            
            const activity = activities[Math.floor(Math.random() * activities.length)];
            const newActivity = document.createElement('div');
            newActivity.className = 'activity-item new-activity';
            newActivity.innerHTML = `
                <div class="activity-avatar">${activity.icon}</div>
                <div class="activity-content">
                    <div class="activity-text">
                        <strong>${activity.user}</strong> ${activity.action}
                    </div>
                    <div class="activity-time">Just now</div>
                </div>
            `;
            
            activityFeed.insertBefore(newActivity, activityFeed.firstChild);
            
            // Remove oldest activity if more than 6
            const activities_list = activityFeed.querySelectorAll('.activity-item');
            if (activities_list.length > 6) {
                activityFeed.removeChild(activities_list[activities_list.length - 1]);
            }
        }
    }

    updateTimer() {
        const timerElements = document.querySelectorAll('[data-timer]');
        timerElements.forEach(element => {
            // Simulate countdown
            const current = element.textContent;
            if (current.includes('2h 15m')) {
                element.textContent = current.replace('2h 15m', '2h 14m');
            }
        });
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '500',
            zIndex: '10000',
            opacity: '0',
            transform: 'translateX(100%)',
            transition: 'all 0.3s ease'
        });

        // Set background color based on type
        const colors = {
            success: '#10B981',
            error: '#EF4444',
            info: '#3B82F6',
            warning: '#F59E0B'
        };
        notification.style.backgroundColor = colors[type] || colors.info;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    async simulateAPICall(endpoint, data) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
        
        // Simulate potential errors
        if (Math.random() < 0.1) {
            throw new Error('Network error');
        }
        
        return { success: true, data };
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new EventDetails();
});
