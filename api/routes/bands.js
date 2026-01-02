const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET all bands
router.get('/', async (req, res) => {
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
        
        const bands = rows.map(band => ({
            ...band,
            features: band.features ? band.features.split(',') : [],
            compatibilities: band.compatibilities ? band.compatibilities.split(',') : [],
            price: parseFloat(band.price)
        }));
        
        res.json({
            success: true,
            data: bands,
            count: bands.length
        });
    } catch (error) {
        console.error('Error fetching bands:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch bands'
        });
    }
});

// GET featured bands
router.get('/featured', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT b.*, 
                   GROUP_CONCAT(DISTINCT f.feature_name) as features
            FROM bands b
            LEFT JOIN band_features f ON b.id = f.band_id
            WHERE b.active = 1 AND b.featured = 1
            GROUP BY b.id
            ORDER BY b.created_at DESC
            LIMIT 6
        `);
        
        const bands = rows.map(band => ({
            ...band,
            features: band.features ? band.features.split(',') : [],
            price: parseFloat(band.price)
        }));
        
        res.json({
            success: true,
            data: bands
        });
    } catch (error) {
        console.error('Error fetching featured bands:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch featured bands'
        });
    }
});

// GET single band by ID
router.get('/:id', async (req, res) => {
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
            return res.status(404).json({
                success: false,
                error: 'Band not found'
            });
        }
        
        const band = {
            ...rows[0],
            features: rows[0].features ? rows[0].features.split(',') : [],
            compatibilities: rows[0].compatibilities ? rows[0].compatibilities.split(',') : [],
            price: parseFloat(rows[0].price)
        };
        
        res.json({
            success: true,
            data: band
        });
    } catch (error) {
        console.error('Error fetching band:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch band'
        });
    }
});

// GET bands by category
router.get('/category/:category', async (req, res) => {
    const { category } = req.params;
    
    try {
        let query = `
            SELECT b.*, 
                   GROUP_CONCAT(DISTINCT f.feature_name) as features
            FROM bands b
            LEFT JOIN band_features f ON b.id = f.band_id
            WHERE b.active = 1
        `;
        
        const params = [];
        
        switch (category) {
            case 'liquid-glass':
                query += ' AND b.liquid_glass = 1';
                break;
            case 'sport':
                query += ' AND b.material IN ("Fluoroelastomer", "Silicone", "Reinforced Silicone")';
                break;
            case 'premium':
                query += ' AND b.material IN ("Premium Leather", "Premium Nylon")';
                break;
            case 'limited':
                query += ' AND b.stock < 10';
                break;
        }
        
        query += ' GROUP BY b.id ORDER BY b.created_at DESC';
        
        const [rows] = await pool.execute(query, params);
        
        const bands = rows.map(band => ({
            ...band,
            features: band.features ? band.features.split(',') : [],
            price: parseFloat(band.price)
        }));
        
        res.json({
            success: true,
            data: bands,
            count: bands.length,
            category
        });
    } catch (error) {
        console.error('Error fetching bands by category:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch bands'
        });
    }
});

// GET compatible bands for watch size
router.get('/compatible/:size', async (req, res) => {
    const { size } = req.params;
    
    try {
        const [rows] = await pool.execute(`
            SELECT DISTINCT b.*, 
                   GROUP_CONCAT(DISTINCT f.feature_name) as features
            FROM bands b
            LEFT JOIN band_features f ON b.id = f.band_id
            LEFT JOIN band_compatibility c ON b.id = c.band_id
            WHERE b.active = 1 
            AND (c.compatibility LIKE ? OR c.compatibility LIKE ? OR c.compatibility = 'All sizes')
            GROUP BY b.id
            ORDER BY b.featured DESC, b.price ASC
        `, [`%${size}%`, '%All sizes%']);
        
        const bands = rows.map(band => ({
            ...band,
            features: band.features ? band.features.split(',') : [],
            price: parseFloat(band.price)
        }));
        
        res.json({
            success: true,
            data: bands,
            count: bands.length,
            compatibleWith: size
        });
    } catch (error) {
        console.error('Error fetching compatible bands:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch compatible bands'
        });
    }
});

// POST new band (admin only)
router.post('/', async (req, res) => {
    // Check for admin authentication (simplified for demo)
    const isAdmin = req.headers['x-admin-key'] === process.env.ADMIN_KEY;
    
    if (!isAdmin) {
        return res.status(403).json({
            success: false,
            error: 'Unauthorized access'
        });
    }
    
    const {
        name,
        description,
        price,
        color,
        material,
        stock,
        featured,
        liquid_glass,
        image_url,
        features,
        compatibilities
    } = req.body;
    
    try {
        const connection = await pool.getConnection();
        await connection.beginTransaction();
        
        try {
            // Insert band
            const [result] = await connection.execute(
                `INSERT INTO bands (name, description, price, color, material, stock, featured, liquid_glass, image_url) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [name, description, price, color, material, stock, featured || 0, liquid_glass || 0, image_url]
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
            
            // Get the newly created band
            const [newBand] = await pool.execute(`
                SELECT * FROM bands WHERE id = ?
            `, [bandId]);
            
            res.status(201).json({
                success: true,
                message: 'Band created successfully',
                data: {
                    ...newBand[0],
                    price: parseFloat(newBand[0].price)
                }
            });
            
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
        
    } catch (error) {
        console.error('Error creating band:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create band'
        });
    }
});

