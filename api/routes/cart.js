const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET cart for user or session
router.get('/', async (req, res) => {
    try {
        const userId = req.query.user_id;
        const sessionId = req.query.session_id;
        
        let cart;
        
        if (userId) {
            // Get cart for logged-in user
            [cart] = await pool.execute(
                `SELECT sc.*, 
                        JSON_ARRAYAGG(
                            JSON_OBJECT(
                                'id', ci.id,
                                'band_id', ci.band_id,
                                'quantity', ci.quantity,
                                'added_at', ci.added_at,
                                'band_name', b.name,
                                'band_price', b.price,
                                'band_image', b.image_url,
                                'band_color', b.color,
                                'band_material', b.material
                            )
                        ) as items
                 FROM shopping_carts sc
                 LEFT JOIN cart_items ci ON sc.id = ci.cart_id
                 LEFT JOIN bands b ON ci.band_id = b.id
                 WHERE sc.user_id = ? AND b.active = 1
                 GROUP BY sc.id
                 ORDER BY sc.updated_at DESC
                 LIMIT 1`,
                [userId]
            );
        } else if (sessionId) {
            // Get cart for session
            [cart] = await pool.execute(
                `SELECT sc.*, 
                        JSON_ARRAYAGG(
                            JSON_OBJECT(
                                'id', ci.id,
                                'band_id', ci.band_id,
                                'quantity', ci.quantity,
                                'added_at', ci.added_at,
                                'band_name', b.name,
                                'band_price', b.price,
                                'band_image', b.image_url,
                                'band_color', b.color,
                                'band_material', b.material
                            )
                        ) as items
                 FROM shopping_carts sc
                 LEFT JOIN cart_items ci ON sc.id = ci.cart_id
                 LEFT JOIN bands b ON ci.band_id = b.id
                 WHERE sc.session_id = ? AND b.active = 1
                 GROUP BY sc.id
                 ORDER BY sc.updated_at DESC
                 LIMIT 1`,
                [sessionId]
            );
        } else {
            return res.status(400).json({
                success: false,
                error: 'User ID or Session ID is required'
            });
        }
        
        if (cart.length === 0) {
            return res.json({
                success: true,
                data: {
                    id: null,
                    items: [],
                    total: 0,
                    itemCount: 0
                }
            });
        }
        
        const cartData = cart[0];
        const items = cartData.items ? JSON.parse(cartData.items) : [];
        
        // Filter out null items (bands that might have been deleted)
        const validItems = items.filter(item => item.band_id);
        
        // Calculate totals
        const total = validItems.reduce((sum, item) => {
            return sum + (parseFloat(item.band_price) * item.quantity);
        }, 0);
        
        const itemCount = validItems.reduce((count, item) => {
            return count + item.quantity;
        }, 0);
        
        res.json({
            success: true,
            data: {
                id: cartData.id,
                userId: cartData.user_id,
                sessionId: cartData.session_id,
                items: validItems,
                total: total.toFixed(2),
                itemCount,
                createdAt: cartData.created_at,
                updatedAt: cartData.updated_at
            }
        });
        
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch cart'
        });
    }
});

