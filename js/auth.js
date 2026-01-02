// Authentication JavaScript
document.addEventListener('DOMContentLoaded', function() {
    initAuthPage();
});

function initAuthPage() {
    // Check if user is already logged in
    checkAuthStatus();
    
    // Initialize tabs
    initAuthTabs();
    
    // Initialize forms
    initLoginForm();
    initRegisterForm();
    
    // Initialize password toggle
    initPasswordToggle();
    
    // Initialize password strength
    initPasswordStrength();
    
    // Initialize Apple login button
    initAppleLogin();
    
    // Initialize logout button
    initLogout();
    
    // Initialize account navigation
    initAccountNav();
}

function checkAuthStatus() {
    const token = localStorage.getItem('pulse_token');
    const user = localStorage.getItem('pulse_user');
    
    if (token && user) {
        // User is logged in
        showAccountSection();
    } else {
        // User is not logged in
        showAuthForms();
    }
}

function showAccountSection() {
    document.getElementById('loginForm')?.classList.remove('active');
    document.getElementById('registerForm')?.classList.remove('active');
    document.querySelector('.auth-container')?.classList.add('hidden');
    document.querySelector('.auth-benefits')?.classList.add('hidden');
    document.getElementById('accountFeatures')?.classList.remove('hidden');
    
    // Load user data
    loadUserData();
}

function showAuthForms() {
    document.querySelector('.auth-container')?.classList.remove('hidden');
    document.querySelector('.auth-benefits')?.classList.remove('hidden');
    document.getElementById('accountFeatures')?.classList.add('hidden');
}

function loadUserData() {
    const userData = JSON.parse(localStorage.getItem('pulse_user') || '{}');
    
    // Update user info in account section
    document.getElementById('userName')?.textContent = userData.name || 'User';
    document.getElementById('userEmail')?.textContent = userData.email || 'user@example.com';
    document.getElementById('dashboardName')?.textContent = userData.name?.split(' ')[0] || 'User';
    
    // Load user avatar if available
    if (userData.avatar) {
        document.getElementById('userAvatar')?.setAttribute('src', userData.avatar);
    }
}

function initAuthTabs() {
    const tabs = document.querySelectorAll('.auth-tab');
    const forms = document.querySelectorAll('.auth-form');
    const switchToRegister = document.querySelector('.switch-to-register');
    const switchToLogin = document.querySelector('.switch-to-login');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            
            // Update tabs
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Update forms
            forms.forEach(form => {
                form.classList.remove('active');
                if (form.id === `${tabName}Form`) {
                    form.classList.add('active');
                }
            });
        });
    });
    
    // Switch to register from login footer
    if (switchToRegister) {
        switchToRegister.addEventListener('click', function(e) {
            e.preventDefault();
            document.querySelector('[data-tab="register"]').click();
        });
    }
    
    // Switch to login from register footer
    if (switchToLogin) {
        switchToLogin.addEventListener('click', function(e) {
            e.preventDefault();
            document.querySelector('[data-tab="login"]').click();
        });
    }
}

function initLoginForm() {
    const form = document.getElementById('emailLoginForm');
    if (!form) return;
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe').checked;
        
        // Simple validation
        if (!email || !password) {
            Pulse.showNotification('Please fill in all fields', 'error');
            return;
        }
        
        // Show loading
        const submitBtn = form.querySelector('.btn-auth-submit');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Signing in...';
        submitBtn.disabled = true;
        
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // For demo purposes, accept any email/password
            // In real app, this would be an API call
            const userData = {
                id: 1,
                name: email.split('@')[0],
                email: email,
                avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde'
            };
            
            // Store auth token and user data
            localStorage.setItem('pulse_token', 'demo_token_' + Date.now());
            localStorage.setItem('pulse_user', JSON.stringify(userData));
            
            if (rememberMe) {
                localStorage.setItem('pulse_remember', 'true');
            }
            
            Pulse.showNotification('Successfully signed in!', 'success');
            
            // Show account section
            setTimeout(() => {
                showAccountSection();
            }, 1000);
            
        } catch (error) {
            console.error('Login error:', error);
            Pulse.showNotification('Login failed. Please try again.', 'error');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
}

function initRegisterForm() {
    const form = document.getElementById('emailRegisterForm');
    if (!form) return;
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const firstName = document.getElementById('firstName').value;
        const lastName = document.getElementById('lastName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const termsAgreed = document.getElementById('termsAgreement').checked;
        const newsletterOptIn = document.getElementById('newsletterOptIn').checked;
        
        // Validation
        if (!firstName || !lastName || !email || !password || !confirmPassword) {
            Pulse.showNotification('Please fill in all required fields', 'error');
            return;
        }
        
        if (password !== confirmPassword) {
            Pulse.showNotification('Passwords do not match', 'error');
            return;
        }
        
        if (!termsAgreed) {
            Pulse.showNotification('Please agree to the Terms of Service', 'error');
            return;
        }
        
        if (password.length < 8) {
            Pulse.showNotification('Password must be at least 8 characters', 'error');
            return;
        }
        
        // Show loading
        const submitBtn = form.querySelector('.btn-auth-submit');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Creating account...';
        submitBtn.disabled = true;
        
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Create user data
            const userData = {
                id: Date.now(),
                name: `${firstName} ${lastName}`,
                email: email,
                avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde',
                joined: new Date().toISOString()
            };
            
            // Store auth token and user data
            localStorage.setItem('pulse_token', 'demo_token_' + Date.now());
            localStorage.setItem('pulse_user', JSON.stringify(userData));
            
            // Subscribe to newsletter if opted in
            if (newsletterOptIn) {
                localStorage.setItem('pulse_newsletter', 'true');
                PulseAPI.subscribeNewsletter(email);
            }
            
            Pulse.showNotification('Account created successfully!', 'success');
            
            // Show account section
            setTimeout(() => {
                showAccountSection();
            }, 1000);
            
        } catch (error) {
            console.error('Registration error:', error);
            Pulse.showNotification('Registration failed. Please try again.', 'error');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
}

function initPasswordToggle() {
    const toggleBtns = document.querySelectorAll('.toggle-password');
    
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const input = this.parentElement.querySelector('input');
            const icon = this.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.className = 'fas fa-eye-slash';
            } else {
                input.type = 'password';
                icon.className = 'fas fa-eye';
            }
        });
    });
}

