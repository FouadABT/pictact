// Create Event Page JavaScript

class EventCreator {
    constructor() {
        this.initializeThemeSystem();
        this.initializeWYSIWYG();
        this.initializeTrophySelection();
        this.initializeFormHandlers();
        this.initializePreview();
        this.loadUserData();
    }

    // Initialize theme system (same as main page)
    initializeThemeSystem() {
        localStorage.removeItem('pictact-theme');
        
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', this.handleSystemThemeChange.bind(this));
        
        const themeIndicator = document.createElement('div');
        themeIndicator.className = 'theme-indicator';
        themeIndicator.setAttribute('title', 'Theme follows your Reddit app setting');
        
        this.updateThemeIndicator(themeIndicator);
        document.body.appendChild(themeIndicator);
    }

    handleSystemThemeChange(e) {
        const newTheme = e.matches ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        
        const indicator = document.querySelector('.theme-indicator');
        if (indicator) {
            this.updateThemeIndicator(indicator);
        }
        
        console.log(`Theme changed to: ${newTheme} (following system preference)`);
    }

    updateThemeIndicator(indicator) {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const isDark = currentTheme === 'dark';
        
        indicator.innerHTML = `
            <span class="theme-icon">${isDark ? '🌙' : '☀️'}</span>
            <span class="theme-text">${isDark ? 'Dark' : 'Light'}</span>
        `;
    }

    // Initialize WYSIWYG Editor
    initializeWYSIWYG() {
        const toolbar = document.querySelector('.wysiwyg-toolbar');
        const editor = document.getElementById('eventDescription');

        if (!toolbar || !editor) {
            console.error('WYSIWYG elements not found');
            return;
        }

        // Simple toolbar handlers
        toolbar.addEventListener('click', (e) => {
            e.preventDefault();
            
            const button = e.target.closest('.toolbar-btn');
            if (!button) return;
            
            const command = button.getAttribute('data-command');
            
            // Focus editor first
            editor.focus();
            
            try {
                if (command === 'createLink') {
                    const url = window.prompt('Enter URL:');
                    if (url && url.trim()) {
                        document.execCommand(command, false, url);
                    }
                } else {
                    document.execCommand(command, false, null);
                }
                
                this.updatePreview();
                
            } catch (error) {
                console.error('Error executing command:', command, error);
            }
        });

        // Simple content change handler
        editor.addEventListener('input', () => {
            this.updatePreview();
        });

        // Simple placeholder handling
        editor.addEventListener('focus', () => {
            if (editor.textContent.trim() === '') {
                editor.classList.add('focused');
            }
        });

        editor.addEventListener('blur', () => {
            if (editor.textContent.trim() === '') {
                editor.classList.remove('focused');
            }
        });

        console.log('WYSIWYG editor initialized');
    }



    // Initialize Trophy Selection
    initializeTrophySelection() {
        const trophyOptions = document.querySelectorAll('.trophy-option');
        const customUpload = document.getElementById('customTrophyUpload');
        const fileInput = document.getElementById('trophyFile');
        const previewArea = document.getElementById('trophyPreview');
        const trophyImage = document.getElementById('trophyImage');
        const removeButton = document.getElementById('removeTrophy');

        // Trophy option selection
        trophyOptions.forEach(option => {
            option.addEventListener('click', () => {
                // Remove active class from all options
                trophyOptions.forEach(opt => opt.classList.remove('active'));
                // Add active class to clicked option
                option.classList.add('active');
                
                const trophyType = option.getAttribute('data-trophy');
                
                if (trophyType === 'custom') {
                    customUpload.style.display = 'block';
                } else {
                    customUpload.style.display = 'none';
                    this.updateSelectedTrophy(trophyType, option.querySelector('.trophy-name').textContent);
                }
            });
        });

        // File input handler
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 2 * 1024 * 1024) { // 2MB limit
                    alert('File size must be less than 2MB');
                    return;
                }

