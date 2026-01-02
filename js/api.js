// API Integration for Pulse Website

const API_BASE_URL = 'https://api.yourdomain.com'; // Replace with your API URL

class PulseAPI {
    constructor() {
        this.cache = {
            bands: null,
            watches: null
        };
    }

    // Fetch all bands
    async getBands() {
        try {
            if (this.cache.bands) {
                return this.cache.bands;
            }

            const response = await fetch(`${API_BASE_URL}/api/bands`);
            
            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }
            
            const bands = await response.json();
            this.cache.bands = bands;
            return bands;
        } catch (error) {
            console.error('Error fetching bands:', error);
            return this.getMockBands(); // Fallback to mock data
        }
    }

    // Fetch featured bands (first 6)
    async getFeaturedBands() {
        const bands = await this.getBands();
        return bands.slice(0, 6);
    }

    // Fetch band by ID
    async getBandById(id) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/bands/${id}`);
            
            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`Error fetching band ${id}:`, error);
            return this.getMockBandById(id);
        }
    }

    // Fetch all Apple Watches
    async getWatches() {
        try {
            if (this.cache.watches) {
                return this.cache.watches;
            }

            const response = await fetch(`${API_BASE_URL}/api/watches`);
            
            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }
            
            const watches = await response.json();
            this.cache.watches = watches;
            return watches;
        } catch (error) {
            console.error('Error fetching watches:', error);
            return this.getMockWatches();
        }
    }

    // Send contact form
    async sendContactForm(formData) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/contact`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error sending contact form:', error);
            return { success: false, message: 'Failed to send message' };
        }
    }

    // Subscribe to newsletter
    async subscribeNewsletter(email) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/newsletter/subscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email })
            });
            
            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error subscribing to newsletter:', error);
            return { success: false, message: 'Subscription failed' };
        }
    }

    // Mock data for development/fallback
    getMockBands() {
        return [
            {
                id: 1,
                name: "Nike Sport Loop",
                description: "Lightweight, breathable, and adjustable",
                price: 49.99,
                image: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
                color: "Midnight Fog",
                compatibility: ["Series 4+", "All sizes"],
                material: "Fluoroelastomer",
                features: ["Sweat-resistant", "Adjustable", "Lightweight"],
                stock: 15
            },
            {
                id: 2,
                name: "Nike Sport Band",
                description: "Sweat-resistant and durable",
                price: 49.99,
                image: "https://images.unsplash.com/photo-1558433916-90a36a0c5ba9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
                color: "Pure Platinum",
                compatibility: ["Series 3+", "41mm/45mm"],
                material: "Silicone",
                features: ["Sweat-resistant", "Durable", "Comfortable"],
                stock: 8
            },
            {
                id: 3,
                name: "Nike Heritage",
                description: "Classic design with modern materials",
                price: 59.99,
                image: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
                color: "Black/Volt",
                compatibility: ["All Series", "All sizes"],
                material: "Premium Nylon",
                features: ["Classic design", "Breathable", "Adjustable"],
                stock: 22
            },
            {
                id: 4,
                name: "Nike Liquid-Glass Pro",
                description: "With self-healing liquid-glass technology",
                price: 79.99,
                image: "https://images.unsplash.com/photo-1579586337278-3f9a8c97d6e0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
                color: "Ocean Blue",
                compatibility: ["Series 6+", "45mm"],
                material: "Liquid-Glass Composite",
                features: ["Self-healing", "Waterproof", "Premium finish"],
                stock: 5
            },
            {
                id: 5,
                name: "Nike Trail Band",
                description: "Designed for extreme conditions",
                price: 64.99,
                image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
                color: "Forest Green",
                compatibility: ["Series 5+", "All sizes"],
                material: "Reinforced Silicone",
                features: ["Extreme durability", "Mud-resistant", "Enhanced grip"],
                stock: 12
            },
            {
                id: 6,
                name: "Nike Midnight Collection",
                description: "Elegant design for all occasions",
                price: 69.99,
                image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
                color: "Midnight Black",
                compatibility: ["All Series", "41mm/45mm"],
                material: "Premium Leather",
                features: ["Elegant design", "Comfortable", "Formal wear"],
                stock: 7
            }
        ];
    }

    getMockBandById(id) {
        const bands = this.getMockBands();
        return bands.find(band => band.id === parseInt(id)) || bands[0];
    }

    getMockWatches() {
        return [
            {
                id: 1,
                name: "Apple Watch Series 8",
                description: "Advanced health features and durable design",
                price: 399,
                image: "https://images.unsplash.com/photo-1434493650001-5d43a6fea0a0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
                sizes: ["41mm", "45mm"],
                colors: ["Midnight", "Starlight", "Silver", "Red"],
                features: ["Blood Oxygen", "ECG", "Always-On Retina"]
            },
            {
                id: 2,
                name: "Apple Watch Ultra",
                description: "Built for endurance and adventure",
                price: 799,
                image: "https://images.unsplash.com/photo-1579586337278-3f9a8c97d6e0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
                sizes: ["49mm"],
                colors: ["Titanium"],
                features: ["Dive Computer", "86dB Siren", "Precision Dual-Frequency GPS"]
            },
            {
                id: 3,
                name: "Apple Watch SE",
                description: "Essential features at a great value",
                price: 249,
                image: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
                sizes: ["40mm", "44mm"],
                colors: ["Midnight", "Starlight", "Silver"],
                features: ["Retina Display", "Fall Detection", "Fitness Tracking"]
            }
        ];
    }

    // Clear cache (useful for admin updates)
    clearCache() {
        this.cache.bands = null;
        this.cache.watches = null;
        console.log('API cache cleared');
    }

    // Check API status
    async checkStatus() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/status`);
            return response.ok;
        } catch (error) {
            return false;
        }
    }
}

// Initialize API instance
const pulseAPI = new PulseAPI();

// Export for use in other files
window.PulseAPI = pulseAPI;

// Auto-update bands when API changes (WebSocket simulation)
function simulateAutoUpdate() {
    // In a real implementation, this would use WebSockets
    // For now, we'll simulate by checking every 30 seconds
    setInterval(async () => {
        const oldCount = pulseAPI.cache.bands ? pulseAPI.cache.bands.length : 0;
        const newBands = await pulseAPI.getBands();
        
        if (newBands.length > oldCount) {
            console.log(`New bands detected: ${newBands.length - oldCount} added`);
            
            // Dispatch custom event for UI updates
            const event = new CustomEvent('bandsUpdated', {
                detail: { newBands, total: newBands.length }
            });
            window.dispatchEvent(event);
            
            // Clear cache to force fresh data
            pulseAPI.clearCache();
        }
    }, 30000); // Check every 30 seconds
}

// Start auto-update simulation
if (window.location.hostname !== 'localhost') {
    simulateAutoUpdate();
}