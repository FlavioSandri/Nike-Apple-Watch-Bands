const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Import routes
const bandsRoutes = require('./routes/bands');
const watchesRoutes = require('./routes/watches');
const contactRoutes = require('./routes/contact');
const authRoutes = require('./routes/auth');
const cartRoutes = require('./routes/cart');
const ordersRoutes = require('./routes/orders');

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https://images.unsplash.com", "https://*.unsplash.com"],
            connectSrc: ["'self'", `http://localhost:${PORT}`, process.env.FRONTEND_URL]
        }
    }
}));

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5500',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Key']
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan('combined'));

// Static files (if serving frontend from same server)
app.use(express.static('../')); // Serve from parent directory

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'Pulse API',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    });
});

// API Routes
app.use('/api/bands', bandsRoutes);
app.use('/api/watches', watchesRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', ordersRoutes);

// Admin dashboard endpoint (basic)
app.get('/api/admin/stats', async (req, res) => {
    const isAdmin = req.headers['x-admin-key'] === process.env.ADMIN_KEY;
    
    if (!isAdmin) {
        return res.status(403).json({
            success: false,
            error: 'Unauthorized access'
        });
    }
    
    try {
        const { pool } = require('./config/database');
        
        // Get total counts
        const [bandsCount] = await pool.execute('SELECT COUNT(*) as count FROM bands WHERE active = 1');
        const [watchesCount] = await pool.execute('SELECT COUNT(*) as count FROM watches WHERE active = 1');
        const [ordersCount] = await pool.execute('SELECT COUNT(*) as count FROM orders');
        const [usersCount] = await pool.execute('SELECT COUNT(*) as count FROM users');
        const [subscribersCount] = await pool.execute('SELECT COUNT(*) as count FROM newsletter_subscribers WHERE active = 1');
        
        // Get recent activity
        const [recentOrders] = await pool.execute(
            'SELECT * FROM orders ORDER BY created_at DESC LIMIT 5'
        );
        
        const [recentContacts] = await pool.execute(
            'SELECT * FROM contact_submissions ORDER BY created_at DESC LIMIT 5'
        );
        
        // Get revenue (simplified)
        const [revenue] = await pool.execute(
            'SELECT SUM(total_amount) as total_revenue FROM orders WHERE status = "delivered"'
        );
        
        res.json({
            success: true,
            data: {
                counts: {
                    bands: bandsCount[0].count,
                    watches: watchesCount[0].count,
                    orders: ordersCount[0].count,
                    users: usersCount[0].count,
                    subscribers: subscribersCount[0].count
                },
                revenue: {
                    total: parseFloat(revenue[0].total_revenue || 0).toFixed(2)
                },
                recentActivity: {
                    orders: recentOrders,
                    contactSubmissions: recentContacts
                }
            }
        });
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch admin statistics'
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    
    res.status(statusCode).json({
        success: false,
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// Start server
const server = app.listen(PORT, () => {
    console.log(`🚀 Pulse API server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
    console.log(`📁 Database: ${process.env.DB_NAME || 'pulse_db'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});

module.exports = app; // For testing