// POST add item to cart
router.post('/add', async (req, res) => {
    const { userId, sessionId, bandId, quantity = 1 } = req.body;
    
    if (!bandId) {
        return res.status(400).json({
            success: false,
            error: 'Band ID is required'
        });
    }
    
    if (!userId && !sessionId) {
        return res.status(400).json({
            success: false,
            error: 'User ID or Session ID is required'
        });
    }
    
    try {
        const connection = await pool.getConnection();
        await connection.beginTransaction();
        
        try {
            // Check if band exists and is in stock
            const [bands] = await connection.execute(
                'SELECT id, name, price, stock FROM bands WHERE id = ? AND active = 1',
                [bandId]
            );
            
            if (bands.length === 0) {
                await connection.rollback();
                connection.release();
                return res.status(404).json({
                    success: false,
                    error: 'Band not found'
                });
            }
            
            const band = bands[0];
            
            if (band.stock < quantity) {
                await connection.rollback();
                connection.release();
                return res.status(400).json({
                    success: false,
                    error: `Only ${band.stock} items available in stock`
                });
            }
            
            // Find or create cart
            let cartId;
            
            if (userId) {
                // For logged-in user
                const [userCarts] = await connection.execute(
                    'SELECT id FROM shopping_carts WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1',
                    [userId]
                );
                
                if (userCarts.length > 0) {
                    cartId = userCarts[0].id;
                } else {
                    const [cartResult] = await connection.execute(
                        'INSERT INTO shopping_carts (user_id) VALUES (?)',
                        [userId]
                    );
                    cartId = cartResult.insertId;
                }
            } else {
                // For guest session
                const [sessionCarts] = await connection.execute(
                    'SELECT id FROM shopping_carts WHERE session_id = ? ORDER BY updated_at DESC LIMIT 1',
                    [sessionId]
                );
                
                if (sessionCarts.length > 0) {
                    cartId = sessionCarts[0].id;
                } else {
                    const [cartResult] = await connection.execute(
                        'INSERT INTO shopping_carts (session_id) VALUES (?)',
                        [sessionId]
                    );
                    cartId = cartResult.insertId;
                }
            }
            
            // Check if item already in cart
            const [existingItems] = await connection.execute(
                'SELECT id, quantity FROM cart_items WHERE cart_id = ? AND band_id = ?',
                [cartId, bandId]
            );
            
            if (existingItems.length > 0) {
                // Update quantity
                const newQuantity = existingItems[0].quantity + quantity;
                
                await connection.execute(
                    'UPDATE cart_items SET quantity = ?, added_at = CURRENT_TIMESTAMP WHERE id = ?',
                    [newQuantity, existingItems[0].id]
                );
            } else {
                // Add new item
                await connection.execute(
                    'INSERT INTO cart_items (cart_id, band_id, quantity) VALUES (?, ?, ?)',
                    [cartId, bandId, quantity]
                );
            }
            
            // Update cart timestamp
            await connection.execute(
                'UPDATE shopping_carts SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [cartId]
            );
            
            await connection.commit();
            connection.release();
            
            // Get updated cart
            const [updatedCart] = await connection.execute(
                `SELECT ci.*, b.name, b.price, b.image_url, b.color, b.material
                 FROM cart_items ci
                 JOIN bands b ON ci.band_id = b.id
                 WHERE ci.cart_id = ?`,
                [cartId]
            );
            
            res.json({
                success: true,
                message: 'Item added to cart',
                data: {
                    cartId,
                    items: updatedCart
                }
            });
            
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
        
    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add item to cart'
        });
    }
});

// PUT update cart item quantity
router.put('/update', async (req, res) => {
    const { cartItemId, quantity } = req.body;
    
    if (!cartItemId || quantity === undefined) {
        return res.status(400).json({
            success: false,
            error: 'Cart item ID and quantity are required'
        });
    }
    
    if (quantity < 0) {
        return res.status(400).json({
            success: false,
            error: 'Quantity cannot be negative'
        });
    }
    
    try {
        const connection = await pool.getConnection();
        await connection.beginTransaction();
        
        try {
            // Get cart item details
            const [cartItems] = await connection.execute(
                `SELECT ci.*, b.stock 
                 FROM cart_items ci
                 JOIN bands b ON ci.band_id = b.id
                 WHERE ci.id = ?`,
                [cartItemId]
            );
            
            if (cartItems.length === 0) {
                await connection.rollback();
                connection.release();
                return res.status(404).json({
                    success: false,
                    error: 'Cart item not found'
                });
            }
            
            const cartItem = cartItems[0];
            
            // Check stock
            if (quantity > cartItem.stock) {
                await connection.rollback();
                connection.release();
                return res.status(400).json({
                    success: false,
                    error: `Only ${cartItem.stock} items available in stock`
                });
            }
            
            if (quantity === 0) {
                // Remove item
                await connection.execute(
                    'DELETE FROM cart_items WHERE id = ?',
                    [cartItemId]
                );
            } else {
                // Update quantity
                await connection.execute(
                    'UPDATE cart_items SET quantity = ? WHERE id = ?',
                    [quantity, cartItemId]
                );
            }
            
            // Update cart timestamp
            await connection.execute(
                'UPDATE shopping_carts SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [cartItem.cart_id]
            );
            
            await connection.commit();
            connection.release();
            
            res.json({
                success: true,
                message: quantity === 0 ? 'Item removed from cart' : 'Cart updated successfully'
            });
            
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
        
    } catch (error) {
        console.error('Error updating cart:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update cart'
        });
    }
});

