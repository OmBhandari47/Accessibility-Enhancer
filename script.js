/* ========================================
   AccessiRead - Accessibility Enhancement Tool
   JavaScript Functionality
======================================== */

// Critical fix for PDF to Reader - Guaranteed content
const GUARANTEED_CONTENT = "ACCESS READ SUCCESSFUL. This is the simulated document content for the voice reader. AccessiRead is now demonstrating the PDF to Audio functionality. The text-to-speech system is working correctly and can read any content reliably. This feature enhances accessibility by providing audio versions of documents for users with visual impairments or reading difficulties.";

// PDF Processing Variables
let currentPDFText = '';
let selectedFile = null;

// Global variables
let speechSynthesis = window.speechSynthesis;
let currentUtterance = null;
let voices = [];
let isVoicesLoaded = false;
let selectedVoice = null;
let speechRate = 1.0;

// Settings object to track all preferences
const settings = {
    fontSize: 16,
    dyslexicFont: false,
    lineSpacing: 1.0,
    paragraphHighlighting: false,
    darkMode: false,
    highContrast: false,
    lowContrast: false,
    monochrome: false,
    focusMode: false,
    selectedVoiceIndex: 0,
    speechRate: 1.0
};

/* ========================================
   Initialization
======================================== */

document.addEventListener('DOMContentLoaded', function() {
    console.log('AccessiRead: Initializing...');
    
    // Initialize PDF.js
    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        console.log('PDF.js initialized');
    }
    
    // Initialize all components
    initializeVoices();
    loadSettings();
    setupEventListeners();
    initializeControls();
    
    // Set up keyboard shortcuts
    setupKeyboardShortcuts();
    
    console.log('AccessiRead: Initialization complete');
    showStatusMessage('AccessiRead loaded successfully', 'success');
});

/* ========================================
   Voice Loading and TTS Setup
======================================== */

function initializeVoices() {
    console.log('Initializing voices...');
    
    // Function to load voices
    function loadVoices() {
        voices = speechSynthesis.getVoices();
        console.log('Voices loaded:', voices.length);
        
        if (voices.length > 0) {
            isVoicesLoaded = true;
            populateVoiceSelect();
            enablePDFButton();
            
            // Set default voice (prefer English voices)
            const englishVoice = voices.find(voice => 
                voice.lang.startsWith('en') && !voice.name.includes('Google')
            ) || voices[0];
            
            if (englishVoice) {
                selectedVoice = englishVoice;
                settings.selectedVoiceIndex = voices.indexOf(englishVoice);
                const voiceSelect = document.getElementById('voice-select');
                if (voiceSelect) {
                    voiceSelect.value = settings.selectedVoiceIndex;
                }
            }
            
            console.log('Default voice set:', selectedVoice?.name);
        }
    }
    
    // Load voices immediately if available
    loadVoices();
    
    // Also listen for voiceschanged event (some browsers need this)
    speechSynthesis.addEventListener('voiceschanged', loadVoices);
    
    // Fallback: Keep trying to load voices for up to 5 seconds
    const voiceCheckInterval = setInterval(() => {
        if (!isVoicesLoaded) {
            loadVoices();
        } else {
            clearInterval(voiceCheckInterval);
        }
    }, 100);
    
    setTimeout(() => {
        clearInterval(voiceCheckInterval);
        if (!isVoicesLoaded) {
            console.warn('Voices not loaded after timeout, enabling PDF button anyway');
            enablePDFButton();
        }
    }, 5000);
}

function populateVoiceSelect() {
    const voiceSelect = document.getElementById('voice-select');
    if (!voiceSelect) return;
    
    // Clear existing options
    voiceSelect.innerHTML = '';
    
    // Add voices to select
    voices.forEach((voice, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `${voice.name} (${voice.lang})`;
        voiceSelect.appendChild(option);
    });
    
    // Set selected voice
    voiceSelect.value = settings.selectedVoiceIndex;
}

function enablePDFButton() {
    const pdfButton = document.getElementById('read-pdf-btn');
    if (pdfButton) {
        pdfButton.disabled = false;
        pdfButton.classList.remove('disabled');
        pdfButton.querySelector('.btn-text').textContent = 'PDF to Audio - Ready';
        console.log('PDF button enabled');
    }
}

/* ========================================
   Event Listeners Setup
======================================== */

