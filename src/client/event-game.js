// Event Game Page JavaScript
import { redditRealTimeClient } from './services/reddit-realtime-client.js';

class EventGameManager {
    constructor() {
        this.currentQuestion = 3;
        this.totalQuestions = 10;
        this.timeRemaining = 155; // 2:35 in seconds
        this.isTimerRunning = false; // Now controlled by Reddit real-time updates
        this.responses = [];
        this.gameId = this.extractGameIdFromUrl();
        
        this.initializeGame();
        this.initializeRedditRealTime();
        this.initializeImageUpload();
        this.initializeLiveFeed();
    }

    /**
     * Extract game ID from URL parameters
     */
    extractGameIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('gameId') || 'default-game';
    }

    initializeGame() {
        console.log('🎮 Event Game initialized');
        this.updateTimerDisplay();
        this.animateResponseFeed();
    }

    /**
     * Initialize Reddit real-time updates system
     * Replaces WebSocket functionality with Reddit comment polling
     */
    async initializeRedditRealTime() {
        console.log('📡 Initializing Reddit real-time updates');
        
        try {
            // Connect to the game
            const connected = await redditRealTimeClient.connect(this.gameId);
            if (!connected) {
                console.error('❌ Failed to connect to Reddit real-time updates');
                this.showNotification('⚠️ Connection issues - some features may be limited', 'warning');
                return;
            }

            // Subscribe to timer updates
            redditRealTimeClient.subscribe('timer', (update) => {
                this.handleTimerUpdate(update);
            });

            // Subscribe to round updates
            redditRealTimeClient.subscribe('round_start', (update) => {
                this.handleRoundStart(update);
            });

            redditRealTimeClient.subscribe('round_end', (update) => {
                this.handleRoundEnd(update);
            });

            // Subscribe to submission updates
            redditRealTimeClient.subscribe('submission', (update) => {
                this.handleNewSubmission(update);
            });

            // Subscribe to leaderboard updates
            redditRealTimeClient.subscribe('leaderboard', (update) => {
                this.handleLeaderboardUpdate(update);
            });

            // Subscribe to status updates
            redditRealTimeClient.subscribe('status', (update) => {
                this.handleStatusUpdate(update);
            });

            // Subscribe to connection events
            redditRealTimeClient.subscribe('connection', (update) => {
                this.handleConnectionUpdate(update);
            });

            // Subscribe to timer expiration
            redditRealTimeClient.subscribe('timer_expired', (update) => {
                this.handleTimeUp();
            });

            console.log('✅ Reddit real-time updates initialized');
            this.showNotification('🔗 Connected to live updates', 'success');

        } catch (error) {
            console.error('❌ Failed to initialize Reddit real-time updates:', error);
            this.showNotification('❌ Failed to connect to live updates', 'error');
        }
    }

    /**
     * Handle timer updates from Reddit real-time system
     * Replaces the old setInterval-based timer with Reddit-synchronized updates
     */
    handleTimerUpdate(update) {
        if (update.data && typeof update.data.timeRemaining === 'number') {
            this.timeRemaining = Math.floor(update.data.timeRemaining);
            this.isTimerRunning = this.timeRemaining > 0;
            
            this.updateTimerDisplay();
            this.updateTimerProgress();
            
            // Warning states
            if (this.timeRemaining === 30) {
                this.showTimeWarning();
            }
        }
    }

    updateTimerDisplay() {
        const minutes = Math.floor(this.timeRemaining / 60);
        const seconds = this.timeRemaining % 60;
        
        const minutesEl = document.querySelector('.timer-minutes');
        const secondsEl = document.querySelector('.timer-seconds');
        
        if (minutesEl) minutesEl.textContent = minutes.toString();
        if (secondsEl) secondsEl.textContent = seconds.toString().padStart(2, '0');
    }

    updateTimerProgress() {
        const totalTime = 300; // 5 minutes total
        const progress = ((totalTime - this.timeRemaining) / totalTime) * 100;
        const progressEl = document.querySelector('.timer-progress');
        
        if (progressEl) {
            progressEl.style.setProperty('--progress', `${progress}%`);
            
            // Color changes based on time remaining
            if (this.timeRemaining <= 30) {
                progressEl.classList.add('critical');
            } else if (this.timeRemaining <= 60) {
                progressEl.classList.add('warning');
            }
        }
    }

    showTimeWarning() {
        const timerContainer = document.querySelector('.timer-container');
        if (timerContainer) {
            timerContainer.classList.add('warning');
            
            // Show notification
            this.showNotification('⚠️ 30 seconds remaining!', 'warning');
        }
    }

    handleTimeUp() {
        this.isTimerRunning = false;
        
        // Show transition overlay
        this.showQuestionTransition();
        
        // Auto-submit if user has uploaded image
        const previewEl = document.getElementById('imagePreview');
        if (previewEl && previewEl.style.display !== 'none') {
            this.autoSubmitResponse();
        }
        
        // Note: Next question loading is now handled by Reddit real-time updates
        // The server will post a new round which will trigger handleRoundStart()
    }

    /**
     * Handle round start updates from Reddit
     */
    handleRoundStart(update) {
        console.log('🎯 New round started:', update);
        
        if (update.data) {
            // Update question counter if round number is provided
            if (update.data.roundNumber) {
                this.currentQuestion = update.data.roundNumber;
                const counterEl = document.querySelector('.question-counter');
                if (counterEl) {
                    counterEl.textContent = `Question ${this.currentQuestion} of ${this.totalQuestions}`;
                }
            }

            // Update question content if prompt is provided
            if (update.data.prompt) {
                this.loadQuestionFromPrompt(update.data.prompt);
            }

            // Reset timer display
            if (update.data.timeRemaining) {
                this.timeRemaining = update.data.timeRemaining;
                this.isTimerRunning = true;
            }
        }

        // Hide transition overlay
        const overlay = document.getElementById('transitionOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }

        // Reset image upload
        this.resetImageUpload();
        
        this.showNotification('🎯 New question loaded!', 'success');
    }

    /**
     * Handle round end updates from Reddit
     */
    handleRoundEnd(update) {
        console.log('🏁 Round ended:', update);
        
        this.isTimerRunning = false;
        
        if (update.data && update.data.winner) {
            this.showNotification(`🏆 Round winner: ${update.data.winner.username}!`, 'success');
        }
        
        // Show transition overlay for next round
        this.showQuestionTransition();
    }

    /**
     * Handle new submission updates from Reddit
     */
    handleNewSubmission(update) {
        console.log('📸 New submission:', update);
        
        if (update.data) {
            // Add submission to live feed
            this.addSubmissionToFeed({
                username: update.data.playerId || 'Anonymous',
                comment: 'New submission received!',
                image: update.data.submissionUrl || 'https://via.placeholder.com/200x150',
                points: 150,
                avatar: `https://i.pravatar.cc/32?u=${update.data.playerId || 'default'}`
            });
            
            this.updateFeedCount();
        }
    }

    /**
     * Handle leaderboard updates from Reddit
     */
    handleLeaderboardUpdate(update) {
        console.log('🏆 Leaderboard updated:', update);
        
        if (update.data && update.data.entries) {
            this.updateLeaderboard(update.data.entries);
        }
    }

    /**
     * Handle status updates from Reddit
     */
    handleStatusUpdate(update) {
        console.log('📊 Status updated:', update);
        
        if (update.data) {
            // Update game status display
            this.updateGameStatus(update.data);
        }
    }

    /**
     * Handle connection updates
     */
    handleConnectionUpdate(update) {
        if (update.type === 'connected') {
            console.log('✅ Connected to Reddit real-time updates');
            this.showNotification('🔗 Connected to live updates', 'success');
        } else if (update.type === 'disconnected') {
            console.log('❌ Disconnected from Reddit real-time updates');
            this.showNotification('⚠️ Connection lost - reconnecting...', 'warning');
        }
    }

    showQuestionTransition() {
        const overlay = document.getElementById('transitionOverlay');
        if (overlay) {
            overlay.style.display = 'flex';
            
            // Animate progress bar
            setTimeout(() => {
                const progressFill = overlay.querySelector('.progress-fill');
                if (progressFill) {
                    progressFill.style.width = '100%';
                }
            }, 500);
        }
    }

    /**
     * Load question content from Reddit prompt
     * Replaces the old random question loading with Reddit-provided prompts
     */
    loadQuestionFromPrompt(prompt) {
        // Update question content with Reddit prompt
        const titleEl = document.querySelector('.question-title');
        const descEl = document.querySelector('.question-description');
        
        if (titleEl) titleEl.textContent = prompt;
        if (descEl) descEl.textContent = 'Submit your best photo matching this prompt!';

        // Clear any previous image upload
        this.resetImageUpload();
    }

    loadQuestionContent() {
        const questions = [
            {
                title: "Capture a building with interesting shadows or light patterns",
                description: "Look for architectural elements that create dramatic shadows or are enhanced by natural or artificial lighting.",
                requirements: ["Clear shadow/light patterns", "Architectural subject", "Good contrast and composition"]
            },
            {
                title: "Find an example of sustainable or green architecture",
                description: "Look for buildings that incorporate eco-friendly design elements like green roofs, solar panels, or natural ventilation.",
                requirements: ["Visible green/sustainable features", "Clear building structure", "Environmental context helpful"]
            }
        ];

        const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
        
        // Update question content
        const titleEl = document.querySelector('.question-title');
        const descEl = document.querySelector('.question-description');
        
        if (titleEl) titleEl.textContent = randomQuestion.title;
        if (descEl) descEl.textContent = randomQuestion.description;

        // Clear any previous image upload
        this.resetImageUpload();
    }

    // Image Upload Handling
    initializeImageUpload() {
        const fileInput = document.getElementById('imageInput');
        const uploadArea = document.getElementById('imageUpload');

        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleImageUpload(e));
        }

        if (uploadArea) {
            // Drag and drop functionality
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('drag-over');
            });

            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('drag-over');
            });

            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('drag-over');
                
                const files = e.dataTransfer.files;
                if (files.length > 0 && files[0].type.startsWith('image/')) {
                    this.processImageFile(files[0]);
                }
            });
        }

        // Submit button
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => this.submitResponse());
        }
    }

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            this.processImageFile(file);
        }
    }

    processImageFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const uploadArea = document.getElementById('imageUpload');
            const previewArea = document.getElementById('imagePreview');
            const previewImg = document.getElementById('previewImg');

            if (uploadArea && previewArea && previewImg) {
                uploadArea.style.display = 'none';
                previewImg.src = e.target.result;
                previewArea.style.display = 'block';
                
                // Enable submit button
                const submitBtn = document.getElementById('submitBtn');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.classList.remove('disabled');
                }
            }
        };
        reader.readAsDataURL(file);
    }

    resetImageUpload() {
        const uploadArea = document.getElementById('imageUpload');
        const previewArea = document.getElementById('imagePreview');
        const fileInput = document.getElementById('imageInput');
        const submitBtn = document.getElementById('submitBtn');
        const commentArea = document.querySelector('.submission-comment');

        if (uploadArea) uploadArea.style.display = 'block';
        if (previewArea) previewArea.style.display = 'none';
        if (fileInput) fileInput.value = '';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.classList.add('disabled');
        }
        if (commentArea) commentArea.value = '';
    }

    submitResponse() {
        const previewImg = document.getElementById('previewImg');
        const comment = document.querySelector('.submission-comment').value;

        if (!previewImg || !previewImg.src) {
            this.showNotification('❌ Please upload an image first!', 'error');
            return;
        }

        // Simulate submission
        this.showNotification('🚀 Response submitted successfully!', 'success');
        
        // Add to responses count
        this.addToLiveFeed({
            username: 'You',
            image: previewImg.src,
            comment: comment || 'Great find!',
            points: 150
        });

        // Reset form
        this.resetImageUpload();
        
        // Update user's score in mini leaderboard
        this.updateUserScore(150);
    }

    autoSubmitResponse() {
        const previewImg = document.getElementById('previewImg');
        if (previewImg && previewImg.src) {
            this.showNotification('⏰ Time up! Auto-submitting your response...', 'info');
            setTimeout(() => {
                this.submitResponse();
            }, 1500);
        }
    }

    // Live Feed Management
    initializeLiveFeed() {
        // Live feed is now populated by Reddit real-time updates
        // Remove the old setInterval simulation
        
        // Add click handlers for response actions
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('response-action')) {
                this.handleResponseAction(e.target);
            }
        });
    }

    /**
     * Add submission to live feed (called by Reddit real-time updates)
     */
    addSubmissionToFeed(submission) {
        this.addToLiveFeed(submission);
        this.updateFeedCount();
    }

    addToLiveFeed(response) {
        const feedContent = document.querySelector('.feed-content');
        if (!feedContent) return;

        const responseEl = document.createElement('div');
        responseEl.className = 'response-item new-response';
        responseEl.innerHTML = `
            <div class="response-header">
                <img src="${response.avatar || 'https://i.pravatar.cc/32?img=1'}" alt="User" class="response-avatar">
                <div class="response-info">
                    <span class="response-username">${response.username}</span>
                    <span class="response-time">now</span>
                </div>
                <div class="response-points">+${response.points}</div>
            </div>
            <div class="response-image">
                <img src="${response.image}" alt="Response" class="response-img">
            </div>
            <div class="response-comment">${response.comment}</div>
            <div class="response-actions">
                <button class="response-action">👍 ${Math.floor(Math.random() * 20)}</button>
                <button class="response-action">💬 ${Math.floor(Math.random() * 10)}</button>
            </div>
        `;

        // Add at the top
        feedContent.insertBefore(responseEl, feedContent.firstChild);

        // Animate in
        setTimeout(() => {
            responseEl.classList.remove('new-response');
        }, 100);

        // Remove old responses to keep feed manageable
        const responses = feedContent.querySelectorAll('.response-item');
        if (responses.length > 8) {
            responses[responses.length - 1].remove();
        }
    }

    updateFeedCount() {
        const countEl = document.querySelector('.feed-count');
        if (countEl) {
            const currentCount = parseInt(countEl.textContent.split(' ')[0]) + 1;
            countEl.textContent = `${currentCount} responses`;
        }
    }

    updateUserScore(points) {
        const userItem = document.querySelector('.leaderboard-item.current-user .points');
        if (userItem) {
            const currentPoints = parseInt(userItem.textContent) + points;
            userItem.textContent = currentPoints.toString();
            
            // Animate score increase
            userItem.parentElement.classList.add('score-increase');
            setTimeout(() => {
                userItem.parentElement.classList.remove('score-increase');
            }, 1000);
        }
    }

    animateResponseFeed() {
        // Add staggered animation to existing responses
        const responses = document.querySelectorAll('.response-item');
        responses.forEach((response, index) => {
            response.style.animationDelay = `${index * 0.1}s`;
            response.classList.add('fade-in');
        });
    }

    handleResponseAction(button) {
        // Handle like/comment actions
        const action = button.textContent.includes('👍') ? 'like' : 'comment';
        
        if (action === 'like') {
            const currentCount = parseInt(button.textContent.split(' ')[1]) + 1;
            button.textContent = `👍 ${currentCount}`;
            button.classList.add('liked');
        }
        
        // Add ripple effect
        button.classList.add('ripple');
        setTimeout(() => {
            button.classList.remove('ripple', 'liked');
        }, 500);
    }

    /**
     * Update leaderboard display with new data
     */
    updateLeaderboard(entries) {
        const leaderboardContainer = document.querySelector('.mini-leaderboard');
        if (!leaderboardContainer) return;

        // Clear existing entries
        const existingEntries = leaderboardContainer.querySelectorAll('.leaderboard-item:not(.current-user)');
        existingEntries.forEach(entry => entry.remove());

        // Add new entries
        entries.forEach((entry, index) => {
            if (index < 5) { // Show top 5
                const entryEl = document.createElement('div');
                entryEl.className = 'leaderboard-item';
                entryEl.innerHTML = `
                    <div class="rank">${entry.rank}</div>
                    <div class="username">${entry.username}</div>
                    <div class="points">${entry.score}</div>
                `;
                leaderboardContainer.appendChild(entryEl);
            }
        });
    }

    /**
     * Update game status display
     */
    updateGameStatus(statusData) {
        // Update various status indicators based on Reddit status updates
        if (statusData.status) {
            const statusEl = document.querySelector('.game-status');
            if (statusEl) {
                statusEl.textContent = statusData.status.toUpperCase();
            }
        }

        if (statusData.submissions !== undefined) {
            const submissionsEl = document.querySelector('.submissions-count');
            if (submissionsEl) {
                submissionsEl.textContent = `${statusData.submissions} submissions`;
            }
        }
    }

    /**
     * Cleanup when leaving the page
     */
    cleanup() {
        console.log('🧹 Cleaning up Reddit real-time connections');
        redditRealTimeClient.disconnect();
    }

    showGameComplete() {
        // Cleanup connections before navigating
        this.cleanup();
        
        // Navigate to results page or show completion modal
        this.showNotification('🎉 Game Complete! Calculating final results...', 'success');
        
        setTimeout(() => {
            window.location.href = 'event-details.html?completed=true';
        }, 3000);
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // Remove after delay
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 4000);
    }
}

// Global functions for HTML event handlers
window.removeImage = function() {
    const gameManager = window.eventGameManager;
    if (gameManager) {
        gameManager.resetImageUpload();
    }
};

window.changeImage = function() {
    const fileInput = document.getElementById('imageInput');
    if (fileInput) {
        fileInput.click();
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.eventGameManager = new EventGameManager();
});

// Cleanup when page unloads
window.addEventListener('beforeunload', () => {
    if (window.eventGameManager) {
        window.eventGameManager.cleanup();
    }
});

// Export for module use
export default EventGameManager;
