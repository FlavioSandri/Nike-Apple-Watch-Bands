const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const nodemailer = require('nodemailer');

// Create email transporter
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// POST contact form submission
router.post('/', async (req, res) => {
    const { name, email, subject, message, orderNumber } = req.body;
    
    // Validation
    if (!name || !email || !message) {
        return res.status(400).json({
            success: false,
            error: 'Name, email, and message are required'
        });
    }
    
    if (!validateEmail(email)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid email address'
        });
    }
    
    try {
        const connection = await pool.getConnection();
        await connection.beginTransaction();
        
        try {
            // Save to database
            const [result] = await connection.execute(
                'INSERT INTO contact_submissions (name, email, subject, message, order_number) VALUES (?, ?, ?, ?, ?)',
                [name, email, subject || 'No subject', message, orderNumber || null]
            );
            
            const submissionId = result.insertId;
            
            // Send email notification
            const mailOptions = {
                from: `"Pulse Support" <${process.env.EMAIL_USER}>`,
                to: process.env.SUPPORT_EMAIL,
                subject: `Pulse Support: ${subject || 'New Contact Form Submission'}`,
                html: generateContactEmailHTML({
                    id: submissionId,
                    name,
                    email,
                    subject,
                    message,
                    orderNumber,
                    timestamp: new Date().toISOString()
                })
            };
            
            await transporter.sendMail(mailOptions);
            
            // Send auto-reply to user
            const userMailOptions = {
                from: `"Pulse Support" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: 'Thank you for contacting Pulse Support',
                html: generateAutoReplyHTML(name)
            };
            
            await transporter.sendMail(userMailOptions);
            
            await connection.commit();
            connection.release();
            
            res.status(201).json({
                success: true,
                message: 'Message sent successfully',
                data: {
                    id: submissionId,
                    name,
                    email,
                    subject
                }
            });
            
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
        
    } catch (error) {
        console.error('Error processing contact form:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send message'
        });
    }
});

// GET contact submissions (admin only)
router.get('/', async (req, res) => {
    const isAdmin = req.headers['x-admin-key'] === process.env.ADMIN_KEY;
    
    if (!isAdmin) {
        return res.status(403).json({
            success: false,
            error: 'Unauthorized access'
        });
    }
    
    try {
        const { limit = 50, offset = 0, unread = false } = req.query;
        
        let query = 'SELECT * FROM contact_submissions';
        const params = [];
        
        if (unread === 'true') {
            query += ' WHERE read_status = 0';
        }
        
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const [rows] = await pool.execute(query, params);
        
        const [totalRows] = await pool.execute(
            'SELECT COUNT(*) as count FROM contact_submissions'
        );
        
        res.json({
            success: true,
            data: rows,
            pagination: {
                total: totalRows[0].count,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: rows.length === parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Error fetching contact submissions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch contact submissions'
        });
    }
});

// PUT mark submission as read (admin only)
router.put('/:id/read', async (req, res) => {
    const isAdmin = req.headers['x-admin-key'] === process.env.ADMIN_KEY;
    
    if (!isAdmin) {
        return res.status(403).json({
            success: false,
            error: 'Unauthorized access'
        });
    }
    
    try {
        await pool.execute(
            'UPDATE contact_submissions SET read_status = 1 WHERE id = ?',
            [req.params.id]
        );
        
        res.json({
            success: true,
            message: 'Submission marked as read'
        });
    } catch (error) {
        console.error('Error updating submission:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update submission'
        });
    }
});

// POST newsletter subscription
router.post('/newsletter', async (req, res) => {
    const { email } = req.body;
    
    if (!email || !validateEmail(email)) {
        return res.status(400).json({
            success: false,
            error: 'Valid email address is required'
        });
    }
    
    try {
        // Check if already subscribed
        const [existing] = await pool.execute(
            'SELECT id FROM newsletter_subscribers WHERE email = ?',
            [email]
        );
        
        if (existing.length > 0) {
            return res.json({
                success: true,
                message: 'Already subscribed to newsletter',
                alreadySubscribed: true
            });
        }
        
        // Add to database
        await pool.execute(
            'INSERT INTO newsletter_subscribers (email) VALUES (?)',
            [email]
        );
        
        // Send welcome email
        const mailOptions = {
            from: `"Pulse Newsletter" <${process.env.NO_REPLY_EMAIL || process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Welcome to the Pulse Newsletter!',
            html: generateNewsletterWelcomeHTML()
        };
        
        await transporter.sendMail(mailOptions);
        
        res.status(201).json({
            success: true,
            message: 'Successfully subscribed to newsletter'
        });
    } catch (error) {
        console.error('Error subscribing to newsletter:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to subscribe to newsletter'
        });
    }
});