function setupEventListeners() {
    // Font size controls
    const fontSizeSlider = document.getElementById('font-size-slider');
    const fontDecrease = document.getElementById('font-decrease');
    const fontIncrease = document.getElementById('font-increase');
    
    if (fontSizeSlider) {
        fontSizeSlider.addEventListener('input', updateFontSize);
    }
    if (fontDecrease) {
        fontDecrease.addEventListener('click', () => adjustFontSize(-1));
    }
    if (fontIncrease) {
        fontIncrease.addEventListener('click', () => adjustFontSize(1));
    }
    
    // Line spacing controls
    const lineSpacingSlider = document.getElementById('line-spacing-slider');
    const spacingDecrease = document.getElementById('spacing-decrease');
    const spacingIncrease = document.getElementById('spacing-increase');
    
    if (lineSpacingSlider) {
        lineSpacingSlider.addEventListener('input', updateLineSpacing);
    }
    if (spacingDecrease) {
        spacingDecrease.addEventListener('click', () => adjustLineSpacing(-1));
    }
    if (spacingIncrease) {
        spacingIncrease.addEventListener('click', () => adjustLineSpacing(1));
    }
    
    // Speed controls
    const speedSlider = document.getElementById('speed-slider');
    const speedDecrease = document.getElementById('speed-decrease');
    const speedIncrease = document.getElementById('speed-increase');
    
    if (speedSlider) {
        speedSlider.addEventListener('input', updateSpeechRate);
    }
    if (speedDecrease) {
        speedDecrease.addEventListener('click', () => adjustSpeed(-1));
    }
    if (speedIncrease) {
        speedIncrease.addEventListener('click', () => adjustSpeed(1));
    }
    
    // Toggle controls
    const toggles = [
        'dyslexic-font',
        'paragraph-highlighting',
        'dark-mode',
        'high-contrast',
        'low-contrast',
        'monochrome',
        'focus-mode'
    ];
    
    toggles.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', handleToggleChange);
        }
    });
    
    // Voice selection
    const voiceSelect = document.getElementById('voice-select');
    if (voiceSelect) {
        voiceSelect.addEventListener('change', handleVoiceChange);
    }
    
    // TTS controls
    const readSelectedBtn = document.getElementById('read-selected');
    const stopReadingBtn = document.getElementById('stop-reading');
    const readPdfBtn = document.getElementById('read-pdf-btn');
    const demoPdfBtn = document.getElementById('demo-pdf-btn');
    const pdfUpload = document.getElementById('pdf-upload');
    
    if (readSelectedBtn) {
        readSelectedBtn.addEventListener('click', readSelectedText);
    }
    if (stopReadingBtn) {
        stopReadingBtn.addEventListener('click', stopReading);
    }
    if (readPdfBtn) {
        readPdfBtn.addEventListener('click', readExtractedPDFText);
    }
    if (demoPdfBtn) {
        demoPdfBtn.addEventListener('click', readDemoContent);
    }
    if (pdfUpload) {
        pdfUpload.addEventListener('change', handlePDFUpload);
    }
    
    // Reset button
    const resetBtn = document.getElementById('reset-settings');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetAllSettings);
    }
    
    // Sidebar collapse
    const collapseBtn = document.getElementById('collapse-sidebar');
    if (collapseBtn) {
        collapseBtn.addEventListener('click', toggleSidebar);
    }
    
    // Paragraph highlighting
    setupParagraphHighlighting();
}

function setupParagraphHighlighting() {
    const contentBlocks = document.querySelectorAll('.content-block');
    contentBlocks.forEach(block => {
        block.addEventListener('click', function() {
            if (settings.paragraphHighlighting) {
                // Remove highlight from other blocks
                contentBlocks.forEach(b => b.classList.remove('highlighted'));
                // Add highlight to clicked block
                this.classList.add('highlighted');
                showStatusMessage('Paragraph highlighted', 'info');
            }
        });
    });
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Escape key stops speech
        if (e.key === 'Escape') {
            stopReading();
        }
        
        // Ctrl/Cmd + combinations
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case 'd':
                    e.preventDefault();
                    toggleDarkMode();
                    break;
                case 'h':
                    e.preventDefault();
                    toggleHighContrast();
                    break;
                case 'r':
                    e.preventDefault();
                    resetAllSettings();
                    break;
            }
        }
    });
}

/* ========================================
   Settings Management
======================================== */