// PUT update band
router.put('/:id', async (req, res) => {
    const isAdmin = req.headers['x-admin-key'] === process.env.ADMIN_KEY;
    
    if (!isAdmin) {
        return res.status(403).json({
            success: false,
            error: 'Unauthorized access'
        });
    }
    
    const bandId = req.params.id;
    const updateData = req.body;
    
    try {
        const connection = await pool.getConnection();
        await connection.beginTransaction();
        
        try {
            // Update band details
            const fields = [];
            const values = [];
            
            const allowedFields = [
                'name', 'description', 'price', 'color', 
                'material', 'stock', 'featured', 'liquid_glass', 
                'image_url', 'active'
            ];
            
            allowedFields.forEach(field => {
                if (updateData[field] !== undefined) {
                    fields.push(`${field} = ?`);
                    values.push(updateData[field]);
                }
            });
            
            if (fields.length > 0) {
                values.push(bandId);
                await connection.execute(
                    `UPDATE bands SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                    values
                );
            }
            
            // Update features if provided
            if (updateData.features && Array.isArray(updateData.features)) {
                // Delete existing features
                await connection.execute(
                    'DELETE FROM band_features WHERE band_id = ?',
                    [bandId]
                );
                
                // Insert new features
                for (const feature of updateData.features) {
                    await connection.execute(
                        'INSERT INTO band_features (band_id, feature_name) VALUES (?, ?)',
                        [bandId, feature]
                    );
                }
            }
            
            // Update compatibilities if provided
            if (updateData.compatibilities && Array.isArray(updateData.compatibilities)) {
                // Delete existing compatibilities
                await connection.execute(
                    'DELETE FROM band_compatibility WHERE band_id = ?',
                    [bandId]
                );
                
                // Insert new compatibilities
                for (const compatibility of updateData.compatibilities) {
                    await connection.execute(
                        'INSERT INTO band_compatibility (band_id, compatibility) VALUES (?, ?)',
                        [bandId, compatibility]
                    );
                }
            }
            
            await connection.commit();
            connection.release();
            
            // Get updated band
            const [updatedBand] = await pool.execute(
                'SELECT * FROM bands WHERE id = ?',
                [bandId]
            );
            
            res.json({
                success: true,
                message: 'Band updated successfully',
                data: {
                    ...updatedBand[0],
                    price: parseFloat(updatedBand[0].price)
                }
            });
            
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
        
    } catch (error) {
        console.error('Error updating band:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update band'
        });
    }
});

// DELETE band (soft delete)
router.delete('/:id', async (req, res) => {
    const isAdmin = req.headers['x-admin-key'] === process.env.ADMIN_KEY;
    
    if (!isAdmin) {
        return res.status(403).json({
            success: false,
            error: 'Unauthorized access'
        });
    }
    
    try {
        await pool.execute(
            'UPDATE bands SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [req.params.id]
        );
        
        res.json({
            success: true,
            message: 'Band deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting band:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete band'
        });
    }
});

// GET search bands
router.get('/search/:query', async (req, res) => {
    const { query } = req.params;
    
    try {
        const [rows] = await pool.execute(`
            SELECT b.*, 
                   GROUP_CONCAT(DISTINCT f.feature_name) as features
            FROM bands b
            LEFT JOIN band_features f ON b.id = f.band_id
            WHERE b.active = 1 
            AND (b.name LIKE ? OR b.description LIKE ? OR b.color LIKE ? OR b.material LIKE ?)
            GROUP BY b.id
            ORDER BY b.featured DESC
            LIMIT 20
        `, [
            `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`
        ]);
        
        const bands = rows.map(band => ({
            ...band,
            features: band.features ? band.features.split(',') : [],
            price: parseFloat(band.price)
        }));
        
        res.json({
            success: true,
            data: bands,
            count: bands.length,
            searchQuery: query
        });
    } catch (error) {
        console.error('Error searching bands:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to search bands'
        });
    }
});

module.exports = router;