function initPasswordStrength() {
    const passwordInput = document.getElementById('registerPassword');
    const strengthBar = document.querySelector('.strength-bar');
    const strengthValue = document.getElementById('strengthValue');
    
    if (!passwordInput || !strengthBar || !strengthValue) return;
    
    passwordInput.addEventListener('input', function() {
        const password = this.value;
        const strength = calculatePasswordStrength(password);
        
        // Update strength bar
        strengthBar.style.width = `${strength.percentage}%`;
        strengthBar.style.background = strength.color;
        
        // Update strength text
        strengthValue.textContent = strength.text;
        strengthValue.style.color = strength.color;
    });
}

function calculatePasswordStrength(password) {
    if (!password) {
        return { percentage: 0, color: '#e0e0e0', text: 'Weak' };
    }
    
    let score = 0;
    
    // Length check
    if (password.length >= 8) score += 25;
    if (password.length >= 12) score += 15;
    
    // Character variety
    if (/[a-z]/.test(password)) score += 10;
    if (/[A-Z]/.test(password)) score += 10;
    if (/[0-9]/.test(password)) score += 10;
    if (/[^a-zA-Z0-9]/.test(password)) score += 10;
    
    // Bonus for mixed case and numbers
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 10;
    if (/[0-9]/.test(password) && /[^a-zA-Z0-9]/.test(password)) score += 10;
    
    // Cap at 100
    score = Math.min(score, 100);
    
    // Determine strength level
    let color, text;
    if (score < 40) {
        color = '#f44336';
        text = 'Weak';
    } else if (score < 70) {
        color = '#FF9800';
        text = 'Fair';
    } else if (score < 90) {
        color = '#4CAF50';
        text = 'Good';
    } else {
        color = '#2E7D32';
        text = 'Strong';
    }
    
    return { percentage: score, color, text };
}

function initAppleLogin() {
    const appleBtns = document.querySelectorAll('.btn-apple-login');
    
    appleBtns.forEach(btn => {
        btn.addEventListener('click', async function() {
            Pulse.showNotification('Apple Sign In is currently unavailable in demo mode', 'info');
            
            // In real implementation, this would initiate Apple OAuth flow
            // For demo purposes, simulate successful login
            setTimeout(() => {
                const userData = {
                    id: 'apple_' + Date.now(),
                    name: 'Apple User',
                    email: 'user@apple.com',
                    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde',
                    apple_id: 'demo_apple_id'
                };
                
                localStorage.setItem('pulse_token', 'apple_token_' + Date.now());
                localStorage.setItem('pulse_user', JSON.stringify(userData));
                localStorage.setItem('pulse_apple_auth', 'true');
                
                Pulse.showNotification('Signed in with Apple', 'success');
                showAccountSection();
            }, 1000);
        });
    });
}

function initLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Clear auth data
            localStorage.removeItem('pulse_token');
            localStorage.removeItem('pulse_user');
            localStorage.removeItem('pulse_remember');
            
            Pulse.showNotification('Successfully signed out', 'success');
            
            // Show auth forms
            setTimeout(() => {
                showAuthForms();
                // Reset to login tab
                document.querySelector('[data-tab="login"]')?.click();
            }, 500);
        });
    }
}

function initAccountNav() {
    const navItems = document.querySelectorAll('.account-nav .nav-item:not(.logout)');
    const sections = document.querySelectorAll('.content-section');
    
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.dataset.section + 'Section';
            
            // Update nav items
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            
            // Show selected section
            sections.forEach(section => {
                section.classList.remove('active');
                if (section.id === sectionId) {
                    section.classList.add('active');
                }
            });
        });
    });
}

// Password reset functionality
document.querySelector('.forgot-password')?.addEventListener('click', function(e) {
    e.preventDefault();
    
    const modal = document.getElementById('resetModal');
    const form = document.getElementById('resetForm');
    const closeBtn = modal.querySelector('.modal-close');
    const modalCloseBtn = modal.querySelector('.btn-modal-close');
    
    // Show modal
    modal.classList.add('active');
    
    // Close modal
    const closeModal = () => {
        modal.classList.remove('active');
    };
    
    closeBtn.addEventListener('click', closeModal);
    modalCloseBtn?.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    
    // Handle form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const email = document.getElementById('resetEmail').value;
        
        if (!email) {
            Pulse.showNotification('Please enter your email', 'error');
            return;
        }
        
        Pulse.showNotification('Password reset link sent to ' + email, 'success');
        closeModal();
    });
});

// Edit profile functionality
document.querySelector('.btn-edit-profile')?.addEventListener('click', function() {
    Pulse.showNotification('Edit profile functionality coming soon', 'info');
});

// File upload for avatar
document.querySelector('.avatar-upload')?.addEventListener('click', function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                document.getElementById('userAvatar').src = e.target.result;
                Pulse.showNotification('Profile picture updated', 'success');
            };
            
            reader.readAsDataURL(this.files[0]);
        }
    });
    
    input.click();
});