function loadSettings() {
    const savedSettings = localStorage.getItem('accessiread-settings');
    if (savedSettings) {
        try {
            const parsed = JSON.parse(savedSettings);
            Object.assign(settings, parsed);
            console.log('Settings loaded:', settings);
        } catch (e) {
            console.error('Error loading settings:', e);
        }
    }
    
    applyAllSettings();
}

function saveSettings() {
    localStorage.setItem('accessiread-settings', JSON.stringify(settings));
    console.log('Settings saved:', settings);
}

function applyAllSettings() {
    // Apply font size
    document.documentElement.style.setProperty('--font-size-base', settings.fontSize + 'px');
    const fontSizeSlider = document.getElementById('font-size-slider');
    const fontSizeValue = document.getElementById('font-size-value');
    if (fontSizeSlider) fontSizeSlider.value = settings.fontSize;
    if (fontSizeValue) fontSizeValue.textContent = settings.fontSize + 'px';
    
    // Apply line spacing
    document.documentElement.style.setProperty('--line-height-base', settings.lineSpacing);
    const lineSpacingSlider = document.getElementById('line-spacing-slider');
    const lineSpacingValue = document.getElementById('line-spacing-value');
    if (lineSpacingSlider) lineSpacingSlider.value = Math.round(settings.lineSpacing * 10);
    if (lineSpacingValue) lineSpacingValue.textContent = settings.lineSpacing.toFixed(1) + 'x';
    
    // Apply speech rate
    speechRate = settings.speechRate;
    const speedSlider = document.getElementById('speed-slider');
    const speedValue = document.getElementById('speed-value');
    if (speedSlider) speedSlider.value = Math.round(settings.speechRate * 10);
    if (speedValue) speedValue.textContent = settings.speechRate.toFixed(1) + 'x';
    
    // Apply toggles
    document.body.classList.toggle('dyslexic-font', settings.dyslexicFont);
    document.body.classList.toggle('dark-mode', settings.darkMode);
    document.body.classList.toggle('high-contrast', settings.highContrast);
    document.body.classList.toggle('low-contrast', settings.lowContrast);
    document.body.classList.toggle('monochrome', settings.monochrome);
    document.body.classList.toggle('focus-mode', settings.focusMode);
    
    // Update checkboxes
    const checkboxes = {
        'dyslexic-font': settings.dyslexicFont,
        'paragraph-highlighting': settings.paragraphHighlighting,
        'dark-mode': settings.darkMode,
        'high-contrast': settings.highContrast,
        'low-contrast': settings.lowContrast,
        'monochrome': settings.monochrome,
        'focus-mode': settings.focusMode
    };
    
    Object.entries(checkboxes).forEach(([id, checked]) => {
        const checkbox = document.getElementById(id);
        if (checkbox) checkbox.checked = checked;
    });
}

/* ========================================
   Visual Controls
======================================== */

function updateFontSize() {
    const slider = document.getElementById('font-size-slider');
    const value = document.getElementById('font-size-value');
    
    if (slider && value) {
        settings.fontSize = parseInt(slider.value);
        value.textContent = settings.fontSize + 'px';
        document.documentElement.style.setProperty('--font-size-base', settings.fontSize + 'px');
        saveSettings();
    }
}

function adjustFontSize(direction) {
    const slider = document.getElementById('font-size-slider');
    if (slider) {
        const newValue = parseInt(slider.value) + direction;
        if (newValue >= 12 && newValue <= 24) {
            slider.value = newValue;
            updateFontSize();
        }
    }
}

function updateLineSpacing() {
    const slider = document.getElementById('line-spacing-slider');
    const value = document.getElementById('line-spacing-value');
    
    if (slider && value) {
        settings.lineSpacing = parseInt(slider.value) / 10;
        value.textContent = settings.lineSpacing.toFixed(1) + 'x';
        document.documentElement.style.setProperty('--line-height-base', settings.lineSpacing);
        saveSettings();
    }
}

function adjustLineSpacing(direction) {
    const slider = document.getElementById('line-spacing-slider');
    if (slider) {
        const newValue = parseInt(slider.value) + direction;
        if (newValue >= 10 && newValue <= 20) {
            slider.value = newValue;
            updateLineSpacing();
        }
    }
}

function updateSpeechRate() {
    const slider = document.getElementById('speed-slider');
    const value = document.getElementById('speed-value');
    
    if (slider && value) {
        settings.speechRate = parseInt(slider.value) / 10;
        speechRate = settings.speechRate;
        value.textContent = settings.speechRate.toFixed(1) + 'x';
        saveSettings();
    }
}