// GET newsletter subscribers (admin only)
router.get('/newsletter/subscribers', async (req, res) => {
    const isAdmin = req.headers['x-admin-key'] === process.env.ADMIN_KEY;
    
    if (!isAdmin) {
        return res.status(403).json({
            success: false,
            error: 'Unauthorized access'
        });
    }
    
    try {
        const { limit = 100, offset = 0, active = true } = req.query;
        
        let query = 'SELECT * FROM newsletter_subscribers';
        const params = [];
        
        if (active === 'true') {
            query += ' WHERE active = 1';
        }
        
        query += ' ORDER BY subscribed_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const [rows] = await pool.execute(query, params);
        
        const [totalRows] = await pool.execute(
            'SELECT COUNT(*) as count FROM newsletter_subscribers'
        );
        
        res.json({
            success: true,
            data: rows,
            pagination: {
                total: totalRows[0].count,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: rows.length === parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Error fetching newsletter subscribers:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch newsletter subscribers'
        });
    }
});

// DELETE unsubscribe from newsletter
router.delete('/newsletter/:email', async (req, res) => {
    const { email } = req.params;
    const { reason } = req.body;
    
    try {
        // Mark as inactive instead of deleting
        await pool.execute(
            'UPDATE newsletter_subscribers SET active = 0, unsubscribed_at = CURRENT_TIMESTAMP, unsubscribe_reason = ? WHERE email = ?',
            [reason || 'No reason provided', email]
        );
        
        res.json({
            success: true,
            message: 'Successfully unsubscribed from newsletter'
        });
    } catch (error) {
        console.error('Error unsubscribing from newsletter:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to unsubscribe'
        });
    }
});

