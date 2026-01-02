// API Server for Pulse Website
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Database connection
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'pulse_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Email transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Routes

// Get all bands
app.get('/api/bands', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT b.*, 
                   GROUP_CONCAT(DISTINCT f.feature_name) as features,
                   GROUP_CONCAT(DISTINCT c.compatibility) as compatibilities
            FROM bands b
            LEFT JOIN band_features f ON b.id = f.band_id
            LEFT JOIN band_compatibility c ON b.id = c.band_id
            WHERE b.active = 1
            GROUP BY b.id
            ORDER BY b.featured DESC, b.created_at DESC
        `);
        
        // Parse features and compatibilities from strings to arrays
        const bands = rows.map(band => ({
            ...band,
            features: band.features ? band.features.split(',') : [],
            compatibilities: band.compatibilities ? band.compatibilities.split(',') : []
        }));
        
        res.json(bands);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Failed to fetch bands' });
    }
});

// Get single band
app.get('/api/bands/:id', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT b.*, 
                   GROUP_CONCAT(DISTINCT f.feature_name) as features,
                   GROUP_CONCAT(DISTINCT c.compatibility) as compatibilities
            FROM bands b
            LEFT JOIN band_features f ON b.id = f.band_id
            LEFT JOIN band_compatibility c ON b.id = c.band_id
            WHERE b.id = ? AND b.active = 1
            GROUP BY b.id
        `, [req.params.id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Band not found' });
        }
        
        const band = {
            ...rows[0],
            features: rows[0].features ? rows[0].features.split(',') : [],
            compatibilities: rows[0].compatibilities ? rows[0].compatibilities.split(',') : []
        };
        
        res.json(band);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Failed to fetch band' });
    }
});

// Get watches
app.get('/api/watches', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT * FROM watches 
            WHERE active = 1 
            ORDER BY release_year DESC
        `);
        res.json(rows);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Failed to fetch watches' });
    }
});

// Contact form submission
app.post('/api/contact', async (req, res) => {
    const { name, email, subject, message } = req.body;
    
    // Validation
    if (!name || !email || !message) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    try {
        // Save to database
        await pool.execute(
            'INSERT INTO contact_submissions (name, email, subject, message) VALUES (?, ?, ?, ?)',
            [name, email, subject || 'No subject', message]
        );
        
        // Send email notification
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.SUPPORT_EMAIL,
            subject: `Pulse Support: ${subject || 'New message'}`,
            html: `
                <h2>New Contact Form Submission</h2>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Subject:</strong> ${subject || 'No subject'}</p>
                <p><strong>Message:</strong></p>
                <p>${message}</p>
                <hr>
                <p>This message was sent from the Pulse website contact form.</p>
            `
        };
        
        await transporter.sendMail(mailOptions);
        
        res.json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
        console.error('Contact form error:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// Newsletter subscription
app.post('/api/newsletter/subscribe', async (req, res) => {
    const { email } = req.body;
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Invalid email address' });
    }
    
    try {
        // Check if already subscribed
        const [existing] = await pool.execute(
            'SELECT id FROM newsletter_subscribers WHERE email = ?',
            [email]
        );
        
        if (existing.length > 0) {
            return res.json({ success: true, message: 'Already subscribed' });
        }
        
        // Add to database
        await pool.execute(
            'INSERT INTO newsletter_subscribers (email, subscribed_at) VALUES (?, NOW())',
            [email]
        );
        
        // Send welcome email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Welcome to Pulse Newsletter',
            html: `
                <h2>Welcome to Pulse!</h2>
                <p>Thank you for subscribing to our newsletter. You'll be the first to know about:</p>
                <ul>
                    <li>New Nike Apple Watch band releases</li>
                    <li>Exclusive collaborations</li>
                    <li>Special promotions and discounts</li>
                    <li>Latest liquid-glass technology updates</li>
                </ul>
                <p>Stay tuned for exciting updates!</p>
                <hr>
                <p><small>You can unsubscribe at any time by clicking the link in our emails.</small></p>
            `
        };
        
        await transporter.sendMail(mailOptions);
        
        res.json({ success: true, message: 'Subscribed successfully' });
    } catch (error) {
        console.error('Newsletter subscription error:', error);
        res.status(500).json({ error: 'Failed to subscribe' });
    }
});

// Admin: Add new band (protected in production)
app.post('/api/admin/bands', async (req, res) => {
    // In production, add authentication middleware
    const { name, description, price, color, material, stock, features, compatibilities } = req.body;
    
    try {
        // Start transaction
        const connection = await pool.getConnection();
        await connection.beginTransaction();
        
        try {
            // Insert band
            const [result] = await connection.execute(
                `INSERT INTO bands (name, description, price, color, material, stock, featured, active, created_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
                [name, description, price, color, material, stock, 0]
            );
            
            const bandId = result.insertId;
            
            // Insert features
            if (features && Array.isArray(features)) {
                for (const feature of features) {
                    await connection.execute(
                        'INSERT INTO band_features (band_id, feature_name) VALUES (?, ?)',
                        [bandId, feature]
                    );
                }
            }
            
            // Insert compatibilities
            if (compatibilities && Array.isArray(compatibilities)) {
                for (const compatibility of compatibilities) {
                    await connection.execute(
                        'INSERT INTO band_compatibility (band_id, compatibility) VALUES (?, ?)',
                        [bandId, compatibility]
                    );
                }
            }
            
            await connection.commit();
            connection.release();
            
            // Clear cache (in a real implementation)
            // This would trigger WebSocket updates to connected clients
            
            res.json({ 
                success: true, 
                message: 'Band added successfully',
                bandId 
            });
            
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
        
    } catch (error) {
        console.error('Add band error:', error);
        res.status(500).json({ error: 'Failed to add band' });
    }
});