function adjustSpeed(direction) {
    const slider = document.getElementById('speed-slider');
    if (slider) {
        const newValue = parseInt(slider.value) + direction;
        if (newValue >= 5 && newValue <= 20) {
            slider.value = newValue;
            updateSpeechRate();
        }
    }
}

/* ========================================
   Toggle Controls
======================================== */

function handleToggleChange(event) {
    const id = event.target.id;
    const isChecked = event.target.checked;
    
    switch(id) {
        case 'dyslexic-font':
            settings.dyslexicFont = isChecked;
            document.body.classList.toggle('dyslexic-font', isChecked);
            showStatusMessage(isChecked ? 'Dyslexic font enabled' : 'Dyslexic font disabled', 'info');
            break;
            
        case 'paragraph-highlighting':
            settings.paragraphHighlighting = isChecked;
            if (!isChecked) {
                // Remove all highlights
                document.querySelectorAll('.content-block').forEach(block => {
                    block.classList.remove('highlighted');
                });
            }
            showStatusMessage(isChecked ? 'Paragraph highlighting enabled' : 'Paragraph highlighting disabled', 'info');
            break;
            
        case 'dark-mode':
            settings.darkMode = isChecked;
            toggleTheme('dark-mode', isChecked);
            break;
            
        case 'high-contrast':
            settings.highContrast = isChecked;
            toggleTheme('high-contrast', isChecked);
            break;
            
        case 'low-contrast':
            settings.lowContrast = isChecked;
            toggleTheme('low-contrast', isChecked);
            break;
            
        case 'monochrome':
            settings.monochrome = isChecked;
            toggleTheme('monochrome', isChecked);
            break;
            
        case 'focus-mode':
            settings.focusMode = isChecked;
            document.body.classList.toggle('focus-mode', isChecked);
            showStatusMessage(isChecked ? 'Enhanced focus mode enabled' : 'Enhanced focus mode disabled', 'info');
            break;
    }
    
    saveSettings();
}

function toggleTheme(theme, isEnabled) {
    // Mutual exclusivity for contrast modes
    if (theme === 'high-contrast' && isEnabled) {
        settings.lowContrast = false;
        document.body.classList.remove('low-contrast');
        const lowContrastCheckbox = document.getElementById('low-contrast');
        if (lowContrastCheckbox) lowContrastCheckbox.checked = false;
    } else if (theme === 'low-contrast' && isEnabled) {
        settings.highContrast = false;
        document.body.classList.remove('high-contrast');
        const highContrastCheckbox = document.getElementById('high-contrast');
        if (highContrastCheckbox) highContrastCheckbox.checked = false;
    }
    
    document.body.classList.toggle(theme, isEnabled);
    
    const messages = {
        'dark-mode': isEnabled ? 'Dark mode enabled' : 'Dark mode disabled',
        'high-contrast': isEnabled ? 'High contrast enabled' : 'High contrast disabled',
        'low-contrast': isEnabled ? 'Low contrast enabled' : 'Low contrast disabled',
        'monochrome': isEnabled ? 'Monochrome filter enabled' : 'Monochrome filter disabled'
    };
    
    showStatusMessage(messages[theme], 'info');
}

function toggleDarkMode() {
    const checkbox = document.getElementById('dark-mode');
    if (checkbox) {
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change'));
    }
}

function toggleHighContrast() {
    const checkbox = document.getElementById('high-contrast');
    if (checkbox) {
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change'));
    }
}

/* ========================================
   Text-to-Speech Functions
======================================== */

function handleVoiceChange() {
    const voiceSelect = document.getElementById('voice-select');
    if (voiceSelect && voices.length > 0) {
        const selectedIndex = parseInt(voiceSelect.value);
        if (selectedIndex >= 0 && selectedIndex < voices.length) {
            selectedVoice = voices[selectedIndex];
            settings.selectedVoiceIndex = selectedIndex;
            saveSettings();
            showStatusMessage(`Voice changed to: ${selectedVoice.name}`, 'info');
        }
    }
}

function readSelectedText() {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (selectedText) {
        speakText(selectedText);
        showStatusMessage('Reading selected text', 'info');
    } else {
        showStatusMessage('Please select some text first', 'warning');
    }
}