// DELETE remove item from cart
router.delete('/remove/:cartItemId', async (req, res) => {
    const { cartItemId } = req.params;
    
    try {
        const connection = await pool.getConnection();
        await connection.beginTransaction();
        
        try {
            // Get cart ID before deleting
            const [cartItems] = await connection.execute(
                'SELECT cart_id FROM cart_items WHERE id = ?',
                [cartItemId]
            );
            
            if (cartItems.length === 0) {
                await connection.rollback();
                connection.release();
                return res.status(404).json({
                    success: false,
                    error: 'Cart item not found'
                });
            }
            
            const cartId = cartItems[0].cart_id;
            
            // Delete item
            await connection.execute(
                'DELETE FROM cart_items WHERE id = ?',
                [cartItemId]
            );
            
            // Update cart timestamp
            await connection.execute(
                'UPDATE shopping_carts SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [cartId]
            );
            
            await connection.commit();
            connection.release();
            
            res.json({
                success: true,
                message: 'Item removed from cart'
            });
            
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
        
    } catch (error) {
        console.error('Error removing from cart:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to remove item from cart'
        });
    }
});

// POST clear entire cart
router.post('/clear', async (req, res) => {
    const { cartId } = req.body;
    
    if (!cartId) {
        return res.status(400).json({
            success: false,
            error: 'Cart ID is required'
        });
    }
    
    try {
        const connection = await pool.getConnection();
        await connection.beginTransaction();
        
        try {
            // Delete all items from cart
            await connection.execute(
                'DELETE FROM cart_items WHERE cart_id = ?',
                [cartId]
            );
            
            // Update cart timestamp
            await connection.execute(
                'UPDATE shopping_carts SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [cartId]
            );
            
            await connection.commit();
            connection.release();
            
            res.json({
                success: true,
                message: 'Cart cleared successfully'
            });
            
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
        
    } catch (error) {
        console.error('Error clearing cart:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to clear cart'
        });
    }
});

// POST merge guest cart with user cart
router.post('/merge', async (req, res) => {
    const { userId, sessionId } = req.body;
    
    if (!userId || !sessionId) {
        return res.status(400).json({
            success: false,
            error: 'User ID and Session ID are required'
        });
    }
    
    try {
        const connection = await pool.getConnection();
        await connection.beginTransaction();
        
        try {
            // Get guest cart
            const [guestCarts] = await connection.execute(
                'SELECT id FROM shopping_carts WHERE session_id = ? ORDER BY updated_at DESC LIMIT 1',
                [sessionId]
            );
            
            if (guestCarts.length === 0) {
                await connection.rollback();
                connection.release();
                return res.json({
                    success: true,
                    message: 'No guest cart to merge'
                });
            }
            
            const guestCartId = guestCarts[0].id;
            
            // Get user cart (create if doesn't exist)
            const [userCarts] = await connection.execute(
                'SELECT id FROM shopping_carts WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1',
                [userId]
            );
            
            let userCartId;
            
            if (userCarts.length > 0) {
                userCartId = userCarts[0].id;
            } else {
                const [cartResult] = await connection.execute(
                    'INSERT INTO shopping_carts (user_id) VALUES (?)',
                    [userId]
                );
                userCartId = cartResult.insertId;
            }
            
            // Get all items from guest cart
            const [guestItems] = await connection.execute(
                'SELECT band_id, quantity FROM cart_items WHERE cart_id = ?',
                [guestCartId]
            );
            
            // Merge each item
            for (const guestItem of guestItems) {
                // Check if item already in user cart
                const [existingItems] = await connection.execute(
                    'SELECT id, quantity FROM cart_items WHERE cart_id = ? AND band_id = ?',
                    [userCartId, guestItem.band_id]
                );
                
                if (existingItems.length > 0) {
                    // Update quantity
                    const newQuantity = existingItems[0].quantity + guestItem.quantity;
                    
                    await connection.execute(
                        'UPDATE cart_items SET quantity = ? WHERE id = ?',
                        [newQuantity, existingItems[0].id]
                    );
                } else {
                    // Add new item
                    await connection.execute(
                        'INSERT INTO cart_items (cart_id, band_id, quantity) VALUES (?, ?, ?)',
                        [userCartId, guestItem.band_id, guestItem.quantity]
                    );
                }
            }
            
            // Delete guest cart
            await connection.execute(
                'DELETE FROM cart_items WHERE cart_id = ?',
                [guestCartId]
            );
            
            await connection.execute(
                'DELETE FROM shopping_carts WHERE id = ?',
                [guestCartId]
            );
            
            // Update user cart timestamp
            await connection.execute(
                'UPDATE shopping_carts SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [userCartId]
            );
            
            await connection.commit();
            connection.release();
            
            res.json({
                success: true,
                message: 'Cart merged successfully',
                data: {
                    userCartId
                }
            });
            
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
        
    } catch (error) {
        console.error('Error merging carts:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to merge carts'
        });
    }
});

module.exports = router;