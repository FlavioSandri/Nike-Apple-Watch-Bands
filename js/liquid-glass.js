// Liquid Glass Effects JavaScript
class LiquidGlass {
    constructor() {
        this.containers = [];
        this.init();
    }

    init() {
        this.createBackgroundEffects();
        this.attachHoverEffects();
        this.createFloatingParticles();
    }

    createBackgroundEffects() {
        const bgContainer = document.querySelector('.liquid-glass-bg');
        if (!bgContainer) return;

        // Create multiple layers of liquid effects
        for (let i = 0; i < 20; i++) {
            const bubble = document.createElement('div');
            bubble.className = 'liquid-particle';
            
            // Random properties
            const size = Math.random() * 100 + 50;
            const x = Math.random() * 100;
            const y = Math.random() * 100;
            const duration = Math.random() * 30 + 20;
            const delay = Math.random() * 5;
            const opacity = Math.random() * 0.2 + 0.1;
            
            // Apply styles
            bubble.style.width = `${size}px`;
            bubble.style.height = `${size}px`;
            bubble.style.left = `${x}%`;
            bubble.style.top = `${y}%`;
            bubble.style.animationDuration = `${duration}s`;
            bubble.style.animationDelay = `${delay}s`;
            bubble.style.opacity = opacity;
            
            // Random gradient
            const hue = Math.random() * 60 + 180; // Blue-purple range
            bubble.style.background = `radial-gradient(circle at 30% 30%, 
                hsla(${hue}, 70%, 70%, ${opacity * 2}), 
                hsla(${hue + 20}, 60%, 60%, ${opacity}), 
                transparent 70%)`;
            
            bgContainer.appendChild(bubble);
            this.containers.push(bubble);
        }
    }

    attachHoverEffects() {
        // Add liquid glass effect to specific elements
        const elements = document.querySelectorAll('.liquid-glass-effect, .liquid-card');
        
        elements.forEach(element => {
            element.addEventListener('mouseenter', this.handleMouseEnter.bind(this));
            element.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
        });

        // Add to buttons
        const buttons = document.querySelectorAll('.btn-liquid, .btn-primary');
        buttons.forEach(button => {
            button.classList.add('btn-liquid');
        });
    }

    handleMouseEnter(e) {
        const element = e.currentTarget;
        this.createRippleEffect(element, e);
        
        // Add shine effect
        const shine = document.createElement('div');
        shine.className = 'liquid-shine';
        shine.style.position = 'absolute';
        shine.style.top = '0';
        shine.style.left = '-100%';
        shine.style.width = '100%';
        shine.style.height = '100%';
        shine.style.background = 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)';
        shine.style.transition = 'left 0.7s ease';
        
        element.appendChild(shine);
        
        // Trigger shine animation
        setTimeout(() => {
            shine.style.left = '100%';
        }, 10);

