// Main JavaScript File

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the site
    initSite();
});

function initSite() {
    // Initialize mobile menu
    initMobileMenu();
    
    // Initialize liquid glass effect
    initLiquidGlass();
    
    // Initialize scroll animations
    initScrollAnimations();
    
    // Load featured bands from API
    loadFeaturedBands();
    
    // Initialize newsletter form
    initNewsletterForm();
    
    // Initialize cart functionality
    initCart();
}

function initMobileMenu() {
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const navMenu = document.querySelector('.nav-menu');
    
    if (menuBtn) {
        menuBtn.addEventListener('click', function() {
            navMenu.style.display = navMenu.style.display === 'flex' ? 'none' : 'flex';
            if (navMenu.style.display === 'flex') {
                navMenu.style.flexDirection = 'column';
                navMenu.style.position = 'absolute';
                navMenu.style.top = '100%';
                navMenu.style.left = '0';
                navMenu.style.right = '0';
                navMenu.style.background = 'rgba(255, 255, 255, 0.98)';
                navMenu.style.backdropFilter = 'blur(10px)';
                navMenu.style.padding = '2rem';
                navMenu.style.gap = '1.5rem';
                navMenu.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.1)';
            }
        });
        
        // Close menu on window resize
        window.addEventListener('resize', function() {
            if (window.innerWidth > 768) {
                navMenu.style.display = '';
            }
        });
    }
}

function initLiquidGlass() {
    // Create liquid glass background particles
    const liquidBg = document.querySelector('.liquid-glass-bg');
    if (liquidBg) {
        for (let i = 0; i < 15; i++) {
            const bubble = document.createElement('div');
            bubble.classList.add('liquid-bubble');
            
            // Random size and position
            const size = Math.random() * 100 + 50;
            bubble.style.width = `${size}px`;
            bubble.style.height = `${size}px`;
            bubble.style.left = `${Math.random() * 100}%`;
            bubble.style.top = `${Math.random() * 100}%`;
            
            // Random animation duration
            const duration = Math.random() * 30 + 20;
            bubble.style.animationDuration = `${duration}s`;
            
            // Random opacity
            bubble.style.opacity = Math.random() * 0.3 + 0.1;
            
            liquidBg.appendChild(bubble);
        }
    }
    
    // Initialize liquid demo
    const liquidDemo = document.getElementById('liquidDemo');
    if (liquidDemo) {
        createLiquidDemo(liquidDemo);
    }
}