                const reader = new FileReader();
                reader.onload = (e) => {
                    trophyImage.src = e.target.result;
                    previewArea.style.display = 'block';
                    this.updateSelectedTrophy('custom', 'Custom Trophy', e.target.result);
                };
                reader.readAsDataURL(file);
            }
        });

        // Remove custom trophy
        removeButton.addEventListener('click', () => {
            fileInput.value = '';
            previewArea.style.display = 'none';
            // Select default trophy
            trophyOptions[0].click();
        });
    }

    // Update selected trophy display
    updateSelectedTrophy(type, name, imageUrl = null) {
        const preview = document.getElementById('selectedTrophyPreview');
        const nameElement = document.getElementById('selectedTrophyName');
        
        nameElement.textContent = name;
        
        if (type === 'custom' && imageUrl) {
            preview.innerHTML = `<img src="${imageUrl}" alt="Custom Trophy" class="trophy-image">`;
        } else {
            // Map trophy types to emojis
            const trophyEmojis = {
                'default-gold': '🏆',
                'default-silver': '🥇',
                'default-crown': '👑',
                'default-star': '⭐',
                'default-diamond': '💎',
                'default-fire': '🔥'
            };
            
            const emoji = trophyEmojis[type] || '🏆';
            preview.innerHTML = `<div class="default-trophy">${emoji}</div>`;
        }
        
        this.updatePreview();
    }

    // Initialize form handlers
    initializeFormHandlers() {
        const form = document.getElementById('eventForm');
        const titleInput = document.getElementById('eventTitle');
        const charCounter = document.querySelector('.char-counter');

        // Add event listeners for buttons (replacing inline handlers)
        const backButton = document.getElementById('backButton');
        const cancelButton = document.getElementById('cancelButton');
        
        if (backButton) {
            backButton.addEventListener('click', () => {
                window.location.href = 'index.html';
            });
        }
        
        if (cancelButton) {
            cancelButton.addEventListener('click', () => {
                window.history.back();
            });
        }

        // Character counter
        titleInput.addEventListener('input', () => {
            const length = titleInput.value.length;
            charCounter.textContent = `${length}/80`;
            this.updatePreview();
        });

        // Form validation and submission
        form.addEventListener('submit', this.handleFormSubmit.bind(this));
        
        // Save as draft
        document.getElementById('saveAsDraft').addEventListener('click', this.saveAsDraft.bind(this));

        // Real-time preview updates
        const previewInputs = ['eventTitle', 'eventCategory', 'duration', 'maxParticipants', 'firstPlace'];
        previewInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('input', this.updatePreview.bind(this));
                input.addEventListener('change', this.updatePreview.bind(this));
            }
        });

        // Set minimum start time to current time
        const startTimeInput = document.getElementById('startTime');
        const now = new Date();
        now.setMinutes(now.getMinutes() + 30); // Minimum 30 minutes from now
        startTimeInput.min = now.toISOString().slice(0, 16);
    }

    // Initialize preview functionality
    initializePreview() {
        this.updatePreview();
    }

    // Update event preview
    updatePreview() {
        const title = document.getElementById('eventTitle').value || 'Your Event Title';
        const description = document.getElementById('eventDescription').textContent || 'Your event description will appear here...';
        const duration = document.getElementById('duration').value;
        const maxParticipants = document.getElementById('maxParticipants').value;
        const firstPlace = document.getElementById('firstPlace').value || '100';
        const selectedTrophy = document.querySelector('.selected-trophy-preview').innerHTML;

        // Update preview card
        document.querySelector('.preview-title').textContent = title;
        document.querySelector('.preview-description p').textContent = description;
        
        // Update stats
        const stats = document.querySelectorAll('.preview-stat .stat-value');
        stats[0].textContent = `${firstPlace} pts`;
        stats[1].textContent = duration ? `${duration} min` : '-- min';
        stats[2].textContent = maxParticipants ? `Max ${maxParticipants}` : 'Unlimited';
        
        // Update trophy
        document.querySelector('.preview-trophy-icon').innerHTML = selectedTrophy;
    }

    // Load user data
    async loadUserData() {
        try {
            const response = await fetch("/api/init");
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (data.type === "init") {
                document.querySelector('.preview-creator').textContent = `by @${data.username}`;
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
            document.querySelector('.preview-creator').textContent = 'by @YourUsername';
        }
    }

    // Handle form submission
    async handleFormSubmit(e) {
        e.preventDefault();
        
        const formData = this.collectFormData();
        
        if (!this.validateForm(formData)) {
            return;
        }

        try {
            // Show loading state
            const submitButton = e.target.querySelector('button[type="submit"]');
            const originalText = submitButton.innerHTML;
            submitButton.innerHTML = '⏳ Creating...';
            submitButton.disabled = true;

            // Simulate API call (replace with actual endpoint)
            await this.createEvent(formData);
            
            // Show success message
            this.showNotification('🎉 Event created successfully! Participants can now join your hunt.', 'success');
            
            // Redirect to main page after a short delay
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
            
        } catch (error) {
            console.error('Error creating event:', error);
            this.showNotification('❌ Error creating event. Please try again.', 'error');
            
            // Reset button
            const submitButton = e.target.querySelector('button[type="submit"]');
            submitButton.innerHTML = '🚀 Create Event';
            submitButton.disabled = false;
        }
    }

    // Collect form data
    collectFormData() {
        const form = document.getElementById('eventForm');
        const formData = new FormData(form);
        
        // Get WYSIWYG content
        const description = document.getElementById('eventDescription').innerHTML;
        
        // Get selected trophy
        const selectedTrophyOption = document.querySelector('.trophy-option.active');
        const trophyType = selectedTrophyOption.getAttribute('data-trophy');
        
        // Get bonuses
        const bonuses = Array.from(document.querySelectorAll('input[name="bonuses"]:checked'))
            .map(cb => cb.value);

        return {
            title: formData.get('eventTitle'),
            category: formData.get('eventCategory'),
            description: description,
            startTime: formData.get('startTime'),
            duration: parseInt(formData.get('duration')),
            maxParticipants: formData.get('maxParticipants') || null,
            difficulty: formData.get('difficulty'),
            points: {
                first: parseInt(formData.get('firstPlace')),
                second: parseInt(formData.get('secondPlace')),
                third: parseInt(formData.get('thirdPlace')),
                participation: parseInt(formData.get('participationPoints'))
            },
            bonuses: bonuses,
            trophy: {
                type: trophyType,
                customImage: trophyType === 'custom' ? document.getElementById('trophyImage').src : null
            }
        };
    }

    // Validate form
    validateForm(data) {
        if (!data.title.trim()) {
            this.showNotification('Please enter an event title', 'error');
            return false;
        }
        
        if (!data.category) {
            this.showNotification('Please select a category', 'error');
            return false;
        }
        
        if (!data.description.trim()) {
            this.showNotification('Please enter an event description', 'error');
            return false;
        }
        
        if (!data.startTime) {
            this.showNotification('Please select a start time', 'error');
            return false;
        }
        
        if (!data.duration) {
            this.showNotification('Please select event duration', 'error');
            return false;
        }
        
        if (!data.difficulty) {
            this.showNotification('Please select difficulty level', 'error');
            return false;
        }

        // Validate start time is in future
        const startTime = new Date(data.startTime);
        const now = new Date();
        if (startTime <= now) {
            this.showNotification('Start time must be in the future', 'error');
            return false;
        }

        return true;
    }

    // Show custom notification instead of alert
    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existing = document.querySelector('.custom-notification');
        if (existing) {
            existing.remove();
        }

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `custom-notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️'}</span>
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        // Add to page
        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    // Create event (API call)
    async createEvent(eventData) {
        try {
            const response = await fetch('/api/reddit/posts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    gameConfig: {
                        title: eventData.title,
                        description: eventData.description,
                        category: eventData.category,
                        startTime: eventData.startTime,
                        duration: eventData.duration,
                        maxParticipants: eventData.maxParticipants,
                        difficulty: eventData.difficulty,
                        pointSystem: eventData.points,
                        bonuses: eventData.bonuses,
                        trophy: eventData.trophy
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to create event');
            }

            const result = await response.json();
            console.log('Event created successfully:', result);
            
            return result;
        } catch (error) {
            console.error('Error creating event:', error);
            throw error;
        }
    }

    // Save as draft
    saveAsDraft() {
        const formData = this.collectFormData();
        
        // Save to localStorage
        localStorage.setItem('pictact-draft-event', JSON.stringify(formData));
        
        this.showNotification('💾 Event saved as draft!', 'success');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new EventCreator();
});

export default EventCreator;
