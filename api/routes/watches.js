const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET all watches
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT * FROM watches 
            WHERE active = 1 
            ORDER BY release_year DESC, price DESC
        `);
        
        const watches = rows.map(watch => ({
            ...watch,
            price: parseFloat(watch.price),
            sizes: watch.sizes ? JSON.parse(watch.sizes) : [],
            colors: watch.colors ? JSON.parse(watch.colors) : [],
            features: watch.features ? JSON.parse(watch.features) : []
        }));
        
        res.json({
            success: true,
            data: watches,
            count: watches.length
        });
    } catch (error) {
        console.error('Error fetching watches:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch watches'
        });
    }
});

// GET single watch by ID
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM watches WHERE id = ? AND active = 1',
            [req.params.id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Watch not found'
            });
        }
        
        const watch = {
            ...rows[0],
            price: parseFloat(rows[0].price),
            sizes: rows[0].sizes ? JSON.parse(rows[0].sizes) : [],
            colors: rows[0].colors ? JSON.parse(rows[0].colors) : [],
            features: rows[0].features ? JSON.parse(rows[0].features) : []
        };
        
        res.json({
            success: true,
            data: watch
        });
    } catch (error) {
        console.error('Error fetching watch:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch watch'
        });
    }
});

// GET watches by series
router.get('/series/:series', async (req, res) => {
    const { series } = req.params;
    
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM watches WHERE active = 1 AND name LIKE ? ORDER BY release_year DESC',
            [`%${series}%`]
        );
        
        const watches = rows.map(watch => ({
            ...watch,
            price: parseFloat(watch.price),
            sizes: watch.sizes ? JSON.parse(watch.sizes) : [],
            colors: watch.colors ? JSON.parse(watch.colors) : [],
            features: watch.features ? JSON.parse(watch.features) : []
        }));
        
        res.json({
            success: true,
            data: watches,
            count: watches.length,
            series
        });
    } catch (error) {
        console.error('Error fetching watches by series:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch watches'
        });
    }
});

// POST new watch (admin only)
router.post('/', async (req, res) => {
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
        sizes,
        colors,
        features,
        image_url,
        release_year
    } = req.body;
    
    try {
        const [result] = await pool.execute(
            `INSERT INTO watches (name, description, price, sizes, colors, features, image_url, release_year) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                name,
                description,
                price,
                JSON.stringify(sizes || []),
                JSON.stringify(colors || []),
                JSON.stringify(features || []),
                image_url,
                release_year || new Date().getFullYear()
            ]
        );
        
        const [newWatch] = await pool.execute(
            'SELECT * FROM watches WHERE id = ?',
            [result.insertId]
        );
        
        res.status(201).json({
            success: true,
            message: 'Watch created successfully',
            data: {
                ...newWatch[0],
                price: parseFloat(newWatch[0].price),
                sizes: newWatch[0].sizes ? JSON.parse(newWatch[0].sizes) : [],
                colors: newWatch[0].colors ? JSON.parse(newWatch[0].colors) : [],
                features: newWatch[0].features ? JSON.parse(newWatch[0].features) : []
            }
        });
    } catch (error) {
        console.error('Error creating watch:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create watch'
        });
    }
});