function createLiquidDemo(container) {
    // Create a canvas for liquid glass demo
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    container.appendChild(canvas);
    
    // Set canvas dimensions
    function resizeCanvas() {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Liquid simulation variables
    const particles = [];
    const particleCount = 50;
    
    // Create particles
    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 20 + 5,
            speedX: (Math.random() - 0.5) * 0.5,
            speedY: (Math.random() - 0.5) * 0.5,
            opacity: Math.random() * 0.5 + 0.3
        });
    }
    
    // Animation function
    function animateLiquid() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Update and draw particles
        particles.forEach(particle => {
            // Update position
            particle.x += particle.speedX;
            particle.y += particle.speedY;
            
            // Bounce off edges
            if (particle.x < 0 || particle.x > canvas.width) particle.speedX *= -1;
            if (particle.y < 0 || particle.y > canvas.height) particle.speedY *= -1;
            
            // Draw particle
            const gradient = ctx.createRadialGradient(
                particle.x, particle.y, 0,
                particle.x, particle.y, particle.size
            );
            
            gradient.addColorStop(0, `rgba(255, 255, 255, ${particle.opacity})`);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
            
            // Draw connections between nearby particles
            particles.forEach(otherParticle => {
                const dx = particle.x - otherParticle.x;
                const dy = particle.y - otherParticle.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 100) {
                    ctx.beginPath();
                    ctx.moveTo(particle.x, particle.y);
                    ctx.lineTo(otherParticle.x, otherParticle.y);
                    ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 * (1 - distance/100)})`;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            });
        });
        
        requestAnimationFrame(animateLiquid);
    }
    
    animateLiquid();
}

function initScrollAnimations() {
    const revealElements = document.querySelectorAll('.scroll-reveal');
    
    const revealOnScroll = function() {
        revealElements.forEach(element => {
            const elementTop = element.getBoundingClientRect().top;
            const elementVisible = 150;
            
            if (elementTop < window.innerHeight - elementVisible) {
                element.classList.add('visible');
            }
        });
    };
    
    // Set initial state
    revealElements.forEach(element => {
        element.classList.remove('visible');
    });
    
    // Listen for scroll events
    window.addEventListener('scroll', revealOnScroll);
    
    // Initial check
    revealOnScroll();
}

function loadFeaturedBands() {
    const bandsContainer = document.getElementById('featured-bands');
    
    if (!bandsContainer) return;
    
    // In a real implementation, this would fetch from your API
    // For now, we'll use mock data
    const featuredBands = [
        {
            id: 1,
            name: "Nike Sport Loop",
            description: "Lightweight, breathable, and adjustable",
            price: "$49",
            image: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
            color: "Midnight Fog"
        },
        {
            id: 2,
            name: "Nike Sport Band",
            description: "Sweat-resistant and durable",
            price: "$49",
            image: "https://images.unsplash.com/photo-1558433916-90a36a0c5ba9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
            color: "Pure Platinum"
        },
        {
            id: 3,
            name: "Nike Heritage",
            description: "Classic design with modern materials",
            price: "$59",
            image: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
            color: "Black/Volt"
        }
    ];
    
    // Clear loading spinner
    bandsContainer.innerHTML = '';
    
    // Create band cards
    featuredBands.forEach(band => {
        const bandCard = createBandCard(band);
        bandsContainer.appendChild(bandCard);
    });
}

function createBandCard(band) {
    const card = document.createElement('div');
    card.className = 'band-card liquid-glass-effect fade-in-up';
    card.innerHTML = `
        <div class="band-image">
            <img src="${band.image}" alt="${band.name}">
            <div class="band-overlay">
                <button class="btn-primary quick-view" data-id="${band.id}">Quick View</button>
            </div>
        </div>
        <div class="band-info">
            <h3>${band.name}</h3>
            <p class="band-color">${band.color}</p>
            <p class="band-description">${band.description}</p>
            <div class="band-footer">
                <span class="band-price">${band.price}</span>
                <button class="btn-cart" data-id="${band.id}">
                    <i class="fas fa-shopping-bag"></i>
                </button>
            </div>
        </div>
    `;
    
    return card;
}

function initNewsletterForm() {
    const form = document.getElementById('newsletterForm');
    
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const emailInput = form.querySelector('input[type="email"]');
            const email = emailInput.value;
            
            // Simple validation
            if (!validateEmail(email)) {
                showNotification('Please enter a valid email address', 'error');
                return;
            }
            
            // In a real implementation, this would send to your API
            showNotification('Thank you for subscribing!', 'success');
            emailInput.value = '';
            
            // Simulate API call
            setTimeout(() => {
                console.log('Subscription saved for:', email);
            }, 1000);
        });
    }
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function showNotification(message, type) {
    // Remove existing notification
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Style notification
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.padding = '1rem 1.5rem';
    notification.style.borderRadius = '10px';
    notification.style.background = type === 'success' ? '#4CAF50' : '#f44336';
    notification.style.color = 'white';
    notification.style.zIndex = '9999';
    notification.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)';
    notification.style.animation = 'fadeInUp 0.3s ease';
    
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'fadeInUp 0.3s ease reverse';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

function initCart() {
    let cartCount = 0;
    const cartCountElement = document.querySelector('.cart-count');
    
    // Load cart from localStorage
    const savedCart = localStorage.getItem('pulseCart');
    if (savedCart) {
        const cart = JSON.parse(savedCart);
        cartCount = cart.length;
        updateCartCount(cartCount);
    }
    
    // Handle add to cart buttons
    document.addEventListener('click', function(e) {
        if (e.target.closest('.btn-cart')) {
            const button = e.target.closest('.btn-cart');
            const productId = button.getAttribute('data-id');
            
            addToCart(productId);
            showNotification('Added to cart', 'success');
        }
    });
    
    function addToCart(productId) {
        // Get existing cart
        let cart = JSON.parse(localStorage.getItem('pulseCart')) || [];
        
        // Add product to cart
        const existingItem = cart.find(item => item.id === productId);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({
                id: productId,
                quantity: 1,
                addedAt: new Date().toISOString()
            });
        }
        
        // Save to localStorage
        localStorage.setItem('pulseCart', JSON.stringify(cart));
        
        // Update cart count
        cartCount = cart.reduce((total, item) => total + item.quantity, 0);
        updateCartCount(cartCount);
    }
    
    function updateCartCount(count) {
        if (cartCountElement) {
            cartCountElement.textContent = count;
        }
    }
}

// Export functions for use in other files
window.Pulse = {
    initSite,
    showNotification,
    addToCart: function(productId) {
        // This would be connected to the actual cart functionality
        console.log('Add to cart:', productId);
    }
};