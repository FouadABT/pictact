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

        // Toolbar button handlers
        toolbar.addEventListener('click', (e) => {
            if (e.target.classList.contains('toolbar-btn')) {
                e.preventDefault();
                const command = e.target.getAttribute('data-command');
                
                if (command === 'createLink') {
                    const url = prompt('Enter URL:');
                    if (url) {
                        document.execCommand(command, false, url);
                    }
                } else {
                    document.execCommand(command, false, null);
                }
                
                editor.focus();
                this.updatePreview();
            }
        });

        // Editor content change handler
        editor.addEventListener('input', () => {
            this.updatePreview();
        });

        // Handle placeholder
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
            alert('🎉 Event created successfully! Participants can now join your hunt.');
            
            // Redirect to main page or event details
            window.location.href = 'index.html';
            
        } catch (error) {
            console.error('Error creating event:', error);
            alert('❌ Error creating event. Please try again.');
            
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
            alert('Please enter an event title');
            return false;
        }
        
        if (!data.category) {
            alert('Please select a category');
            return false;
        }
        
        if (!data.description.trim()) {
            alert('Please enter an event description');
            return false;
        }
        
        if (!data.startTime) {
            alert('Please select a start time');
            return false;
        }
        
        if (!data.duration) {
            alert('Please select event duration');
            return false;
        }
        
        if (!data.difficulty) {
            alert('Please select difficulty level');
            return false;
        }

        // Validate start time is in future
        const startTime = new Date(data.startTime);
        const now = new Date();
        if (startTime <= now) {
            alert('Start time must be in the future');
            return false;
        }

        return true;
    }

    // Create event (API call)
    async createEvent(eventData) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // TODO: Replace with actual API endpoint
        console.log('Creating event with data:', eventData);
        
        // For now, just store in localStorage for demo
        const events = JSON.parse(localStorage.getItem('pictact-events') || '[]');
        events.push({
            id: Date.now(),
            ...eventData,
            createdAt: new Date().toISOString(),
            status: 'upcoming'
        });
        localStorage.setItem('pictact-events', JSON.stringify(events));
    }

    // Save as draft
    saveAsDraft() {
        const formData = this.collectFormData();
        
        // Save to localStorage
        localStorage.setItem('pictact-draft-event', JSON.stringify(formData));
        
        alert('💾 Event saved as draft!');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new EventCreator();
});

export default EventCreator;