// Helper functions
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function generateContactEmailHTML(data) {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #000000 0%, #333333 100%); color: white; padding: 20px; text-align: center; }
                .content { background: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0; }
                .field { margin-bottom: 15px; }
                .label { font-weight: bold; color: #666; }
                .value { padding: 8px; background: white; border: 1px solid #ddd; border-radius: 4px; }
                .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>New Contact Form Submission</h1>
                    <p>Submission ID: ${data.id}</p>
                </div>
                <div class="content">
                    <div class="field">
                        <div class="label">From:</div>
                        <div class="value">${data.name} (${data.email})</div>
                    </div>
                    <div class="field">
                        <div class="label">Subject:</div>
                        <div class="value">${data.subject || 'No subject'}</div>
                    </div>
                    ${data.orderNumber ? `
                    <div class="field">
                        <div class="label">Order Number:</div>
                        <div class="value">${data.orderNumber}</div>
                    </div>
                    ` : ''}
                    <div class="field">
                        <div class="label">Message:</div>
                        <div class="value" style="white-space: pre-wrap;">${data.message}</div>
                    </div>
                    <div class="field">
                        <div class="label">Submitted At:</div>
                        <div class="value">${new Date(data.timestamp).toLocaleString()}</div>
                    </div>
                </div>
                <div class="footer">
                    <p>This message was sent from the Pulse website contact form.</p>
                    <p>Please respond within 24 hours.</p>
                </div>
            </div>
        </body>
        </html>
    `;
}

function generateAutoReplyHTML(name) {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { text-align: center; padding: 30px 0; }
                .logo { font-size: 32px; font-weight: bold; background: linear-gradient(135deg, #000000 0%, #333333 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 10px; }
                .content { background: #f8f9fa; padding: 30px; border-radius: 15px; margin: 20px 0; }
                .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
                .response-time { background: #e8f4fd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007aff; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">PULSE</div>
                    <p>Nike × Apple Watch Bands</p>
                </div>
                <div class="content">
                    <h2>Thank you for contacting Pulse Support, ${name}!</h2>
                    <p>We have received your message and our support team will get back to you as soon as possible.</p>
                    
                    <div class="response-time">
                        <h3>📞 Response Time</h3>
                        <p><strong>Live Chat:</strong> Immediate</p>
                        <p><strong>Email:</strong> Within 24 hours</p>
                        <p><strong>Phone:</strong> Mon-Fri, 9AM-6PM EST</p>
                    </div>
                    
                    <h3>Need Immediate Help?</h3>
                    <p>Check out our <a href="${process.env.WEBSITE_URL}/support.html#faq" style="color: #007aff;">FAQ section</a> for quick answers to common questions.</p>
                    
                    <p>You can also reach us directly:</p>
                    <ul>
                        <li><strong>Email:</strong> support@pulse.com</li>
                        <li><strong>Phone:</strong> 1-800-555-1234</li>
                        <li><strong>Live Chat:</strong> Available on our website</li>
                    </ul>
                    
                    <p>Best regards,<br>The Pulse Support Team</p>
                </div>
                <div class="footer">
                    <p>This is an automated response. Please do not reply to this email.</p>
                    <p>© 2023 Pulse. Nike and Apple are registered trademarks of their respective owners.</p>
                    <p><a href="${process.env.WEBSITE_URL}/privacy" style="color: #666;">Privacy Policy</a> | <a href="${process.env.WEBSITE_URL}/unsubscribe" style="color: #666;">Unsubscribe</a></p>
                </div>
            </div>
        </body>
        </html>
    `;
}

function generateNewsletterWelcomeHTML() {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { text-align: center; padding: 40px 0; background: linear-gradient(135deg, #000000 0%, #333333 100%); color: white; border-radius: 15px 15px 0 0; }
                .logo { font-size: 42px; font-weight: bold; margin-bottom: 10px; }
                .content { background: #f8f9fa; padding: 40px; border-radius: 0 0 15px 15px; }
                .benefit { display: flex; align-items: center; margin: 20px 0; }
                .benefit-icon { width: 40px; height: 40px; background: #007aff; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; }
                .footer { text-align: center; color: #666; font-size: 12px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; }
                .btn { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #000000 0%, #333333 100%); color: white; text-decoration: none; border-radius: 25px; font-weight: 600; margin: 20px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">PULSE</div>
                    <h1>Welcome to the Pulse Family! 🎉</h1>
                </div>
                <div class="content">
                    <h2>You're In!</h2>
                    <p>Thank you for subscribing to the Pulse newsletter. You're now part of an exclusive community that gets first access to:</p>
                    
                    <div class="benefit">
                        <div class="benefit-icon">✨</div>
                        <div>
                            <h3>New Nike Band Releases</h3>
                            <p>Be the first to know when new collections drop</p>
                        </div>
                    </div>
                    
                    <div class="benefit">
                        <div class="benefit-icon">💰</div>
                        <div>
                            <h3>Exclusive Discounts</h3>
                            <p>Members-only sales and special offers</p>
                        </div>
                    </div>
                    
                    <div class="benefit">
                        <div class="benefit-icon">🔬</div>
                        <div>
                            <h3>Liquid-Glass Updates</h3>
                            <p>Latest innovations in band technology</p>
                        </div>
                    </div>
                    
                    <div class="benefit">
                        <div class="benefit-icon">🎁</div>
                        <div>
                            <h3>Early Access</h3>
                            <p>Shop limited editions before anyone else</p>
                        </div>
                    </div>
                    
                    <center>
                        <a href="${process.env.WEBSITE_URL}/bands.html" class="btn">Shop Now</a>
                    </center>
                    
                    <p style="margin-top: 30px;"><small>You can unsubscribe at any time by clicking the link in our emails or visiting your account settings.</small></p>
                </div>
                <div class="footer">
                    <p>Pulse × Nike Apple Watch Bands</p>
                    <p>© 2023 Pulse. All rights reserved.</p>
                    <p><a href="${process.env.WEBSITE_URL}/privacy" style="color: #666;">Privacy Policy</a> | <a href="${process.env.WEBSITE_URL}/unsubscribe" style="color: #666;">Unsubscribe</a></p>
                </div>
            </div>
        </body>
        </html>
    `;
}

module.exports = router;