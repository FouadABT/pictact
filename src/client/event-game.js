// Event Game Page JavaScript

class EventGameManager {
    constructor() {
        this.currentQuestion = 3;
        this.totalQuestions = 10;
        this.timeRemaining = 155; // 2:35 in seconds
        this.isTimerRunning = true;
        this.responses = [];
        
        this.initializeGame();
        this.startTimer();
        this.initializeImageUpload();
        this.initializeLiveFeed();
    }

    initializeGame() {
        console.log('🎮 Event Game initialized');
        this.updateTimerDisplay();
        this.animateResponseFeed();
    }

    // Timer Management
    startTimer() {
        this.timerInterval = setInterval(() => {
            if (this.isTimerRunning && this.timeRemaining > 0) {
                this.timeRemaining--;
                this.updateTimerDisplay();
                this.updateTimerProgress();
                
                // Warning states
                if (this.timeRemaining === 30) {
                    this.showTimeWarning();
                } else if (this.timeRemaining === 0) {
                    this.handleTimeUp();
                }
            }
        }, 1000);
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
        clearInterval(this.timerInterval);
        
        // Show transition overlay
        this.showQuestionTransition();
        
        // Auto-submit if user has uploaded image
        const previewEl = document.getElementById('imagePreview');
        if (previewEl && previewEl.style.display !== 'none') {
            this.autoSubmitResponse();
        }
        
        setTimeout(() => {
            this.loadNextQuestion();
        }, 3000);
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

    loadNextQuestion() {
        this.currentQuestion++;
        
        if (this.currentQuestion > this.totalQuestions) {
            this.showGameComplete();
            return;
        }

        // Reset for next question
        this.timeRemaining = 300; // 5 minutes for new question
        this.isTimerRunning = true;
        
        // Update question counter
        const counterEl = document.querySelector('.question-counter');
        if (counterEl) {
            counterEl.textContent = `Question ${this.currentQuestion} of ${this.totalQuestions}`;
        }

        // Hide transition overlay
        const overlay = document.getElementById('transitionOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }

        // Load new question content (simulate)
        this.loadQuestionContent();
        
        // Reset timer display
        this.updateTimerDisplay();
        this.startTimer();
        
        this.showNotification('🎯 New question loaded!', 'success');
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
        // Simulate new responses coming in
        setInterval(() => {
            if (Math.random() < 0.3) { // 30% chance every 5 seconds
                this.simulateNewResponse();
            }
        }, 5000);

        // Add click handlers for response actions
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('response-action')) {
                this.handleResponseAction(e.target);
            }
        });
    }

    simulateNewResponse() {
        const mockUsers = [
            '@StreetPhotog', '@ArchHunter', '@CityWalker', '@BuildingSpotter',
            '@UrbanSnap', '@PhotoExplorer', '@DesignHunter', '@CityscapeSeeker'
        ];

        const mockComments = [
            'Amazing detail on this facade!',
            'Perfect example of modern architecture',
            'Love the geometric patterns here',
            'Great lighting in this shot!',
            'Interesting architectural style',
            'Beautiful building design',
            'Creative composition!',
            'Excellent find!'
        ];

        const mockImages = [
            'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=200&h=150&fit=crop',
            'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=200&h=150&fit=crop',
            'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=200&h=150&fit=crop',
            'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=200&h=150&fit=crop'
        ];

        const newResponse = {
            username: mockUsers[Math.floor(Math.random() * mockUsers.length)],
            comment: mockComments[Math.floor(Math.random() * mockComments.length)],
            image: mockImages[Math.floor(Math.random() * mockImages.length)],
            points: 150,
            avatar: `https://i.pravatar.cc/32?img=${Math.floor(Math.random() * 20) + 1}`
        };

        this.addToLiveFeed(newResponse);
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

    showGameComplete() {
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

// Export for module use
export default EventGameManager;