async function handlePDFUpload(event) {
    const file = event.target.files[0];
    if (!file || file.type !== 'application/pdf') {
        showStatusMessage('Please select a valid PDF file', 'error');
        return;
    }

    selectedFile = file;
    showPDFStatus(file.name, 'Processing...');
    
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        
        let fullText = '';
        const totalPages = pdf.numPages;
        
        showStatusMessage(`Processing ${totalPages} pages...`, 'info');
        
        // Extract text from all pages
        for (let i = 1; i <= totalPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + ' ';
        }
        
        currentPDFText = fullText.trim();
        
        if (currentPDFText.length > 0) {
            showPDFStatus(file.name, `${totalPages} pages`, true);
            enablePDFReader();
            showStatusMessage(`PDF processed successfully - ${currentPDFText.length} characters extracted`, 'success');
        } else {
            showStatusMessage('No readable text found in PDF', 'warning');
            showPDFStatus(file.name, 'No text content', false);
        }
        
    } catch (error) {
        console.error('PDF processing error:', error);
        showStatusMessage('Error processing PDF file', 'error');
        showPDFStatus(file.name, 'Processing failed', false);
    }
}

function showPDFStatus(filename, pages, success = null) {
    const statusDiv = document.getElementById('pdf-status');
    const filenameSpan = document.getElementById('pdf-filename');
    const pagesSpan = document.getElementById('pdf-pages');
    
    if (statusDiv && filenameSpan && pagesSpan) {
        statusDiv.style.display = 'block';
        filenameSpan.textContent = filename;
        pagesSpan.textContent = pages;
        
        if (success === true) {
            statusDiv.style.borderColor = 'var(--success-color)';
            statusDiv.style.backgroundColor = '#f0fdf4';
        } else if (success === false) {
            statusDiv.style.borderColor = 'var(--error-color)';
            statusDiv.style.backgroundColor = '#fef2f2';
        }
    }
}

function enablePDFReader() {
    const pdfButton = document.getElementById('read-pdf-btn');
    if (pdfButton) {
        pdfButton.disabled = false;
        pdfButton.classList.remove('disabled');
        pdfButton.querySelector('.btn-text').textContent = 'Read PDF Content';
    }
}

function readExtractedPDFText() {
    console.log('PDF to Audio button clicked');
    
    if (currentPDFText && currentPDFText.trim().length > 0) {
        const pdfButton = document.getElementById('read-pdf-btn');
        if (pdfButton) {
            pdfButton.classList.add('loading');
        }
        
        // Small delay to show loading state
        setTimeout(() => {
            // Limit text length for reasonable reading time (first 2000 characters)
            const textToRead = currentPDFText.length > 2000 
                ? currentPDFText.substring(0, 2000) + "... PDF content continues beyond this point."
                : currentPDFText;
                
            speakText(textToRead);
            showStatusMessage('Reading PDF content', 'success');
            
            if (pdfButton) {
                pdfButton.classList.remove('loading');
            }
        }, 300);
    } else {
        showStatusMessage('Please upload a PDF file first', 'warning');
    }
}

function readDemoContent() {
    console.log('Demo PDF button clicked');
    
    const demoButton = document.getElementById('demo-pdf-btn');
    if (demoButton) {
        demoButton.classList.add('loading');
    }
    
    setTimeout(() => {
        speakText(GUARANTEED_CONTENT);
        showStatusMessage('Reading demo content', 'success');
        
        if (demoButton) {
            demoButton.classList.remove('loading');
        }
    }, 300);
}

function speakText(text) {
    // Stop any current speech
    stopReading();
    
    if (!text || text.trim() === '') {
        showStatusMessage('No text to read', 'warning');
        return;
    }
    
    try {
        currentUtterance = new SpeechSynthesisUtterance(text);
        
        // Set voice if available
        if (selectedVoice) {
            currentUtterance.voice = selectedVoice;
        }
        
        // Set speech parameters
        currentUtterance.rate = speechRate;
        currentUtterance.pitch = 1;
        currentUtterance.volume = 1;
        
        // Event handlers
        currentUtterance.onstart = function() {
            console.log('Speech started');
            showStatusMessage('Speech started', 'info');
        };
        
        currentUtterance.onend = function() {
            console.log('Speech ended');
            currentUtterance = null;
            showStatusMessage('Speech completed', 'success');
        };
        
        currentUtterance.onerror = function(event) {
            console.error('Speech error:', event.error);
            currentUtterance = null;
            showStatusMessage('Speech error: ' + event.error, 'error');
        };
        
        // Start speaking
        speechSynthesis.speak(currentUtterance);
        console.log('Started speaking:', text.substring(0, 50) + '...');
        
    } catch (error) {
        console.error('Error in speakText:', error);
        showStatusMessage('Error starting speech: ' + error.message, 'error');
    }
}

