const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../config/database');

// POST register new user
router.post('/register', async (req, res) => {
    const { email, password, name, apple_id } = req.body;
    
    // Validation
    if (!email || !password || !name) {
        return res.status(400).json({
            success: false,
            error: 'Email, password, and name are required'
        });
    }
    
    if (!validateEmail(email)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid email address'
        });
    }
    
    if (password.length < 8) {
        return res.status(400).json({
            success: false,
            error: 'Password must be at least 8 characters'
        });
    }
    
    try {
        // Check if user already exists
        const [existingUsers] = await pool.execute(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );
        
        if (existingUsers.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'User already exists'
            });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user
        const [result] = await pool.execute(
            'INSERT INTO users (email, password_hash, name, apple_id) VALUES (?, ?, ?, ?)',
            [email, hashedPassword, name, apple_id || null]
        );
        
        const userId = result.insertId;
        
        // Generate JWT token
        const token = jwt.sign(
            { userId, email, name },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        // Get user data (without password)
        const [userRows] = await pool.execute(
            'SELECT id, email, name, apple_id, created_at FROM users WHERE id = ?',
            [userId]
        );
        
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user: userRows[0],
                token
            }
        });
        
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to register user'
        });
    }
});

// POST login user
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({
            success: false,
            error: 'Email and password are required'
        });
    }
    
    try {
        // Find user
        const [users] = await pool.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        
        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }
        
        const user = users[0];
        
        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }
        
        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        // Update last login
        await pool.execute(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
            [user.id]
        );
        
        // Remove password hash from response
        const { password_hash, ...userWithoutPassword } = user;
        
        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: userWithoutPassword,
                token
            }
        });
        
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to login'
        });
    }
});

// POST Apple OAuth login
router.post('/apple', async (req, res) => {
    const { apple_id, email, name } = req.body;
    
    if (!apple_id) {
        return res.status(400).json({
            success: false,
            error: 'Apple ID is required'
        });
    }
    
    try {
        // Check if user exists with Apple ID
        const [existingUsers] = await pool.execute(
            'SELECT * FROM users WHERE apple_id = ?',
            [apple_id]
        );
        
        let user;
        
        if (existingUsers.length > 0) {
            // Existing user
            user = existingUsers[0];
            
            // Update last login
            await pool.execute(
                'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
                [user.id]
            );
            
        } else {
            // New user - create account
            const [result] = await pool.execute(
                'INSERT INTO users (apple_id, email, name) VALUES (?, ?, ?)',
                [apple_id, email || null, name || 'Apple User']
            );
            
            const [newUser] = await pool.execute(
                'SELECT * FROM users WHERE id = ?',
                [result.insertId]
            );
            
            user = newUser[0];
        }
        
        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email, name: user.name, apple_id: user.apple_id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        // Remove password hash from response
        const { password_hash, ...userWithoutPassword } = user;
        
        res.json({
            success: true,
            message: 'Apple login successful',
            data: {
                user: userWithoutPassword,
                token
            }
        });
        
    } catch (error) {
        console.error('Error with Apple login:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to login with Apple'
        });
    }
});

// GET current user profile
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const [users] = await pool.execute(
            'SELECT id, email, name, apple_id, created_at, last_login FROM users WHERE id = ?',
            [req.user.userId]
        );
        
        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        res.json({
            success: true,
            data: users[0]
        });
        
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch profile'
        });
    }
});