        // Remove shine after animation
        setTimeout(() => {
            if (shine.parentNode === element) {
                element.removeChild(shine);
            }
        }, 800);
    }

    handleMouseLeave(e) {
        const element = e.currentTarget;
        
        // Remove any remaining shine effects
        const shines = element.querySelectorAll('.liquid-shine');
        shines.forEach(shine => {
            if (shine.parentNode === element) {
                element.removeChild(shine);
            }
        });
    }

    createRippleEffect(element, event) {
        const rect = element.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const ripple = document.createElement('div');
        ripple.className = 'liquid-ripple';
        ripple.style.position = 'absolute';
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;
        ripple.style.width = '0';
        ripple.style.height = '0';
        ripple.style.borderRadius = '50%';
        ripple.style.background = 'radial-gradient(circle, rgba(255,255,255,0.3), transparent)';
        ripple.style.transform = 'translate(-50%, -50%)';
        ripple.style.animation = 'ripple 0.6s linear';
        
        element.appendChild(ripple);
        
        // Remove ripple after animation
        setTimeout(() => {
            if (ripple.parentNode === element) {
                element.removeChild(ripple);
            }
        }, 600);
    }

    createFloatingParticles() {
        const demoContainer = document.getElementById('liquidDemo');
        if (!demoContainer) return;

        // Clear container
        demoContainer.innerHTML = '';

        // Create canvas for interactive demo
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        demoContainer.appendChild(canvas);
        
        // Set canvas size
        const resizeCanvas = () => {
            canvas.width = demoContainer.clientWidth;
            canvas.height = demoContainer.clientHeight;
        };
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        
        // Particle system
        const particles = [];
        const particleCount = 30;
        
        // Create particles
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 15 + 5,
                speedX: (Math.random() - 0.5) * 0.8,
                speedY: (Math.random() - 0.5) * 0.8,
                opacity: Math.random() * 0.4 + 0.2,
                color: `hsla(${Math.random() * 60 + 180}, 70%, 70%, `
            });
        }
        
        // Animation loop
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Update and draw particles
            particles.forEach(particle => {
                // Update position
                particle.x += particle.speedX;
                particle.y += particle.speedY;
                
                // Bounce off edges
                if (particle.x < 0 || particle.x > canvas.width) particle.speedX *= -1;
                if (particle.y < 0 || particle.y > canvas.height) particle.speedY *= -1;
                
                // Draw particle with gradient
                const gradient = ctx.createRadialGradient(
                    particle.x, particle.y, 0,
                    particle.x, particle.y, particle.size
                );
                
                gradient.addColorStop(0, `${particle.color}${particle.opacity})`);
                gradient.addColorStop(1, `${particle.color}0)`);
                
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fillStyle = gradient;
                ctx.fill();
                
                // Draw connections
                particles.forEach(otherParticle => {
                    const dx = particle.x - otherParticle.x;
                    const dy = particle.y - otherParticle.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < 80) {
                        ctx.beginPath();
                        ctx.moveTo(particle.x, particle.y);
                        ctx.lineTo(otherParticle.x, otherParticle.y);
                        ctx.strokeStyle = `${particle.color}${0.1 * (1 - distance/80)})`;
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                });
            });
            
            // Draw central glowing orb
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const time = Date.now() * 0.001;
            const pulseSize = 30 + Math.sin(time) * 10;
            
            const centerGradient = ctx.createRadialGradient(
                centerX, centerY, 0,
                centerX, centerY, pulseSize
            );
            
            centerGradient.addColorStop(0, 'hsla(220, 100%, 80%, 0.8)');
            centerGradient.addColorStop(0.5, 'hsla(220, 100%, 70%, 0.4)');
            centerGradient.addColorStop(1, 'hsla(220, 100%, 60%, 0)');
            
            ctx.beginPath();
            ctx.arc(centerX, centerY, pulseSize, 0, Math.PI * 2);
            ctx.fillStyle = centerGradient;
            ctx.fill();
            
            requestAnimationFrame(animate);
        };
        
        animate();
        
        // Make particles interactive
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            particles.forEach(particle => {
                const dx = particle.x - mouseX;
                const dy = particle.y - mouseY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 100) {
                    const force = (100 - distance) / 100;
                    particle.speedX += (dx / distance) * force * 0.2;
                    particle.speedY += (dy / distance) * force * 0.2;
                }
            });
        });
    }

    // Public method to refresh effects
    refresh() {
        // Clear existing effects
        this.containers.forEach(container => {
            if (container.parentNode) {
                container.parentNode.removeChild(container);
            }
        });
        this.containers = [];
        
        // Recreate effects
        this.createBackgroundEffects();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.liquidGlass = new LiquidGlass();
    
    // Add CSS animation for ripple
    if (!document.querySelector('#liquid-styles')) {
        const style = document.createElement('style');
        style.id = 'liquid-styles';
        style.textContent = `
            @keyframes ripple {
                to {
                    width: 300px;
                    height: 300px;
                    opacity: 0;
                }
            }
            
            @keyframes float {
                0%, 100% {
                    transform: translateY(0) rotate(0deg);
                }
                50% {
                    transform: translateY(-20px) rotate(180deg);
                }
            }
            
            .liquid-particle {
                position: absolute;
                border-radius: 50%;
                pointer-events: none;
                animation: float linear infinite;
            }
        `;
        document.head.appendChild(style);
    }
});

// Export for use in other modules
window.LiquidGlass = LiquidGlass;