// API status check
app.get('/api/status', (req, res) => {
    res.json({ 
        status: 'online', 
        timestamp: new Date().toISOString(),
        service: 'Pulse API',
        version: '1.0.0'
    });
});

// Database initialization endpoint (for development)
app.post('/api/init-db', async (req, res) => {
    // SECURITY: In production, this should be protected or removed
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: 'Not available in production' });
    }
    
    try {
        // Create tables
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS bands (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                price DECIMAL(10,2) NOT NULL,
                color VARCHAR(100),
                material VARCHAR(100),
                stock INT DEFAULT 0,
                featured BOOLEAN DEFAULT FALSE,
                active BOOLEAN DEFAULT TRUE,
                image_url VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS band_features (
                id INT PRIMARY KEY AUTO_INCREMENT,
                band_id INT NOT NULL,
                feature_name VARCHAR(100) NOT NULL,
                FOREIGN KEY (band_id) REFERENCES bands(id) ON DELETE CASCADE
            )
        `);
        
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS band_compatibility (
                id INT PRIMARY KEY AUTO_INCREMENT,
                band_id INT NOT NULL,
                compatibility VARCHAR(100) NOT NULL,
                FOREIGN KEY (band_id) REFERENCES bands(id) ON DELETE CASCADE
            )
        `);
        
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS watches (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                price DECIMAL(10,2) NOT NULL,
                sizes JSON,
                colors JSON,
                features JSON,
                image_url VARCHAR(500),
                release_year INT,
                active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS contact_submissions (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                subject VARCHAR(255),
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                read BOOLEAN DEFAULT FALSE
            )
        `);
        
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS newsletter_subscribers (
                id INT PRIMARY KEY AUTO_INCREMENT,
                email VARCHAR(255) UNIQUE NOT NULL,
                subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                active BOOLEAN DEFAULT TRUE
            )
        `);
        
        res.json({ success: true, message: 'Database initialized' });
    } catch (error) {
        console.error('Database initialization error:', error);
        res.status(500).json({ error: 'Failed to initialize database' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Pulse API server running on port ${PORT}`);
});