function stopReading() {
    if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
        currentUtterance = null;
        console.log('Speech stopped');
        showStatusMessage('Speech stopped', 'info');
    }
}

/* ========================================
   Utility Functions
======================================== */

function resetAllSettings() {
    if (confirm('Are you sure you want to reset all settings to default values?')) {
        // Reset settings object
        Object.assign(settings, {
            fontSize: 16,
            dyslexicFont: false,
            lineSpacing: 1.0,
            paragraphHighlighting: false,
            darkMode: false,
            highContrast: false,
            lowContrast: false,
            monochrome: false,
            focusMode: false,
            selectedVoiceIndex: 0,
            speechRate: 1.0
        });
        
        // Remove all body classes
        document.body.className = '';
        
        // Reset CSS custom properties
        document.documentElement.style.removeProperty('--font-size-base');
        document.documentElement.style.removeProperty('--line-height-base');
        
        // Remove all highlights
        document.querySelectorAll('.content-block').forEach(block => {
            block.classList.remove('highlighted');
        });
        
        // Apply default settings
        applyAllSettings();
        
        // Save to localStorage
        saveSettings();
        
        showStatusMessage('All settings reset to default', 'success');
        console.log('Settings reset');
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('controls');
    const collapseBtn = document.getElementById('collapse-sidebar');
    
    if (sidebar && collapseBtn) {
        sidebar.classList.toggle('collapsed');
        const icon = collapseBtn.querySelector('i');
        
        if (sidebar.classList.contains('collapsed')) {
            icon.className = 'fas fa-chevron-right';
            collapseBtn.setAttribute('aria-label', 'Expand sidebar');
            collapseBtn.setAttribute('title', 'Expand Controls');
        } else {
            icon.className = 'fas fa-chevron-left';
            collapseBtn.setAttribute('aria-label', 'Collapse sidebar');
            collapseBtn.setAttribute('title', 'Collapse Controls');
        }
    }
}

function initializeControls() {
    // Update all display values
    updateFontSize();
    updateLineSpacing();
    updateSpeechRate();
}

function showStatusMessage(message, type = 'info') {
    const statusContainer = document.getElementById('status-messages');
    if (!statusContainer) return;
    
    const messageElement = document.createElement('div');
    messageElement.className = `status-message ${type}`;
    messageElement.textContent = message;
    messageElement.setAttribute('role', 'alert');
    
    statusContainer.appendChild(messageElement);
    
    // Remove message after 5 seconds
    setTimeout(() => {
        if (messageElement.parentNode) {
            messageElement.remove();
        }
    }, 5000);
    
    console.log(`Status [${type}]:`, message);
}

/* ========================================
   Browser Compatibility Checks
======================================== */

// Check for Speech Synthesis support
if (!('speechSynthesis' in window)) {
    console.warn('Speech Synthesis not supported');
    showStatusMessage('Text-to-speech not supported in this browser', 'warning');
    
    // Disable TTS controls
    const ttsButtons = document.querySelectorAll('.tts-btn, .pdf-btn');
    ttsButtons.forEach(button => {
        button.disabled = true;
        button.classList.add('disabled');
    });
}

// Check for localStorage support
if (!('localStorage' in window)) {
    console.warn('localStorage not supported');
    showStatusMessage('Settings cannot be saved in this browser', 'warning');
}

/* ========================================
   Error Handling
======================================== */

window.addEventListener('error', function(event) {
    console.error('Global error:', event.error);
    showStatusMessage('An error occurred. Some features may not work properly.', 'error');
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    showStatusMessage('An error occurred with speech functionality.', 'error');
});

/* ========================================
   Export for testing (optional)
======================================== */

// Make functions available globally for testing
window.AccessiRead = {
    settings,
    readExtractedPDFText,
    speakText,
    stopReading,
    resetAllSettings,
    showStatusMessage,
    GUARANTEED_CONTENT
};

console.log('AccessiRead script loaded successfully');