// PUT update watch
router.put('/:id', async (req, res) => {
    const isAdmin = req.headers['x-admin-key'] === process.env.ADMIN_KEY;
    
    if (!isAdmin) {
        return res.status(403).json({
            success: false,
            error: 'Unauthorized access'
        });
    }
    
    const watchId = req.params.id;
    const updateData = req.body;
    
    try {
        const fields = [];
        const values = [];
        
        const allowedFields = [
            'name', 'description', 'price', 'sizes', 
            'colors', 'features', 'image_url', 'release_year', 'active'
        ];
        
        allowedFields.forEach(field => {
            if (updateData[field] !== undefined) {
                fields.push(`${field} = ?`);
                if (field === 'sizes' || field === 'colors' || field === 'features') {
                    values.push(JSON.stringify(updateData[field]));
                } else {
                    values.push(updateData[field]);
                }
            }
        });
        
        if (fields.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No fields to update'
            });
        }
        
        values.push(watchId);
        
        await pool.execute(
            `UPDATE watches SET ${fields.join(', ')} WHERE id = ?`,
            values
        );
        
        const [updatedWatch] = await pool.execute(
            'SELECT * FROM watches WHERE id = ?',
            [watchId]
        );
        
        res.json({
            success: true,
            message: 'Watch updated successfully',
            data: {
                ...updatedWatch[0],
                price: parseFloat(updatedWatch[0].price),
                sizes: updatedWatch[0].sizes ? JSON.parse(updatedWatch[0].sizes) : [],
                colors: updatedWatch[0].colors ? JSON.parse(updatedWatch[0].colors) : [],
                features: updatedWatch[0].features ? JSON.parse(updatedWatch[0].features) : []
            }
        });
    } catch (error) {
        console.error('Error updating watch:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update watch'
        });
    }
});

// GET watch compatibility info
router.get('/:id/compatibility', async (req, res) => {
    try {
        const [watchRows] = await pool.execute(
            'SELECT sizes FROM watches WHERE id = ? AND active = 1',
            [req.params.id]
        );
        
        if (watchRows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Watch not found'
            });
        }
        
        const sizes = watchRows[0].sizes ? JSON.parse(watchRows[0].sizes) : [];
        
        // Get compatible bands for each size
        const compatibility = [];
        
        for (const size of sizes) {
            const [bandRows] = await pool.execute(`
                SELECT DISTINCT b.*
                FROM bands b
                LEFT JOIN band_compatibility c ON b.id = c.band_id
                WHERE b.active = 1 
                AND (c.compatibility LIKE ? OR c.compatibility LIKE ? OR c.compatibility = 'All sizes')
                LIMIT 5
            `, [`%${size}%`, '%All sizes%']);
            
            compatibility.push({
                size,
                bands: bandRows.map(band => ({
                    ...band,
                    price: parseFloat(band.price)
                }))
            });
        }
        
        res.json({
            success: true,
            data: {
                sizes,
                compatibility
            }
        });
    } catch (error) {
        console.error('Error fetching compatibility info:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch compatibility information'
        });
    }
});

// GET watch comparison data
router.get('/compare/:ids', async (req, res) => {
    const ids = req.params.ids.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
    
    if (ids.length === 0 || ids.length > 4) {
        return res.status(400).json({
            success: false,
            error: 'Please provide 1-4 watch IDs to compare'
        });
    }
    
    try {
        const placeholders = ids.map(() => '?').join(',');
        const [rows] = await pool.execute(
            `SELECT * FROM watches WHERE id IN (${placeholders}) AND active = 1 ORDER BY release_year DESC`,
            ids
        );
        
        const watches = rows.map(watch => ({
            ...watch,
            price: parseFloat(watch.price),
            sizes: watch.sizes ? JSON.parse(watch.sizes) : [],
            colors: watch.colors ? JSON.parse(watch.colors) : [],
            features: watch.features ? JSON.parse(watch.features) : []
        }));
        
        // Generate comparison matrix
        const comparison = {
            watches,
            specs: [
                {
                    name: 'Price',
                    key: 'price',
                    format: 'currency'
                },
                {
                    name: 'Release Year',
                    key: 'release_year',
                    format: 'number'
                },
                {
                    name: 'Sizes Available',
                    key: 'sizes',
                    format: 'array'
                },
                {
                    name: 'Color Options',
                    key: 'colors',
                    format: 'array-count'
                },
                {
                    name: 'Key Features',
                    key: 'features',
                    format: 'array-count'
                }
            ]
        };
        
        res.json({
            success: true,
            data: comparison,
            count: watches.length
        });
    } catch (error) {
        console.error('Error comparing watches:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to compare watches'
        });
    }
});

module.exports = router;