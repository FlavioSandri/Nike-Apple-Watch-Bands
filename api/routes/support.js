// Support Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    initSupportPage();
});

function initSupportPage() {
    // Initialize contact form
    initContactForm();
    
    // Initialize FAQ
    initFAQ();
    
    // Initialize live chat
    initLiveChat();
    
    // Initialize search
    initSearch();
    
    // Initialize help cards
    initHelpCards();
}

function initContactForm() {
    const form = document.getElementById('supportContactForm');
    if (!form) return;
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const name = document.getElementById('contactName').value;
        const email = document.getElementById('contactEmail').value;
        const subject = document.getElementById('contactSubject').value;
        const orderNumber = document.getElementById('contactOrder').value;
        const message = document.getElementById('contactMessage').value;
        const agreement = document.getElementById('contactAgreement').checked;
        
        // Validation
        if (!name || !email || !subject || !message) {
            Pulse.showNotification('Please fill in all required fields', 'error');
            return;
        }
        
        if (!agreement) {
            Pulse.showNotification('Please agree to the privacy policy', 'error');
            return;
        }
        
        if (!validateEmail(email)) {
            Pulse.showNotification('Please enter a valid email address', 'error');
            return;
        }
        
        // Show loading
        const submitBtn = form.querySelector('.btn-submit-message');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Sending...';
        submitBtn.disabled = true;
        
        try {
            // Prepare form data
            const formData = {
                name,
                email,
                subject,
                orderNumber: orderNumber || null,
                message,
                timestamp: new Date().toISOString()
            };
            
            // Send to API
            const response = await PulseAPI.sendContactForm(formData);
            
            if (response.success) {
                // Show success modal
                showSuccessModal();
                
                // Reset form
                form.reset();
            } else {
                throw new Error(response.message || 'Failed to send message');
            }
            
        } catch (error) {
            console.error('Contact form error:', error);
            Pulse.showNotification('Failed to send message. Please try again.', 'error');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function showSuccessModal() {
    const modal = document.getElementById('successModal');
    const closeBtn = modal.querySelector('.modal-close');
    const okBtn = modal.querySelector('.btn-modal-close');
    
    // Show modal
    modal.classList.add('active');
    
    // Close modal functions
    const closeModal = () => {
        modal.classList.remove('active');
    };
    
    closeBtn.addEventListener('click', closeModal);
    okBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
}

function initFAQ() {
    const faqQuestions = document.querySelectorAll('.faq-question');
    
    faqQuestions.forEach(question => {
        question.addEventListener('click', function() {
            const answer = this.nextElementSibling;
            const icon = this.querySelector('i');
            
            // Toggle answer
            answer.classList.toggle('active');
            
            // Rotate icon
            icon.style.transform = answer.classList.contains('active') ? 'rotate(180deg)' : 'rotate(0deg)';
            
            // Close other answers in the same category
            const category = this.closest('.faq-category');
            if (category) {
                const otherQuestions = category.querySelectorAll('.faq-question');
                otherQuestions.forEach(otherQuestion => {
                    if (otherQuestion !== this) {
                        const otherAnswer = otherQuestion.nextElementSibling;
                        const otherIcon = otherQuestion.querySelector('i');
                        otherAnswer.classList.remove('active');
                        otherIcon.style.transform = 'rotate(0deg)';
                    }
                });
            }
        });
    });
}

function initLiveChat() {
    const chatTrigger = document.getElementById('chatTrigger');
    const startChatBtn = document.getElementById('startChatBtn');
    const chatWidget = document.getElementById('chatWidget');
    const chatClose = document.querySelector('.chat-close');
    const chatInput = document.getElementById('chatInput');
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    const chatMessages = document.getElementById('chatMessages');
    
    if (!chatTrigger || !chatWidget) return;
    
    // Toggle chat widget
    const toggleChat = () => {
        chatWidget.classList.toggle('active');
    };
    
    // Open chat from trigger button
    chatTrigger.addEventListener('click', toggleChat);
    
    // Open chat from "Start Chat" button
    if (startChatBtn) {
        startChatBtn.addEventListener('click', toggleChat);
    }
    
    // Close chat
    if (chatClose) {
        chatClose.addEventListener('click', toggleChat);
    }
    
    // Send message
    const sendMessage = () => {
        const message = chatInput.value.trim();
        if (!message) return;
        
        // Add user message
        addMessage(message, 'user');
        
        // Clear input
        chatInput.value = '';
        
        // Simulate agent response
        setTimeout(() => {
            const responses = [
                "Thanks for your message! How can I assist you today?",
                "I understand. Let me check that for you.",
                "Can you provide more details about your issue?",
                "I'll look into that right away.",
                "Is there anything specific about your order you'd like to know?",
                "I can help you with band compatibility questions.",
                "Let me check our inventory for you.",
                "Thanks for your patience. I'm finding the information you need."
            ];
            
            const randomResponse = responses[Math.floor(Math.random() * responses.length)];
            addMessage(randomResponse, 'agent');
        }, 1000);
    };
    
    // Send on button click
    if (sendMessageBtn) {
        sendMessageBtn.addEventListener('click', sendMessage);
    }
    
    // Send on Enter key
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }
    
    // Add initial welcome message
    setTimeout(() => {
        addMessage("Hello! I'm Alex from Pulse support. How can I help you today?", 'agent');
    }, 500);
}

function addMessage(text, sender) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageDiv.innerHTML = `
        <div class="message-content">
            <p>${text}</p>
            <span class="message-time">${time}</span>
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function initSearch() {
    const searchInput = document.querySelector('.search-input');
    const searchBtn = document.querySelector('.search-btn');
    
    if (!searchInput || !searchBtn) return;
    
    const performSearch = () => {
        const query = searchInput.value.trim();
        if (!query) return;
        
        Pulse.showNotification(`Searching for: "${query}"`, 'info');
        
        // In real implementation, this would search the FAQ/knowledge base
        // For demo, simulate search results
        setTimeout(() => {
            const faqItems = document.querySelectorAll('.faq-item');
            let foundAny = false;
            
            faqItems.forEach(item => {
                const question = item.querySelector('.faq-question').textContent;
                const answer = item.querySelector('.faq-answer').textContent;
                const text = (question + answer).toLowerCase();
                
                if (text.includes(query.toLowerCase())) {
                    item.style.display = 'block';
                    foundAny = true;
                    
                    // Expand to show answer
                    const answerEl = item.querySelector('.faq-answer');
                    const icon = item.querySelector('.faq-question i');
                    answerEl.classList.add('active');
                    icon.style.transform = 'rotate(180deg)';
                } else {
                    item.style.display = 'none';
                }
            });
            
            if (!foundAny) {
                Pulse.showNotification(`No results found for "${query}"`, 'info');
            } else {
                Pulse.showNotification(`Found ${document.querySelectorAll('.faq-item[style="display: block"]').length} results`, 'success');
            }
        }, 500);
    };
    
    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
}

function initHelpCards() {
    const helpCards = document.querySelectorAll('.help-card');
    
    helpCards.forEach(card => {
        card.addEventListener('click', function(e) {
            e.preventDefault();
            const target = this.getAttribute('href').substring(1);
            
            // Scroll to section
            const section = document.getElementById(target);
            if (section) {
                section.scrollIntoView({ behavior: 'smooth' });
                
                // If it's an FAQ section, expand first question
                if (target === 'faq') {
                    const firstQuestion = section.querySelector('.faq-question');
                    if (firstQuestion) {
                        firstQuestion.click();
                    }
                }
            }
        });
    });
}

// Phone number click
document.querySelector('a[href^="tel:"]')?.addEventListener('click', function(e) {
    e.preventDefault();
    Pulse.showNotification('Calling support: 1-800-555-1234', 'info');
    
    // In real implementation, this would actually call
    // For demo, just show notification
});

// Email click
document.querySelector('a[href^="mailto:"]')?.addEventListener('click', function(e) {
    e.preventDefault();
    const email = this.getAttribute('href').replace('mailto:', '');
    Pulse.showNotification(`Opening email to: ${email}`, 'info');
    
    // In real implementation, this would open default email client
    // For demo, copy to clipboard
    navigator.clipboard.writeText(email).then(() => {
        Pulse.showNotification('Email address copied to clipboard', 'success');
    });
});