// PUT update user profile
router.put('/profile', authenticateToken, async (req, res) => {
    const { name, email } = req.body;
    
    try {
        const updates = [];
        const values = [];
        
        if (name) {
            updates.push('name = ?');
            values.push(name);
        }
        
        if (email) {
            if (!validateEmail(email)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid email address'
                });
            }
            
            // Check if email is already taken by another user
            const [existing] = await pool.execute(
                'SELECT id FROM users WHERE email = ? AND id != ?',
                [email, req.user.userId]
            );
            
            if (existing.length > 0) {
                return res.status(409).json({
                    success: false,
                    error: 'Email already in use'
                });
            }
            
            updates.push('email = ?');
            values.push(email);
        }
        
        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No fields to update'
            });
        }
        
        values.push(req.user.userId);
        
        await pool.execute(
            `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
            values
        );
        
        // Get updated user
        const [users] = await pool.execute(
            'SELECT id, email, name, apple_id, created_at, last_login FROM users WHERE id = ?',
            [req.user.userId]
        );
        
        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: users[0]
        });
        
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update profile'
        });
    }
});

// POST change password
router.post('/change-password', authenticateToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
        return res.status(400).json({
            success: false,
            error: 'Current and new password are required'
        });
    }
    
    if (newPassword.length < 8) {
        return res.status(400).json({
            success: false,
            error: 'New password must be at least 8 characters'
        });
    }
    
    try {
        // Get current user with password
        const [users] = await pool.execute(
            'SELECT * FROM users WHERE id = ?',
            [req.user.userId]
        );
        
        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        const user = users[0];
        
        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
        
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                error: 'Current password is incorrect'
            });
        }
        
        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Update password
        await pool.execute(
            'UPDATE users SET password_hash = ? WHERE id = ?',
            [hashedPassword, req.user.userId]
        );
        
        res.json({
            success: true,
            message: 'Password changed successfully'
        });
        
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to change password'
        });
    }
});

// POST forgot password
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    
    if (!email || !validateEmail(email)) {
        return res.status(400).json({
            success: false,
            error: 'Valid email address is required'
        });
    }
    
    try {
        // Check if user exists
        const [users] = await pool.execute(
            'SELECT id, name FROM users WHERE email = ?',
            [email]
        );
        
        if (users.length === 0) {
            // Don't reveal that user doesn't exist for security
            return res.json({
                success: true,
                message: 'If an account exists with this email, you will receive a password reset link'
            });
        }
        
        const user = users[0];
        
        // Generate reset token
        const resetToken = jwt.sign(
            { userId: user.id, email, action: 'password_reset' },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        
        // In production, you would send an email with the reset link
        // For demo, we'll just return the token
        const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
        
        res.json({
            success: true,
            message: 'Password reset link generated',
            data: {
                resetToken,
                resetLink,
                expiresIn: '1 hour'
            }
        });
        
    } catch (error) {
        console.error('Error in forgot password:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process password reset'
        });
    }
});

// POST reset password
router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
        return res.status(400).json({
            success: false,
            error: 'Token and new password are required'
        });
    }
    
    if (newPassword.length < 8) {
        return res.status(400).json({
            success: false,
            error: 'Password must be at least 8 characters'
        });
    }
    
    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (decoded.action !== 'password_reset') {
            return res.status(400).json({
                success: false,
                error: 'Invalid token'
            });
        }
        
        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Update password
        await pool.execute(
            'UPDATE users SET password_hash = ? WHERE id = ?',
            [hashedPassword, decoded.userId]
        );
        
        res.json({
            success: true,
            message: 'Password reset successfully'
        });
        
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(400).json({
                success: false,
                error: 'Reset token has expired'
            });
        }
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(400).json({
                success: false,
                error: 'Invalid token'
            });
        }
        
        console.error('Error resetting password:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to reset password'
        });
    }
});

// DELETE user account
router.delete('/account', authenticateToken, async (req, res) => {
    try {
        // Soft delete - just deactivate the account
        await pool.execute(
            'UPDATE users SET active = 0 WHERE id = ?',
            [req.user.userId]
        );
        
        res.json({
            success: true,
            message: 'Account deleted successfully'
        });
        
    } catch (error) {
        console.error('Error deleting account:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete account'
        });
    }
});

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'Access token required'
        });
    }
    
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({
                success: false,
                error: 'Invalid or expired token'
            });
        }
        
        req.user = user;
        next();
    });
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

module.exports = router;